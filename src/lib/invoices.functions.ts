import { createServerFn } from "@/lib/react-start-mock";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function customerOwnsOrder(orderId: string, userId: string): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: cust } = await supabaseAdmin
    .from("customers")
    .select("id")
    .eq("supabase_user_id", userId)
    .eq("is_deleted", false)
    .maybeSingle();
  if (!cust) return false;
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("id, customer_id")
    .eq("id", orderId)
    .maybeSingle();
  return Boolean(order && order.customer_id === cust.id);
}

/** Fetch the invoice (if any) for one of the signed-in customer's orders. */
export const getMyInvoiceForOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string }) => {
    if (!data?.orderId) throw new Error("orderId required");
    return data;
  })
  .handler(async ({ data, context }) => {
    const ok = await customerOwnsOrder(data.orderId, context.userId);
    if (!ok) throw new Error("Order not found");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inv } = await supabaseAdmin
      .from("invoices")
      .select("id, invoice_number, invoice_url, invoice_amount, tax_amount, generated_at, is_void")
      .eq("order_id", data.orderId)
      .maybeSingle();
    return { invoice: inv ?? null };
  });

/** Trigger invoice generation for a paid/COD order the customer owns. Idempotent. */
export const generateMyInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string }) => {
    if (!data?.orderId) throw new Error("orderId required");
    return data;
  })
  .handler(async ({ data, context }) => {
    const ok = await customerOwnsOrder(data.orderId, context.userId);
    if (!ok) throw new Error("Order not found");
    
    console.log('📄 Generating invoice for order:', data.orderId);
    
    // First, check if invoice already exists
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existingInvoice } = await supabaseAdmin
      .from("invoices")
      .select("id, invoice_number, invoice_url")
      .eq("order_id", data.orderId)
      .maybeSingle();
    
    // If invoice exists and has URL, return it
    if (existingInvoice?.invoice_url) {
      console.log('✅ Invoice already exists with URL:', existingInvoice.invoice_url);
      return { 
        success: true, 
        invoice: existingInvoice,
        message: 'Invoice already exists' 
      };
    }
    
    // If invoice exists but no URL, generate PDF
    if (existingInvoice && !existingInvoice.invoice_url) {
      console.log('📄 Invoice exists but no URL, generating PDF...');
      const result = await generateAndUploadMyInvoicePdf({
        data: { 
          orderId: data.orderId, 
          invoiceNumber: existingInvoice.invoice_number 
        },
        context
      });
      return result;
    }
    
    // If no invoice exists, create one and generate PDF
    console.log('📄 Creating new invoice...');
    
    // Get order details
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", data.orderId)
      .single();
    
    if (!order) {
      throw new Error("Order not found");
    }
    
    // Generate invoice number
    const invoiceNumber = `INV-${order.order_number}-${Date.now()}`;
    
    // Create invoice record
    const { data: newInvoice, error: createError } = await supabaseAdmin
      .from("invoices")
      .insert({
        order_id: data.orderId,
        invoice_number: invoiceNumber,
        invoice_amount: order.grand_total,
        tax_amount: order.tax_amount || 0,
        generated_at: new Date().toISOString(),
        is_void: false,
        customer_id: order.customer_id
      })
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Error creating invoice:', createError);
      throw new Error(`Failed to create invoice: ${createError.message}`);
    }
    
    console.log('✅ Invoice record created:', newInvoice.id);
    
    // Generate and upload PDF
    try {
      const result = await generateAndUploadMyInvoicePdf({
        data: { 
          orderId: data.orderId, 
          invoiceNumber: invoiceNumber 
        },
        context
      });
      
      return {
        success: true,
        invoice: newInvoice,
        ...result
      };
    } catch (error) {
      console.error('❌ Error generating PDF:', error);
      // Return the invoice even if PDF generation fails
      return {
        success: true,
        invoice: newInvoice,
        warning: 'Invoice created but PDF generation failed. Please try again.'
      };
    }
  });

/** List invoices for all of the signed-in customer's orders. */
export const listMyInvoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cust } = await supabaseAdmin
      .from("customers")
      .select("id")
      .eq("supabase_user_id", context.userId)
      .eq("is_deleted", false)
      .maybeSingle();
    if (!cust) return { invoices: [] };
    const { data: orders } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("customer_id", cust.id);
    const orderIds = (orders ?? []).map((o) => o.id);
    if (orderIds.length === 0) return { invoices: [] };
    const { data: invs } = await supabaseAdmin
      .from("invoices")
      .select("id, order_id, invoice_number, invoice_url, invoice_amount, generated_at, is_void")
      .in("order_id", orderIds)
      .order("generated_at", { ascending: false });
    return { invoices: invs ?? [] };
  });

/** Generate and upload PDF for a customer's invoice */
export const generateAndUploadMyInvoicePdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string, invoiceNumber: string }) => {
    if (!data?.orderId) throw new Error("orderId required");
    if (!data?.invoiceNumber) throw new Error("invoiceNumber required");
    return data;
  })
  .handler(async ({ data, context }) => {
    console.log('📤 Generating PDF for invoice:', data.invoiceNumber);
    
    const ok = await customerOwnsOrder(data.orderId, context.userId);
    if (!ok) throw new Error("Order not found");
    
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    try {
      // Fetch full order data for PDF
      console.log('📊 Fetching order data...');
      const { data: order } = await supabaseAdmin
        .from("orders")
        .select("*")
        .eq("id", data.orderId)
        .single();
      
      if (!order) throw new Error("Order not found");
      
      const { data: items } = await supabaseAdmin
        .from("order_items")
        .select("*")
        .eq("order_id", data.orderId);
      
      const { data: payments } = await supabaseAdmin
        .from("payments")
        .select("*")
        .eq("order_id", data.orderId);
      
      const { data: outlet } = await supabaseAdmin
        .from("outlets")
        .select("*")
        .eq("id", order?.outlet_id)
        .single();
      
      const { data: customer } = await supabaseAdmin
        .from("customers")
        .select("*")
        .eq("supabase_user_id", context.userId)
        .single();
      
      const itemIds = (items || []).map((i: any) => i.id);
      const { data: addons } = itemIds.length 
        ? await supabaseAdmin.from("order_item_addons").select("*").in("order_item_id", itemIds) 
        : { data: [] };
      
      console.log('✅ Order data fetched:', {
        orderId: order.id,
        items: items?.length || 0,
        addons: addons?.length || 0
      });
      
      // Build PDF
      console.log('📄 Building PDF...');
      const { buildPdfBlob } = await import("@/components/invoice-pdf");
      const blob = await buildPdfBlob({
        order,
        items: items || [],
        addons: addons || [],
        payments: payments || [],
        customer: { 
          full_name: `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim() || 'Guest', 
          phone: customer?.phone || '', 
          email: customer?.email || '' 
        },
        outlet,
        invoiceNumber: data.invoiceNumber
      });
      
      console.log('✅ PDF built, size:', blob.size, 'bytes');
      
      const path = `${data.orderId}/${data.invoiceNumber}.pdf`;
      console.log('📤 Uploading to storage:', path);
      
      // Convert Blob to ArrayBuffer for Node.js Supabase Storage upload
      const arrayBuffer = await blob.arrayBuffer();
      
      // Check if bucket exists
      const { data: buckets } = await supabaseAdmin.storage.listBuckets();
      const bucketExists = buckets?.some(b => b.name === 'invoices');
      
      if (!bucketExists) {
        console.log('📁 Creating invoices bucket...');
        await supabaseAdmin.storage.createBucket('invoices', {
          public: true,
          fileSizeLimit: 5242880,
          allowedMimeTypes: ['application/pdf']
        });
      }
      
      // Upload PDF
      const { error: uploadError } = await supabaseAdmin.storage
        .from("invoices")
        .upload(path, arrayBuffer, { 
          contentType: "application/pdf", 
          upsert: true 
        });
      
      if (uploadError) {
        console.error('❌ Upload error:', uploadError);
        throw new Error(`Failed to upload PDF: ${uploadError.message}`);
      }
      
      console.log('✅ PDF uploaded successfully');
      
      // Get public URL
      const { data: pubData } = supabaseAdmin.storage
        .from("invoices")
        .getPublicUrl(path);
      
      console.log('🔗 Public URL:', pubData.publicUrl);
      
      // Update invoice with URL
      console.log('💾 Updating invoice record with URL...');
      const { error: updateError } = await supabaseAdmin
        .from("invoices")
        .update({ 
          invoice_url: pubData.publicUrl
        })
        .eq("order_id", data.orderId);
      
      if (updateError) {
        console.error('❌ Update error:', updateError);
        throw new Error(`Failed to update invoice URL: ${updateError.message}`);
      }
      
      console.log('✅ Invoice URL updated successfully');
      
      // Fetch updated invoice
      const { data: updatedInvoice } = await supabaseAdmin
        .from("invoices")
        .select("*")
        .eq("order_id", data.orderId)
        .single();
      
      return { 
        ok: true, 
        invoiceUrl: pubData.publicUrl,
        invoice: updatedInvoice
      };
      
    } catch (error) {
      console.error('❌ PDF generation error:', error);
      throw error;
    }
  });

export const getMyInvoiceOrderDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string }) => {
    if (!data?.orderId) throw new Error("orderId required");
    return data;
  })
  .handler(async ({ data, context }) => {
    const ok = await customerOwnsOrder(data.orderId, context.userId);
    if (!ok) throw new Error("Order not found");
    
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: order }, { data: items }, { data: payments }] = await Promise.all([
      supabaseAdmin.from("orders").select("*").eq("id", data.orderId).maybeSingle(),
      supabaseAdmin.from("order_items").select("*").eq("order_id", data.orderId),
      supabaseAdmin.from("payments").select("*").eq("order_id", data.orderId),
    ]);
    
    if (!order) throw new Error("Order not found");
    const itemIds = (items ?? []).map((i) => i.id);
    const { data: addons } = itemIds.length
      ? await supabaseAdmin.from("order_item_addons").select("*").in("order_item_id", itemIds)
      : { data: [] as any[] };
      
    const [{ data: customer }, { data: outlet }] = await Promise.all([
      order.customer_id
        ? supabaseAdmin.from("customers").select("*").eq("id", order.customer_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabaseAdmin.from("outlets").select("*").eq("id", order.outlet_id).maybeSingle(),
    ]);
    
    return { order, items: items ?? [], addons: addons ?? [], payments: payments ?? [], customer, outlet };
  });

export const updateMyInvoiceUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string, invoiceUrl: string }) => {
    if (!data?.orderId) throw new Error("orderId required");
    if (!data?.invoiceUrl) throw new Error("invoiceUrl required");
    return data;
  })
  .handler(async ({ data, context }) => {
    const ok = await customerOwnsOrder(data.orderId, context.userId);
    if (!ok) throw new Error("Order not found");
    
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("invoices")
      .update({ invoice_url: data.invoiceUrl })
      .eq("order_id", data.orderId);
      
    if (error) throw new Error(error.message);
    return { ok: true };
  });
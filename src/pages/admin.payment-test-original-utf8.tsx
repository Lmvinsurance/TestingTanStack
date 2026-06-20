import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Wallet, 
  Coffee, 
  Utensils,
  Smartphone,
  Menu,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Clock,
  IndianRupee,
  Phone,
  User,
  MapPin,
  Tag,
  Printer,
  RefreshCw,
  FileText,
  Download,
  ExternalLink
} from 'lucide-react';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const API_PATH = 'https://u18pdq88oa.execute-api.ap-south-1.amazonaws.com/';
const BUCKET = "invoices";

// Helper functions
function fmt(n: number) { 
  return "Γé╣" + Number(n || 0).toLocaleString("en-IN"); 
}

async function buildPdfBlob(args: {
  order: any; 
  items: any[]; 
  addons: any[]; 
  payments: any[]; 
  customer: any; 
  outlet: any; 
  invoiceNumber: string;
}): Promise<Blob> {
  const { order, items, addons, payments, customer, outlet, invoiceNumber } = args;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  
  // Header
  doc.setFontSize(18); 
  doc.text("Telugu Food Club", 40, 50);
  doc.setFontSize(10); 
  doc.text(outlet?.outlet_name ?? "", 40, 66);
  doc.text(`${outlet?.address ?? ""} ${outlet?.city ?? ""}`, 40, 80);
  doc.text(`Phone: ${outlet?.phone ?? ""}`, 40, 94);
  
  doc.setFontSize(14); 
  doc.text("TAX INVOICE", 400, 50);
  doc.setFontSize(10);
  doc.text(`Invoice #: ${invoiceNumber}`, 400, 66);
  doc.text(`Date: ${new Date().toLocaleString()}`, 400, 80);
  doc.text(`Order #: ${order.order_number || order.id.slice(0, 8)}`, 400, 94);

  // Customer Info
  doc.setFontSize(11); 
  doc.text("Bill To", 40, 120);
  doc.setFontSize(10);
  doc.text(customer?.full_name || customer?.name || "Guest", 40, 136);
  doc.text(customer?.phone || "", 40, 150);
  doc.text(customer?.email || "", 40, 164);

  // Items with addons
  const addonByItem = new Map<string, any[]>();
  (addons || []).forEach((a: any) => {
    const arr = addonByItem.get(a.order_item_id) ?? [];
    arr.push(a); 
    addonByItem.set(a.order_item_id, arr);
  });

  const rows = (items || []).flatMap((it: any) => {
    const base = [
      it.item_name_snapshot + (it.variant_name_snapshot ? ` ΓÇö ${it.variant_name_snapshot}` : ""),
      String(it.quantity),
      fmt(it.unit_price_snapshot || it.price || 0),
      fmt(it.total_price || (it.price * it.quantity) || 0)
    ];
    const adds = (addonByItem.get(it.id) ?? []).map((a: any) => [
      `  + ${a.addon_name_snapshot}`,
      String(a.quantity),
      fmt(a.price_snapshot || a.price || 0),
      fmt((a.price_snapshot || a.price || 0) * (a.quantity || 1))
    ]);
    return [base, ...adds];
  });

  autoTable(doc, {
    startY: 190,
    head: [["Item", "Qty", "Rate", "Total"]],
    body: rows,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [184, 71, 28] },
  });

  const endY = (doc as any).lastAutoTable.finalY + 20;
  
  // Totals
  const lines = [
    ["Subtotal", fmt(order.subtotal || 0)],
    ["Tax", fmt(order.tax_amount || 0)],
    ["Grand Total", fmt(order.grand_total || 0)],
  ];
  
  lines.forEach(([k, v], i) => {
    doc.setFontSize(i === lines.length - 1 ? 12 : 10);
    doc.text(k, 380, endY + i * 16);
    doc.text(v, 540, endY + i * 16, { align: "right" });
  });

  // Payment status
  const paid = (payments || []).find((p: any) => p.payment_status === "success");
  if (paid) {
    doc.setFontSize(10); 
    doc.setTextColor(0, 120, 0);
    doc.text(
      `PAID via ${paid.payment_gateway}${paid.payment_mode ? " ┬╖ " + paid.payment_mode : ""}${paid.transaction_id ? "  TXN " + paid.transaction_id : ""}`, 
      40, 
      endY + lines.length * 16 + 24
    );
    doc.setTextColor(0, 0, 0);
  }

  // Footer
  doc.setFontSize(9);
  doc.text("Thank you for your business!", 40, 800);
  doc.text("This is a system generated invoice.", 40, 814);
  
  return doc.output("blob");
}

function AdminPaymentTest() {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [outletId, setOutletId] = useState('');
  const [outlets, setOutlets] = useState([]);
  const [customerMobileNumber, setCustomerMobileNumber] = useState('9876543210');
  const [customerName, setCustomerName] = useState('Rahul Sharma');
  const [branch, setBranch] = useState('Mumbai');
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('');
  const [dataLoading, setDataLoading] = useState(true);
  const [orderType, setOrderType] = useState('dine_in');
  const [tableNumber, setTableNumber] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [isWalkIn, setIsWalkIn] = useState(true);
  const [adminId, setAdminId] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('phonepe');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [cartAnimation, setCartAnimation] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState(null);
  const [invoiceData, setInvoiceData] = useState(null);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [verificationAttempts, setVerificationAttempts] = useState(0);
  const [phonePeWindow, setPhonePeWindow] = useState(null);
  const [showRetryButton, setShowRetryButton] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [uploadingInvoice, setUploadingInvoice] = useState(false);
  const [phonePeStatus, setPhonePeStatus] = useState<'idle' | 'pending' | 'success' | 'failed'>('idle');
  const [paymentChannelUrl, setPaymentChannelUrl] = useState<string | null>(null);
  const [showPaymentChannel, setShowPaymentChannel] = useState(false);
  
  const pollIntervalRef = useRef(null);
  const timeoutRef = useRef(null);
  const invoiceRef = useRef(null);

  // Fetch outlets
  useEffect(() => {
    const fetchOutlets = async () => {
      try {
        const { data: outletsData, error: outletsError } = await supabaseAdmin
          .from("outlets")
          .select("id, outlet_name, city, state, address, is_active, phone, email, outlet_code")
          .eq("is_active", true);

        if (outletsError) throw outletsError;
        
        if (outletsData && outletsData.length > 0) {
          setOutlets(outletsData);
          setOutletId(outletsData[0].id);
          setBranch(outletsData[0].outlet_name || outletsData[0].city || 'Default Branch');
        } else {
          setPaymentStatus('No active outlets found');
        }
      } catch (error) {
        console.error('Error fetching outlets:', error);
        setPaymentStatus('Failed to load outlets: ' + error.message);
      }
    };

    fetchOutlets();

    const getAdminId = async () => {
      try {
        const { data: { user } } = await supabaseAdmin.auth.getUser();
        if (user) {
          setAdminId(user.id);
        }
      } catch (error) {
        console.error('Error getting admin ID:', error);
      }
    };
    getAdminId();
  }, []);

  // Fetch menu data
  useEffect(() => {
    const fetchMenuData = async () => {
      if (!outletId) {
        setDataLoading(false);
        return;
      }

      try {
        setDataLoading(true);
        setPaymentStatus('Loading menu data...');
        
        const { data: categoriesData, error: categoriesError } = await supabaseAdmin
          .from("menu_categories")
          .select("id, category_name, display_order")
          .eq("is_active", true)
          .eq("is_deleted", false)
          .order("display_order");

        if (categoriesError) throw categoriesError;
        setCategories(categoriesData || []);

        const { data: itemsData, error: itemsError } = await supabaseAdmin
          .from("menu_items")
          .select("id, item_name, category_id, short_description, is_active, is_deleted")
          .eq("is_active", true)
          .eq("is_deleted", false);

        if (itemsError) throw itemsError;

        const { data: variantsData, error: variantsError } = await supabaseAdmin
          .from("item_variants")
          .select("id, item_id, variant_name, base_price, quantity_label, is_active")
          .eq("is_active", true);

        if (variantsError) throw variantsError;

        const { data: pricesData, error: pricesError } = await supabaseAdmin
          .from("outlet_variant_prices")
          .select("variant_id, item_id, selling_price, mrp_price, is_available")
          .eq("outlet_id", outletId);

        if (pricesError) {
          console.error('Prices error:', pricesError);
        }

        const { data: availabilityData, error: availabilityError } = await supabaseAdmin
          .from("outlet_item_availability")
          .select("item_id, is_available, stock_status")
          .eq("outlet_id", outletId);

        if (availabilityError) {
          console.error('Availability error:', availabilityError);
        }

        const combinedItems = itemsData?.map(item => {
          const variants = variantsData
            ?.filter(v => v.item_id === item.id)
            .map(variant => {
              const price = pricesData?.find(p => p.variant_id === variant.id);
              return {
                ...variant,
                selling_price: price?.selling_price || variant.base_price,
                mrp_price: price?.mrp_price || variant.base_price,
                is_available: price?.is_available !== undefined ? price.is_available : true
              };
            })
            .filter(v => v.selling_price > 0) || [];

          const availability = availabilityData?.find(a => a.item_id === item.id);
          
          return {
            ...item,
            variants,
            is_available: availability?.is_available !== undefined ? availability.is_available : true,
            stock_status: availability?.stock_status || 'available'
          };
        }) || [];

        const availableItems = combinedItems.filter(item => 
          item.variants && item.variants.length > 0 && item.is_available !== false
        );

        setMenuItems(availableItems);
        
        if (availableItems.length > 0) {
          const demoItems = availableItems.slice(0, Math.min(3, availableItems.length))
            .map(item => {
              const firstVariant = item.variants[0];
              return {
                id: item.id,
                name: item.item_name,
                variant_id: firstVariant.id,
                variant_name: firstVariant.variant_name || 'Regular',
                price: firstVariant.selling_price,
                quantity: 1,
                category_id: item.category_id,
                short_description: item.short_description,
                quantity_label: firstVariant.quantity_label
              };
            });
          
          setCartItems(demoItems);
          setPaymentStatus(`Loaded ${availableItems.length} items`);
        } else {
          setPaymentStatus('No items available for this outlet');
        }

      } catch (error) {
        console.error('Error fetching menu data:', error);
        setPaymentStatus('Failed to load menu data: ' + error.message);
      } finally {
        setDataLoading(false);
      }
    };

    fetchMenuData();
  }, [outletId]);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (phonePeWindow && !phonePeWindow.closed) {
        phonePeWindow.close();
      }
    };
  }, []);

  // Save order to Supabase
  const saveOrderToSupabase = async (paymentResponse) => {
    try {
      const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const taxAmount = parseFloat((subtotal * 0.18).toFixed(2));
      const grandTotal = subtotal + taxAmount;

      const { data: order, error: orderError } = await supabaseAdmin
        .from("orders")
        .insert({
          customer_id: null,
          outlet_id: outletId,
          order_type: orderType,
          order_status: 'pending_payment',
          payment_status: 'pending',
          subtotal: subtotal,
          tax_amount: taxAmount,
          delivery_charge: 0,
          discount_amount: 0,
          grand_total: grandTotal,
          customer_notes: specialInstructions || null,
          created_by: adminId,
          last_updated_by: adminId,
          is_walk_in: isWalkIn,
          walk_in_customer_name: isWalkIn ? customerName : null,
          walk_in_customer_phone: isWalkIn ? customerMobileNumber : null,
          table_number: orderType === 'dine_in' ? tableNumber || null : null,
        })
        .select("id, order_number, created_at")
        .single();

      if (orderError) {
        console.error('Order creation error:', orderError);
        throw new Error('Failed to create order: ' + orderError.message);
      }

      setCurrentOrderId(order.id);

      const orderItems = cartItems.map(item => ({
        order_id: order.id,
        item_id: item.id,
        variant_id: item.variant_id,
        item_name_snapshot: item.name,
        variant_name_snapshot: item.variant_name,
        unit_price_snapshot: item.price,
        quantity: item.quantity,
        total_price: item.price * item.quantity,
        special_instructions: null
      }));

      const { error: itemsError } = await supabaseAdmin
        .from("order_items")
        .insert(orderItems);

      if (itemsError) {
        console.error('Order items error:', itemsError);
        throw new Error('Failed to create order items: ' + itemsError.message);
      }

      const merchantTransactionId = `PHONEPE-${order.order_number}-${Date.now()}`;
      
      const { data: payment, error: paymentError } = await supabaseAdmin
        .from("payments")
        .insert({
          order_id: order.id,
          payment_gateway: selectedPaymentMethod === 'phonepe' ? 'phonepe' : selectedPaymentMethod,
          payment_mode: selectedPaymentMethod === 'phonepe' ? 'upi' : selectedPaymentMethod === 'card' ? 'card' : 'cash',
          payment_status: selectedPaymentMethod === 'cash' ? 'success' : 'initiated',
          amount: grandTotal,
          transaction_id: paymentResponse?.transactionId || merchantTransactionId,
          merchant_transaction_id: merchantTransactionId,
          gateway_response_snapshot: paymentResponse || null,
          ip_address: null,
        })
        .select("id")
        .single();

      if (paymentError) {
        console.error('Payment creation error:', paymentError);
        throw new Error('Failed to create payment record: ' + paymentError.message);
      }

      const { error: historyError } = await supabaseAdmin
        .from("order_status_history")
        .insert({
          order_id: order.id,
          old_status: null,
          new_status: 'pending_payment',
          remarks: `Order created via ${selectedPaymentMethod} payment. Order type: ${orderType}`,
          changed_by: adminId,
          changed_by_role: 'admin',
          ip_address: null,
        });

      if (historyError) {
        console.error('Status history error:', historyError);
      }

      return {
        order,
        payment,
        merchantTransactionId
      };

    } catch (error) {
      console.error('Error saving order:', error);
      throw error;
    }
  };

  // Check payment status directly from database
  const checkPaymentStatusFromDB = async (orderId) => {
    try {
      const { data: order, error } = await supabaseAdmin
        .from("orders")
        .select("payment_status, order_status, grand_total, subtotal, tax_amount")
        .eq("id", orderId)
        .single();

      if (error) {
        console.error('Error checking order:', error);
        return null;
      }

      return order;
    } catch (error) {
      console.error('Error checking payment:', error);
      return null;
    }
  };

  // Update payment status and generate invoice
  const updatePaymentStatus = async (orderId, paymentId, status, transactionId) => {
    try {
      // Update payment status
      if (paymentId) {
        const { error: paymentUpdateError } = await supabaseAdmin
          .from("payments")
          .update({
            payment_status: status,
            paid_at: status === 'success' ? new Date().toISOString() : null,
            transaction_id: transactionId,
          })
          .eq("id", paymentId);

        if (paymentUpdateError) {
          console.error('Payment update error:', paymentUpdateError);
        }
      }

      // Update order status
      const { error: orderUpdateError } = await supabaseAdmin
        .from("orders")
        .update({
          payment_status: status === 'success' ? 'paid' : 'failed',
          order_status: status === 'success' ? 'received' : 'payment_failed',
          last_updated_by: adminId,
        })
        .eq("id", orderId);

      if (orderUpdateError) {
        console.error('Order update error:', orderUpdateError);
      }

      // Add status history
      await supabaseAdmin
        .from("order_status_history")
        .insert({
          order_id: orderId,
          old_status: 'pending_payment',
          new_status: status === 'success' ? 'received' : 'payment_failed',
          remarks: status === 'success' ? 'Payment successful' : 'Payment failed',
          changed_by: adminId,
          changed_by_role: 'admin',
        });

      // Generate and save invoice if payment successful
      if (status === 'success') {
        await generateAndSaveInvoice(orderId);
      }

      return { success: true };

    } catch (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }
  };

  // Generate and save invoice with PDF upload
  const generateAndSaveInvoice = async (orderId) => {
    try {
      setGeneratingInvoice(true);
      setUploadingInvoice(true);
      
      // Fetch order details
      const { data: order, error: orderError } = await supabaseAdmin
        .from("orders")
        .select(`
          id,
          order_number,
          created_at,
          subtotal,
          tax_amount,
          grand_total,
          walk_in_customer_name,
          walk_in_customer_phone,
          order_type,
          table_number,
          customer_notes
        `)
        .eq("id", orderId)
        .single();

      if (orderError) throw orderError;

      // Fetch order items
      const { data: items, error: itemsError } = await supabaseAdmin
        .from("order_items")
        .select(`
          id,
          item_name_snapshot,
          variant_name_snapshot,
          quantity,
          unit_price_snapshot,
          total_price
        `)
        .eq("order_id", orderId);

      if (itemsError) throw itemsError;

      // Fetch payments
      const { data: payments, error: paymentsError } = await supabaseAdmin
        .from("payments")
        .select("payment_gateway, payment_mode, payment_status, transaction_id")
        .eq("order_id", orderId);

      if (paymentsError) throw paymentsError;

      // Get outlet details
      const { data: outlet, error: outletError } = await supabaseAdmin
        .from("outlets")
        .select("outlet_name, address, city, state, phone, outlet_code")
        .eq("id", outletId)
        .single();

      if (outletError) throw outletError;

      // Get invoice number from the trigger - we'll save and let the trigger generate it
      const invoiceNumber = `INV-${order.order_number || orderId.slice(0, 8)}-${Date.now().toString().slice(-6)}`;
      
      // Customer object
      const customer = {
        full_name: order.walk_in_customer_name || customerName || 'Guest',
        phone: order.walk_in_customer_phone || customerMobileNumber || '',
        email: ''
      };

      // Build PDF
      const blob = await buildPdfBlob({
        order,
        items: items || [],
        addons: [],
        payments: payments || [],
        customer,
        outlet,
        invoiceNumber
      });

      // Upload to Supabase Storage
      const path = `${orderId}/${invoiceNumber}.pdf`;
      const { error: uploadError } = await supabase
        .storage
        .from(BUCKET)
        .upload(path, blob, { 
          contentType: "application/pdf", 
          upsert: true 
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        // If bucket doesn't exist, try to create it or handle error gracefully
        if (uploadError.message.includes('Bucket not found')) {
          toast.error('Storage bucket not found. Please create the "invoices" bucket in Supabase Storage.');
        }
        throw new Error('Failed to upload invoice PDF: ' + uploadError.message);
      }

      // Get public URL
      const { data: pubData } = supabase
        .storage
        .from(BUCKET)
        .getPublicUrl(path);

      // Save invoice record - let the trigger generate the invoice_number
      const { data: invoiceRecord, error: saveError } = await supabaseAdmin
        .from("invoices")
        .insert({
          order_id: orderId,
          invoice_number: invoiceNumber, // Will be overwritten by trigger if configured
          invoice_url: pubData.publicUrl,
          invoice_amount: Number(order.grand_total),
          tax_amount: Number(order.tax_amount),
          generated_by: adminId || 'system',
          is_void: false,
          generated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (saveError) {
        console.error('Save invoice error:', saveError);
        throw new Error('Failed to save invoice record: ' + saveError.message);
      }

      // Set invoice data for display
      setInvoiceData({
        id: invoiceRecord.id,
        invoiceNumber: invoiceRecord.invoice_number || invoiceNumber,
        orderNumber: order.order_number || orderId.slice(0, 8),
        date: new Date(order.created_at).toLocaleString(),
        customerName: customer.full_name,
        customerPhone: customer.phone,
        orderType: order.order_type,
        tableNumber: order.table_number || 'N/A',
        items: items || [],
        subtotal: order.subtotal || 0,
        tax: order.tax_amount || 0,
        total: order.grand_total || 0,
        outlet: outlet,
        notes: order.customer_notes || '',
        invoiceUrl: pubData.publicUrl,
      });

      setUploadingInvoice(false);
      setGeneratingInvoice(false);
      
      toast.success(`Invoice ${invoiceRecord.invoice_number || invoiceNumber} generated successfully!`);
      return { success: true, invoiceNumber: invoiceRecord.invoice_number || invoiceNumber };

    } catch (error) {
      console.error('Error generating invoice:', error);
      setGeneratingInvoice(false);
      setUploadingInvoice(false);
      toast.error('Failed to generate invoice: ' + (error.message || 'Unknown error'));
      throw error;
    }
  };

  // Verify PhonePe payment status
  const verifyPhonePePayment = async (orderId, isManual = false) => {
    try {
      if (!isManual) {
        setVerifyingPayment(true);
        setVerificationAttempts(prev => prev + 1);
      }
      
      setPaymentStatus(isManual ? 'Checking payment status...' : `Verifying payment (${verificationAttempts + 1}/10)...`);

      // First check if order is already marked as paid in database
      const orderStatus = await checkPaymentStatusFromDB(orderId);
      
      if (orderStatus && orderStatus.payment_status === 'paid') {
        // Already paid - generate invoice if not already
        if (!invoiceData) {
          await generateAndSaveInvoice(orderId);
        }
        setPaymentConfirmed(true);
        setIsSuccess(true);
        setPaymentCompleted(true);
        setVerifyingPayment(false);
        setPhonePeStatus('success');
        stopPolling();
        setShowPaymentChannel(false);
        return { success: true, alreadyPaid: true };
      }

      // Try to verify with PhonePe API
      try {
        const response = await axios.post(`${API_PATH}api/admin/phonepe/verify`, {
          orderId: orderId
        });

        console.log('Verification response:', response.data);

        if (response.data) {
          if (response.data.paymentStatus === 'success') {
            stopPolling();
            await updatePaymentStatus(orderId, null, 'success', `VERIFIED-${Date.now()}`);
            setPaymentConfirmed(true);
            setIsSuccess(true);
            setVerifyingPayment(false);
            setPaymentCompleted(true);
            setPhonePeStatus('success');
            setShowPaymentChannel(false);
            setPaymentStatus(`Γ£à Payment successful! Invoice #${invoiceData?.invoiceNumber || 'generated'}.`);
            
            if (phonePeWindow && !phonePeWindow.closed) {
              phonePeWindow.close();
              setPhonePeWindow(null);
            }
            
            return { success: true };
          } 
          else if (response.data.paymentStatus === 'failed') {
            stopPolling();
            setVerifyingPayment(false);
            setPhonePeStatus('failed');
            setPaymentStatus('Γ¥î Payment failed. Please try again.');
            setShowRetryButton(true);
            return { success: false, status: 'failed' };
          } 
          else {
            setPhonePeStatus('pending');
            setPaymentStatus(`ΓÅ│ Waiting for payment confirmation... (${verificationAttempts + 1}/10)`);
            return { success: false, status: 'pending' };
          }
        }
      } catch (apiError) {
        console.error('PhonePe API error:', apiError);
        
        if (apiError.response?.status === 404 || apiError.message?.includes('Cannot POST')) {
          const updatedOrder = await checkPaymentStatusFromDB(orderId);
          
          if (updatedOrder && updatedOrder.payment_status === 'paid') {
            if (!invoiceData) {
              await generateAndSaveInvoice(orderId);
            }
            setPaymentConfirmed(true);
            setIsSuccess(true);
            setPaymentCompleted(true);
            setVerifyingPayment(false);
            setPhonePeStatus('success');
            setShowPaymentChannel(false);
            stopPolling();
            setPaymentStatus(`Γ£à Payment successful! Invoice #${invoiceData?.invoiceNumber || 'generated'}.`);
            return { success: true };
          }
          
          if (verificationAttempts >= 10) {
            setVerifyingPayment(false);
            setPaymentStatus('ΓÅ│ Payment still processing. Please check manually.');
            setShowRetryButton(true);
            return { success: false, status: 'pending' };
          }
          
          return { success: false, status: 'pending' };
        }
      }

      return { success: false, status: 'pending' };

    } catch (error) {
      console.error('Payment verification error:', error);
      
      if (isManual) {
        setPaymentStatus('Γ¥î Failed to verify payment: ' + (error.message || 'Unknown error'));
        setShowRetryButton(true);
      }
      
      setVerifyingPayment(false);
      return { success: false, error: error.message };
    }
  };

  // Manual confirmation for testing
  const manuallyConfirmPayment = async () => {
    if (!currentOrderId) {
      setPaymentStatus('No order to confirm');
      return;
    }

    setVerifyingPayment(true);
    setPaymentStatus('Manually confirming payment...');

    try {
      await updatePaymentStatus(currentOrderId, null, 'success', `MANUAL-${Date.now()}`);
      setPaymentConfirmed(true);
      setIsSuccess(true);
      setPaymentCompleted(true);
      setVerifyingPayment(false);
      setPhonePeStatus('success');
      setShowPaymentChannel(false);
      stopPolling();
      setPaymentStatus(`Γ£à Payment confirmed manually! Invoice #${invoiceData?.invoiceNumber || 'generated'}.`);
      
      if (phonePeWindow && !phonePeWindow.closed) {
        phonePeWindow.close();
        setPhonePeWindow(null);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Manual confirmation error:', error);
      setPaymentStatus('Γ¥î Failed to confirm payment: ' + error.message);
      setVerifyingPayment(false);
      return { success: false };
    }
  };

  // Stop polling
  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  // Download invoice PDF
  const downloadInvoice = () => {
    if (!invoiceData?.invoiceUrl) {
      toast.error('No invoice URL available');
      return;
    }
    
    window.open(invoiceData.invoiceUrl, '_blank');
  };

  // Print invoice
  const printInvoice = () => {
    if (!invoiceData?.invoiceUrl) {
      toast.error('No invoice available to print');
      return;
    }
    
    const printWindow = window.open(invoiceData.invoiceUrl, '_blank', 'width=800,height=600');
    if (!printWindow) {
      alert('Please allow popups to print invoice');
      return;
    }
    
    printWindow.onload = function() {
      setTimeout(() => {
        printWindow.print();
      }, 1000);
    };
  };

  // Open PhonePe payment channel
  const openPaymentChannel = (url) => {
    if (url) {
      const newWindow = window.open(url, '_blank');
      setPhonePeWindow(newWindow);
      setShowPaymentChannel(true);
      setPhonePeStatus('pending');
      setPaymentStatus('≡ƒöä Payment channel opened. Complete the payment in PhonePe...');
    }
  };

  // Add item to cart with animation
  const addToCart = (item) => {
    if (!item.variants || item.variants.length === 0) {
      setPaymentStatus('This item has no variants available');
      return;
    }

    const firstVariant = item.variants.find(v => v.is_available !== false && v.selling_price > 0) || item.variants[0];
    
    if (!firstVariant || !firstVariant.selling_price) {
      setPaymentStatus('This item has no price configured');
      return;
    }

    setCartAnimation(true);
    setTimeout(() => setCartAnimation(false), 300);

    const existingItem = cartItems.find(ci => ci.id === item.id);
    if (existingItem) {
      setCartItems(cartItems.map(ci => 
        ci.id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci
      ));
    } else {
      setCartItems([...cartItems, {
        id: item.id,
        name: item.item_name,
        variant_id: firstVariant.id,
        variant_name: firstVariant.variant_name || 'Regular',
        price: firstVariant.selling_price,
        quantity: 1,
        category_id: item.category_id,
        short_description: item.short_description,
        quantity_label: firstVariant.quantity_label
      }]);
    }
    setPaymentStatus(`Added ${item.item_name} to cart`);
  };

  // Remove item from cart
  const removeFromCart = (itemId) => {
    const existingItem = cartItems.find(ci => ci.id === itemId);
    if (existingItem && existingItem.quantity > 1) {
      setCartItems(cartItems.map(ci => 
        ci.id === itemId ? { ...ci, quantity: ci.quantity - 1 } : ci
      ));
    } else {
      setCartItems(cartItems.filter(ci => ci.id !== itemId));
    }
  };

  // Clear cart
  const clearCart = () => {
    setCartItems([]);
    setPaymentStatus('Cart cleared');
  };

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const taxAmount = parseFloat((subtotal * 0.18).toFixed(2));
  const grandTotal = subtotal + taxAmount;

  // Handle payment
  const handlePayment = async () => {
    if (cartItems.length === 0) {
      setPaymentStatus('Please add items to cart');
      return;
    }

    if (!customerName || !customerMobileNumber) {
      setPaymentStatus('Please enter customer name and mobile number');
      return;
    }

    if (orderType === 'dine_in' && !tableNumber) {
      setPaymentStatus('Please enter table number for dine-in');
      return;
    }

    setShowPaymentModal(true);
  };

  // Process payment with selected method
  const processPayment = async () => {
    setLoading(true);
    setPaymentStatus('Processing payment...');
    setShowRetryButton(false);
    setVerificationAttempts(0);
    setPaymentCompleted(false);
    setPaymentConfirmed(false);
    setPhonePeStatus('idle');
    setShowPaymentChannel(false);
    
    try {
      // Save order first
      const { order, payment, merchantTransactionId } = await saveOrderToSupabase();
      
      if (selectedPaymentMethod === 'cash') {
        // Cash payment - mark as success immediately
        await updatePaymentStatus(order.id, payment.id, 'success', `CASH-${Date.now()}`);
        setIsSuccess(true);
        setPaymentCompleted(true);
        setPaymentConfirmed(true);
        setPaymentStatus(`Γ£à Cash payment successful! Invoice #${invoiceData?.invoiceNumber || 'generated'}.`);
        setLoading(false);
        return;
      }

      if (selectedPaymentMethod === 'card') {
        // Card payment simulation
        await new Promise(resolve => setTimeout(resolve, 2000));
        await updatePaymentStatus(order.id, payment.id, 'success', `CARD-${Date.now()}`);
        setIsSuccess(true);
        setPaymentCompleted(true);
        setPaymentConfirmed(true);
        setPaymentStatus(`Γ£à Card payment successful! Invoice #${invoiceData?.invoiceNumber || 'generated'}.`);
        setLoading(false);
        return;
      }

      // PhonePe payment
      if (!paymentConfirmed) {
        const orderItems = cartItems.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          variant: item.variant_name || 'Regular'
        }));

        const totalAmount = grandTotal;

        const payload = {
          mobilenumber: customerMobileNumber,
          customer_name: customerName,
          total_amount: totalAmount,
          order_status: 'PENDING',
          order_items: orderItems,
          order_type: `Online-${branch}`,
          restaurant_id: 1,
          payment_status: 'PENDING',
          order_id: order.id
        };

        const response = await axios.post(`${API_PATH}api/admin/phonepay/order`, payload);

        if (response.status === 200 && response.data.result) {
          await updatePaymentStatus(
            order.id, 
            payment.id, 
            'pending', 
            response.data.result.transactionId || merchantTransactionId
          );

          // Store payment channel URL
          const channelUrl = response.data.result.redirectUrl;
          setPaymentChannelUrl(channelUrl);
          setShowPaymentChannel(true);
          setPhonePeStatus('pending');
          
          setPaymentStatus('≡ƒöä Payment initiated! Click "Open Payment Channel" to complete payment in PhonePe...');
          
          // Store order details
          window.localStorage.setItem("orderdetails", JSON.stringify({
            ...response.data.result,
            order_id: order.id,
            payment_id: payment.id
          }));
          
          // Start polling for payment status
          let pollCount = 0;
          const maxPolls = 30;
          
          stopPolling();
          
          pollIntervalRef.current = setInterval(async () => {
            pollCount++;
            setVerificationAttempts(pollCount);
            
            console.log(`Polling attempt ${pollCount}/${maxPolls}`);
            
            if (pollCount > maxPolls) {
              stopPolling();
              setVerifyingPayment(false);
              setLoading(false);
              setPaymentStatus('ΓÅ│ Payment verification timed out. Please check status manually.');
              setShowRetryButton(true);
              return;
            }

            // Check database first
            const dbStatus = await checkPaymentStatusFromDB(order.id);
            if (dbStatus && dbStatus.payment_status === 'paid') {
              if (!invoiceData) {
                await generateAndSaveInvoice(order.id);
              }
              setPaymentConfirmed(true);
              setIsSuccess(true);
              setPaymentCompleted(true);
              setVerifyingPayment(false);
              setLoading(false);
              setPhonePeStatus('success');
              setShowPaymentChannel(false);
              stopPolling();
              setPaymentStatus(`Γ£à Payment confirmed! Invoice #${invoiceData?.invoiceNumber || 'generated'}.`);
              
              if (phonePeWindow && !phonePeWindow.closed) {
                phonePeWindow.close();
                setPhonePeWindow(null);
              }
              return;
            }

            // If not in database, try API verification
            try {
              const verificationResult = await verifyPhonePePayment(order.id);
              if (verificationResult.success) {
                stopPolling();
                setPaymentConfirmed(true);
                setIsSuccess(true);
                setLoading(false);
                setVerifyingPayment(false);
                setPaymentCompleted(true);
                setPhonePeStatus('success');
                setShowPaymentChannel(false);
                setPaymentStatus(`Γ£à Payment confirmed! Invoice #${invoiceData?.invoiceNumber || 'generated'}.`);
                
                if (phonePeWindow && !phonePeWindow.closed) {
                  phonePeWindow.close();
                  setPhonePeWindow(null);
                }
                return;
              } else if (verificationResult.status === 'failed') {
                stopPolling();
                setVerifyingPayment(false);
                setLoading(false);
                setPhonePeStatus('failed');
                setShowRetryButton(true);
                return;
              }
            } catch (error) {
              console.error('Verification error:', error);
            }
          }, 10000);

          // Set a fallback timeout - 5 minutes max wait
          timeoutRef.current = setTimeout(() => {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            if (!isSuccess && loading) {
              setVerifyingPayment(false);
              setLoading(false);
              setPaymentStatus('ΓÅ│ Payment is taking longer than expected. Please check your PhonePe app.');
              setShowRetryButton(true);
            }
          }, 300000);

          setLoading(false);

        } else {
          await updatePaymentStatus(order.id, payment.id, 'failed', merchantTransactionId);
          setPaymentStatus('Payment initiation failed. Please try again.');
          setLoading(false);
        }
      }

    } catch (error) {
      console.error('Payment error:', error);
      setPaymentStatus('Payment failed. Please try again. Error: ' + (error.response?.data?.message || error.message));
      setLoading(false);
      setShowRetryButton(true);
    }
  };

  // Manual retry verification
  const handleRetryVerification = async () => {
    if (!currentOrderId) {
      setPaymentStatus('No order to verify');
      return;
    }
    
    setShowRetryButton(false);
    setVerifyingPayment(true);
    setPaymentStatus('Checking payment status...');
    
    // Check database first
    const dbStatus = await checkPaymentStatusFromDB(currentOrderId);
    if (dbStatus && dbStatus.payment_status === 'paid') {
      if (!invoiceData) {
        await generateAndSaveInvoice(currentOrderId);
      }
      setPaymentConfirmed(true);
      setIsSuccess(true);
      setPaymentCompleted(true);
      setVerifyingPayment(false);
      setPhonePeStatus('success');
      setShowPaymentChannel(false);
      setPaymentStatus(`Γ£à Payment confirmed! Invoice #${invoiceData?.invoiceNumber || 'generated'}.`);
      return;
    }
    
    const result = await verifyPhonePePayment(currentOrderId, true);
    
    if (result.success) {
      setPaymentConfirmed(true);
      setIsSuccess(true);
      setPaymentCompleted(true);
      setVerifyingPayment(false);
      setPhonePeStatus('success');
      setShowPaymentChannel(false);
      setPaymentStatus(`Γ£à Payment confirmed! Invoice #${invoiceData?.invoiceNumber || 'generated'}.`);
    } else if (result.status === 'failed') {
      setVerifyingPayment(false);
      setPhonePeStatus('failed');
      setPaymentStatus('Γ¥î Payment failed. Please try again.');
      setShowRetryButton(true);
    } else {
      setVerifyingPayment(false);
      setPhonePeStatus('pending');
      setPaymentStatus('ΓÅ│ Payment still pending. Try manual confirmation if payment was completed.');
      setShowRetryButton(true);
    }
  };

  const handleReset = () => {
    stopPolling();
    
    if (phonePeWindow && !phonePeWindow.closed) {
      phonePeWindow.close();
      setPhonePeWindow(null);
    }
    
    setCustomerMobileNumber('9876543210');
    setCustomerName('Rahul Sharma');
    if (outlets.length > 0) {
      setOutletId(outlets[0].id);
      setBranch(outlets[0].outlet_name || outlets[0].city || 'Default Branch');
    }
    setTableNumber('');
    setSpecialInstructions('');
    setOrderType('dine_in');
    setIsWalkIn(true);
    setSelectedPaymentMethod('phonepe');
    setShowPaymentModal(false);
    setIsSuccess(false);
    setInvoiceData(null);
    setCurrentOrderId(null);
    setVerifyingPayment(false);
    setVerificationAttempts(0);
    setShowRetryButton(false);
    setLoading(false);
    setPaymentCompleted(false);
    setPaymentConfirmed(false);
    setPhonePeStatus('idle');
    setShowPaymentChannel(false);
    setPaymentChannelUrl(null);
    
    if (menuItems.length > 0) {
      const demoItems = menuItems.slice(0, Math.min(3, menuItems.length))
        .map(item => {
          const firstVariant = item.variants[0];
          return {
            id: item.id,
            name: item.item_name,
            variant_id: firstVariant.id,
            variant_name: firstVariant.variant_name || 'Regular',
            price: firstVariant.selling_price,
            quantity: 1,
            category_id: item.category_id,
            short_description: item.short_description,
            quantity_label: firstVariant.quantity_label
          };
        });
      setCartItems(demoItems);
    } else {
      setCartItems([]);
    }
    setPaymentStatus('Reset to default');
  };

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"
          />
          <h2 className="text-2xl font-semibold text-gray-700">Loading Menu...</h2>
          <p className="text-gray-500 mt-2">Please wait while we prepare your menu</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100 }}
        className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg sticky top-0 z-40"
      >
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Utensils className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">POS System</h1>
                <p className="text-sm opacity-90">{branch}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-white/20 px-4 py-2 rounded-full flex items-center gap-2">
                <Coffee className="w-4 h-4" />
                <span className="text-sm font-medium">{cartItems.length} items</span>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleReset}
                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full text-sm font-medium transition"
              >
                Reset
              </motion.button>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Menu */}
          <div className="lg:col-span-2">
            {/* Outlet Selector */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-md p-4 mb-6"
            >
              <div className="flex items-center gap-4 flex-wrap">
                <label className="font-semibold text-gray-700">≡ƒôì Outlet:</label>
                <select 
                  value={outletId} 
                  onChange={(e) => {
                    setOutletId(e.target.value);
                    const selectedOutlet = outlets.find(o => o.id === e.target.value);
                    if (selectedOutlet) {
                      setBranch(selectedOutlet.outlet_name || selectedOutlet.city || 'Selected Branch');
                    }
                  }}
                  className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {outlets.map(outlet => (
                    <option key={outlet.id} value={outlet.id}>
                      {outlet.outlet_name} {outlet.city ? `- ${outlet.city}` : ''}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Tag className="w-4 h-4" />
                  <span>{menuItems.length} items</span>
                </div>
              </div>
            </motion.div>

            {/* Customer Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl shadow-md p-4 mb-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Customer Name *"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    placeholder="Mobile Number *"
                    value={customerMobileNumber}
                    onChange={(e) => setCustomerMobileNumber(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <select
                    value={orderType}
                    onChange={(e) => setOrderType(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="dine_in">≡ƒì╜∩╕Å Dine In</option>
                    <option value="pickup">≡ƒôª Takeaway</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {orderType === 'dine_in' && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Table Number *"
                      value={tableNumber}
                      onChange={(e) => setTableNumber(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Menu className="w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Special Instructions"
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </motion.div>

            {/* Menu Items */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {menuItems.length === 0 ? (
                <div className="bg-white rounded-xl shadow-md p-12 text-center">
                  <Utensils className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-xl font-semibold text-gray-600">No menu items available</p>
                  <p className="text-gray-400">Try selecting a different outlet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {categories.map((category, idx) => {
                    const categoryItems = menuItems.filter(item => 
                      item.category_id === category.id && 
                      item.is_available !== false
                    );
                    if (categoryItems.length === 0) return null;
                    
                    return (
                      <motion.div
                        key={category.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="bg-white rounded-xl shadow-md overflow-hidden"
                      >
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b">
                          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                            <Utensils className="w-4 h-4" />
                            {category.category_name}
                            <span className="text-sm font-normal text-gray-500 ml-2">
                              ({categoryItems.length} items)
                            </span>
                          </h3>
                        </div>
                        <div className="p-4 space-y-3">
                          {categoryItems.map((item) => {
                            const hasVariants = item.variants && item.variants.length > 0;
                            const hasValidVariant = hasVariants && item.variants.some(v => v.is_available !== false && v.selling_price > 0);
                            const isDisabled = !hasValidVariant;
                            
                            return (
                              <motion.div
                                key={item.id}
                                whileHover={{ scale: 1.02 }}
                                className={`flex items-center justify-between p-3 rounded-lg transition border ${
                                  isDisabled ? 'bg-gray-50 border-gray-200 opacity-60' : 'hover:bg-gray-50 border-gray-100'
                                }`}
                              >
                                <div className="flex-1">
                                  <div className="font-medium text-gray-800">{item.item_name}</div>
                                  {item.short_description && (
                                    <div className="text-sm text-gray-500">{item.short_description}</div>
                                  )}
                                  <div className="text-xs text-gray-400 mt-1 flex flex-wrap gap-2">
                                    {item.variants?.map((v) => (
                                      <span key={v.id} className={`px-2 py-1 rounded ${
                                        v.is_available !== false && v.selling_price > 0 
                                          ? 'bg-gray-100' 
                                          : 'bg-red-50 text-gray-400 line-through'
                                      }`}>
                                        {v.variant_name}: Γé╣{v.selling_price}
                                      </span>
                                    ))}
                                  </div>
                                  {isDisabled && (
                                    <div className="text-xs text-red-500 mt-1">ΓÜá∩╕Å No available variants</div>
                                  )}
                                </div>
                                <motion.button
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => !isDisabled && addToCart(item)}
                                  disabled={isDisabled}
                                  className={`ml-4 p-2 rounded-full transition ${
                                    isDisabled
                                      ? 'bg-gray-300 cursor-not-allowed'
                                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
                                  }`}
                                >
                                  <Plus className="w-5 h-5" />
                                </motion.button>
                              </motion.div>
                            );
                          })}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </div>

          {/* Right Column - Cart */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:sticky lg:top-24 self-start"
          >
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-4 py-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    Cart
                  </h3>
                  <motion.span
                    animate={cartAnimation ? { scale: 1.3 } : { scale: 1 }}
                    className="bg-white/20 px-3 py-1 rounded-full text-sm"
                  >
                    {cartItems.length} items
                  </motion.span>
                </div>
              </div>

              <div className="p-4">
                <div className="max-h-[400px] overflow-y-auto space-y-2">
                  {cartItems.length === 0 ? (
                    <div className="text-center py-8">
                      <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500">Your cart is empty</p>
                      <p className="text-sm text-gray-400">Add items from the menu</p>
                    </div>
                  ) : (
                    <AnimatePresence>
                      {cartItems.map((item, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-sm">{item.name}</div>
                            <div className="text-xs text-gray-500">
                              {item.variant_name} ├ù {item.quantity}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-indigo-600 text-sm">
                              Γé╣{(item.price * item.quantity).toFixed(2)}
                            </span>
                            <motion.button
                              whileTap={{ scale: 0.9 }}
                              onClick={() => removeFromCart(item.id)}
                              className="w-7 h-7 rounded-full bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center transition"
                            >
                              <Minus className="w-3 h-3" />
                            </motion.button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                </div>

                <div className="border-t mt-4 pt-4 space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Subtotal</span>
                    <span>Γé╣{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Tax (18%)</span>
                    <span>Γé╣{taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>Total</span>
                    <span className="text-indigo-600">Γé╣{grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handlePayment}
                    disabled={loading || cartItems.length === 0 || paymentCompleted}
                    className={`w-full py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
                      loading || cartItems.length === 0 || paymentCompleted
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-md hover:shadow-lg'
                    }`}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing...
                      </>
                    ) : paymentCompleted ? (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Paid
                      </>
                    ) : (
                      <>
                        <IndianRupee className="w-5 h-5" />
                        Pay Γé╣{grandTotal.toFixed(2)}
                      </>
                    )}
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={clearCart}
                    disabled={cartItems.length === 0 || paymentCompleted}
                    className={`w-full py-2 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                      cartItems.length === 0 || paymentCompleted
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-red-50 hover:bg-red-100 text-red-600'
                    }`}
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear Cart
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Payment Modal */}
        <AnimatePresence>
          {showPaymentModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => !loading && !verifyingPayment && setShowPaymentModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                {isSuccess ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-center py-8"
                  >
                    <motion.div
                      animate={{ 
                        scale: [1, 1.2, 1],
                        rotate: [0, 10, -10, 0]
                      }}
                      transition={{ duration: 0.6 }}
                      className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
                    >
                      <CheckCircle className="w-12 h-12 text-green-600" />
                    </motion.div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">Payment Successful!</h3>
                    <p className="text-gray-600">Your order has been confirmed</p>
                    {invoiceData && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-600 flex items-center justify-center gap-2">
                          <FileText className="w-4 h-4" />
                          Invoice #{invoiceData.invoiceNumber}
                        </p>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-3 justify-center mt-6">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setShowPaymentModal(false);
                          setIsSuccess(false);
                          setCartItems([]);
                          setInvoiceData(null);
                          setCurrentOrderId(null);
                          setPaymentCompleted(false);
                          setPaymentConfirmed(false);
                          setPhonePeStatus('idle');
                          setShowPaymentChannel(false);
                        }}
                        className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition"
                      >
                        Done
                      </motion.button>
                      {invoiceData && (
                        <>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={printInvoice}
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition flex items-center gap-2"
                          >
                            <Printer className="w-4 h-4" />
                            Print
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={downloadInvoice}
                            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition flex items-center gap-2"
                          >
                            <Download className="w-4 h-4" />
                            Download
                          </motion.button>
                        </>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-gray-800">Select Payment Method</h3>
                      <button
                        onClick={() => !loading && !verifyingPayment && setShowPaymentModal(false)}
                        className="p-2 hover:bg-gray-100 rounded-full transition"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedPaymentMethod('phonepe')}
                        className={`w-full p-4 rounded-xl border-2 transition flex items-center gap-3 ${
                          selectedPaymentMethod === 'phonepe'
                            ? 'border-indigo-600 bg-indigo-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Smartphone className={`w-6 h-6 ${
                          selectedPaymentMethod === 'phonepe' ? 'text-indigo-600' : 'text-gray-400'
                        }`} />
                        <div className="flex-1 text-left">
                          <div className="font-semibold">PhonePe</div>
                          <div className="text-sm text-gray-500">UPI / Wallet</div>
                        </div>
                        {selectedPaymentMethod === 'phonepe' && (
                          <CheckCircle className="w-5 h-5 text-indigo-600" />
                        )}
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedPaymentMethod('card')}
                        className={`w-full p-4 rounded-xl border-2 transition flex items-center gap-3 ${
                          selectedPaymentMethod === 'card'
                            ? 'border-indigo-600 bg-indigo-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <CreditCard className={`w-6 h-6 ${
                          selectedPaymentMethod === 'card' ? 'text-indigo-600' : 'text-gray-400'
                        }`} />
                        <div className="flex-1 text-left">
                          <div className="font-semibold">Card</div>
                          <div className="text-sm text-gray-500">Credit / Debit Card</div>
                        </div>
                        {selectedPaymentMethod === 'card' && (
                          <CheckCircle className="w-5 h-5 text-indigo-600" />
                        )}
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedPaymentMethod('cash')}
                        className={`w-full p-4 rounded-xl border-2 transition flex items-center gap-3 ${
                          selectedPaymentMethod === 'cash'
                            ? 'border-indigo-600 bg-indigo-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Wallet className={`w-6 h-6 ${
                          selectedPaymentMethod === 'cash' ? 'text-indigo-600' : 'text-gray-400'
                        }`} />
                        <div className="flex-1 text-left">
                          <div className="font-semibold">Cash</div>
                          <div className="text-sm text-gray-500">Pay with cash</div>
                        </div>
                        {selectedPaymentMethod === 'cash' && (
                          <CheckCircle className="w-5 h-5 text-indigo-600" />
                        )}
                      </motion.button>
                    </div>

                    <div className="mt-6 flex items-center justify-between text-sm">
                      <span className="text-gray-500">Total Amount</span>
                      <span className="font-bold text-xl text-indigo-600">Γé╣{grandTotal.toFixed(2)}</span>
                    </div>

                    {/* Payment Channel Button */}
                    {showPaymentChannel && paymentChannelUrl && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-200"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {phonePeStatus === 'pending' && (
                              <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                            )}
                            {phonePeStatus === 'success' && (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            )}
                            {phonePeStatus === 'failed' && (
                              <AlertCircle className="w-4 h-4 text-red-600" />
                            )}
                            <span className="text-sm font-medium text-gray-700">
                              {phonePeStatus === 'pending' && 'Waiting for payment...'}
                              {phonePeStatus === 'success' && 'Payment successful!'}
                              {phonePeStatus === 'failed' && 'Payment failed'}
                              {phonePeStatus === 'idle' && 'Ready to pay'}
                            </span>
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => openPaymentChannel(paymentChannelUrl)}
                            disabled={phonePeStatus === 'success' || phonePeStatus === 'failed'}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition ${
                              phonePeStatus === 'success' || phonePeStatus === 'failed'
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:shadow-lg'
                            }`}
                          >
                            <ExternalLink className="w-4 h-4" />
                            Open Payment Channel
                          </motion.button>
                        </div>
                        {phonePeStatus === 'pending' && (
                          <div className="mt-2 text-xs text-gray-500">
                            <Clock className="w-3 h-3 inline mr-1" />
                            Waiting for payment confirmation...
                          </div>
                        )}
                      </motion.div>
                    )}

                    {showRetryButton && (
                      <div className="mt-3 space-y-2">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleRetryVerification}
                          disabled={verifyingPayment}
                          className="w-full py-2 rounded-lg font-medium transition flex items-center justify-center gap-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border border-yellow-200"
                        >
                          <RefreshCw className={`w-4 h-4 ${verifyingPayment ? 'animate-spin' : ''}`} />
                          {verifyingPayment ? 'Checking...' : 'Check Payment Status'}
                        </motion.button>
                        
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={manuallyConfirmPayment}
                          disabled={verifyingPayment}
                          className="w-full py-2 rounded-lg font-medium transition flex items-center justify-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Confirm Payment (Manual)
                        </motion.button>
                      </div>
                    )}

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={processPayment}
                      disabled={loading || verifyingPayment || paymentConfirmed || (showPaymentChannel && phonePeStatus === 'pending')}
                      className={`w-full mt-4 py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2 ${
                        loading || verifyingPayment || paymentConfirmed || (showPaymentChannel && phonePeStatus === 'pending')
                          ? 'bg-gray-300 cursor-not-allowed'
                          : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl'
                      }`}
                    >
                      {loading || verifyingPayment ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          {verifyingPayment ? `Verifying (${verificationAttempts}/15)...` : 'Processing...'}
                        </>
                      ) : paymentConfirmed ? (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          Payment Confirmed
                        </>
                      ) : showPaymentChannel && phonePeStatus === 'pending' ? (
                        <>
                          <Clock className="w-5 h-5" />
                          Waiting for Payment
                        </>
                      ) : (
                        <>
                          <IndianRupee className="w-5 h-5" />
                          Pay Γé╣{grandTotal.toFixed(2)}
                        </>
                      )}
                    </motion.button>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status Message */}
        <AnimatePresence>
          {paymentStatus && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className={`fixed bottom-4 right-4 max-w-md p-4 rounded-xl shadow-lg flex items-center gap-3 ${
                paymentStatus.toLowerCase().includes('failed') || paymentStatus.toLowerCase().includes('error')
                  ? 'bg-red-50 border border-red-200'
                  : paymentStatus.toLowerCase().includes('success') || paymentStatus.toLowerCase().includes('invoice')
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-blue-50 border border-blue-200'
              }`}
            >
              {paymentStatus.toLowerCase().includes('failed') || paymentStatus.toLowerCase().includes('error') ? (
                <AlertCircle className="w-5 h-5 text-red-600" />
              ) : paymentStatus.toLowerCase().includes('success') || paymentStatus.toLowerCase().includes('invoice') ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              )}
              <span className="text-sm font-medium">{paymentStatus}</span>
            </motion.div>
          )}
        </AnimatePresence>  
      </div>
    </div>
  );
}

export default AdminPaymentTest;

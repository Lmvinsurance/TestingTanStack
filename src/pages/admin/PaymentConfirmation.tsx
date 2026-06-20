import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { supabase } from '@/integrations/supabase/client';
import { AdminPage } from '@/components/admin/AdminShell';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, Eye, RotateCcw, Home, FileText, Printer } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Supabase Edge Function URL
const SUPABASE_EDGE_FUNCTION_URL = 'https://aynfbxixpviadworsbmk.supabase.co/functions/v1/phonepe';
const BUCKET = 'invoices';

function fmt(n: number) {
  return '₹' + Number(n || 0).toLocaleString('en-IN');
}

async function buildPdfBlob(args: any) {
  const { order, items, addons, payments, customer, outlet, invoiceNumber } = args;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  
  doc.setFontSize(20);
  doc.setTextColor(184, 71, 28);
  doc.text('Telugu Food Club', 40, 50);
  
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(outlet?.outlet_name ?? '', 40, 68);
  doc.text(`${outlet?.address ?? ''} ${outlet?.city ?? ''}`, 40, 82);
  doc.text(`Phone: ${outlet?.phone ?? ''}`, 40, 96);
  
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text('TAX INVOICE', 400, 50);
  
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(`Invoice #: ${invoiceNumber}`, 400, 68);
  doc.text(`Date: ${new Date().toLocaleString()}`, 400, 82);
  doc.text(`Order #: ${order.order_number || order.id.slice(0, 8)}`, 400, 96);

  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('Bill To', 40, 125);
  doc.setFontSize(10);
  doc.text(customer?.full_name || customer?.name || 'Guest', 40, 141);
  doc.text(customer?.phone || '', 40, 155);
  if (customer?.email) {
    doc.text(customer?.email || '', 40, 169);
  }

  const addonByItem = new Map();
  (addons || []).forEach((a: any) => {
    const arr = addonByItem.get(a.order_item_id) ?? [];
    arr.push(a); 
    addonByItem.set(a.order_item_id, arr);
  });

  const rows = (items || []).flatMap((it: any) => {
    const base = [
      it.item_name_snapshot + (it.variant_name_snapshot ? ` — ${it.variant_name_snapshot}` : ''),
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
    head: [['Item', 'Qty', 'Rate', 'Total']],
    body: rows,
    styles: { 
      fontSize: 9,
      cellPadding: 4,
    },
    headStyles: { 
      fillColor: [184, 71, 28],
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 40, halign: 'center' },
      2: { cellWidth: 60, halign: 'right' },
      3: { cellWidth: 60, halign: 'right' },
    },
    tableWidth: 'auto',
    margin: { left: 40, right: 40 },
  });

  const endY = (doc as any).lastAutoTable.finalY + 20;
  
  const totalLines = [
    ['Subtotal', fmt(order.subtotal || 0)],
    ['Tax', fmt(order.tax_amount || 0)],
  ];
  
  totalLines.forEach(([label, value], i) => {
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(label, 440, endY + i * 18);
    doc.text(value, 550, endY + i * 18, { align: 'right' });
  });

  const grandY = endY + totalLines.length * 18 + 8;
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('Grand Total', 440, grandY);
  doc.text(fmt(order.grand_total || 0), 550, grandY, { align: 'right' });
  doc.setFont('helvetica', 'normal');

  const paid = (payments || []).find((p: any) => p.payment_status === 'success' || p.payment_status === 'paid');
  if (paid) {
    const paidY = grandY + 24;
    doc.setFontSize(9);
    doc.setTextColor(0, 120, 0);
    const paymentText = `PAID via ${paid.payment_gateway?.toUpperCase() || 'PHONEPE'}${paid.payment_mode ? ' · ' + paid.payment_mode.toUpperCase() : ''}${paid.transaction_id ? '  TXN: ' + paid.transaction_id : ''}`;
    doc.text(paymentText, 40, paidY);
    doc.setTextColor(0, 0, 0);
  }

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Thank you for your business!', 40, 780);
  doc.text('This is a system generated invoice.', 40, 794);

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.rect(20, 20, 555, 790);
  
  return doc.output('blob');
}

export default function PaymentConfirmation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'success' | 'failed' | 'pending'>('pending');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [pollingAttempts, setPollingAttempts] = useState(0);
  const [isPolling, setIsPolling] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [merchantTransactionId, setMerchantTransactionId] = useState<string | null>(null);
  const [phonePeResponse, setPhonePeResponse] = useState<any>(null);

  useEffect(() => {
    const orderIdParam = searchParams.get('orderId');
    if (orderIdParam) {
      setOrderId(orderIdParam);
      checkPhonePeStatus(orderIdParam);
    } else {
      setLoading(false);
      setStatus('failed');
      toast.error('No order ID found');
    }

    return () => {
      // Cleanup any intervals
    };
  }, [searchParams]);

  const checkPhonePeStatus = async (orderId: string) => {
    try {
      setLoading(true);
      
      // FIRST: Check if order already has a successful status
      const { data: existingOrder } = await supabaseAdmin
        .from('orders')
        .select('payment_status, order_status')
        .eq('id', orderId)
        .single();

      // If already paid/successful, skip the API call
      if (existingOrder?.payment_status === 'paid' || existingOrder?.order_status === 'received') {
        console.log('Order already marked as paid/received');
        setStatus('success');
        await fetchOrderDetails(orderId);
        await generateAndSaveInvoice(orderId, null);
        setLoading(false);
        toast.success('Payment already confirmed!');
        return;
      }
      
      // Step 1: Get merchant transaction ID from database
      const { data: payment, error: paymentError } = await supabaseAdmin
        .from('payments')
        .select('merchant_transaction_id, id')
        .eq('order_id', orderId)
        .single();

      if (paymentError || !payment?.merchant_transaction_id) {
        await fetchOrderDetails(orderId);
        setStatus('pending');
        toast.warning('No transaction found. Please check manually.');
        setLoading(false);
        return;
      }

      const merchantId = payment.merchant_transaction_id;
      const paymentId = payment.id;
      setMerchantTransactionId(merchantId);

      // Step 2: Call PhonePe Edge Function to check status
      const response = await axios.post(SUPABASE_EDGE_FUNCTION_URL, {
        action: 'status',
        merchantOrderId: merchantId
      });

      if (response.data) {
        const result = response.data;
        setPhonePeResponse(result);
        
        // Step 3: Save PhonePe response to database
        await savePhonePeResponse(orderId, paymentId, result);
        
        // Step 4: Check if payment is successful
        const isSuccess = 
          result.state === 'COMPLETED' || 
          result.status === 'SUCCESS' ||
          result.paymentState === 'COMPLETED' ||
          result.success === true;

        const isFailed = 
          result.state === 'FAILED' || 
          result.status === 'FAILED' ||
          result.paymentState === 'FAILED' ||
          result.success === false;

        if (isSuccess) {
          // Step 5: Update database with success status
          await updateOrderStatus(orderId, 'success', merchantId, result);
          
          // Step 6: Generate and save invoice
          await generateAndSaveInvoice(orderId, result);
          
          setStatus('success');
          toast.success('Payment confirmed!');
          
          // Step 7: Fetch updated order details
          await fetchOrderDetails(orderId);
          
        } else if (isFailed) {
          await updateOrderStatus(orderId, 'failed', merchantId, result);
          setStatus('failed');
          toast.error('Payment failed');
          await fetchOrderDetails(orderId);
        } else {
          setStatus('pending');
          toast.info('Payment is still processing. Please wait...');
          startPolling(orderId, merchantId, paymentId);
        }
      } else {
        setStatus('pending');
        startPolling(orderId, merchantId, paymentId);
      }
    } catch (error: any) {
      console.error('Error checking PhonePe status:', error);
      
      // Check if order already has a success status
      const { data: order } = await supabaseAdmin
        .from('orders')
        .select('payment_status, order_status')
        .eq('id', orderId)
        .single();

      if (order?.payment_status === 'paid' || order?.order_status === 'received') {
        setStatus('success');
        await generateAndSaveInvoice(orderId, null);
        await fetchOrderDetails(orderId);
      } else if (order?.payment_status === 'failed' || order?.order_status === 'payment_failed') {
        setStatus('failed');
        await fetchOrderDetails(orderId);
      } else {
        setStatus('pending');
        toast.warning('Unable to verify payment status. Please check manually.');
        await fetchOrderDetails(orderId);
      }
    } finally {
      setLoading(false);
    }
  };

  const savePhonePeResponse = async (orderId: string, paymentId: string, phonePeResult: any) => {
    try {
      await supabaseAdmin
        .from('payments')
        .update({
          gateway_response_snapshot: phonePeResult,
          transaction_id: phonePeResult?.paymentDetails?.[0]?.transactionId || phonePeResult?.orderId,
          payment_mode: phonePeResult?.paymentDetails?.[0]?.paymentMode || 'upi',
        })
        .eq('id', paymentId);

      console.log('PhonePe response saved to database');
    } catch (error) {
      console.error('Error saving PhonePe response:', error);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string, merchantId: string, phonePeResult: any) => {
    try {
      const isSuccess = status === 'success';
      
      console.log('Updating order status to:', isSuccess ? 'success' : 'failed');
      
      // Get payment ID
      const { data: payment, error: paymentFetchError } = await supabaseAdmin
        .from('payments')
        .select('id')
        .eq('merchant_transaction_id', merchantId)
        .single();

      if (paymentFetchError) {
        console.error('Error fetching payment:', paymentFetchError);
        throw new Error('Payment record not found');
      }

      // Update payments table
      const { error: paymentUpdateError } = await supabaseAdmin
        .from('payments')
        .update({
          payment_status: isSuccess ? 'success' : 'failed',
          paid_at: isSuccess ? new Date().toISOString() : null,
          gateway_response_snapshot: phonePeResult,
          transaction_id: phonePeResult?.paymentDetails?.[0]?.transactionId || merchantId,
        })
        .eq('merchant_transaction_id', merchantId);

      if (paymentUpdateError) {
        console.error('Error updating payment:', paymentUpdateError);
        throw new Error('Failed to update payment record');
      }

      // ✅ CRITICAL FIX: Update orders table with correct statuses
      const orderUpdateData = {
        payment_status: isSuccess ? 'paid' : 'failed',
        order_status: isSuccess ? 'received' : 'payment_failed',
        last_updated_by: 'system',
        updated_at: new Date().toISOString(),
      };

      console.log('Updating order with:', orderUpdateData);

      const { data: updatedOrder, error: orderUpdateError } = await supabaseAdmin
        .from('orders')
        .update(orderUpdateData)
        .eq('id', orderId)
        .select()
        .single();

      if (orderUpdateError) {
        console.error('Error updating order:', orderUpdateError);
        throw new Error('Failed to update order record');
      }

      console.log('Order updated successfully:', {
        orderId,
        payment_status: orderUpdateData.payment_status,
        order_status: orderUpdateData.order_status,
        updatedOrder
      });

      // ✅ Add status history with all fields
      const { error: historyError } = await supabaseAdmin
        .from('order_status_history')
        .insert({
          order_id: orderId,
          old_status: 'pending_payment',
          new_status: isSuccess ? 'received' : 'payment_failed',
          remarks: isSuccess ? 'Payment confirmed via PhonePe' : 'Payment failed',
          changed_by: 'system',
          changed_by_role: 'system',
          ip_address: null,
          created_at: new Date().toISOString()
        });

      if (historyError) {
        console.error('Error adding status history:', historyError);
        // Don't throw here, as the order update was successful
      }

      toast.success(isSuccess ? 'Payment status updated successfully!' : 'Payment status updated.');
      return updatedOrder;
      
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update payment status: ' + (error as Error).message);
      throw error;
    }
  };

  const generateAndSaveInvoice = async (orderId: string, phonePeResult: any) => {
    try {
      // Check if invoice already exists
      const { data: existingInvoice } = await supabaseAdmin
        .from('invoices')
        .select('*')
        .eq('order_id', orderId)
        .single();

      if (existingInvoice) {
        setInvoiceData(existingInvoice);
        toast.info('Invoice already exists');
        return;
      }

      // Fetch order details for invoice
      const { data: order } = await supabaseAdmin
        .from('orders')
        .select(`
          id, order_number, created_at, subtotal, tax_amount, grand_total, 
          walk_in_customer_name, walk_in_customer_phone, order_type, table_number, 
          customer_notes, outlet_id
        `)
        .eq('id', orderId)
        .single();

      const { data: items } = await supabaseAdmin
        .from('order_items')
        .select('id, item_name_snapshot, variant_name_snapshot, quantity, unit_price_snapshot, total_price')
        .eq('order_id', orderId);

      const { data: payments } = await supabaseAdmin
        .from('payments')
        .select('payment_gateway, payment_mode, payment_status, transaction_id, gateway_response_snapshot')
        .eq('order_id', orderId);

      const { data: outlet } = await supabaseAdmin
        .from('outlets')
        .select('outlet_name, address, city, state, phone, outlet_code')
        .eq('id', order.outlet_id)
        .single();

      const invoiceNumber = `INV-${order.order_number || orderId.slice(0, 8)}-${Date.now().toString().slice(-6)}`;
      const customer = {
        full_name: order.walk_in_customer_name || 'Guest',
        phone: order.walk_in_customer_phone || '',
        email: ''
      };

      // Generate PDF
      const blob = await buildPdfBlob({ 
        order, 
        items: items || [], 
        addons: [], 
        payments: payments || [], 
        customer, 
        outlet, 
        invoiceNumber 
      });
      
      // Upload to S3 (Supabase Storage)
      const path = `${orderId}/${invoiceNumber}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, { 
          contentType: "application/pdf", 
          upsert: true 
        });
      
      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error('Failed to upload invoice to storage');
      }
      
      // Get public URL
      const { data: pubData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(path);

      // Save invoice record to database
      const { data: invoiceRecord, error: invoiceError } = await supabaseAdmin
        .from('invoices')
        .insert({
          order_id: orderId,
          invoice_number: invoiceNumber,
          invoice_url: pubData.publicUrl,
          invoice_amount: Number(order.grand_total),
          tax_amount: Number(order.tax_amount),
          generated_by: 'system',
          is_void: false,
          generated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (invoiceError) {
        console.error('Invoice save error:', invoiceError);
        throw new Error('Failed to save invoice record');
      }

      setInvoiceData(invoiceRecord);
      toast.success('Invoice generated and saved successfully!');

    } catch (error) {
      console.error('Error generating invoice:', error);
      toast.error('Failed to generate invoice: ' + (error as Error).message);
    }
  };

  const fetchOrderDetails = async (orderId: string) => {
    try {
      const { data: order, error } = await supabaseAdmin
        .from('orders')
        .select(`
          *,
          order_items (*),
          payments (*),
          invoices (*)
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;
      setOrderDetails(order);
      
      if (order.invoices && order.invoices.length > 0) {
        setInvoiceData(order.invoices[0]);
      }
      
      return order;
    } catch (error) {
      console.error('Error fetching order details:', error);
      return null;
    }
  };

  const startPolling = (orderId: string, merchantId: string, paymentId: string) => {
    let attempts = 0;
    const maxAttempts = 20;
    setIsPolling(true);

    const interval = setInterval(async () => {
      attempts++;
      setPollingAttempts(attempts);

      try {
        const response = await axios.post(SUPABASE_EDGE_FUNCTION_URL, {
          action: 'status',
          merchantOrderId: merchantId
        });

        if (response.data) {
          const result = response.data;
          setPhonePeResponse(result);
          
          await savePhonePeResponse(orderId, paymentId, result);
          
          const isSuccess = 
            result.state === 'COMPLETED' || 
            result.status === 'SUCCESS' ||
            result.paymentState === 'COMPLETED' ||
            result.success === true;

          const isFailed = 
            result.state === 'FAILED' || 
            result.status === 'FAILED' ||
            result.paymentState === 'FAILED' ||
            result.success === false;

          if (isSuccess) {
            await updateOrderStatus(orderId, 'success', merchantId, result);
            setStatus('success');
            setIsPolling(false);
            await generateAndSaveInvoice(orderId, result);
            await fetchOrderDetails(orderId);
            toast.success('Payment confirmed!');
            clearInterval(interval);
          } else if (isFailed) {
            await updateOrderStatus(orderId, 'failed', merchantId, result);
            setStatus('failed');
            setIsPolling(false);
            await fetchOrderDetails(orderId);
            toast.error('Payment failed');
            clearInterval(interval);
          }
        }

        if (attempts >= maxAttempts) {
          setIsPolling(false);
          toast.warning('Payment still processing. Please check manually.');
          clearInterval(interval);
        }
      } catch (error) {
        console.error('Polling error:', error);
        if (attempts >= maxAttempts) {
          setIsPolling(false);
          clearInterval(interval);
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  };

  const handleViewOrder = () => {
    if (orderId) {
      navigate(`/admin/order-status/${orderId}`);
    }
  };

  const handleRetry = () => {
    navigate('/admin/payment-test');
  };

  const handleGoHome = () => {
    navigate('/admin/dashboard');
  };

  const handlePrintInvoice = () => {
    if (orderId) {
      navigate(`/admin/invoice/${orderId}?format=thermal&print=1`);
    }
  };

  const handleViewInvoice = () => {
    if (invoiceData?.invoice_url) {
      window.open(invoiceData.invoice_url, '_blank');
    }
  };

  const formatCurrency = (amount: number) => {
    return '₹' + Number(amount || 0).toLocaleString('en-IN');
  };

  // Render loading state
  if (loading) {
    return (
      <AdminPage>
        <div className="flex min-h-[60vh] items-center justify-center px-4">
          <div className="w-full max-w-md rounded-2xl border border-gold/20 bg-card p-8 text-center">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-maroon" />
            <h2 className="mt-4 text-xl font-semibold text-maroon">Verifying Payment...</h2>
            <p className="mt-2 text-sm text-muted-foreground">Checking with PhonePe...</p>
            <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-gold/20">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-maroon"></div>
            </div>
          </div>
        </div>
      </AdminPage>
    );
  }

  // Render success state
  if (status === 'success') {
    return (
      <AdminPage>
        <div className="flex min-h-[60vh] items-center justify-center px-4">
          <div className="w-full max-w-md rounded-2xl border border-green-500/30 bg-green-50 p-8 text-center">
            <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
            <h2 className="mt-4 text-2xl font-bold text-green-700">Payment Successful!</h2>
            <p className="mt-2 text-sm text-green-600">Your payment has been confirmed</p>
            
            {orderDetails && (
              <div className="mt-4 rounded-lg bg-white p-4 text-left shadow-sm">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Order #</span>
                  <span className="font-semibold">{orderDetails.order_number || orderDetails.id?.slice(0, 8)}</span>
                </div>
                <div className="mt-1 flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-semibold text-maroon">{formatCurrency(orderDetails.grand_total)}</span>
                </div>
                <div className="mt-1 flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-semibold text-green-600">{orderDetails.order_status}</span>
                </div>
                {orderDetails.walk_in_customer_name && (
                  <div className="mt-1 flex justify-between text-sm">
                    <span className="text-muted-foreground">Customer</span>
                    <span className="font-semibold">{orderDetails.walk_in_customer_name}</span>
                  </div>
                )}
                {orderDetails.payments && orderDetails.payments[0]?.transaction_id && (
                  <div className="mt-1 flex justify-between text-sm">
                    <span className="text-muted-foreground">Transaction ID</span>
                    <span className="font-mono text-xs font-semibold">
                      {orderDetails.payments[0].transaction_id}
                    </span>
                  </div>
                )}
                {invoiceData && (
                  <div className="mt-2 border-t border-green-200 pt-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Invoice</span>
                      <span className="font-semibold text-blue-600">{invoiceData.invoice_number}</span>
                    </div>
                    {invoiceData.invoice_url && (
                      <div className="mt-1 flex justify-between text-xs">
                        <span className="text-muted-foreground">URL</span>
                        <a 
                          href={invoiceData.invoice_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline truncate max-w-[200px]"
                        >
                          {invoiceData.invoice_url}
                        </a>
                      </div>
                    )}
                  </div>
                )}
                {phonePeResponse && (
                  <div className="mt-2 border-t border-green-200 pt-2">
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground">PhonePe Response Details</summary>
                      <pre className="mt-1 max-h-40 overflow-auto rounded bg-gray-50 p-2 text-xs">
                        {JSON.stringify(phonePeResponse, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 space-y-3">
              {invoiceData && (
                <>
                  <Button onClick={handlePrintInvoice} className="w-full bg-maroon text-cream hover:bg-maroon/90">
                    <Printer className="mr-2 h-4 w-4" />
                    Print Invoice
                  </Button>
                  <Button onClick={handleViewInvoice} variant="outline" className="w-full">
                    <FileText className="mr-2 h-4 w-4" />
                    View Invoice
                  </Button>
                </>
              )}
              <Button onClick={handleViewOrder} className="w-full bg-green-600 text-white hover:bg-green-700">
                <Eye className="mr-2 h-4 w-4" />
                View Order Status
              </Button>
              <Button onClick={handleGoHome} variant="outline" className="w-full">
                <Home className="mr-2 h-4 w-4" />
                Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </AdminPage>
    );
  }

  // Render failed state
  if (status === 'failed') {
    return (
      <AdminPage>
        <div className="flex min-h-[60vh] items-center justify-center px-4">
          <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-red-50 p-8 text-center">
            <XCircle className="mx-auto h-16 w-16 text-red-500" />
            <h2 className="mt-4 text-2xl font-bold text-red-700">Payment Failed</h2>
            <p className="mt-2 text-sm text-red-600">Your payment could not be processed</p>
            
            {orderId && orderDetails && (
              <div className="mt-4 rounded-lg bg-white p-4 text-left shadow-sm">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Order #</span>
                  <span className="font-semibold">{orderDetails.order_number || orderId.slice(0, 8)}</span>
                </div>
                <div className="mt-1 flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-semibold text-maroon">{formatCurrency(orderDetails.grand_total)}</span>
                </div>
                {phonePeResponse && (
                  <div className="mt-2 border-t border-red-200 pt-2">
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground">PhonePe Response Details</summary>
                      <pre className="mt-1 max-h-40 overflow-auto rounded bg-gray-50 p-2 text-xs">
                        {JSON.stringify(phonePeResponse, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 space-y-3">
              <Button onClick={handleRetry} className="w-full bg-maroon text-cream hover:bg-maroon/90">
                <RotateCcw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              <Button onClick={handleGoHome} variant="outline" className="w-full">
                <Home className="mr-2 h-4 w-4" />
                Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </AdminPage>
    );
  }

  // Render pending state
  return (
    <AdminPage>
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-amber-50 p-8 text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-amber-500" />
          <h2 className="mt-4 text-xl font-semibold text-amber-700">Payment Processing</h2>
          <p className="mt-2 text-sm text-amber-600">Your payment is being processed</p>
          
          <div className="mt-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Checking status...</span>
              <span className="font-semibold text-amber-600">
                {isPolling ? `${pollingAttempts}/20 attempts` : 'Waiting...'}
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-amber-200">
              <div 
                className="h-full rounded-full bg-amber-500 transition-all duration-300"
                style={{ width: `${isPolling ? (pollingAttempts / 20) * 100 : 0}%` }}
              />
            </div>
          </div>

          {merchantTransactionId && (
            <div className="mt-4 text-xs text-muted-foreground">
              Transaction ID: {merchantTransactionId}
            </div>
          )}

          {orderId && (
            <div className="mt-6 space-y-3">
              <Button onClick={handleViewOrder} variant="outline" className="w-full">
                <Eye className="mr-2 h-4 w-4" />
                Check Order Status
              </Button>
              <Button onClick={handleGoHome} variant="ghost" className="w-full">
                <Home className="mr-2 h-4 w-4" />
                Go to Dashboard
              </Button>
            </div>
          )}
        </div>
      </div>
    </AdminPage>
  );
}
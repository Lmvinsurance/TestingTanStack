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
  
  doc.setFontSize(18); 
  doc.text('Telugu Food Club', 40, 50);
  doc.setFontSize(10); 
  doc.text(outlet?.outlet_name ?? '', 40, 66);
  doc.text(`${outlet?.address ?? ''} ${outlet?.city ?? ''}`, 40, 80);
  doc.text(`Phone: ${outlet?.phone ?? ''}`, 40, 94);
  
  doc.setFontSize(14); 
  doc.text('TAX INVOICE', 400, 50);
  doc.setFontSize(10);
  doc.text(`Invoice #: ${invoiceNumber}`, 400, 66);
  doc.text(`Date: ${new Date().toLocaleString()}`, 400, 80);
  doc.text(`Order #: ${order.order_number || order.id.slice(0, 8)}`, 400, 94);

  doc.setFontSize(11); 
  doc.text('Bill To', 40, 120);
  doc.setFontSize(10);
  doc.text(customer?.full_name || customer?.name || 'Guest', 40, 136);
  doc.text(customer?.phone || '', 40, 150);
  doc.text(customer?.email || '', 40, 164);

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
    styles: { fontSize: 9 },
    headStyles: { fillColor: [184, 71, 28] },
  });

  const endY = (doc as any).lastAutoTable.finalY + 20;
  
  const lines = [
    ['Subtotal', fmt(order.subtotal || 0)],
    ['Tax', fmt(order.tax_amount || 0)],
    ['Grand Total', fmt(order.grand_total || 0)],
  ];
  
  lines.forEach(([k, v], i) => {
    doc.setFontSize(i === lines.length - 1 ? 12 : 10);
    doc.text(k, 380, endY + i * 16);
    doc.text(v, 540, endY + i * 16, { align: 'right' });
  });

  const paid = (payments || []).find((p: any) => p.payment_status === 'success');
  if (paid) {
    doc.setFontSize(10); 
    doc.setTextColor(0, 120, 0);
    doc.text(
      `PAID via ${paid.payment_gateway}${paid.payment_mode ? ' · ' + paid.payment_mode : ''}${paid.transaction_id ? '  TXN ' + paid.transaction_id : ''}`, 
      40, 
      endY + lines.length * 16 + 24
    );
    doc.setTextColor(0, 0, 0);
  }

  doc.setFontSize(9);
  doc.text('Thank you for your business!', 40, 800);
  doc.text('This is a system generated invoice.', 40, 814);
  
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
      verifyPayment(orderIdParam);
    } else {
      setLoading(false);
      setStatus('failed');
      toast.error('No order ID found');
    }

    return () => {
      // Cleanup any intervals
    };
  }, [searchParams]);

  const verifyPayment = async (orderId: string) => {
    try {
      // First check order in database
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

      // Get merchant transaction ID from payments
      if (order.payments && order.payments.length > 0) {
        const payment = order.payments[0];
        setMerchantTransactionId(payment.merchant_transaction_id);
      }

      // Check if already paid
      const isPaid = order.payment_status === 'paid' || 
                     order.payment_status === 'success' ||
                     order.order_status === 'received' ||
                     order.order_status === 'completed';

      const isFailed = order.payment_status === 'failed' || 
                       order.order_status === 'payment_failed';

      if (isPaid) {
        setStatus('success');
        if (order.invoices && order.invoices.length > 0) {
          setInvoiceData(order.invoices[0]);
        } else {
          // Generate invoice if not exists
          await generateInvoice(orderId);
        }
        toast.success('Payment confirmed!');
      } else if (isFailed) {
        setStatus('failed');
        toast.error('Payment failed');
      } else {
        // Call PhonePe Edge Function to check status
        await checkPhonePeStatus(orderId);
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      setStatus('failed');
      toast.error('Failed to verify payment');
    } finally {
      setLoading(false);
    }
  };

  const checkPhonePeStatus = async (orderId: string) => {
    try {
      // Get merchant transaction ID from database
      const { data: payment } = await supabaseAdmin
        .from('payments')
        .select('merchant_transaction_id')
        .eq('order_id', orderId)
        .single();

      if (!payment?.merchant_transaction_id) {
        setStatus('pending');
        toast.warning('No transaction found. Please check manually.');
        return;
      }

      const merchantId = payment.merchant_transaction_id;
      setMerchantTransactionId(merchantId);

      // Call Supabase Edge Function to check status
      const response = await axios.post(SUPABASE_EDGE_FUNCTION_URL, {
        action: 'status',
        merchantOrderId: merchantId
      });

      if (response.data) {
        setPhonePeResponse(response.data);
        const result = response.data;
        
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
          // Update order status in database
          await updateOrderStatus(orderId, 'success', merchantId);
          setStatus('success');
          await generateInvoice(orderId);
          toast.success('Payment confirmed!');
        } else if (isFailed) {
          await updateOrderStatus(orderId, 'failed', merchantId);
          setStatus('failed');
          toast.error('Payment failed');
        } else {
          // Still pending - start polling
          setStatus('pending');
          startPolling(orderId, merchantId);
        }
      } else {
        setStatus('pending');
        startPolling(orderId, merchantId);
      }
    } catch (error: any) {
      console.error('Error checking PhonePe status:', error);
      
      // If Edge Function fails, check database status
      const { data: order } = await supabaseAdmin
        .from('orders')
        .select('payment_status, order_status')
        .eq('id', orderId)
        .single();

      if (order?.payment_status === 'paid' || order?.order_status === 'received') {
        setStatus('success');
        await generateInvoice(orderId);
      } else if (order?.payment_status === 'failed' || order?.order_status === 'payment_failed') {
        setStatus('failed');
      } else {
        setStatus('pending');
        toast.warning('Unable to verify payment status. Please check manually.');
      }
    }
  };

  const updateOrderStatus = async (orderId: string, status: string, merchantId: string) => {
    try {
      const isSuccess = status === 'success';
      
      // Update payments table
      await supabaseAdmin
        .from('payments')
        .update({
          payment_status: isSuccess ? 'success' : 'failed',
          paid_at: isSuccess ? new Date().toISOString() : null,
        })
        .eq('merchant_transaction_id', merchantId);

      // Update orders table
      await supabaseAdmin
        .from('orders')
        .update({
          payment_status: isSuccess ? 'paid' : 'failed',
          order_status: isSuccess ? 'received' : 'payment_failed',
        })
        .eq('id', orderId);

      // Add status history
      await supabaseAdmin
        .from('order_status_history')
        .insert({
          order_id: orderId,
          old_status: 'pending_payment',
          new_status: isSuccess ? 'received' : 'payment_failed',
          remarks: isSuccess ? 'Payment confirmed via PhonePe' : 'Payment failed',
          changed_by: 'system',
          changed_by_role: 'system',
        });

      // Refresh order details
      const { data: updatedOrder } = await supabaseAdmin
        .from('orders')
        .select(`
          *,
          order_items (*),
          payments (*),
          invoices (*)
        `)
        .eq('id', orderId)
        .single();

      if (updatedOrder) {
        setOrderDetails(updatedOrder);
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const generateInvoice = async (orderId: string) => {
    try {
      // Check if invoice already exists
      const { data: existingInvoice } = await supabaseAdmin
        .from('invoices')
        .select('*')
        .eq('order_id', orderId)
        .single();

      if (existingInvoice) {
        setInvoiceData(existingInvoice);
        return;
      }

      // Fetch order details for invoice
      const { data: order } = await supabaseAdmin
        .from('orders')
        .select(`
          id, order_number, created_at, subtotal, tax_amount, grand_total, 
          walk_in_customer_name, walk_in_customer_phone, order_type, table_number, customer_notes
        `)
        .eq('id', orderId)
        .single();

      const { data: items } = await supabaseAdmin
        .from('order_items')
        .select('id, item_name_snapshot, variant_name_snapshot, quantity, unit_price_snapshot, total_price')
        .eq('order_id', orderId);

      const { data: payments } = await supabaseAdmin
        .from('payments')
        .select('payment_gateway, payment_mode, payment_status, transaction_id')
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

      const blob = await buildPdfBlob({ 
        order, 
        items: items || [], 
        addons: [], 
        payments: payments || [], 
        customer, 
        outlet, 
        invoiceNumber 
      });
      
      const path = `${orderId}/${invoiceNumber}.pdf`;
      await supabase.storage.from(BUCKET).upload(path, blob, { 
        contentType: "application/pdf", 
        upsert: true 
      });
      
      const { data: pubData } = supabase.storage.from(BUCKET).getPublicUrl(path);

      const { data: invoiceRecord } = await supabaseAdmin
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

      setInvoiceData(invoiceRecord);
      toast.success('Invoice generated successfully!');

      // Refresh order details with invoice
      const { data: updatedOrder } = await supabaseAdmin
        .from('orders')
        .select(`
          *,
          order_items (*),
          payments (*),
          invoices (*)
        `)
        .eq('id', orderId)
        .single();

      if (updatedOrder) {
        setOrderDetails(updatedOrder);
      }
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast.error('Failed to generate invoice');
    }
  };

  const startPolling = (orderId: string, merchantId: string) => {
    let attempts = 0;
    const maxAttempts = 20;
    setIsPolling(true);

    const interval = setInterval(async () => {
      attempts++;
      setPollingAttempts(attempts);

      try {
        // Check database first
        const { data: order } = await supabaseAdmin
          .from('orders')
          .select('payment_status, order_status')
          .eq('id', orderId)
          .single();

        if (order?.payment_status === 'paid' || order?.order_status === 'received') {
          setStatus('success');
          setIsPolling(false);
          await generateInvoice(orderId);
          toast.success('Payment confirmed!');
          clearInterval(interval);
          return;
        }

        if (order?.payment_status === 'failed' || order?.order_status === 'payment_failed') {
          setStatus('failed');
          setIsPolling(false);
          toast.error('Payment failed');
          clearInterval(interval);
          return;
        }

        // Call Edge Function for status
        const response = await axios.post(SUPABASE_EDGE_FUNCTION_URL, {
          action: 'status',
          merchantOrderId: merchantId
        });

        if (response.data) {
          setPhonePeResponse(response.data);
          const result = response.data;
          
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
            await updateOrderStatus(orderId, 'success', merchantId);
            setStatus('success');
            setIsPolling(false);
            await generateInvoice(orderId);
            toast.success('Payment confirmed!');
            clearInterval(interval);
          } else if (isFailed) {
            await updateOrderStatus(orderId, 'failed', merchantId);
            setStatus('failed');
            setIsPolling(false);
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
            <p className="mt-2 text-sm text-muted-foreground">Please wait while we confirm your payment</p>
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
                {orderDetails.walk_in_customer_name && (
                  <div className="mt-1 flex justify-between text-sm">
                    <span className="text-muted-foreground">Customer</span>
                    <span className="font-semibold">{orderDetails.walk_in_customer_name}</span>
                  </div>
                )}
                {invoiceData && (
                  <div className="mt-2 border-t border-green-200 pt-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Invoice</span>
                      <span className="font-semibold text-blue-600">{invoiceData.invoice_number}</span>
                    </div>
                  </div>
                )}
                {phonePeResponse && (
                  <div className="mt-2 border-t border-green-200 pt-2">
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground">PhonePe Response Details</summary>
                      <pre className="mt-1 overflow-auto rounded bg-gray-50 p-2 text-xs">
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
                      <pre className="mt-1 overflow-auto rounded bg-gray-50 p-2 text-xs">
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
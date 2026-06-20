import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { AdminPage } from '@/components/admin/AdminShell';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, Eye, RotateCcw, Home } from 'lucide-react';

export default function PaymentConfirmation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'success' | 'failed' | 'pending'>('pending');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [pollingAttempts, setPollingAttempts] = useState(0);

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

    // Cleanup function
    return () => {
      // Clear any intervals if component unmounts
    };
  }, [searchParams]);

  const verifyPayment = async (orderId: string) => {
    try {
      // Check order status in database
      const { data: order, error } = await supabaseAdmin
        .from('orders')
        .select(`
          id,
          order_number,
          order_status,
          payment_status,
          grand_total,
          subtotal,
          tax_amount,
          walk_in_customer_name,
          walk_in_customer_phone,
          table_number,
          created_at,
          order_items (
            id,
            item_name_snapshot,
            variant_name_snapshot,
            quantity,
            unit_price_snapshot,
            total_price
          ),
          payments (
            id,
            payment_gateway,
            payment_mode,
            payment_status,
            transaction_id,
            amount
          ),
          invoices (
            id,
            invoice_number,
            invoice_url,
            invoice_amount
          )
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;

      setOrderDetails(order);

      if (order.payment_status === 'paid') {
        setStatus('success');
        toast.success('Payment confirmed!');
        generateInvoice(orderId);
      } else if (order.payment_status === 'failed') {
        setStatus('failed');
        toast.error('Payment failed');
      } else {
        setStatus('pending');
        // Start polling for status
        pollPaymentStatus(orderId);
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      setStatus('failed');
      toast.error('Failed to verify payment');
    } finally {
      setLoading(false);
    }
  };

  const generateInvoice = async (orderId: string) => {
    try {
      // Check if invoice already exists
      const { data: existingInvoice } = await supabaseAdmin
        .from('invoices')
        .select('id, invoice_number, invoice_url')
        .eq('order_id', orderId)
        .single();

      if (existingInvoice) {
        setOrderDetails((prev: any) => ({
          ...prev,
          invoices: [existingInvoice]
        }));
        return;
      }

      // Call your invoice generation function
      // This should be imported from your admin-payment-test file
      // For now, we'll just fetch the updated order details
      const { data: updatedOrder } = await supabaseAdmin
        .from('orders')
        .select(`
          *,
          invoices (*)
        `)
        .eq('id', orderId)
        .single();

      if (updatedOrder) {
        setOrderDetails(updatedOrder);
      }
    } catch (error) {
      console.error('Error generating invoice:', error);
    }
  };

  const pollPaymentStatus = async (orderId: string) => {
    let attempts = 0;
    const maxAttempts = 20; // 20 * 3 seconds = 60 seconds max

    const interval = setInterval(async () => {
      attempts++;
      setPollingAttempts(attempts);

      try {
        const { data: order, error } = await supabaseAdmin
          .from('orders')
          .select('payment_status, order_status, grand_total, subtotal')
          .eq('id', orderId)
          .single();

        if (error) throw error;

        if (order.payment_status === 'paid') {
          setStatus('success');
          setOrderDetails((prev: any) => ({ ...prev, ...order }));
          toast.success('Payment confirmed!');
          
          // Fetch full order details
          const { data: fullOrder } = await supabaseAdmin
            .from('orders')
            .select(`
              *,
              order_items (*),
              payments (*),
              invoices (*)
            `)
            .eq('id', orderId)
            .single();
          
          if (fullOrder) {
            setOrderDetails(fullOrder);
          }
          
          clearInterval(interval);
        } else if (order.payment_status === 'failed') {
          setStatus('failed');
          toast.error('Payment failed');
          clearInterval(interval);
        } else if (attempts >= maxAttempts) {
          setStatus('pending');
          toast.warning('Payment still processing. Please check order status manually.');
          clearInterval(interval);
        }
      } catch (error) {
        console.error('Error polling payment status:', error);
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          toast.error('Could not verify payment status. Please check manually.');
        }
      }
    }, 3000);

    // Cleanup interval on component unmount
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
                {orderDetails.invoices && orderDetails.invoices.length > 0 && (
                  <div className="mt-2 border-t border-green-200 pt-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Invoice</span>
                      <a 
                        href={orderDetails.invoices[0].invoice_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-semibold text-blue-600 hover:underline"
                      >
                        {orderDetails.invoices[0].invoice_number}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 space-y-3">
              <Button 
                onClick={handleViewOrder} 
                className="w-full bg-green-600 text-white hover:bg-green-700"
              >
                <Eye className="mr-2 h-4 w-4" />
                View Order Status
              </Button>
              <Button 
                onClick={handleGoHome} 
                variant="outline" 
                className="w-full"
              >
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
            
            {orderId && (
              <div className="mt-4 rounded-lg bg-white p-4 text-left shadow-sm">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Order #</span>
                  <span className="font-semibold">{orderDetails?.order_number || orderId.slice(0, 8)}</span>
                </div>
                {orderDetails?.grand_total && (
                  <div className="mt-1 flex justify-between text-sm">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-semibold text-maroon">{formatCurrency(orderDetails.grand_total)}</span>
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
              <span className="font-semibold text-amber-600">{pollingAttempts}/20 attempts</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-amber-200">
              <div 
                className="h-full rounded-full bg-amber-500 transition-all duration-300"
                style={{ width: `${(pollingAttempts / 20) * 100}%` }}
              ></div>
            </div>
          </div>

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
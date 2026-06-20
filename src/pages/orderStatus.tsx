import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle2, XCircle, Loader2, Home } from 'lucide-react';
import { supabaseAdmin } from '@/integrations/supabase/client.server';

export default function OrderStatusPage() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id') || searchParams.get('order_number') || searchParams.get('transactionId') || searchParams.get('merchantOrderId');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'failed' | 'idle'>('idle');
  const [message, setMessage] = useState('');
  const [orderData, setOrderData] = useState<any>(null);

  useEffect(() => {
    if (!id) {
      setStatus('failed');
      setMessage('No Order ID provided in the URL. Please provide ?id=YOUR_ORDER_ID');
      return;
    }

    const checkPhonePeStatus = async () => {
      setStatus('loading');
      try {
        // Find the actual merchant transaction ID if a Supabase order number was passed
        let merchantTxnId = id;
        
        try {
          const { data: orderQuery } = await supabaseAdmin
            .from("orders")
            .select("id, order_number")
            .eq("order_number", id)
            .single();
            
          if (orderQuery) {
            setOrderData(orderQuery);
            const { data: paymentQuery } = await supabaseAdmin
              .from("payments")
              .select("merchant_transaction_id")
              .eq("order_id", orderQuery.id)
              .single();
              
            if (paymentQuery && paymentQuery.merchant_transaction_id) {
              merchantTxnId = paymentQuery.merchant_transaction_id;
            }
          }
        } catch (dbErr) {
          console.error("DB lookup skipped or failed", dbErr);
        }

        // Call the PhonePe API endpoint directly as requested
        const response = await axios.get(`https://api.phonepe.com/apis/pg/checkout/v2/order/${merchantTxnId}/status`);
        const resData = response.data;
        
        console.log("PhonePe Status Response:", resData);

        // PhonePe responses vary, so we check for common success indicators
        const isSuccess = 
          resData?.success === true || 
          resData?.state === 'COMPLETED' || 
          resData?.paymentStatus === 'success' || 
          resData?.code === 'PAYMENT_SUCCESS';

        if (isSuccess) {
          setStatus('success');
          setMessage(`Payment Successful for Order ${id}`);
          
          // Optionally update the DB status to paid if we found the order
          if (orderData?.id) {
            await supabaseAdmin.from("orders").update({
              payment_status: 'paid',
              order_status: 'received'
            }).eq("id", orderData.id);
          }
        } else {
          setStatus('failed');
          setMessage(`Payment Failed or Pending (State: ${resData?.state || resData?.code || 'UNKNOWN'})`);
        }
      } catch (error: any) {
        console.error('PhonePe API Error:', error);
        setStatus('failed');
        setMessage('Failed to fetch status from PhonePe: ' + (error.response?.data?.message || error.message));
      }
    };
    
    checkPhonePeStatus();
  }, [id, orderData?.id]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream p-4">
      <div className="bg-card border border-gold/20 p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
        {status === 'loading' && (
          <div className="space-y-4">
            <Loader2 className="mx-auto h-16 w-16 animate-spin text-saffron-deep" />
            <h2 className="text-2xl font-display text-maroon">Checking Payment Status...</h2>
            <p className="text-sm text-maroon-deep/70">Please wait while we verify order {id}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-6 animate-in zoom-in duration-500">
            <div className="mx-auto w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-14 w-14 text-green-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-display text-green-700">Payment Successful!</h2>
              <p className="text-sm font-medium text-maroon-deep/80">{message}</p>
              <img src="/success-payment.png" alt="Success" className="mx-auto mt-4 max-h-32 object-contain hidden" /> 
            </div>
            <Link to="/admin/payment-test" className="mt-8 flex items-center justify-center gap-2 w-full rounded-xl bg-saffron px-4 py-3 font-semibold text-cream hover:bg-saffron-deep transition-colors">
              <Home className="h-4 w-4" /> Return to Payment Test
            </Link>
          </div>
        )}

        {status === 'failed' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="mx-auto w-24 h-24 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="h-14 w-14 text-red-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-display text-red-700">Payment Failed</h2>
              <p className="text-sm font-medium text-maroon-deep/80">{message}</p>
            </div>
            <Link to="/admin/payment-test" className="mt-8 flex items-center justify-center gap-2 w-full rounded-xl border border-gold/40 text-maroon bg-cream px-4 py-3 font-semibold hover:bg-gold/10 transition-colors">
              Try Again
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

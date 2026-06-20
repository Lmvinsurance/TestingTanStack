import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { AdminPage, AdminHeader } from '@/components/admin/AdminShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Package, 
  Truck, 
  CheckCheck,
  Printer,
  FileText,
  ArrowLeft,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

// Status metadata (simplified version)
const ORDER_STATUS_META: Record<string, { label: string; tone: string }> = {
  pending_payment: { label: 'Pending Payment', tone: 'amber' },
  payment_failed: { label: 'Payment Failed', tone: 'red' },
  received: { label: 'Received', tone: 'saffron' },
  preparing: { label: 'Preparing', tone: 'amber' },
  ready: { label: 'Ready', tone: 'blue' },
  out_for_delivery: { label: 'Out for Delivery', tone: 'indigo' },
  completed: { label: 'Completed', tone: 'emerald' },
  cancelled: { label: 'Cancelled', tone: 'slate' },
  refunded: { label: 'Refunded', tone: 'maroon' },
};

const PAYMENT_STATUS_META: Record<string, { label: string; tone: string }> = {
  pending: { label: 'Pending', tone: 'amber' },
  paid: { label: 'Paid', tone: 'emerald' },
  failed: { label: 'Failed', tone: 'red' },
  refunded: { label: 'Refunded', tone: 'maroon' },
  partially_refunded: { label: 'Partially Refunded', tone: 'indigo' },
};

export default function AdminOrderStatus() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails(orderId);
    }
  }, [orderId]);

  const fetchOrderDetails = async (id: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabaseAdmin
        .from('orders')
        .select(`
          *,
          order_items (*),
          payments (*),
          invoices (*),
          outlet:outlets (outlet_name, address, city, phone)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setOrder(data);
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Failed to fetch order details');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (orderId) {
      setRefreshing(true);
      await fetchOrderDetails(orderId);
      setRefreshing(false);
      toast.success('Order status refreshed');
    }
  };

  const handlePrintInvoice = () => {
    if (orderId) {
      navigate(`/admin/invoice/${orderId}?format=thermal&print=1`);
    }
  };

  const handleViewInvoice = () => {
    if (order?.invoices && order.invoices.length > 0) {
      window.open(order.invoices[0].invoice_url, '_blank');
    } else {
      toast.info('No invoice generated yet');
    }
  };

  const getStatusBadge = (status: string) => {
    const meta = ORDER_STATUS_META[status];
    if (!meta) return <Badge variant="outline">{status}</Badge>;

    const colorMap: Record<string, string> = {
      amber: 'bg-amber-100 text-amber-800 border-amber-200',
      red: 'bg-red-100 text-red-800 border-red-200',
      saffron: 'bg-orange-100 text-orange-800 border-orange-200',
      blue: 'bg-blue-100 text-blue-800 border-blue-200',
      indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      emerald: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      slate: 'bg-slate-100 text-slate-800 border-slate-200',
      maroon: 'bg-red-900 text-white border-red-900',
    };

    return (
      <Badge className={`${colorMap[meta.tone] || 'bg-gray-100'} px-3 py-1`}>
        {meta.label}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const meta = PAYMENT_STATUS_META[status];
    if (!meta) return <Badge variant="outline">{status}</Badge>;

    const colorMap: Record<string, string> = {
      amber: 'bg-amber-100 text-amber-800 border-amber-200',
      emerald: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      red: 'bg-red-100 text-red-800 border-red-200',
      maroon: 'bg-red-900 text-white border-red-900',
      indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    };

    return (
      <Badge className={`${colorMap[meta.tone] || 'bg-gray-100'} px-3 py-1`}>
        {meta.label}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return '₹' + Number(amount || 0).toLocaleString('en-IN');
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <AdminPage>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-maroon" />
          <span className="ml-2">Loading order details...</span>
        </div>
      </AdminPage>
    );
  }

  if (!order) {
    return (
      <AdminPage>
        <div className="flex min-h-[60vh] flex-col items-center justify-center">
          <XCircle className="h-12 w-12 text-red-500" />
          <h2 className="mt-4 text-xl font-semibold">Order Not Found</h2>
          <p className="text-muted-foreground">The order you're looking for doesn't exist</p>
          <Button onClick={() => navigate('/admin/orders')} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Orders
          </Button>
        </div>
      </AdminPage>
    );
  }

  return (
    <AdminPage>
      <AdminHeader 
        title={`Order #${order.order_number || order.id.slice(0, 8)}`}
        subtitle={`Status: ${ORDER_STATUS_META[order.order_status]?.label || order.order_status}`}
      />

      <div className="space-y-4 px-4 py-4">
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate('/admin/orders')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Orders
          </Button>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {order.invoices && order.invoices.length > 0 && (
            <>
              <Button onClick={handlePrintInvoice} className="bg-maroon text-cream hover:bg-maroon/90">
                <Printer className="mr-2 h-4 w-4" />
                Print Invoice
              </Button>
              <Button variant="outline" onClick={handleViewInvoice}>
                <FileText className="mr-2 h-4 w-4" />
                View Invoice
              </Button>
            </>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* Order Details Card */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Order Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Status Badges */}
                <div className="flex flex-wrap gap-2">
                  {getStatusBadge(order.order_status)}
                  {getPaymentStatusBadge(order.payment_status)}
                </div>

                {/* Order Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Order Number</p>
                    <p className="font-semibold">{order.order_number || order.id.slice(0, 8)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-semibold">{formatDate(order.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Order Type</p>
                    <p className="font-semibold capitalize">{order.order_type || 'Dine In'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Table Number</p>
                    <p className="font-semibold">{order.table_number || 'N/A'}</p>
                  </div>
                </div>

                {/* Customer Info */}
                {(order.walk_in_customer_name || order.walk_in_customer_phone) && (
                  <div className="border-t pt-4">
                    <p className="text-sm font-semibold">Customer Information</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                      {order.walk_in_customer_name && (
                        <div>
                          <span className="text-muted-foreground">Name: </span>
                          <span className="font-medium">{order.walk_in_customer_name}</span>
                        </div>
                      )}
                      {order.walk_in_customer_phone && (
                        <div>
                          <span className="text-muted-foreground">Phone: </span>
                          <span className="font-medium">{order.walk_in_customer_phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Order Items */}
                <div className="border-t pt-4">
                  <p className="text-sm font-semibold">Order Items</p>
                  <div className="mt-2 space-y-2">
                    {order.order_items?.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between rounded-lg bg-muted/30 p-2">
                        <div>
                          <p className="font-medium">{item.item_name_snapshot}</p>
                          {item.variant_name_snapshot && (
                            <p className="text-sm text-muted-foreground">{item.variant_name_snapshot}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm">{item.quantity} × {formatCurrency(item.unit_price_snapshot)}</p>
                          <p className="font-semibold">{formatCurrency(item.total_price)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatCurrency(order.tax_amount)}</span>
                </div>
                {order.discount_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="text-red-500">-{formatCurrency(order.discount_amount)}</span>
                  </div>
                )}
                <div className="border-t pt-2">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Grand Total</span>
                    <span className="text-maroon">{formatCurrency(order.grand_total)}</span>
                  </div>
                </div>

                {/* Payment Info */}
                {order.payments && order.payments.length > 0 && (
                  <div className="border-t pt-4">
                    <p className="text-sm font-semibold">Payment Information</p>
                    {order.payments.map((payment: any) => (
                      <div key={payment.id} className="mt-2 space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Method</span>
                          <span className="capitalize">{payment.payment_gateway} ({payment.payment_mode})</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status</span>
                          <span className="capitalize">{payment.payment_status}</span>
                        </div>
                        {payment.transaction_id && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Transaction ID</span>
                            <span className="text-xs font-mono">{payment.transaction_id}</span>
                          </div>
                        )}
                        {payment.amount && (
                          <div className="flex justify-between font-semibold">
                            <span className="text-muted-foreground">Amount Paid</span>
                            <span>{formatCurrency(payment.amount)}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Outlet Info */}
                {order.outlet && (
                  <div className="border-t pt-4">
                    <p className="text-sm font-semibold">Outlet</p>
                    <div className="mt-1 text-sm">
                      <p className="font-medium">{order.outlet.outlet_name}</p>
                      <p className="text-muted-foreground">{order.outlet.address}</p>
                      {order.outlet.phone && (
                        <p className="text-muted-foreground">Phone: {order.outlet.phone}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {order.customer_notes && (
                  <div className="border-t pt-4">
                    <p className="text-sm font-semibold">Notes</p>
                    <p className="mt-1 text-sm text-muted-foreground">{order.customer_notes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminPage>
  );
}
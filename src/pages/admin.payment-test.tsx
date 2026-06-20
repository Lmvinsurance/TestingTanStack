import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

import { useServerFn } from '@/lib/react-start-mock';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminHeader, AdminPage } from '@/components/admin/AdminShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Minus, Trash2, Search, Printer, CheckCircle2, Smartphone, Banknote, CreditCard, AlertTriangle, Loader2, FileText, Eye, XCircle, RefreshCw, RotateCcw } from 'lucide-react';
import {
  listWalkinOutlets,
  listWalkinMenu,
} from '@/lib/admin-walkin.functions';

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

export default function AdminPaymentTest() {
  const navigate = useNavigate();
  const outletsFn = useServerFn(listWalkinOutlets);
  const menuFn = useServerFn(listWalkinMenu);

  const [outletsData, setOutletsData] = useState<any>(null);
  const [outletsLoading, setOutletsLoading] = useState(true);

  const [menuData, setMenuData] = useState<any>(null);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState<any>(null);

  const [adminId, setAdminId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchOutlets = async () => {
      setOutletsLoading(true);
      try {
        const res = await outletsFn();
        if (active) setOutletsData(res);
      } catch (err) {
      } finally {
        if (active) setOutletsLoading(false);
      }
    };
    fetchOutlets();
    const getAdminId = async () => {
      try {
        const { data: { user } } = await supabaseAdmin.auth.getUser();
        if (user) setAdminId(user.id);
      } catch (error) {}
    };
    getAdminId();
    return () => { active = false; };
  }, [outletsFn]);

  const [outletId, setOutletId] = useState('');
  const effectiveOutletId = outletId || outletsData?.defaultOutletId || outletsData?.outlets[0]?.id || '';
  const branch = outletsData?.outlets?.find((o: any) => o.id === effectiveOutletId)?.name || 'Default Branch';

  useEffect(() => {
    let active = true;
    if (!effectiveOutletId) return;
    const fetchMenu = async () => {
      setMenuLoading(true);
      setMenuError(null);
      try {
        const res = await menuFn({ data: { outletId: effectiveOutletId } });
        if (active) setMenuData(res);
      } catch (err) {
        if (active) setMenuError(err);
      } finally {
        if (active) setMenuLoading(false);
      }
    };
    fetchMenu();
    return () => { active = false; };
  }, [effectiveOutletId, menuFn]);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [cart, setCart] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [table, setTable] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [taxPct, setTaxPct] = useState(5);
  const [discount, setDiscount] = useState(0);

  // Payment state
  const [loading, setLoading] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [verificationAttempts, setVerificationAttempts] = useState(0);
  const [phonePeWindow, setPhonePeWindow] = useState<any>(null);
  const [showRetryButton, setShowRetryButton] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [showPaymentChannel, setShowPaymentChannel] = useState(false);
  const [paymentChannelUrl, setPaymentChannelUrl] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [pollingStopped, setPollingStopped] = useState(false);
  const [canCheckManually, setCanCheckManually] = useState(false);
  const [paymentCancelled, setPaymentCancelled] = useState(false);

  const pollIntervalRef = useRef<any>(null);
  const timeoutRef = useRef<any>(null);

  const items = menuData?.items ?? [];
  const categories = menuData?.categories ?? [];

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    return items.filter((it: any) => {
      if (category && it.category !== category) return false;
      if (t && !it.name.toLowerCase().includes(t)) return false;
      return true;
    });
  }, [items, search, category]);

  function addLine(item: any, variant: any) {
    setCart((c) => {
      const idx = c.findIndex((l) => l.variantId === variant.id);
      if (idx >= 0) {
        const next = c.slice();
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [
        ...c,
        {
          variantId: variant.id,
          itemId: item.id,
          itemName: item.name,
          variantName: variant.name,
          unitPrice: variant.price,
          quantity: 1,
        },
      ];
    });
  }
  function setQty(variantId: string, delta: number) {
    setCart((c) =>
      c.map((l) => (l.variantId === variantId ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0),
    );
  }
  function removeLine(variantId: string) {
    setCart((c) => c.filter((l) => l.variantId !== variantId));
  }
  function resetCart() {
    setCart([]); setName(''); setPhone(''); setTable(''); setNotes('');
    setDiscount(0); setPaymentMode('cash');
    stopPolling();
    setCurrentOrderId(null);
    setInvoiceData(null);
    setPaymentConfirmed(false);
    setShowPaymentChannel(false);
    setShowRetryButton(false);
    setOrderDetails(null);
    setIsPolling(false);
    setPollingStopped(false);
    setCanCheckManually(false);
    setVerificationAttempts(0);
    setPaymentCancelled(false);
  }

  const subtotal = cart.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const taxable = Math.max(0, subtotal - (Number(discount) || 0));
  const tax = Math.round(taxable * ((Number(taxPct) || 0) / 100) * 100) / 100;
  const grand = Math.round((taxable + tax) * 100) / 100;

  // ---------------- PAYMENT LOGIC ----------------

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const generateMerchantTransactionId = () => {
    const timestamp = Date.now();
    return `ORDID${timestamp}`;
  };

  const saveOrderToSupabase = async (paymentResponse?: any) => {
    try {
      const { data: order, error: orderError } = await supabaseAdmin
        .from("orders")
        .insert({
          customer_id: null,
          outlet_id: effectiveOutletId,
          order_type: 'dine_in',
          order_status: 'pending_payment',
          payment_status: 'pending',
          subtotal: subtotal,
          tax_amount: tax,
          delivery_charge: 0,
          discount_amount: discount,
          grand_total: grand,
          customer_notes: notes || null,
          created_by: adminId,
          last_updated_by: adminId,
          is_walk_in: true,
          walk_in_customer_name: name || null,
          walk_in_customer_phone: phone || null,
          table_number: table || null,
        })
        .select("id, order_number, created_at")
        .single();

      if (orderError) throw new Error('Failed to create order: ' + orderError.message);
      setCurrentOrderId(order.id);

      const orderItems = cart.map(item => ({
        order_id: order.id,
        item_id: item.itemId,
        variant_id: item.variantId,
        item_name_snapshot: item.itemName,
        variant_name_snapshot: item.variantName,
        unit_price_snapshot: item.unitPrice,
        quantity: item.quantity,
        total_price: item.unitPrice * item.quantity,
        special_instructions: null
      }));

      const { error: itemsError } = await supabaseAdmin.from("order_items").insert(orderItems);
      if (itemsError) throw new Error('Failed to create order items: ' + itemsError.message);

      const merchantTransactionId = generateMerchantTransactionId();
      
      const pMode = paymentMode === 'upi' ? 'upi' : paymentMode === 'card_machine' ? 'card' : 'cash';
      const pg = paymentMode === 'upi' ? 'phonepe' : paymentMode;

      const { data: payment, error: paymentError } = await supabaseAdmin
        .from("payments")
        .insert({
          order_id: order.id,
          payment_gateway: pg,
          payment_mode: pMode,
          payment_status: paymentMode === 'cash' ? 'success' : 'initiated',
          amount: grand,
          transaction_id: paymentResponse?.transactionId || merchantTransactionId,
          merchant_transaction_id: merchantTransactionId,
          gateway_response_snapshot: paymentResponse || null,
        })
        .select("id")
        .single();

      if (paymentError) throw new Error('Failed to create payment record: ' + paymentError.message);

      await supabaseAdmin.from("order_status_history").insert({
        order_id: order.id,
        old_status: null,
        new_status: 'pending_payment',
        remarks: `Order created via ${paymentMode} payment.`,
        changed_by: adminId,
        changed_by_role: 'admin',
      });

      return { order, payment, merchantTransactionId };
    } catch (error) {
      console.error('Error saving order:', error);
      throw error;
    }
  };

  const checkPaymentStatusFromDB = async (orderId: string) => {
    try {
      const { data: order } = await supabaseAdmin
        .from("orders")
        .select("payment_status, order_status, grand_total, subtotal, tax_amount")
        .eq("id", orderId)
        .single();
      return order;
    } catch (error) {
      return null;
    }
  };

  const updatePaymentStatus = async (orderId: string, paymentId: string | null, status: string, transactionId: string) => {
    try {
      if (paymentId) {
        await supabaseAdmin.from("payments").update({
          payment_status: status,
          paid_at: status === 'success' ? new Date().toISOString() : null,
          transaction_id: transactionId,
        }).eq("id", paymentId);
      }

      await supabaseAdmin.from("orders").update({
        payment_status: status === 'success' ? 'paid' : 'failed',
        order_status: status === 'success' ? 'received' : 'payment_failed',
        last_updated_by: adminId,
      }).eq("id", orderId);

      await supabaseAdmin.from("order_status_history").insert({
        order_id: orderId,
        old_status: 'pending_payment',
        new_status: status === 'success' ? 'received' : 'payment_failed',
        remarks: status === 'success' ? 'Payment successful' : 'Payment failed',
        changed_by: adminId,
        changed_by_role: 'admin',
      });

      if (status === 'success') {
        await generateAndSaveInvoice(orderId);
      }
      return { success: true };
    } catch (error) {
      throw error;
    }
  };

  const generateAndSaveInvoice = async (orderId: string) => {
    try {
      const { data: order } = await supabaseAdmin.from("orders")
        .select(`id, order_number, created_at, subtotal, tax_amount, grand_total, walk_in_customer_name, walk_in_customer_phone, order_type, table_number, customer_notes`)
        .eq("id", orderId).single();

      const { data: items } = await supabaseAdmin.from("order_items")
        .select(`id, item_name_snapshot, variant_name_snapshot, quantity, unit_price_snapshot, total_price`)
        .eq("order_id", orderId);

      const { data: payments } = await supabaseAdmin.from("payments")
        .select("payment_gateway, payment_mode, payment_status, transaction_id")
        .eq("order_id", orderId);

      const { data: outlet } = await supabaseAdmin.from("outlets")
        .select("outlet_name, address, city, state, phone, outlet_code")
        .eq("id", effectiveOutletId).single();

      const invoiceNumber = `INV-${order.order_number || orderId.slice(0, 8)}-${Date.now().toString().slice(-6)}`;
      const customer = {
        full_name: order.walk_in_customer_name || name || 'Guest',
        phone: order.walk_in_customer_phone || phone || '',
        email: ''
      };

      const blob = await buildPdfBlob({ order, items: items || [], addons: [], payments: payments || [], customer, outlet, invoiceNumber });
      
      const path = `${orderId}/${invoiceNumber}.pdf`;
      await supabase.storage.from(BUCKET).upload(path, blob, { contentType: "application/pdf", upsert: true });
      const { data: pubData } = supabase.storage.from(BUCKET).getPublicUrl(path);

      const { data: invoiceRecord } = await supabaseAdmin.from("invoices").insert({
        order_id: orderId,
        invoice_number: invoiceNumber,
        invoice_url: pubData.publicUrl,
        invoice_amount: Number(order.grand_total),
        tax_amount: Number(order.tax_amount),
        generated_by: adminId || 'system',
        is_void: false,
        generated_at: new Date().toISOString()
      }).select().single();

      setInvoiceData({
        id: invoiceRecord.id,
        invoiceNumber: invoiceRecord.invoice_number || invoiceNumber,
        orderNumber: order.order_number || orderId.slice(0, 8),
        invoiceUrl: pubData.publicUrl,
      });
      
      await fetchOrderDetails(orderId);
      
      toast.success(`Invoice generated successfully!`);
      return { success: true, invoiceNumber: invoiceRecord.invoice_number || invoiceNumber };
    } catch (error) {
      toast.error('Failed to generate invoice');
      throw error;
    }
  };

  const fetchOrderDetails = async (orderId: string) => {
    try {
      const { data: order, error: orderError } = await supabaseAdmin
        .from("orders")
        .select(`
          *,
          order_items (*),
          payments (*),
          invoices (*)
        `)
        .eq("id", orderId)
        .single();

      if (orderError) throw orderError;
      
      setOrderDetails(order);
      return order;
    } catch (error) {
      console.error('Error fetching order details:', error);
      return null;
    }
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsPolling(false);
    setPollingStopped(true);
  };

  // Cancel payment - stops polling and cancels the payment
  const cancelPayment = async () => {
    if (!currentOrderId) {
      toast.error('No active payment to cancel');
      return;
    }

    // Show confirmation dialog
    if (!window.confirm('Are you sure you want to cancel this payment?')) {
      return;
    }

    try {
      setPaymentCancelled(true);
      stopPolling();
      setLoading(false);
      setIsPolling(false);
      setShowPaymentChannel(false);
      setCanCheckManually(false);
      
      // Close PhonePe window if open
      if (phonePeWindow && !phonePeWindow.closed) {
        phonePeWindow.close();
        setPhonePeWindow(null);
      }

      // Update order status to cancelled
      await supabaseAdmin
        .from('orders')
        .update({
          order_status: 'cancelled',
          payment_status: 'failed',
          last_updated_by: adminId,
        })
        .eq('id', currentOrderId);

      // Update payment status
      await supabaseAdmin
        .from('payments')
        .update({
          payment_status: 'cancelled',
        })
        .eq('order_id', currentOrderId);

      // Add status history
      await supabaseAdmin
        .from('order_status_history')
        .insert({
          order_id: currentOrderId,
          old_status: 'pending_payment',
          new_status: 'cancelled',
          remarks: 'Payment cancelled by user',
          changed_by: adminId,
          changed_by_role: 'admin',
        });

      toast.success('Payment cancelled successfully');
      
      // Reset the payment state after a moment
      setTimeout(() => {
        setPaymentCancelled(false);
        setCurrentOrderId(null);
        setShowPaymentChannel(false);
        setPaymentConfirmed(false);
        setShowRetryButton(false);
        setCanCheckManually(false);
        setPollingStopped(false);
        setVerificationAttempts(0);
        resetCart();
      }, 2000);

    } catch (error) {
      console.error('Error cancelling payment:', error);
      toast.error('Failed to cancel payment');
    }
  };

  const verifyPhonePePayment = async (merchantTransactionId: string, isManual = false) => {
    try {
      if (!isManual) {
        setVerifyingPayment(true);
        setVerificationAttempts(prev => prev + 1);
      }
      
      if (currentOrderId) {
        const orderStatus = await checkPaymentStatusFromDB(currentOrderId);
        if (orderStatus && orderStatus.payment_status === 'paid') {
          if (!invoiceData) await generateAndSaveInvoice(currentOrderId);
          setPaymentConfirmed(true);
          setVerifyingPayment(false);
          stopPolling();
          setShowPaymentChannel(false);
          setCanCheckManually(false);
          
          await fetchOrderDetails(currentOrderId);
          
          return { success: true, alreadyPaid: true };
        }
      }

      try {
        const response = await axios.post(SUPABASE_EDGE_FUNCTION_URL, {
          action: 'status',
          merchantOrderId: merchantTransactionId
        });

        if (response.data) {
          const result = response.data;
          
          const isSuccess = 
            result.state === 'COMPLETED' || 
            result.status === 'SUCCESS' ||
            result.paymentState === 'COMPLETED' ||
            result.success === true;

          if (isSuccess) {
            stopPolling();
            if (currentOrderId) {
              await updatePaymentStatus(currentOrderId, null, 'success', merchantTransactionId);
            }
            setPaymentConfirmed(true);
            setVerifyingPayment(false);
            setShowPaymentChannel(false);
            setCanCheckManually(false);
            toast.success(`Payment successful!`);
            
            if (currentOrderId) {
              await fetchOrderDetails(currentOrderId);
            }
            
            if (phonePeWindow && !phonePeWindow.closed) {
              phonePeWindow.close();
              setPhonePeWindow(null);
            }
            return { success: true };
          } else if (result.state === 'FAILED' || result.status === 'FAILED' || result.paymentState === 'FAILED') {
            stopPolling();
            setVerifyingPayment(false);
            setCanCheckManually(false);
            toast.error('Payment failed.');
            setShowRetryButton(true);
            return { success: false, status: 'failed' };
          } else {
            return { success: false, status: 'pending' };
          }
        }
        return { success: false, status: 'pending' };
      } catch (err: any) {
        console.error('Supabase Edge Function error:', err.response?.data || err.message);
        
        if (currentOrderId) {
          const dbCheck = await checkPaymentStatusFromDB(currentOrderId);
          if (dbCheck && dbCheck.payment_status === 'paid') {
            if (!invoiceData) await generateAndSaveInvoice(currentOrderId);
            setPaymentConfirmed(true);
            setVerifyingPayment(false);
            stopPolling();
            setShowPaymentChannel(false);
            setCanCheckManually(false);
            
            await fetchOrderDetails(currentOrderId);
            
            return { success: true };
          }
        }
        
        return { success: false, status: 'pending', error: err.message };
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      setVerifyingPayment(false);
      return { success: false, error: error.message };
    }
  };

  // Manual check payment status
  const handleManualCheck = async () => {
    if (!currentOrderId) {
      toast.error('No active order found');
      return;
    }

    setCanCheckManually(false);
    setVerifyingPayment(true);
    
    try {
      const { data: payment } = await supabaseAdmin
        .from("payments")
        .select("merchant_transaction_id")
        .eq("order_id", currentOrderId)
        .single();
      
      const merchantTransactionId = payment?.merchant_transaction_id;
      if (!merchantTransactionId) {
        toast.error('No merchant transaction ID found');
        setVerifyingPayment(false);
        setCanCheckManually(true);
        return;
      }
      
      const dbStatus = await checkPaymentStatusFromDB(currentOrderId);
      if (dbStatus && dbStatus.payment_status === 'paid') {
        if (!invoiceData) await generateAndSaveInvoice(currentOrderId);
        setPaymentConfirmed(true);
        setVerifyingPayment(false);
        setShowPaymentChannel(false);
        setCanCheckManually(false);
        toast.success('Payment confirmed!');
        await fetchOrderDetails(currentOrderId);
        return;
      }
      
      const result = await verifyPhonePePayment(merchantTransactionId, true);
      if (result.success) {
        setPaymentConfirmed(true);
        setVerifyingPayment(false);
        setShowPaymentChannel(false);
        setCanCheckManually(false);
        toast.success('Payment confirmed!');
        if (currentOrderId) {
          await fetchOrderDetails(currentOrderId);
        }
      } else if (result.status === 'failed') {
        setVerifyingPayment(false);
        setCanCheckManually(true);
        setShowRetryButton(true);
      } else {
        setVerifyingPayment(false);
        setCanCheckManually(true);
        toast.info('Payment still pending. Please check again later.');
      }
    } catch (error) {
      console.error('Error in manual check:', error);
      setVerifyingPayment(false);
      setCanCheckManually(true);
      toast.error('Failed to verify payment');
    }
  };

  // Navigate to order status page
  const goToOrderStatus = (orderId: string) => {
    navigate(`/admin/order-status/${orderId}`);
  };

  // Navigate to payment confirmation page
  const goToPaymentConfirmation = (orderId: string) => {
    navigate(`/admin/payment-confirmation?orderId=${orderId}`);
  };

  // Retry payment - reset and start new payment
  const handleRetryPayment = () => {
    resetCart();
    navigate('/admin/payment-test');
  };

  const processPayment = async () => {
    if (!cart.length) { toast.error('Cart is empty'); return; }
    if (paymentMode === 'upi' && (!phone || phone.length !== 10)) { toast.error('Valid phone number required for UPI'); return; }
    if (!effectiveOutletId) { toast.error('Outlet required'); return; }

    setLoading(true);
    setShowRetryButton(false);
    setVerificationAttempts(0);
    setPaymentConfirmed(false);
    setShowPaymentChannel(false);
    setPollingStopped(false);
    setCanCheckManually(false);
    setIsPolling(true);
    setPaymentCancelled(false);
    
    try {
      const { order, payment, merchantTransactionId } = await saveOrderToSupabase();
      
      if (paymentMode === 'cash' || paymentMode === 'card_machine') {
        await updatePaymentStatus(order.id, payment.id, 'success', `${paymentMode.toUpperCase()}-${Date.now()}`);
        setPaymentConfirmed(true);
        toast.success(`${paymentMode} payment successful!`);
        setLoading(false);
        setIsPolling(false);
        
        await fetchOrderDetails(order.id);
        
        setTimeout(() => {
          goToOrderStatus(order.id);
        }, 1500);
        return;
      }

      if (!paymentConfirmed && paymentMode === 'upi') {
        const amountPaise = Math.round(grand * 100);
        const redirectUrl = `${window.location.origin}/admin/payment-confirmation?orderId=${order.id}`;

        const payload = {
          action: 'create',
          merchantOrderId: merchantTransactionId,
          amountPaise: amountPaise,
          redirectUrl: redirectUrl,
          message: `Payment for Order #${order.order_number || order.id.slice(0, 8)}`,
          metaInfo: {
            orderId: order.id,
            customerName: name || 'Guest',
            customerPhone: phone || '',
            outletId: effectiveOutletId
          }
        };

        const response = await axios.post(SUPABASE_EDGE_FUNCTION_URL, payload);

        if (response.status === 200 && response.data?.redirectUrl) {
          await updatePaymentStatus(order.id, payment.id, 'pending', merchantTransactionId);

          const channelUrl = response.data.redirectUrl;
          setPaymentChannelUrl(channelUrl);
          setShowPaymentChannel(true);
          toast.success('Payment initiated!');
          
          if (channelUrl) {
            const newWindow = window.open(channelUrl, '_blank');
            setPhonePeWindow(newWindow);
          }

          // Start polling with limited attempts
          let pollCount = 0;
          const maxPolls = 8; // Reduced from 30 to 8 for better UX
          stopPolling();
          
          pollIntervalRef.current = setInterval(async () => {
            // Check if payment was cancelled
            if (paymentCancelled) {
              stopPolling();
              setIsPolling(false);
              setLoading(false);
              return;
            }

            pollCount++;
            setVerificationAttempts(pollCount);
            
            const dbStatus = await checkPaymentStatusFromDB(order.id);
            if (dbStatus && dbStatus.payment_status === 'paid') {
              if (!invoiceData) await generateAndSaveInvoice(order.id);
              setPaymentConfirmed(true);
              setVerifyingPayment(false);
              setLoading(false);
              setShowPaymentChannel(false);
              setCanCheckManually(false);
              setIsPolling(false);
              stopPolling();
              
              if (phonePeWindow && !phonePeWindow.closed) {
                phonePeWindow.close();
                setPhonePeWindow(null);
              }
              
              toast.success('Payment successful!');
              await fetchOrderDetails(order.id);
              goToPaymentConfirmation(order.id);
              return;
            }

            // If we've reached max attempts, stop polling and show manual check option
            if (pollCount >= maxPolls) {
              stopPolling();
              setIsPolling(false);
              setPollingStopped(true);
              setCanCheckManually(true);
              setLoading(false);
              toast.info('Payment verification paused. Click "Check Status" to verify.');
              return;
            }

            const verificationResult = await verifyPhonePePayment(merchantTransactionId);
            if (verificationResult.success) {
              setLoading(false);
              setIsPolling(false);
              stopPolling();
              if (order.id) {
                await fetchOrderDetails(order.id);
                goToPaymentConfirmation(order.id);
              }
            } else if (verificationResult.status === 'failed') {
              setLoading(false);
              setIsPolling(false);
              stopPolling();
              setShowRetryButton(true);
              setCanCheckManually(false);
            }
          }, 5000);

          timeoutRef.current = setTimeout(() => {
            if (isPolling && !paymentCancelled) {
              stopPolling();
              setIsPolling(false);
              setPollingStopped(true);
              setCanCheckManually(true);
              setLoading(false);
              toast.info('Payment verification timed out. Click "Check Status" to verify.');
            }
          }, 120000);
        } else {
          await updatePaymentStatus(order.id, payment.id, 'failed', merchantTransactionId);
          toast.error('Payment initiation failed.');
          setLoading(false);
          setIsPolling(false);
          setShowRetryButton(true);
        }
      }
    } catch (error: any) {
      toast.error('Payment failed. ' + (error.response?.data?.message || error.message));
      setLoading(false);
      setIsPolling(false);
      setShowRetryButton(true);
    }
  };

  const handleRetryVerification = async () => {
    if (!currentOrderId) return;
    setShowRetryButton(false);
    setVerifyingPayment(true);
    setCanCheckManually(false);
    
    try {
      const { data: payment } = await supabaseAdmin
        .from("payments")
        .select("merchant_transaction_id")
        .eq("order_id", currentOrderId)
        .single();
      
      const merchantTransactionId = payment?.merchant_transaction_id;
      if (!merchantTransactionId) {
        toast.error('No merchant transaction ID found');
        setVerifyingPayment(false);
        setCanCheckManually(true);
        return;
      }
      
      const dbStatus = await checkPaymentStatusFromDB(currentOrderId);
      if (dbStatus && dbStatus.payment_status === 'paid') {
        if (!invoiceData) await generateAndSaveInvoice(currentOrderId);
        setPaymentConfirmed(true);
        setVerifyingPayment(false);
        setShowPaymentChannel(false);
        setCanCheckManually(false);
        toast.success('Payment confirmed!');
        await fetchOrderDetails(currentOrderId);
        goToPaymentConfirmation(currentOrderId);
        return;
      }
      
      const result = await verifyPhonePePayment(merchantTransactionId, true);
      if (result.success) {
        setPaymentConfirmed(true);
        setVerifyingPayment(false);
        setShowPaymentChannel(false);
        setCanCheckManually(false);
        toast.success('Payment confirmed!');
        if (currentOrderId) {
          await fetchOrderDetails(currentOrderId);
          goToPaymentConfirmation(currentOrderId);
        }
      } else if (result.status === 'failed') {
        setVerifyingPayment(false);
        setCanCheckManually(true);
        setShowRetryButton(true);
      } else {
        setVerifyingPayment(false);
        setCanCheckManually(true);
        toast.info('Payment still pending. Please check again later.');
      }
    } catch (error) {
      console.error('Error in retry:', error);
      setVerifyingPayment(false);
      setCanCheckManually(true);
      setShowRetryButton(true);
      toast.error('Failed to verify payment');
    }
  };

  // ---------------- UI RENDER ----------------

  return (
    <AdminPage>
      <AdminHeader 
        title="Payment Test" 
        subtitle="PhonePe via Supabase Edge Function" 
      />
      
      {orderDetails && paymentConfirmed && (
        <div className="mx-4 mb-4 rounded-lg border border-green-500/30 bg-green-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-green-700">Order Confirmed!</h3>
              <p className="text-sm text-green-600">
                Order #{orderDetails.order_number || orderDetails.id.slice(0, 8)} - 
                Total: {fmt(orderDetails.grand_total)}
              </p>
              <p className="text-xs text-green-500">
                Status: {orderDetails.order_status} • 
                Payment: {orderDetails.payment_status}
              </p>
            </div>
            <div className="flex gap-2">
              {invoiceData && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(invoiceData.invoiceUrl, '_blank')}
                  className="border-green-500 text-green-700"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  View Invoice
                </Button>
              )}
              <Button 
                size="sm"
                onClick={() => goToPaymentConfirmation(orderDetails.id)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Eye className="mr-2 h-4 w-4" />
                View Payment Status
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 px-4 py-4 lg:grid-cols-[1fr_400px]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={effectiveOutletId} onValueChange={setOutletId} disabled={paymentConfirmed || loading}>
              <SelectTrigger className="w-[240px]"><SelectValue placeholder="Select outlet" /></SelectTrigger>
              <SelectContent>
                {(outletsData?.outlets ?? []).map((o: any) => (
                  <SelectItem key={o.id} value={o.id}>{o.name}{o.city ? ` — ${o.city}` : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items..." className="pl-8" />
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setCategory('')} className={`rounded-full border px-3 py-1 text-xs ${!category ? 'border-saffron bg-saffron text-cream' : 'border-gold/30 bg-card text-maroon'}`}>All</button>
            {categories.map((c: string) => (
              <button key={c} onClick={() => setCategory(c)} className={`rounded-full border px-3 py-1 text-xs ${category === c ? 'border-saffron bg-saffron text-cream' : 'border-gold/30 bg-card text-maroon'}`}>{c}</button>
            ))}
          </div>

          {menuLoading && <p className="text-sm text-muted-foreground">Loading menu…</p>}
          {!menuLoading && filtered.length === 0 && <p className="text-sm text-muted-foreground">No items available.</p>}

          <div className="grid gap-2 sm:grid-cols-2">
            {filtered.map((it: any) => (
              <div key={it.id} className="rounded-xl border border-gold/20 bg-card p-3">
                <p className="text-sm font-semibold text-maroon">{it.name}</p>
                <p className="text-[11px] text-muted-foreground">{it.category}</p>
                <div className="mt-2 space-y-1">
                  {it.variants.map((v: any) => (
                    <button
                      key={v.id}
                      disabled={paymentConfirmed || loading}
                      onClick={() => addLine(it, v)}
                      className="flex w-full items-center justify-between rounded-md border border-gold/15 bg-cream px-2 py-1.5 text-xs hover:bg-saffron/10 disabled:opacity-50"
                    >
                      <span className="truncate text-left">{v.name}{v.label ? ` · ${v.label}` : ''}</span>
                      <span className="ml-2 font-semibold text-maroon">₹{v.price.toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-gold/20 bg-card p-3 lg:sticky lg:top-20 lg:self-start">
          <div className="flex items-center justify-between">
            <h2 className="text-display text-lg text-maroon">
              {currentOrderId ? `Order Active` : `Cart (${cart.length})`}
            </h2>
            {currentOrderId && <Button size="sm" variant="ghost" onClick={resetCart}>New order</Button>}
          </div>

          {!paymentConfirmed && !paymentCancelled && (
            <>
              <div className="max-h-[40vh] space-y-2 overflow-auto">
                {cart.length === 0 && <p className="text-xs text-muted-foreground">No items added yet.</p>}
                {cart.map((l) => (
                  <div key={l.variantId} className="rounded-md border border-gold/15 bg-cream p-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-maroon">{l.itemName}</p>
                        <p className="truncate text-[10px] text-muted-foreground">{l.variantName} · ₹{l.unitPrice.toFixed(2)}</p>
                      </div>
                      <button onClick={() => removeLine(l.variantId)} className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setQty(l.variantId, -1)} className="rounded border px-1.5"><Minus className="h-3 w-3" /></button>
                        <span className="text-xs font-semibold">{l.quantity}</span>
                        <button onClick={() => setQty(l.variantId, 1)} className="rounded border px-1.5"><Plus className="h-3 w-3" /></button>
                      </div>
                      <span className="text-xs font-semibold text-maroon">₹{(l.unitPrice * l.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Customer name (opt.)" value={name} onChange={(e) => setName(e.target.value)} />
                <Input placeholder="Phone (required for UPI)" value={phone} onChange={(e) => setPhone(e.target.value)} className={paymentMode === 'upi' && (!phone || phone.length !== 10) ? 'border-red-500' : ''} />
                <Input placeholder="Table # (opt.)" value={table} onChange={(e) => setTable(e.target.value)} />
                <Input type="number" min={0} placeholder="Discount ₹" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
                <Input type="number" min={0} step="0.01" placeholder="Tax %" value={taxPct} onChange={(e) => setTaxPct(Number(e.target.value))} />
              </div>
              <Input placeholder="Order notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase text-muted-foreground">Payment method</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['cash', 'card_machine', 'upi']).map((m) => {
                    const active = paymentMode === m;
                    const Icon = m === 'cash' ? Banknote : m === 'card_machine' ? CreditCard : Smartphone;
                    return (
                      <button
                        key={m}
                        onClick={() => setPaymentMode(m)}
                        className={`flex flex-col items-center gap-1 rounded-md border px-2 py-2 text-[11px] ${active ? 'border-saffron bg-saffron text-cream' : 'border-gold/30 bg-cream text-maroon'}`}
                      >
                        <Icon className="h-4 w-4" />
                        {m === 'cash' ? 'Cash' : m === 'card_machine' ? 'Card Machine' : 'UPI / PhonePe'}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          <div className="space-y-1 border-t border-gold/20 pt-2 text-xs">
            <div className="flex justify-between"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Discount</span><span>− ₹{(Number(discount) || 0).toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Tax ({taxPct}%)</span><span>₹{tax.toFixed(2)}</span></div>
            <div className="flex justify-between text-base font-bold text-maroon"><span>Total</span><span>₹{grand.toFixed(2)}</span></div>
          </div>

          {/* Payment Button */}
          {!paymentConfirmed && !loading && !showPaymentChannel && !pollingStopped && !paymentCancelled && (
            <Button
              disabled={!cart.length || (paymentMode === 'upi' && (!phone || phone.length !== 10))}
              onClick={processPayment}
              className="w-full bg-gradient-to-br from-maroon to-maroon/80 text-cream"
            >
              {paymentMode === 'upi' ? 'Pay with PhonePe' : 'Complete Order'}
            </Button>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="animate-spin h-6 w-6 text-maroon mr-2" />
              <span>Processing...</span>
            </div>
          )}

          {/* Payment Channel - Shows when UPI payment is initiated */}
          {showPaymentChannel && !paymentCancelled && (
            <div className="space-y-2">
              <div className="rounded-md bg-saffron/10 p-2 text-[11px] text-maroon">
                <p className="font-semibold flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> 
                  📱 Polling for Payment Status... ({verificationAttempts}/8)
                </p>
              </div>
              {paymentChannelUrl && (
                <a href={paymentChannelUrl} target="_blank" rel="noopener noreferrer" className="block w-full rounded-md border border-saffron bg-cream px-3 py-2 text-center text-xs font-semibold text-maroon hover:bg-saffron/10">
                  Open PhonePe Checkout ↗
                </a>
              )}
              
              {/* Cancel Payment Button */}
              <Button 
                onClick={cancelPayment} 
                variant="destructive" 
                className="w-full bg-red-500 hover:bg-red-600 text-white"
                disabled={paymentCancelled}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Cancel Payment
              </Button>
            </div>
          )}

          {/* Manual Check Status - Shows after polling stops */}
          {pollingStopped && canCheckManually && !paymentConfirmed && !paymentCancelled && (
            <div className="space-y-2">
              <div className="rounded-md bg-amber-50 border border-amber-200 p-2 text-[11px] text-amber-700">
                <p className="font-semibold">⏳ Payment verification paused</p>
                <p className="text-xs">Click below to check payment status manually</p>
              </div>
              <Button 
                onClick={handleManualCheck} 
                variant="outline" 
                className="w-full border-amber-500 text-amber-700 hover:bg-amber-50"
                disabled={verifyingPayment}
              >
                {verifyingPayment ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Check Status
              </Button>
              <Button 
                onClick={cancelPayment} 
                variant="destructive" 
                className="w-full bg-red-500 hover:bg-red-600 text-white"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Cancel Payment
              </Button>
            </div>
          )}

          {/* Retry Button - Shows when payment fails */}
          {showRetryButton && !paymentConfirmed && (
            <div className="space-y-2 mt-4">
              <div className="rounded-md bg-red-50 border border-red-200 p-2 text-[11px] text-red-700">
                <p className="font-semibold">❌ Payment failed</p>
                <p className="text-xs">You can retry the payment or check status</p>
              </div>
              <Button onClick={handleRetryVerification} variant="outline" className="w-full border-saffron text-maroon">
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry Verification
              </Button>
              <Button onClick={handleRetryPayment} className="w-full bg-maroon text-cream hover:bg-maroon/90">
                <RotateCcw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </div>
          )}

          {/* Payment Cancelled State */}
          {paymentCancelled && (
            <div className="space-y-2 mt-4">
              <div className="rounded-md bg-red-50 border border-red-200 p-3 text-center text-red-700">
                <XCircle className="h-8 w-8 mx-auto mb-2" />
                <p className="font-bold">Payment Cancelled</p>
                <p className="text-xs">You can start a new payment</p>
              </div>
              <Button onClick={handleRetryPayment} className="w-full bg-maroon text-cream hover:bg-maroon/90">
                <RotateCcw className="mr-2 h-4 w-4" />
                Start New Payment
              </Button>
            </div>
          )}

          {/* Payment Confirmed State */}
          {paymentConfirmed && currentOrderId && !orderDetails && (
            <div className="space-y-4 mt-4">
              <div className="rounded-md border border-green-500/30 bg-green-50 p-3 text-green-700 text-center">
                <CheckCircle2 className="h-6 w-6 mx-auto mb-2" />
                <p className="font-bold">Payment Confirmed!</p>
                <p className="text-xs mt-1">Redirecting to payment confirmation...</p>
              </div>
              <Button 
                onClick={() => goToPaymentConfirmation(currentOrderId)} 
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                <Eye className="mr-2 h-4 w-4" /> View Payment Status
              </Button>
            </div>
          )}

          {/* Invoice View */}
          {paymentConfirmed && invoiceData && (
            <div className="space-y-2 mt-2">
              <Button 
                onClick={() => window.open(invoiceData.invoiceUrl, '_blank')}
                variant="outline"
                className="w-full border-saffron text-maroon"
              >
                <FileText className="mr-2 h-4 w-4" />
                View Invoice
              </Button>
            </div>
          )}
        </div>
      </div>
    </AdminPage>
  );
}
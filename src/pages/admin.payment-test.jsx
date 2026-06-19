import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  listWalkinOutlets, 
  listWalkinMenu, 
  createWalkinOrder,
  verifyWalkinUpi,
  getInvoicePrintData
} from "../lib/admin-walkin.functions";
import { toast } from "sonner";

const API_PATH = 'https://u18pdq88oa.execute-api.ap-south-1.amazonaws.com/';

function AdminPaymentTest() {
  // State for outlets from database
  const [outletsData, setOutletsData] = useState(null);
  const [outletId, setOutletId] = useState("");
  const [outletsLoading, setOutletsLoading] = useState(true);

  // State for menu items from database
  const [menuData, setMenuData] = useState(null);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState(null);

  // State for cart
  const [cartItems, setCartItems] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerMobileNumber, setCustomerMobileNumber] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('');
  const [discount, setDiscount] = useState(0);
  const [taxPct, setTaxPct] = useState(5);
  const [notes, setNotes] = useState('');
  const [placedOrder, setPlacedOrder] = useState(null);
  const [branch, setBranch] = useState('');

  // Fetch outlets from database
  useEffect(() => {
    const fetchOutlets = async () => {
      setOutletsLoading(true);
      try {
        const res = await listWalkinOutlets();
        setOutletsData(res);
        if (res?.defaultOutletId) {
          setOutletId(res.defaultOutletId);
          // Set branch name from outlet
          const defaultOutlet = res.outlets?.find(o => o.id === res.defaultOutletId);
          if (defaultOutlet) {
            setBranch(defaultOutlet.name);
          }
        } else if (res?.outlets?.[0]?.id) {
          setOutletId(res.outlets[0].id);
          setBranch(res.outlets[0].name);
        }
      } catch (err) {
        console.error('Error fetching outlets:', err);
        toast.error('Failed to fetch outlets');
      } finally {
        setOutletsLoading(false);
      }
    };
    fetchOutlets();
  }, []);

  // Fetch menu based on selected outlet
  useEffect(() => {
    if (!outletId) return;

    const fetchMenu = async () => {
      setMenuLoading(true);
      setMenuError(null);
      try {
        const res = await listWalkinMenu({ data: { outletId } });
        setMenuData(res);
      } catch (err) {
        setMenuError(err.message);
        console.error('Error fetching menu:', err);
        toast.error('Failed to fetch menu');
      } finally {
        setMenuLoading(false);
      }
    };
    fetchMenu();
  }, [outletId]);

  // Update branch when outlet changes
  useEffect(() => {
    if (outletId && outletsData?.outlets) {
      const outlet = outletsData.outlets.find(o => o.id === outletId);
      if (outlet) {
        setBranch(outlet.name);
      }
    }
  }, [outletId, outletsData]);

  const items = menuData?.items ?? [];
  const categories = menuData?.categories ?? [];

  // Filter menu items
  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    return items.filter((it) => {
      if (category && it.category !== category) return false;
      if (t && !it.name.toLowerCase().includes(t)) return false;
      return true;
    });
  }, [items, search, category]);

  // Add item to cart
  const addItemToCart = (item, variant) => {
    setCartItems(prev => {
      const existingIndex = prev.findIndex(
        i => i.variantId === variant.id
      );

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            variantId: variant.id,
            itemId: item.id,
            itemName: item.name,
            variantName: variant.name,
            unitPrice: variant.price,
            quantity: 1,
            category: item.category
          }
        ];
      }
    });
  };

  // Update quantity
  const updateQuantity = (variantId, delta) => {
    setCartItems(prev => {
      const updated = prev.map(item => {
        if (item.variantId === variantId) {
          const newQuantity = item.quantity + delta;
          return { ...item, quantity: Math.max(0, newQuantity) };
        }
        return item;
      });
      return updated.filter(item => item.quantity > 0);
    });
  };

  // Remove item from cart
  const removeFromCart = (variantId) => {
    setCartItems(prev => prev.filter(item => item.variantId !== variantId));
  };

  // Clear cart
  const clearCart = () => {
    setCartItems([]);
    setCustomerName('');
    setCustomerMobileNumber('');
    setTableNumber('');
    setDiscount(0);
    setNotes('');
    setPlacedOrder(null);
    setPaymentStatus('');
  };

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const taxable = Math.max(0, subtotal - Number(discount));
  const tax = Math.round(taxable * (Number(taxPct) / 100) * 100) / 100;
  const grandTotal = Math.round((taxable + tax) * 100) / 100;

  // Handle place order with UPI payment
  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) {
      toast.error('Please add items to cart');
      return;
    }

    if (!customerMobileNumber || customerMobileNumber.length !== 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    if (!outletId) {
      toast.error('Please select an outlet');
      return;
    }

    setLoading(true);
    setPaymentStatus('Creating order...');

    try {
      // Create order using the server function
      const orderRes = await createWalkinOrder({
        data: {
          outletId: outletId,
          items: cartItems,
          walkInName: customerName || null,
          walkInPhone: customerMobileNumber,
          tableNumber: tableNumber || null,
          paymentMode: "upi",
          discountAmount: Number(discount) || 0,
          taxPercent: Number(taxPct) || 0,
          notes: notes || null,
        },
      });

      console.log('Order created:', orderRes);
      toast.success(`Order ${orderRes.orderNumber} created`);

      setPlacedOrder(orderRes);
      setPaymentStatus('Order created! Processing payment...');

      // Now process PhonePe payment
      await processPhonePePayment(orderRes);

    } catch (error) {
      console.error('Order creation error:', error);
      setPaymentStatus('Failed to create order: ' + (error.message || 'Unknown error'));
      toast.error('Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  // Process PhonePe payment - UPDATED TO MATCH EXACT PAYLOAD PATTERN
  const processPhonePePayment = async (order) => {
    try {
      // Build order items for PhonePe - EXACT MATCH TO OLD WORKING FORMAT
      const order_items = cartItems.map((item, index) => ({
        id: index + 1,                          // ← Sequential number ID
        name: item.itemName,                    // ← name field
        price: item.unitPrice,
        quantity: item.quantity
      }));

      // Create PhonePe payload - EXACT MATCH TO OLD WORKING FORMAT
      const payload = {
        mobilenumber: customerMobileNumber,
        customer_name: customerName || "Rahul Sharma",
        total_amount: Number(grandTotal.toFixed(2)),
        order_status: "PENDING",
        order_items: order_items,
        order_type: `Online-${branch || 'Mumbai'}`,
        restaurant_id: 1,
        payment_status: "PENDING"
      };

      console.log('Sending PhonePe payload:', payload);

      // Call PhonePe API
      const response = await axios.post(
        `${API_PATH}api/admin/phonepay/order`,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          }
        }
      );

      console.log('PhonePe response:', response.data);

      // Extract redirect URL
      let redirectUrl = null;
      if (response.data?.result?.redirectUrl) {
        redirectUrl = response.data.result.redirectUrl;
      } else if (response.data?.redirectUrl) {
        redirectUrl = response.data.redirectUrl;
      } else if (response.data?.data?.instrumentResponse?.redirectInfo?.url) {
        redirectUrl = response.data.data.instrumentResponse.redirectInfo.url;
      }

      if (redirectUrl) {
        window.open(redirectUrl, "_blank", "noopener,noreferrer");
        setPaymentStatus('Payment initiated! Redirecting to PhonePe...');
        toast.success('PhonePe checkout opened!');
      } else {
        setPaymentStatus('Payment initiated but no redirect URL received');
        toast.info('Please check payment status manually');
      }

    } catch (error) {
      console.error('Payment processing error:', error);
      
      // Log the payload that failed
      const failedPayload = {
        mobilenumber: customerMobileNumber,
        customer_name: customerName || "Rahul Sharma",
        total_amount: Number(grandTotal.toFixed(2)),
        order_status: "PENDING",
        order_items: cartItems.map((item, index) => ({
          id: index + 1,
          name: item.itemName,
          price: item.unitPrice,
          quantity: item.quantity
        })),
        order_type: `Online-${branch || 'Mumbai'}`,
        restaurant_id: 1,
        payment_status: "PENDING"
      };
      
      console.log('Failed payload:', failedPayload);
      
      setPaymentStatus('Payment processing failed: ' + (error.message || 'Unknown error'));
      toast.error('Failed to process payment');
    }
  };

  // Verify UPI payment
  const handleVerifyPayment = async () => {
    if (!placedOrder) {
      toast.error('No order to verify');
      return;
    }

    setLoading(true);
    try {
      const res = await verifyWalkinUpi({ data: { orderId: placedOrder.orderId } });
      console.log('Verification result:', res);

      if (res.paymentStatus === "success") {
        setPaymentStatus('✅ Payment verified successfully!');
        toast.success('Payment confirmed!');
        
        try {
          const invoiceData = await getInvoicePrintData({ data: { orderId: placedOrder.orderId } });
          console.log('Invoice data:', invoiceData);
          if (invoiceData?.printable) {
            toast.success('Invoice generated!');
          }
        } catch (invErr) {
          console.error('Invoice fetch error:', invErr);
        }
      } else if (res.paymentStatus === "failed") {
        setPaymentStatus('❌ Payment verification failed');
        toast.error('Payment failed');
      } else {
        setPaymentStatus('⏳ Payment pending. Please retry after customer completes payment.');
        toast.info('Payment still pending');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setPaymentStatus('Verification failed: ' + (error.message || 'Unknown error'));
      toast.error('Failed to verify payment');
    } finally {
      setLoading(false);
    }
  };

  // Handle outlet change
  const handleOutletChange = (e) => {
    const selectedId = e.target.value;
    setOutletId(selectedId);
    if (outletsData?.outlets) {
      const outlet = outletsData.outlets.find(o => o.id === selectedId);
      if (outlet) {
        setBranch(outlet.name);
      }
    }
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
      <h2 style={{ color: '#333', borderBottom: '2px solid #007bff', paddingBottom: '10px' }}>
        PhonePe Payment Test - Dynamic from Database
      </h2>

      {/* Outlet Selection */}
      <div style={{ background: '#e9ecef', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={{ fontWeight: 'bold' }}>Select Outlet:</label>
          <select
            value={outletId}
            onChange={handleOutletChange}
            style={{
              padding: '8px 12px',
              borderRadius: '4px',
              border: '1px solid #ced4da',
              minWidth: '200px'
            }}
            disabled={outletsLoading}
          >
            <option value="">Select an outlet...</option>
            {(outletsData?.outlets ?? []).map((outlet) => (
              <option key={outlet.id} value={outlet.id}>
                {outlet.name} {outlet.city ? `- ${outlet.city}` : ''}
              </option>
            ))}
          </select>
          {outletsLoading && <span>Loading outlets...</span>}
          {branch && <span style={{ marginLeft: '10px', fontWeight: 'bold', color: '#007bff' }}>Branch: {branch}</span>}
        </div>
      </div>

      {/* Customer Details */}
      <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <h4 style={{ marginTop: 0 }}>Customer Details</h4>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Customer Name (optional)"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            style={{ padding: '8px', flex: '1', minWidth: '150px', borderRadius: '4px', border: '1px solid #ced4da' }}
          />
          <input
            type="tel"
            placeholder="Mobile Number (required)"
            value={customerMobileNumber}
            onChange={(e) => setCustomerMobileNumber(e.target.value)}
            style={{ 
              padding: '8px', 
              flex: '1', 
              minWidth: '150px', 
              borderRadius: '4px', 
              border: customerMobileNumber && customerMobileNumber.length !== 10 ? '2px solid red' : '1px solid #ced4da' 
            }}
          />
          <input
            type="text"
            placeholder="Table Number (optional)"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            style={{ padding: '8px', width: '120px', borderRadius: '4px', border: '1px solid #ced4da' }}
          />
          <input
            type="number"
            placeholder="Discount ₹"
            value={discount}
            onChange={(e) => setDiscount(Number(e.target.value))}
            style={{ padding: '8px', width: '120px', borderRadius: '4px', border: '1px solid #ced4da' }}
          />
          <input
            type="number"
            placeholder="Tax %"
            value={taxPct}
            onChange={(e) => setTaxPct(Number(e.target.value))}
            style={{ padding: '8px', width: '100px', borderRadius: '4px', border: '1px solid #ced4da' }}
          />
        </div>
        <div style={{ marginTop: '8px' }}>
          <input
            type="text"
            placeholder="Order Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
          />
        </div>
        {customerMobileNumber && customerMobileNumber.length !== 10 && (
          <p style={{ color: 'red', fontSize: '12px', marginTop: '5px' }}>
            ⚠️ Please enter a valid 10-digit phone number
          </p>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Menu Section - Left Side */}
        <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
          <div style={{ marginBottom: '15px' }}>
            <input
              type="text"
              placeholder="🔍 Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '4px',
                border: '1px solid #ced4da'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '15px' }}>
            <button
              onClick={() => setCategory('')}
              style={{
                padding: '4px 12px',
                background: !category ? '#007bff' : '#e9ecef',
                color: !category ? 'white' : '#333',
                border: 'none',
                borderRadius: '20px',
                cursor: 'pointer'
              }}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                style={{
                  padding: '4px 12px',
                  background: category === c ? '#007bff' : '#e9ecef',
                  color: category === c ? 'white' : '#333',
                  border: 'none',
                  borderRadius: '20px',
                  cursor: 'pointer'
                }}
              >
                {c}
              </button>
            ))}
          </div>

          {menuLoading && (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <p>Loading menu from database...</p>
            </div>
          )}
          {menuError && (
            <p style={{ color: 'red', padding: '10px', background: '#f8d7da', borderRadius: '4px' }}>
              ❌ Error loading menu: {menuError}
            </p>
          )}
          
          {!menuLoading && !menuError && (
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {filtered.length === 0 ? (
                <p style={{ color: '#6c757d', textAlign: 'center', padding: '40px 0' }}>
                  {items.length === 0 ? 'No items available for this outlet' : 'No items match your search'}
                </p>
              ) : (
                filtered.map((item) => (
                  <div key={item.id} style={{
                    padding: '12px',
                    marginBottom: '10px',
                    background: 'white',
                    borderRadius: '6px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div>
                        <strong>{item.name}</strong>
                        <span style={{ fontSize: '12px', color: '#6c757d', marginLeft: '8px' }}>
                          ({item.category})
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {item.variants.map((variant) => (
                        <button
                          key={variant.id}
                          onClick={() => addItemToCart(item, variant)}
                          style={{
                            padding: '4px 12px',
                            background: '#e9ecef',
                            border: '1px solid #ced4da',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = '#007bff';
                            e.target.style.color = 'white';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = '#e9ecef';
                            e.target.style.color = 'inherit';
                          }}
                        >
                          {variant.name} - ₹{variant.price.toFixed(2)}
                          <span style={{ fontSize: '14px', fontWeight: 'bold' }}>+</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Cart Section - Right Side */}
        <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', position: 'sticky', top: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h4 style={{ margin: 0 }}>🛒 Cart ({cartItems.length} items)</h4>
            {cartItems.length > 0 && (
              <button
                onClick={clearCart}
                style={{
                  padding: '4px 12px',
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Clear Cart
              </button>
            )}
          </div>

          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {cartItems.length === 0 ? (
              <p style={{ color: '#6c757d', textAlign: 'center', padding: '40px 0' }}>
                No items in cart.<br />
                Click on items from the menu to add.
              </p>
            ) : (
              cartItems.map((item) => (
                <div key={item.variantId} style={{
                  padding: '10px',
                  marginBottom: '8px',
                  background: 'white',
                  borderRadius: '6px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <strong>{item.itemName}</strong>
                      <span style={{ fontSize: '12px', color: '#6c757d', marginLeft: '5px' }}>
                        ({item.variantName})
                      </span>
                      <div style={{ fontSize: '12px', color: '#6c757d' }}>
                        ₹{item.unitPrice.toFixed(2)} each
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={() => updateQuantity(item.variantId, -1)}
                        style={{
                          padding: '2px 8px',
                          border: '1px solid #ced4da',
                          borderRadius: '4px',
                          background: 'white',
                          cursor: 'pointer',
                          width: '28px'
                        }}
                      >
                        -
                      </button>
                      <span style={{ minWidth: '24px', textAlign: 'center', fontWeight: 'bold' }}>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.variantId, 1)}
                        style={{
                          padding: '2px 8px',
                          border: '1px solid #ced4da',
                          borderRadius: '4px',
                          background: 'white',
                          cursor: 'pointer',
                          width: '28px'
                        }}
                      >
                        +
                      </button>
                      <span style={{ minWidth: '70px', textAlign: 'right', fontWeight: 'bold' }}>
                        ₹{(item.unitPrice * item.quantity).toFixed(2)}
                      </span>
                      <button
                        onClick={() => removeFromCart(item.variantId)}
                        style={{
                          padding: '2px 8px',
                          background: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '16px'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Totals */}
          {cartItems.length > 0 && (
            <div style={{
              borderTop: '2px solid #333',
              marginTop: '15px',
              paddingTop: '15px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal:</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#28a745' }}>
                  <span>Discount:</span>
                  <span>-₹{discount.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666' }}>
                <span>Tax ({taxPct}%):</span>
                <span>₹{tax.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.2em', borderTop: '1px solid #ddd', paddingTop: '8px', marginTop: '4px' }}>
                <span>Total:</span>
                <span>₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Payment Buttons */}
          {!placedOrder ? (
            <button
              onClick={handlePlaceOrder}
              disabled={loading || cartItems.length === 0 || !customerMobileNumber || customerMobileNumber.length !== 10}
              style={{
                width: '100%',
                marginTop: '15px',
                padding: '14px 24px',
                background: (loading || cartItems.length === 0 || !customerMobileNumber || customerMobileNumber.length !== 10)
                  ? '#6c757d'
                  : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: (loading || cartItems.length === 0 || !customerMobileNumber || customerMobileNumber.length !== 10)
                  ? 'not-allowed'
                  : 'pointer',
                transition: 'background 0.3s'
              }}
            >
              {loading ? '⏳ Processing...' : '💳 Pay with PhonePe'}
            </button>
          ) : (
            <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
              <button
                onClick={handleVerifyPayment}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '14px 24px',
                  background: loading ? '#6c757d' : '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? '⏳ Verifying...' : '✅ Verify Payment'}
              </button>
              <button
                onClick={clearCart}
                style={{
                  padding: '14px 24px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  fontSize: '16px',
                  cursor: 'pointer'
                }}
              >
                New Order
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Status Message */}
      {paymentStatus && (
        <div style={{
          padding: '12px',
          borderRadius: '5px',
          marginTop: '15px',
          background: paymentStatus.toLowerCase().includes('failed') || paymentStatus.toLowerCase().includes('error') 
            ? '#f8d7da' 
            : '#d4edda',
          color: paymentStatus.toLowerCase().includes('failed') || paymentStatus.toLowerCase().includes('error')
            ? '#721c24' 
            : '#155724',
          border: `1px solid ${paymentStatus.toLowerCase().includes('failed') || paymentStatus.toLowerCase().includes('error')
            ? '#f5c6cb' 
            : '#c3e6cb'}`
        }}>
          {paymentStatus}
        </div>
      )}

      {/* Order Details */}
      {placedOrder && (
        <div style={{ marginTop: '15px', padding: '15px', background: '#d1ecf1', borderRadius: '5px' }}>
          <h4>Order Details</h4>
          <p><strong>Order ID:</strong> {placedOrder.orderId}</p>
          <p><strong>Order Number:</strong> {placedOrder.orderNumber}</p>
          <p><strong>Payment Mode:</strong> {placedOrder.paymentMode}</p>
          {placedOrder.redirectUrl && (
            <p><strong>Redirect URL:</strong> <a href={placedOrder.redirectUrl} target="_blank" rel="noopener noreferrer">{placedOrder.redirectUrl}</a></p>
          )}
        </div>
      )}

      {/* Payload Preview - Shows EXACT format being sent */}
      {cartItems.length > 0 && (
        <div style={{ marginTop: '20px', padding: '15px', background: '#d1ecf1', borderRadius: '5px' }}>
          <details>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
              📤 View PhonePe Payload Preview (Exact Format)
            </summary>
            <pre style={{
              background: '#fff',
              padding: '10px',
              borderRadius: '4px',
              fontSize: '12px',
              overflow: 'auto',
              maxHeight: '300px',
              marginTop: '8px'
            }}>
              {JSON.stringify({
                mobilenumber: customerMobileNumber || '9876543210',
                customer_name: customerName || 'Rahul Sharma',
                total_amount: Number(grandTotal.toFixed(2)),
                order_status: "PENDING",
                order_items: cartItems.map((item, index) => ({
                  id: index + 1,
                  name: item.itemName,
                  price: item.unitPrice,
                  quantity: item.quantity
                })),
                order_type: `Online-${branch || 'Mumbai'}`,
                restaurant_id: 1,
                payment_status: "PENDING"
              }, null, 2)}
            </pre>
          </details>
          <p style={{ marginTop: '10px', fontSize: '13px', marginBottom: 0, color: '#0c5460' }}>
            ✅ Items are read dynamically from your database tables: <strong>outlets</strong>, <strong>menu_items</strong>, <strong>item_variants</strong>, <strong>outlet_variant_prices</strong>
          </p>
        </div>
      )}
    </div>
  );
}

export default AdminPaymentTest;
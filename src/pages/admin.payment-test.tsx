import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const API_PATH = 'https://u18pdq88oa.execute-api.ap-south-1.amazonaws.com/';

function AdminPaymentTest() {
  // State for dynamic data
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

  // Fetch outlets first to get UUIDs
  useEffect(() => {
    const fetchOutlets = async () => {
      try {
        const { data: outletsData, error: outletsError } = await supabaseAdmin
          .from("outlets")
          .select("id, outlet_name, city, state, address, is_active")
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

  // Fetch menu data from Supabase when outlet changes
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
          setPaymentStatus(`Loaded ${availableItems.length} items from ${categoriesData?.length || 0} categories`);
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
        .select("id, order_number")
        .single();

      if (orderError) {
        console.error('Order creation error:', orderError);
        throw new Error('Failed to create order: ' + orderError.message);
      }

      console.log('Order created:', order);

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

      console.log('Order items created:', orderItems.length);

      const merchantTransactionId = `PHONEPE-${order.order_number}-${Date.now()}`;
      
      const { data: payment, error: paymentError } = await supabaseAdmin
        .from("payments")
        .insert({
          order_id: order.id,
          payment_gateway: 'phonepe',
          payment_mode: 'upi',
          payment_status: 'initiated',
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

      console.log('Payment record created:', payment);

      const { error: historyError } = await supabaseAdmin
        .from("order_status_history")
        .insert({
          order_id: order.id,
          old_status: null,
          new_status: 'pending_payment',
          remarks: `Order created via PhonePe payment. Order type: ${orderType}`,
          changed_by: adminId,
          changed_by_role: 'admin',
          ip_address: null,
        });

      if (historyError) {
        console.error('Status history error:', historyError);
      }

      console.log('Status history created');

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

  // Update payment status after successful payment
  const updatePaymentStatus = async (orderId, paymentId, status, transactionId) => {
    try {
      const { error: paymentUpdateError } = await supabaseAdmin
        .from("payments")
        .update({
          payment_status: status,
          paid_at: new Date().toISOString(),
          transaction_id: transactionId,
        })
        .eq("id", paymentId);

      if (paymentUpdateError) {
        console.error('Payment update error:', paymentUpdateError);
      }

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

    } catch (error) {
      console.error('Error updating payment status:', error);
    }
  };

  // Add item to cart
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

  // Clear entire cart
  const clearCart = () => {
    setCartItems([]);
    setPaymentStatus('Cart cleared');
  };

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const taxAmount = parseFloat((subtotal * 0.18).toFixed(2));
  const grandTotal = subtotal + taxAmount;

  // Handle payment - FIXED: Simplified payload matching working version
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

    setLoading(true);
    setPaymentStatus('Processing payment...');
    
    try {
      // First, save the order to Supabase
      const { order, payment, merchantTransactionId } = await saveOrderToSupabase();
      
      console.log('Order saved, initiating PhonePe payment...');

      // SIMPLIFIED PAYLOAD - Matching the working version exactly
      // Convert cart items to the format expected by the API
      const orderItems = cartItems.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        variant: item.variant_name || 'Regular'
      }));

      // Calculate total (including GST)
      const totalAmount = grandTotal;

      // Create payload matching the working static version
      const payload = {
        mobilenumber: customerMobileNumber,
        customer_name: customerName,
        total_amount: totalAmount,
        order_status: 'PENDING',
        order_items: orderItems,
        order_type: `Online-${branch}`,
        restaurant_id: 1, // Using static restaurant_id as in working version
        payment_status: 'PENDING'
      };

      // Add optional fields if needed - but keep it minimal like working version
      console.log('Sending PhonePe payload:', payload);

      // Make PhonePe API call
      const response = await axios.post(`${API_PATH}api/admin/phonepay/order`, payload);

      if (response.status === 200 && response.data.result) {
        // Update payment status to pending
        await updatePaymentStatus(
          order.id, 
          payment.id, 
          'pending', 
          response.data.result.transactionId || merchantTransactionId
        );

        setPaymentStatus('Payment initiated! Redirecting to PhonePe...');
        
        // Store order details for callback
        window.localStorage.setItem("orderdetails", JSON.stringify({
          ...response.data.result,
          order_id: order.id,
          payment_id: payment.id
        }));
        
        // Open PhonePe payment page
        window.open(response.data.result.redirectUrl, '_blank');
        
        // Mark payment as success (this would normally be handled by webhook/callback)
        setTimeout(async () => {
          try {
            await updatePaymentStatus(order.id, payment.id, 'success', response.data.result.transactionId);
            console.log('Payment status updated to success');
          } catch (error) {
            console.error('Error updating payment status:', error);
          }
        }, 5000);

      } else {
        // Payment initiation failed
        await updatePaymentStatus(order.id, payment.id, 'failed', merchantTransactionId);
        setPaymentStatus('Payment initiation failed. Please try again.');
      }

    } catch (error) {
      console.error('Payment error:', error);
      setPaymentStatus('Payment failed. Please try again. Error: ' + (error.response?.data?.message || error.message));
      
      // Try to update the order status to failed
      try {
        const orderId = window.localStorage.getItem('orderdetails') 
          ? JSON.parse(window.localStorage.getItem('orderdetails'))?.order_id 
          : null;
        if (orderId) {
          await supabaseAdmin
            .from("orders")
            .update({
              order_status: 'payment_failed',
              last_updated_by: adminId,
            })
            .eq("id", orderId);
        }
      } catch (updateError) {
        console.error('Error updating order status:', updateError);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
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
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
        <h2>Loading Menu Data...</h2>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ 
            display: 'inline-block',
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #007bff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{ marginTop: '20px', color: '#666' }}>Loading menu items and prices...</p>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <h2 style={{ color: '#333', borderBottom: '2px solid #007bff', paddingBottom: '10px' }}>
        🍽️ PhonePe Payment - Integrated Order System
      </h2>

      {/* Outlet Selector */}
      <div style={{ 
        marginBottom: '20px', 
        padding: '15px', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '8px',
        color: 'white'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
          <label style={{ fontWeight: 'bold' }}>Select Outlet:</label>
          <select 
            value={outletId} 
            onChange={(e) => {
              setOutletId(e.target.value);
              const selectedOutlet = outlets.find(o => o.id === e.target.value);
              if (selectedOutlet) {
                setBranch(selectedOutlet.outlet_name || selectedOutlet.city || 'Selected Branch');
              }
            }}
            style={{ 
              padding: '8px 15px', 
              borderRadius: '4px', 
              border: 'none',
              flex: '1',
              minWidth: '200px',
              fontSize: '14px'
            }}
          >
            {outlets.map(outlet => (
              <option key={outlet.id} value={outlet.id}>
                {outlet.outlet_name} {outlet.city ? `- ${outlet.city}` : ''}
              </option>
            ))}
          </select>
          <span style={{ background: 'rgba(255,255,255,0.2)', padding: '5px 15px', borderRadius: '20px' }}>
            📍 {branch}
          </span>
          <span style={{ background: 'rgba(255,255,255,0.2)', padding: '5px 15px', borderRadius: '20px', fontSize: '12px' }}>
            Items: {menuItems.length}
          </span>
        </div>
      </div>

      {/* Customer Info */}
      <div style={{ 
        marginBottom: '20px', 
        padding: '15px', 
        background: '#f8f9fa', 
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
          <input
            type="text"
            placeholder="Customer Name *"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
          />
          <input
            type="tel"
            placeholder="Mobile Number *"
            value={customerMobileNumber}
            onChange={(e) => setCustomerMobileNumber(e.target.value)}
            style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
          />
          <select
            value={orderType}
            onChange={(e) => setOrderType(e.target.value)}
            style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
          >
            <option value="dine_in">Dine In</option>
            <option value="pickup">Takeaway</option>
            <option value="delivery">Delivery</option>
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
          {orderType === 'dine_in' && (
            <input
              type="text"
              placeholder="Table Number *"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
            />
          )}
          <input
            type="text"
            placeholder="Special Instructions (optional)"
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Menu Items Section */}
        <div>
          <h3>📋 Menu Items</h3>
          {menuItems.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', background: '#f8f9fa', borderRadius: '8px' }}>
              <p style={{ fontSize: '18px', color: '#666' }}>No menu items available</p>
              <p style={{ color: '#999' }}>Try selecting a different outlet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {categories.map(category => {
                const categoryItems = menuItems.filter(item => 
                  item.category_id === category.id && 
                  item.is_available !== false
                );
                if (categoryItems.length === 0) return null;
                
                return (
                  <div key={category.id} style={{ 
                    background: '#f8f9fa', 
                    padding: '15px', 
                    borderRadius: '8px',
                    border: '1px solid #e9ecef'
                  }}>
                    <h4 style={{ marginTop: 0, color: '#495057', borderBottom: '2px solid #dee2e6', paddingBottom: '8px' }}>
                      {category.category_name}
                      <span style={{ fontSize: '12px', color: '#6c757d', marginLeft: '10px' }}>
                        ({categoryItems.length} items)
                      </span>
                    </h4>
                    {categoryItems.map(item => (
                      <div key={item.id} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '10px',
                        marginBottom: '8px',
                        background: 'white',
                        borderRadius: '6px',
                        border: '1px solid #e9ecef',
                        transition: 'all 0.2s'
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <strong>{item.item_name}</strong>
                            {item.short_description && (
                              <span style={{ fontSize: '12px', color: '#6c757d' }}>
                                {item.short_description}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
                            {item.variants?.map((v, idx) => (
                              <span key={v.id}>
                                {idx > 0 && ' | '}
                                {v.variant_name}: ₹{v.selling_price}
                                {v.quantity_label && ` (${v.quantity_label})`}
                              </span>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={() => addToCart(item)}
                          disabled={!item.variants || item.variants.length === 0}
                          style={{
                            padding: '6px 20px',
                            background: (!item.variants || item.variants.length === 0) ? '#6c757d' : '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '20px',
                            cursor: (!item.variants || item.variants.length === 0) ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            transition: 'all 0.2s',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          + Add
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cart Section */}
        <div style={{ 
          background: '#f8f9fa', 
          padding: '20px', 
          borderRadius: '8px', 
          position: 'sticky', 
          top: '20px',
          border: '1px solid #dee2e6',
          maxHeight: 'calc(100vh - 100px)',
          overflow: 'auto'
        }}>
          <h3 style={{ marginTop: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            🛒 Cart
            <span style={{ fontSize: '14px', color: '#6c757d', fontWeight: 'normal' }}>
              {cartItems.length} items
            </span>
          </h3>

          <div style={{ 
            borderTop: '1px solid #dee2e6', 
            paddingTop: '10px', 
            minHeight: '100px',
            maxHeight: '300px',
            overflow: 'auto'
          }}>
            {cartItems.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#6c757d', padding: '30px 0' }}>
                <p style={{ fontSize: '24px', margin: 0 }}>🛒</p>
                <p style={{ margin: '5px 0 0 0' }}>Your cart is empty</p>
                <p style={{ fontSize: '12px' }}>Add items from the menu</p>
              </div>
            ) : (
              cartItems.map((item, index) => (
                <div key={index} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '8px 0', 
                  borderBottom: '1px solid #e9ecef'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '500' }}>{item.name}</div>
                    <div style={{ fontSize: '11px', color: '#6c757d' }}>
                      {item.variant_name} × {item.quantity}
                      {item.quantity_label && ` (${item.quantity_label})`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: '600', color: '#28a745' }}>
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </span>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      style={{
                        padding: '2px 10px',
                        background: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        fontSize: '16px',
                        width: '28px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      −
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ 
            borderTop: '2px solid #495057', 
            marginTop: '10px', 
            paddingTop: '10px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span>Subtotal:</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: '#6c757d' }}>
              <span>Tax (18%):</span>
              <span>₹{taxAmount.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.2em', padding: '8px 0', borderTop: '1px solid #dee2e6' }}>
              <span>Total:</span>
              <span style={{ color: '#28a745' }}>₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
            <button 
              onClick={handlePayment}
              disabled={loading || cartItems.length === 0}
              style={{
                flex: 1,
                padding: '12px',
                background: loading || cartItems.length === 0 ? '#6c757d' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: loading || cartItems.length === 0 ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s'
              }}
            >
              {loading ? 'Processing...' : `Pay ₹${grandTotal.toFixed(2)}`}
            </button>
            
            <button 
              onClick={clearCart}
              disabled={cartItems.length === 0}
              style={{
                padding: '12px 20px',
                background: cartItems.length === 0 ? '#6c757d' : '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                fontSize: '14px',
                cursor: cartItems.length === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              Clear
            </button>
          </div>

          <button 
            onClick={handleReset}
            style={{
              width: '100%',
              padding: '10px',
              marginTop: '10px',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Reset to Default
          </button>
        </div>
      </div>

      {paymentStatus && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          borderRadius: '8px',
          background: paymentStatus.toLowerCase().includes('failed') || paymentStatus.toLowerCase().includes('error') ? '#f8d7da' : 
                      paymentStatus.toLowerCase().includes('success') || paymentStatus.toLowerCase().includes('loaded') ? '#d4edda' : '#d1ecf1',
          color: paymentStatus.toLowerCase().includes('failed') || paymentStatus.toLowerCase().includes('error') ? '#721c24' : 
                 paymentStatus.toLowerCase().includes('success') || paymentStatus.toLowerCase().includes('loaded') ? '#155724' : '#0c5460',
          border: `1px solid ${paymentStatus.toLowerCase().includes('failed') || paymentStatus.toLowerCase().includes('error') ? '#f5c6cb' : 
                                 paymentStatus.toLowerCase().includes('success') || paymentStatus.toLowerCase().includes('loaded') ? '#c3e6cb' : '#bee5eb'}`,
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span style={{ fontSize: '20px' }}>
            {paymentStatus.toLowerCase().includes('failed') || paymentStatus.toLowerCase().includes('error') ? '❌' :
             paymentStatus.toLowerCase().includes('success') || paymentStatus.toLowerCase().includes('loaded') ? '✅' : 'ℹ️'}
          </span>
          <span>{paymentStatus}</span>
        </div>
      )}

      <div style={{ marginTop: '20px', padding: '15px', background: '#e9ecef', borderRadius: '8px', fontSize: '13px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <strong>📊 Order Summary:</strong>
            <div style={{ marginTop: '5px' }}>
              <div>Outlet: <strong>{branch}</strong></div>
              <div>Items: <strong>{cartItems.length}</strong></div>
              <div>Subtotal: <strong>₹{subtotal.toFixed(2)}</strong></div>
              <div>Tax (18%): <strong>₹{taxAmount.toFixed(2)}</strong></div>
              <div style={{ fontSize: '16px', marginTop: '5px' }}>Grand Total: <strong style={{ color: '#28a745' }}>₹{grandTotal.toFixed(2)}</strong></div>
            </div>
          </div>
          <div>
            <strong>🔧 System Info:</strong>
            <div style={{ marginTop: '5px', color: '#6c757d', fontSize: '12px' }}>
              <div>Outlet ID: {outletId}</div>
              <div>Categories: {categories.length}</div>
              <div>Menu Items: {menuItems.length}</div>
              <div>Order Type: {orderType}</div>
              <div>API: {API_PATH}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminPaymentTest;
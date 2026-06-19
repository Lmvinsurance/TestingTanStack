import React, { useState } from 'react';
import axios from 'axios';

const API_PATH = 'https://u18pdq88oa.execute-api.ap-south-1.amazonaws.com/';

function AdminPaymentTest() {
  // Mock data for payload
  const mockPayload = {
    mobilenumber: '9876543210',
    customer_name: 'Rahul Sharma',
    branch: 'Mumbai',
    cartData: {
      totalValue: 500,
      cartItems: [
        { id: 1, name: 'Paneer Butter Masala', price: 280, quantity: 1 },
        { id: 2, name: 'Garlic Naan', price: 60, quantity: 2 },
        { id: 3, name: 'Masala Chai', price: 40, quantity: 2 }
      ]
    }
  };

  const [customerMobileNumber, setCustomerMobileNumber] = useState(mockPayload.mobilenumber);
  const [customerName, setCustomerName] = useState(mockPayload.customer_name);
  const [branch, setBranch] = useState(mockPayload.branch);
  const [cartData, setCartData] = useState(mockPayload.cartData);
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('');

  const handlePayment = async () => {
    setLoading(true);
    setPaymentStatus('Processing payment...');
    
    try {
      const subtotal = parseFloat(cartData.totalValue);
      const gst = parseFloat((subtotal * 0.18).toFixed(2));
      const totalAmount = subtotal + gst;

      const payload = {
        mobilenumber: customerMobileNumber,
        customer_name: customerName,
        total_amount: totalAmount,
        order_status: 'PENDING',
        order_items: cartData.cartItems,
        order_type: `Online-${branch}`,
        restaurant_id: 1,
        payment_status: 'PENDING'
      };

      console.log('Sending payload:', payload);

      const response = await axios.post(`${API_PATH}api/admin/phonepay/order`, payload);

      if (response.status === 200) {
        window.localStorage.setItem("orderdetails", JSON.stringify(response.data.result));
        setPaymentStatus('Payment initiated! Redirecting...');
        window.open(response.data.result.redirectUrl, '_blank');
      }
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentStatus('Payment failed. Please try again.');
      
      console.log('Failed payload:', {
        mobilenumber: customerMobileNumber,
        customer_name: customerName,
        total_amount: (parseFloat(cartData.totalValue) + parseFloat((cartData.totalValue * 0.18).toFixed(2))),
        order_items: cartData.cartItems,
        order_type: `Online-${branch}`
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCustomerMobileNumber(mockPayload.mobilenumber);
    setCustomerName(mockPayload.customer_name);
    setBranch(mockPayload.branch);
    setCartData(mockPayload.cartData);
    setPaymentStatus('');
  };

  const subtotal = parseFloat(cartData.totalValue);
  const gst = parseFloat((subtotal * 0.18).toFixed(2));
  const grandTotal = subtotal + gst;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h2 style={{ color: '#333', borderBottom: '2px solid #007bff', paddingBottom: '10px' }}>
        PhonePe Payment Integration - Test
      </h2>
      
      <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h4 style={{ marginTop: 0 }}>Order Summary</h4>
        <p><strong>Customer:</strong> {customerName}</p>
        <p><strong>Mobile:</strong> {customerMobileNumber}</p>
        <p><strong>Branch:</strong> {branch}</p>
        
        <div style={{ borderTop: '1px solid #ddd', marginTop: '10px', paddingTop: '10px' }}>
          <h5>Items:</h5>
          {cartData.cartItems.map((item, index) => (
            <div key={index} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span>{item.name} x {item.quantity}</span>
              <span>₹{(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
        
        <div style={{ borderTop: '2px solid #333', marginTop: '10px', paddingTop: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Subtotal:</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666' }}>
            <span>GST (18%):</span>
            <span>₹{gst.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.2em' }}>
            <span>Total:</span>
            <span>₹{grandTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button 
          onClick={handlePayment}
          disabled={loading}
          style={{
            flex: 1,
            padding: '12px 24px',
            background: loading ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            fontSize: '16px',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background 0.3s'
          }}
        >
          {loading ? 'Processing...' : 'Pay with PhonePe'}
        </button>
        
        <button 
          onClick={handleReset}
          style={{
            padding: '12px 24px',
            background: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            fontSize: '16px',
            cursor: 'pointer'
          }}
        >
          Reset
        </button>
      </div>

      {paymentStatus && (
        <div style={{
          padding: '12px',
          borderRadius: '5px',
          background: paymentStatus.includes('failed') ? '#f8d7da' : '#d4edda',
          color: paymentStatus.includes('failed') ? '#721c24' : '#155724',
          border: `1px solid ${paymentStatus.includes('failed') ? '#f5c6cb' : '#c3e6cb'}`
        }}>
          {paymentStatus}
        </div>
      )}

      <div style={{ marginTop: '20px', padding: '15px', background: '#d1ecf1', borderRadius: '5px' }}>
        <strong>📤 Payload being sent:</strong>
        <pre style={{ 
          background: '#fff', 
          padding: '10px', 
          borderRadius: '4px',
          fontSize: '12px',
          overflow: 'auto',
          maxHeight: '200px'
        }}>
{`{
  mobilenumber: "${customerMobileNumber}",
  customer_name: "${customerName}",
  total_amount: ${grandTotal.toFixed(2)},
  order_status: "PENDING",
  order_items: ${JSON.stringify(cartData.cartItems, null, 2)},
  order_type: "Online-${branch}",
  restaurant_id: 1,
  payment_status: "PENDING"
}`}
        </pre>
        <p style={{ marginTop: '10px', fontSize: '14px', marginBottom: 0 }}>
          ⚡ Using mock customer data | Actual API call to: <code>{API_PATH}</code>
        </p>
      </div>
    </div>
  );
}

export default AdminPaymentTest;
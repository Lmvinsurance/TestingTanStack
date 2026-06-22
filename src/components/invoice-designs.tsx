import React from 'react';

export type PrintProps = {
  order: any; outlet: any; items: any[]; invoice: any; payment: any; customer: any;
};

export function ThermalReceipt({ order, outlet, items, invoice, payment, customer }: PrintProps) {
  return (
    <div className="invoice-thermal shadow-lg">
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{outlet?.outlet_name ?? 'Restaurant'}</div>
        {outlet?.address && <div>{outlet.address}</div>}
        {(outlet?.city || outlet?.pincode) && <div>{[outlet.city, outlet.pincode].filter(Boolean).join(' - ')}</div>}
        {outlet?.phone && <div>Ph: {outlet.phone}</div>}
      </div>
      <hr />
      <div>Invoice: {invoice?.number ?? '-'}</div>
      <div>Order: {order?.orderNumber}</div>
      <div>Date: {order?.createdAt ? new Date(order.createdAt).toLocaleString() : ''}</div>
      {order?.tableNumber && <div>Table: {order.tableNumber}</div>}
      {(order?.walkInName || customer?.full_name) && <div>Customer: {order?.walkInName ?? customer?.full_name}</div>}
      {(order?.walkInPhone || customer?.phone) && <div>Phone: {order?.walkInPhone ?? customer?.phone}</div>}
      <hr />
      <table style={{ width: '100%', fontSize: 11 }}>
        <thead>
          <tr><th style={{ textAlign: 'left' }}>Item</th><th>Qty</th><th style={{ textAlign: 'right' }}>Amt</th></tr>
        </thead>
        <tbody>
          {items?.map((i, k) => (
            <tr key={k}>
              <td style={{ textAlign: 'left' }}>{i.name}<br /><span style={{ fontSize: 9, color: '#555' }}>{i.variant} @ ₹{i.unit?.toFixed(2)}</span></td>
              <td style={{ textAlign: 'center' }}>{i.qty}</td>
              <td style={{ textAlign: 'right' }}>₹{i.total?.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <hr />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal</span><span>₹{order?.subtotal?.toFixed(2)}</span></div>
      {order?.discountAmount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Discount</span><span>- ₹{order?.discountAmount?.toFixed(2)}</span></div>}
      {order?.taxAmount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Tax</span><span>₹{order?.taxAmount?.toFixed(2)}</span></div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 13, marginTop: 4 }}><span>TOTAL</span><span>₹{order?.grandTotal?.toFixed(2)}</span></div>
      <hr />
      <div>Payment: {(payment?.mode ?? '-').toUpperCase()} ({payment?.status ?? '-'})</div>
      <div style={{ textAlign: 'center', marginTop: 8, fontSize: 10 }}>** Thank you, Visit Again! **</div>
    </div>
  );
}

export function A4Invoice({ order, outlet, items, invoice, payment, customer }: PrintProps) {
  return (
    <div className="invoice-a4 shadow-lg">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{outlet?.outlet_name ?? 'Restaurant'}</h1>
          <div style={{ color: '#555', fontSize: 12 }}>
            {outlet?.address}<br />
            {[outlet?.city, outlet?.state, outlet?.pincode].filter(Boolean).join(', ')}<br />
            {outlet?.phone && <>Phone: {outlet.phone}</>}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>TAX INVOICE</div>
          <div style={{ fontSize: 12 }}>No: <b>{invoice?.number ?? '-'}</b></div>
          <div style={{ fontSize: 12 }}>Date: {order?.createdAt ? new Date(order.createdAt).toLocaleString() : ''}</div>
        </div>
      </div>
      <hr />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 12 }}>
        <div>
          <div style={{ color: '#888', fontSize: 10, textTransform: 'uppercase' }}>Bill To</div>
          <div style={{ fontWeight: 600 }}>{order?.walkInName ?? customer?.full_name ?? 'Walk-in Customer'}</div>
          <div>{order?.walkInPhone ?? customer?.phone ?? ''}</div>
          {customer?.email && <div>{customer.email}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#888', fontSize: 10, textTransform: 'uppercase' }}>Order</div>
          <div>{order?.orderNumber}</div>
          <div>Type: {order?.orderType}{order?.tableNumber ? ` · Table ${order.tableNumber}` : ''}</div>
          <div>Status: {order?.orderStatus}</div>
        </div>
      </div>
      <table style={{ width: '100%', marginTop: 16, borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #333' }}>
            <th style={{ textAlign: 'left', padding: '6px 4px' }}>#</th>
            <th style={{ textAlign: 'left', padding: '6px 4px' }}>Item</th>
            <th style={{ textAlign: 'right', padding: '6px 4px' }}>Rate</th>
            <th style={{ textAlign: 'right', padding: '6px 4px' }}>Qty</th>
            <th style={{ textAlign: 'right', padding: '6px 4px' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {items?.map((i, k) => (
            <tr key={k} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '6px 4px' }}>{k + 1}</td>
              <td style={{ padding: '6px 4px' }}><b>{i.name}</b><br /><span style={{ color: '#666', fontSize: 11 }}>{i.variant}</span></td>
              <td style={{ padding: '6px 4px', textAlign: 'right' }}>₹{i.unit?.toFixed(2)}</td>
              <td style={{ padding: '6px 4px', textAlign: 'right' }}>{i.qty}</td>
              <td style={{ padding: '6px 4px', textAlign: 'right' }}>₹{i.total?.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
        <table style={{ fontSize: 12, minWidth: 280 }}>
          <tbody>
            <tr><td style={{ padding: '4px 8px' }}>Subtotal</td><td style={{ textAlign: 'right', padding: '4px 8px' }}>₹{order?.subtotal?.toFixed(2)}</td></tr>
            {order?.discountAmount > 0 && <tr><td style={{ padding: '4px 8px' }}>Discount</td><td style={{ textAlign: 'right', padding: '4px 8px' }}>- ₹{order?.discountAmount?.toFixed(2)}</td></tr>}
            <tr><td style={{ padding: '4px 8px' }}>Tax</td><td style={{ textAlign: 'right', padding: '4px 8px' }}>₹{order?.taxAmount?.toFixed(2)}</td></tr>
            <tr style={{ borderTop: '2px solid #333', fontWeight: 700, fontSize: 14 }}>
              <td style={{ padding: '6px 8px' }}>Grand Total</td>
              <td style={{ textAlign: 'right', padding: '6px 8px' }}>₹{order?.grandTotal?.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <hr />
      <div style={{ fontSize: 12 }}>
        <b>Payment:</b> {(payment?.mode ?? '-').toUpperCase()} · {payment?.status ?? '-'} · ₹{(payment?.amount ?? order?.grandTotal)?.toFixed(2)}
        {payment?.paidAt && <> · paid {new Date(payment.paidAt).toLocaleString()}</>}
      </div>
      {order?.notes && <div style={{ marginTop: 8, fontSize: 12 }}><b>Notes:</b> {order.notes}</div>}
      <div style={{ marginTop: 24, color: '#666', fontSize: 11, textAlign: 'center' }}>
        This is a computer-generated invoice. Thank you for your business!
      </div>
    </div>
  );
}

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function pad(n: number, w: number) { return String(n).padStart(w, "0"); }
function fmt(num: any) { return Number(num || 0).toFixed(2); }

export async function buildPdfBlob(args: {
  order: any; items: any[]; addons: any[]; payments: any[]; customer: any; outlet: any; invoiceNumber: string;
}): Promise<Blob> {
  const { order, items, addons, payments, customer, outlet, invoiceNumber } = args;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  doc.setFontSize(18); doc.text("Telugu Food Club", 40, 50);
  doc.setFontSize(10); doc.text(outlet?.outlet_name ?? "", 40, 66);
  doc.text(`${outlet?.address ?? ""} ${outlet?.city ?? ""}`, 40, 80);
  doc.setFontSize(14); doc.text("TAX INVOICE", 400, 50);
  doc.setFontSize(10);
  doc.text(`Invoice #: ${invoiceNumber}`, 400, 66);
  doc.text(`Date: ${new Date().toLocaleString()}`, 400, 80);
  doc.text(`Order #: ${order.order_number || order.orderNumber}`, 400, 94);

  doc.setFontSize(11); doc.text("Bill To", 40, 120);
  doc.setFontSize(10);
  doc.text(customer?.full_name ?? "—", 40, 136);
  doc.text(customer?.phone ?? "", 40, 150);
  doc.text(customer?.email ?? "", 40, 164);

  const addonByItem = new Map<string, any[]>();
  addons.forEach((a) => {
    const arr = addonByItem.get(a.order_item_id) ?? [];
    arr.push(a); addonByItem.set(a.order_item_id, arr);
  });
  const rows = items.flatMap((it) => {
    const itemName = it.item_name_snapshot || it.itemName || "";
    const variantName = it.variant_name_snapshot || it.variantName || "";
    const name = itemName + (variantName ? ` — ${variantName}` : "");
    const base = [name,
      String(it.quantity), fmt(it.unit_price_snapshot || it.unitPrice), fmt(it.total_price || it.totalPrice)];
    const adds = (addonByItem.get(it.id) ?? []).map((a) => [`  + ${a.addon_name_snapshot || a.name}`, String(a.quantity), fmt(a.price_snapshot || a.price), fmt(Number(a.price_snapshot || a.price) * Number(a.quantity))]);
    return [base, ...adds];
  });
  autoTable(doc, {
    startY: 190,
    head: [["Item", "Qty", "Rate", "Total"]],
    body: rows,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [184, 71, 28] },
  });
  const endY = (doc as any).lastAutoTable.finalY + 20;
  
  const subtotal = order.subtotal || order.subtotal || 0;
  const tax = order.tax_amount || order.taxAmount || 0;
  const delivery = order.delivery_charge || order.deliveryCharge || 0;
  const discount = order.discount_amount || order.discountAmount || 0;
  const grandTotal = order.grand_total || order.grandTotal || 0;

  const lines = [
    ["Subtotal", fmt(subtotal)],
    ["Tax", fmt(tax)],
    ["Delivery", fmt(delivery)],
    ["Discount", `- ${fmt(discount)}`],
    ["Grand Total", fmt(grandTotal)],
  ];
  lines.forEach(([k, v], i) => {
    doc.setFontSize(i === lines.length - 1 ? 12 : 10);
    doc.text(k, 380, endY + i * 16);
    doc.text(v, 540, endY + i * 16, { align: "right" });
  });
  const paid = payments.find((p) => p.payment_status === "success" || p.paymentStatus === "success");
  if (paid) {
    doc.setFontSize(10); doc.setTextColor(0, 120, 0);
    doc.text(`PAID via ${paid.payment_gateway || paid.paymentGateway}${paid.payment_mode || paid.paymentMode ? " · " + (paid.payment_mode || paid.paymentMode) : ""}${paid.transaction_id || paid.transactionId ? "  TXN " + (paid.transaction_id || paid.transactionId) : ""}`, 40, endY + lines.length * 16 + 24);
    doc.setTextColor(0, 0, 0);
  }
  doc.setFontSize(9);
  doc.text("Thank you for ordering authentic Telugu food.", 40, 800);
  return doc.output("blob");
}

import { Link, useParams, useSearchParams } from "react-router-dom";
import { useServerFn } from "@/lib/react-start-mock";
import { useEffect, useState, useCallback, useRef } from "react";
import { z } from "zod";
import { getInvoicePrintData } from "@/lib/admin-walkin.functions";
import { saveAdminInvoice } from "@/lib/admin-invoices.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft, Download, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const searchSchema = z.object({
  format: z.enum(["thermal", "a4"]).optional().default("thermal"),
  print: z.coerce.number().optional(),
});

const BUCKET = "invoice-pdfs";

function pad(n: number, l: number) { return String(n).padStart(l, "0"); }
function makeInvoiceNumber(outletCode: string | null) {
  const d = new Date();
  const code = (outletCode ?? "KRR").toUpperCase().slice(0, 4);
  const rnd = Math.floor(1000 + Math.random() * 9000);
  return `INV-${code}-${d.getFullYear()}${pad(d.getMonth() + 1, 2)}${pad(d.getDate(), 2)}-${rnd}`;
}

function InvoicePage() {
  const { orderId = "" } = useParams<{ orderId: string }>();
  const [sp] = useSearchParams();
  const search = { format: (sp.get("format") as "thermal" | "a4") || "thermal", print: Number(sp.get("print") || 0) };
  const [format, setFormat] = useState<"thermal" | "a4">(search.format ?? "thermal");
  const fn = useServerFn(getInvoicePrintData);
  const saveFn = useServerFn(saveAdminInvoice);
  
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [working, setWorking] = useState(false);

  const printAreaRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fn({ data: { orderId } });
      setData(res);
    } catch (err: any) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [orderId, fn]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (data && search.print) {
      const t = setTimeout(() => window.print(), 350);
      return () => clearTimeout(t);
    }
  }, [data, search.print]);

  const generateAndSavePDF = async () => {
    if (!printAreaRef.current || !data) return;
    setWorking(true);
    try {
      const { order, outlet } = data;
      const invoiceNumber = data?.invoice?.number ?? makeInvoiceNumber(outlet?.outlet_code ?? null);
      
      const canvas = await html2canvas(printAreaRef.current, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      
      const isThermal = format === "thermal";
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: isThermal ? [215.43, (canvas.height * 215.43) / canvas.width] : "a4"
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      const blob = pdf.output("blob");
      
      const path = `invoices/${order.id}/${invoiceNumber}.pdf`;
      const up = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: "application/pdf", upsert: true });
      if (up.error) throw up.error;
      
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      
      await saveFn({ data: {
        order_id: order.id,
        invoice_number: invoiceNumber,
        invoice_amount: Number(order.grandTotal),
        tax_amount: Number(order.taxAmount),
        invoice_url: pub.publicUrl,
      }});
      
      toast.success(`Invoice ${invoiceNumber} saved from HTML design!`);
      await loadData();
    } catch (e: any) {
      const msg = e?.message ?? "Failed";
      toast.error(msg.includes("Bucket not found") ? "Bucket 'invoice-pdfs' missing — create it in Supabase Storage." : msg);
    } finally {
      setWorking(false);
    }
  };

  if (isLoading) return <p className="p-6 text-sm">Loading…</p>;
  if (error || !data) return <p className="p-6 text-sm text-destructive">Failed to load invoice.</p>;

  const { order, outlet, items, invoice, payment, customer } = data;
  const isThermal = format === "thermal";

  return (
    <div className="min-h-screen bg-muted">
      {/* Toolbar (hidden on print) */}
      <div className="no-print sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b bg-cream px-4 py-2">
        <Link to="/admin/orders" className="inline-flex items-center gap-1 text-sm text-maroon"><ArrowLeft className="h-4 w-4" />Orders</Link>
        
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex overflow-hidden rounded-md border border-gold/40">
            <button onClick={() => setFormat("thermal")} className={`px-3 py-1 text-xs ${isThermal ? "bg-saffron text-cream" : "text-maroon"}`}>Thermal 80mm</button>
            <button onClick={() => setFormat("a4")} className={`px-3 py-1 text-xs ${!isThermal ? "bg-saffron text-cream" : "text-maroon"}`}>A4 Invoice</button>
          </div>
          
          <Button onClick={() => window.print()} size="sm" variant="outline" className="border-gold/40 text-maroon">
            <Printer className="mr-1 h-4 w-4" />Print
          </Button>

          {invoice?.url ? (
            <Button asChild size="sm" variant="outline" className="border-saffron text-saffron-deep">
              <a href={invoice.url} target="_blank" rel="noreferrer">
                <Download className="mr-1 h-4 w-4" /> Download PDF
              </a>
            </Button>
          ) : null}

          <Button onClick={generateAndSavePDF} disabled={working} size="sm" className="bg-saffron text-cream hover:bg-saffron-deep">
            {working ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Download className="mr-1 h-4 w-4" />}
            Save HTML Design to Bucket
          </Button>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          @page { size: ${isThermal ? "80mm auto" : "A4"}; margin: ${isThermal ? "4mm" : "12mm"}; }
        }
        .invoice-thermal { width: 76mm; margin: 0 auto; font-family: ui-monospace, Menlo, monospace; font-size: 11px; color: #000; background: white; padding: 8px; }
        .invoice-a4 { width: 210mm; max-width: 100%; margin: 0 auto; padding: 16mm; font-family: ui-sans-serif, system-ui; color: #111; background: white; }
        .invoice-thermal hr, .invoice-a4 hr { border: none; border-top: 1px dashed #999; margin: 6px 0; }
        .invoice-a4 hr { border-top: 1px solid #ddd; margin: 12px 0; }
      `}</style>

      <div className="py-6 flex justify-center">
        <div ref={printAreaRef} className="bg-white">
          {isThermal ? <ThermalReceipt {...{ order, outlet, items, invoice, payment, customer }} /> : <A4Invoice {...{ order, outlet, items, invoice, payment, customer }} />}
        </div>
      </div>
    </div>
  );
}

type PrintProps = {
  order: any; outlet: any; items: any[]; invoice: any; payment: any; customer: any;
};

function ThermalReceipt({ order, outlet, items, invoice, payment, customer }: PrintProps) {
  return (
    <div className="invoice-thermal shadow-lg">
      <div style={{ textAlign: "center" }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{outlet?.outlet_name ?? "Restaurant"}</div>
        {outlet?.address && <div>{outlet.address}</div>}
        {(outlet?.city || outlet?.pincode) && <div>{[outlet.city, outlet.pincode].filter(Boolean).join(" - ")}</div>}
        {outlet?.phone && <div>Ph: {outlet.phone}</div>}
      </div>
      <hr />
      <div>Invoice: {invoice?.number ?? "—"}</div>
      <div>Order: {order?.orderNumber}</div>
      <div>Date: {order?.createdAt ? new Date(order.createdAt).toLocaleString() : ''}</div>
      {order?.tableNumber && <div>Table: {order.tableNumber}</div>}
      {(order?.walkInName || customer?.full_name) && <div>Customer: {order?.walkInName ?? customer?.full_name}</div>}
      {(order?.walkInPhone || customer?.phone) && <div>Phone: {order?.walkInPhone ?? customer?.phone}</div>}
      <hr />
      <table style={{ width: "100%", fontSize: 11 }}>
        <thead>
          <tr><th style={{ textAlign: "left" }}>Item</th><th>Qty</th><th style={{ textAlign: "right" }}>Amt</th></tr>
        </thead>
        <tbody>
          {items?.map((i: any, k: number) => (
            <tr key={k}>
              <td style={{ textAlign: "left" }}>{i.name}<br /><span style={{ fontSize: 9, color: "#555" }}>{i.variant} @ ₹{i.unit?.toFixed(2)}</span></td>
              <td style={{ textAlign: "center" }}>{i.qty}</td>
              <td style={{ textAlign: "right" }}>₹{i.total?.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <hr />
      <div style={{ display: "flex", justifyContent: "space-between" }}><span>Subtotal</span><span>₹{order?.subtotal?.toFixed(2)}</span></div>
      {order?.discountAmount > 0 && <div style={{ display: "flex", justifyContent: "space-between" }}><span>Discount</span><span>− ₹{order?.discountAmount?.toFixed(2)}</span></div>}
      {order?.taxAmount > 0 && <div style={{ display: "flex", justifyContent: "space-between" }}><span>Tax</span><span>₹{order?.taxAmount?.toFixed(2)}</span></div>}
      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 13, marginTop: 4 }}><span>TOTAL</span><span>₹{order?.grandTotal?.toFixed(2)}</span></div>
      <hr />
      <div>Payment: {(payment?.mode ?? "—").toUpperCase()} ({payment?.status ?? "—"})</div>
      <div style={{ textAlign: "center", marginTop: 8, fontSize: 10 }}>** Thank you, Visit Again! **</div>
    </div>
  );
}

function A4Invoice({ order, outlet, items, invoice, payment, customer }: PrintProps) {
  return (
    <div className="invoice-a4 shadow-lg">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{outlet?.outlet_name ?? "Restaurant"}</h1>
          <div style={{ color: "#555", fontSize: 12 }}>
            {outlet?.address}<br />
            {[outlet?.city, outlet?.state, outlet?.pincode].filter(Boolean).join(", ")}<br />
            {outlet?.phone && <>Phone: {outlet.phone}</>}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>TAX INVOICE</div>
          <div style={{ fontSize: 12 }}>No: <b>{invoice?.number ?? "—"}</b></div>
          <div style={{ fontSize: 12 }}>Date: {order?.createdAt ? new Date(order.createdAt).toLocaleString() : ''}</div>
        </div>
      </div>
      <hr />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, fontSize: 12 }}>
        <div>
          <div style={{ color: "#888", fontSize: 10, textTransform: "uppercase" }}>Bill To</div>
          <div style={{ fontWeight: 600 }}>{order?.walkInName ?? customer?.full_name ?? "Walk-in Customer"}</div>
          <div>{order?.walkInPhone ?? customer?.phone ?? ""}</div>
          {customer?.email && <div>{customer.email}</div>}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "#888", fontSize: 10, textTransform: "uppercase" }}>Order</div>
          <div>{order?.orderNumber}</div>
          <div>Type: {order?.orderType}{order?.tableNumber ? ` · Table ${order.tableNumber}` : ""}</div>
          <div>Status: {order?.orderStatus}</div>
        </div>
      </div>
      <table style={{ width: "100%", marginTop: 16, borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #333" }}>
            <th style={{ textAlign: "left", padding: "6px 4px" }}>#</th>
            <th style={{ textAlign: "left", padding: "6px 4px" }}>Item</th>
            <th style={{ textAlign: "right", padding: "6px 4px" }}>Rate</th>
            <th style={{ textAlign: "right", padding: "6px 4px" }}>Qty</th>
            <th style={{ textAlign: "right", padding: "6px 4px" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {items?.map((i: any, k: number) => (
            <tr key={k} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "6px 4px" }}>{k + 1}</td>
              <td style={{ padding: "6px 4px" }}><b>{i.name}</b><br /><span style={{ color: "#666", fontSize: 11 }}>{i.variant}</span></td>
              <td style={{ padding: "6px 4px", textAlign: "right" }}>₹{i.unit?.toFixed(2)}</td>
              <td style={{ padding: "6px 4px", textAlign: "right" }}>{i.qty}</td>
              <td style={{ padding: "6px 4px", textAlign: "right" }}>₹{i.total?.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
        <table style={{ fontSize: 12, minWidth: 280 }}>
          <tbody>
            <tr><td style={{ padding: "4px 8px" }}>Subtotal</td><td style={{ textAlign: "right", padding: "4px 8px" }}>₹{order?.subtotal?.toFixed(2)}</td></tr>
            {order?.discountAmount > 0 && <tr><td style={{ padding: "4px 8px" }}>Discount</td><td style={{ textAlign: "right", padding: "4px 8px" }}>− ₹{order?.discountAmount?.toFixed(2)}</td></tr>}
            <tr><td style={{ padding: "4px 8px" }}>Tax</td><td style={{ textAlign: "right", padding: "4px 8px" }}>₹{order?.taxAmount?.toFixed(2)}</td></tr>
            <tr style={{ borderTop: "2px solid #333", fontWeight: 700, fontSize: 14 }}>
              <td style={{ padding: "6px 8px" }}>Grand Total</td>
              <td style={{ textAlign: "right", padding: "6px 8px" }}>₹{order?.grandTotal?.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <hr />
      <div style={{ fontSize: 12 }}>
        <b>Payment:</b> {(payment?.mode ?? "—").toUpperCase()} · {payment?.status ?? "—"} · ₹{(payment?.amount ?? order?.grandTotal)?.toFixed(2)}
        {payment?.paidAt && <> · paid {new Date(payment.paidAt).toLocaleString()}</>}
      </div>
      {order?.notes && <div style={{ marginTop: 8, fontSize: 12 }}><b>Notes:</b> {order.notes}</div>}
      <div style={{ marginTop: 24, color: "#666", fontSize: 11, textAlign: "center" }}>
        This is a computer-generated invoice. Thank you for your business!
      </div>
    </div>
  );
}

export default InvoicePage;

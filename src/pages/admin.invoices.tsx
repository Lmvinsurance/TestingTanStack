import { Link } from "react-router-dom";;
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, X, Bell, ChevronLeft, FileText, Download, Loader2, AlertCircle, Inbox } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@/lib/react-start-mock";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminBottomNav, AdminPage, StatCard, Chip } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { listAdminInvoices, getInvoiceOrderDetails, saveAdminInvoice } from "@/lib/admin-invoices.functions";



const BUCKET = "invoice-pdfs";
function fmt(n: number) { return "₹" + Number(n || 0).toLocaleString("en-IN"); }
function pad(n: number, l: number) { return String(n).padStart(l, "0"); }
function makeInvoiceNumber(outletCode: string | null) {
  const d = new Date();
  const code = (outletCode ?? "KRR").toUpperCase().slice(0, 4);
  const rnd = Math.floor(1000 + Math.random() * 9000);
  return `INV-${code}-${d.getFullYear()}${pad(d.getMonth() + 1, 2)}${pad(d.getDate(), 2)}-${rnd}`;
}

async function buildPdfBlob(args: {
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
  doc.text(`Order #: ${order.order_number}`, 400, 94);

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
    const base = [it.item_name_snapshot + (it.variant_name_snapshot ? ` — ${it.variant_name_snapshot}` : ""),
      String(it.quantity), fmt(it.unit_price_snapshot), fmt(it.total_price)];
    const adds = (addonByItem.get(it.id) ?? []).map((a) => [`  + ${a.addon_name_snapshot}`, String(a.quantity), fmt(a.price_snapshot), fmt(Number(a.price_snapshot) * Number(a.quantity))]);
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
  const lines = [
    ["Subtotal", fmt(order.subtotal)],
    ["Tax", fmt(order.tax_amount)],
    ["Delivery", fmt(order.delivery_charge)],
    ["Discount", `- ${fmt(order.discount_amount)}`],
    ["Grand Total", fmt(order.grand_total)],
  ];
  lines.forEach(([k, v], i) => {
    doc.setFontSize(i === lines.length - 1 ? 12 : 10);
    doc.text(k, 380, endY + i * 16);
    doc.text(v, 540, endY + i * 16, { align: "right" });
  });
  const paid = payments.find((p) => p.payment_status === "success");
  if (paid) {
    doc.setFontSize(10); doc.setTextColor(0, 120, 0);
    doc.text(`PAID via ${paid.payment_gateway}${paid.payment_mode ? " · " + paid.payment_mode : ""}${paid.transaction_id ? "  TXN " + paid.transaction_id : ""}`, 40, endY + lines.length * 16 + 24);
    doc.setTextColor(0, 0, 0);
  }
  doc.setFontSize(9);
  doc.text("Thank you for ordering authentic Telugu food.", 40, 800);
  return doc.output("blob");
}

function InvoicesAdmin() {
  const qc = useQueryClient();
  const list = useServerFn(listAdminInvoices);
  const details = useServerFn(getInvoiceOrderDetails);
  const save = useServerFn(saveAdminInvoice);

  const q = useQuery({ queryKey: ["admin", "invoices"], queryFn: () => list(), retry: 1 });

  const [filter, setFilter] = useState<"All" | "Today" | "Generated" | "Pending">("All");
  const [search, setSearch] = useState("");
  const [viewOrder, setViewOrder] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const invoicesByOrder = useMemo(() => new Map((q.data?.invoices ?? []).map((i: any) => [i.order_id, i])), [q.data]);
  const customersById = useMemo(() => new Map((q.data?.customers ?? []).map((c: any) => [c.id, c])), [q.data]);
  const outletsById = useMemo(() => new Map((q.data?.outlets ?? []).map((o: any) => [o.id, o])), [q.data]);

  // Rows: every order, with either its invoice or a pending placeholder
  const rows = useMemo(() => {
    const orders = q.data?.orders ?? [];
    return orders
      .filter((o: any) => ["paid", "cash_on_delivery", "completed"].includes((o.payment_status || "").toLowerCase()) || invoicesByOrder.has(o.id))
      .map((o: any) => ({ order: o, invoice: invoicesByOrder.get(o.id) }))
      .sort((a: any, b: any) => {
        const at = a.invoice?.generated_at ?? a.order.created_at;
        const bt = b.invoice?.generated_at ?? b.order.created_at;
        return new Date(bt).getTime() - new Date(at).getTime();
      });
  }, [q.data, invoicesByOrder]);

  const filtered = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const needle = search.trim().toLowerCase();
    return rows.filter(({ order, invoice }: any) => {
      if (filter === "Generated" && !invoice) return false;
      if (filter === "Pending" && invoice) return false;
      if (filter === "Today") {
        const d = invoice?.generated_at ?? order.created_at;
        if (new Date(d).getTime() < today.getTime()) return false;
      }
      if (!needle) return true;
      const cust: any = customersById.get(order.customer_id);
      return [invoice?.invoice_number, order.order_number, cust?.full_name].filter(Boolean).some((v: string) => String(v).toLowerCase().includes(needle));
    });
  }, [rows, filter, search, customersById]);

  const totals = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const invs = q.data?.invoices ?? [];
    return {
      total: invs.length,
      todayCount: invs.filter((i: any) => new Date(i.generated_at).getTime() >= today.getTime()).length,
      todayAmount: invs.filter((i: any) => new Date(i.generated_at).getTime() >= today.getTime()).reduce((s: number, i: any) => s + Number(i.invoice_amount || 0), 0),
      pending: rows.filter((r: any) => !r.invoice).length,
    };
  }, [q.data, rows]);

  const detailsQ = useQuery({
    queryKey: ["admin", "invoice-details", viewOrder],
    queryFn: () => details({ data: { order_id: viewOrder! } }),
    enabled: !!viewOrder,
  });

  const saveMut = useMutation({
    mutationFn: (v: any) => save({ data: v }),
  });

  const generate = async () => {
    if (!detailsQ.data) return;
    setWorking(true);
    try {
      const { order, items, addons, payments, customer, outlet } = detailsQ.data;
      const invoiceNumber = makeInvoiceNumber(outlet?.outlet_code ?? null);
      const blob = await buildPdfBlob({ order, items, addons, payments, customer, outlet, invoiceNumber });
      const path = `invoices/${order.id}/${invoiceNumber}.pdf`;
      const up = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: "application/pdf", upsert: true });
      if (up.error) throw up.error;
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      await saveMut.mutateAsync({
        order_id: order.id,
        invoice_number: invoiceNumber,
        invoice_amount: Number(order.grand_total),
        tax_amount: Number(order.tax_amount),
        invoice_url: pub.publicUrl,
      });
      toast.success(`Invoice ${invoiceNumber} generated`);
      qc.invalidateQueries({ queryKey: ["admin", "invoices"] });
    } catch (e: any) {
      const msg = e?.message ?? "Failed";
      toast.error(msg.includes("Bucket not found") ? "Bucket 'invoice-pdfs' missing — create it in Supabase Storage." : msg);
    } finally {
      setWorking(false);
    }
  };

  return (
    <AdminPage>
      <header className="header-gradient sticky top-0 z-30 px-3 py-2.5 backdrop-blur sm:px-4 sm:py-3">
        <div className="mx-auto flex max-w-md items-center gap-3 sm:max-w-lg">
          <Link to="/admin/dashboard" className="grid h-10 w-10 place-items-center rounded-full border border-gold/40 text-maroon"><ChevronLeft className="h-4 w-4" /></Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-display truncate text-base leading-tight text-maroon">Invoices</h1>
            <p className="truncate text-[10px] text-maroon-deep/60">Generate, view, download invoices</p>
          </div>
          <button className="relative grid h-10 w-10 place-items-center rounded-full border border-gold/40 text-maroon"><Bell className="h-4 w-4" /></button>
        </div>
      </header>

      <div className="mx-auto max-w-md space-y-4 px-4 py-4 sm:max-w-lg">
        <div className="grid grid-cols-2 gap-2">
          <StatCard label="Total Invoices" value={totals.total} tone="saffron" />
          <StatCard label="Today" value={totals.todayCount} tone="maroon" />
          <StatCard label="Amount Today" value={fmt(totals.todayAmount)} tone="emerald" />
          <StatCard label="Pending Gen" value={totals.pending} tone="amber" />
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-maroon-deep/40" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoice, order, customer" className="w-full rounded-2xl border border-gold/30 bg-card py-2.5 pl-9 pr-3 text-xs focus:border-saffron focus:outline-none" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(["All", "Today", "Generated", "Pending"] as const).map((f) => (
            <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>{f}</Chip>
          ))}
        </div>

        {q.isLoading && <div className="grid place-items-center py-10 text-maroon"><Loader2 className="h-6 w-6 animate-spin" /></div>}
        {q.isError && <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-center text-sm text-red-700"><AlertCircle className="mx-auto mb-2 h-5 w-5" />{(q.error as Error).message}</div>}
        {!q.isLoading && filtered.length === 0 && <div className="rounded-2xl border border-gold/30 bg-card p-8 text-center text-maroon-deep/60"><Inbox className="mx-auto mb-2 h-8 w-8" /><p className="text-sm">No invoices</p></div>}

        <div className="space-y-3">
          {filtered.map(({ order, invoice }: any) => {
            const pending = !invoice;
            const cust: any = customersById.get(order.customer_id);
            const outlet: any = outletsById.get(order.outlet_id);
            return (
              <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-3xl border border-gold/25 bg-card shadow-sm">
                <div className="flex gap-3 p-3">
                  <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${pending ? "bg-amber-500/15 text-amber-700" : "bg-saffron/15 text-saffron-deep"}`}><FileText className="h-6 w-6" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-display truncate text-sm leading-tight text-maroon">{invoice?.invoice_number ?? "Pending"}</p>
                        <p className="truncate text-[10px] text-saffron-deep">{order.order_number} • {outlet?.outlet_name ?? "—"}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${pending ? "bg-amber-500/15 text-amber-700" : "bg-emerald-500/15 text-emerald-700"}`}>{pending ? "Pending" : invoice.is_void ? "Void" : "Generated"}</span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-maroon-deep/70">{cust?.full_name ?? "—"}</p>
                    <div className="mt-1 flex items-center justify-between">
                      <p className="text-[10px] text-maroon-deep/60">{new Date(invoice?.generated_at ?? order.created_at).toLocaleString()}</p>
                      <p className="text-display text-base text-maroon">{fmt(invoice?.invoice_amount ?? order.grand_total)}</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1 border-t border-gold/20 bg-cream/50 p-2 text-[10px] font-semibold">
                  <button onClick={() => setViewOrder(order.id)} className="rounded-lg py-1.5 text-maroon">{pending ? "Generate" : "View"}</button>
                  {!pending && invoice?.invoice_url ? (
                    <a href={invoice.invoice_url} target="_blank" rel="noreferrer" className="rounded-lg py-1.5 text-center text-saffron-deep"><Download className="mr-1 inline h-3 w-3" />PDF</a>
                  ) : <span className="rounded-lg py-1.5 text-center text-maroon-deep/40">—</span>}
                  <button onClick={() => toast.message("Share will be connected later.")} className="rounded-lg py-1.5 text-emerald-700">Share</button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <AdminBottomNav />

      <AnimatePresence>
        {viewOrder && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !working && setViewOrder(null)} className="fixed inset-0 z-50 bg-black/40" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28 }} className="fixed inset-x-0 bottom-0 z-50 max-h-[92vh] overflow-y-auto rounded-t-3xl bg-cream p-5">
              <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-gold/40" />
              <div className="flex items-center justify-between">
                <h2 className="text-display text-xl text-maroon">Invoice Preview</h2>
                <button onClick={() => !working && setViewOrder(null)} className="grid h-9 w-9 place-items-center rounded-full border border-gold/40"><X className="h-4 w-4" /></button>
              </div>

              {detailsQ.isLoading ? (
                <div className="mt-6 grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-maroon" /></div>
              ) : detailsQ.data ? (
                <PreviewBody d={detailsQ.data} existing={invoicesByOrder.get(viewOrder) as any} />
              ) : null}

              <div className="mt-3 grid grid-cols-2 gap-2">
                {invoicesByOrder.get(viewOrder) ? (
                  <>
                    <a href={(invoicesByOrder.get(viewOrder) as any)?.invoice_url ?? "#"} target="_blank" rel="noreferrer" className="rounded-xl border border-gold/40 py-3 text-center text-sm font-semibold text-maroon"><Download className="mr-1 inline h-3 w-3" /> Download</a>
                    <button onClick={generate} disabled={working} className="rounded-xl bg-gradient-to-r from-saffron to-saffron-deep py-3 text-sm font-semibold text-cream disabled:opacity-50">
                      {working ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Regenerate"}
                    </button>
                  </>
                ) : (
                  <button onClick={generate} disabled={working || !detailsQ.data} className="col-span-2 rounded-xl bg-gradient-to-r from-saffron to-saffron-deep py-3 text-sm font-semibold text-cream disabled:opacity-50">
                    {working ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Generate Invoice & Upload PDF"}
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AdminPage>
  );
}

function PreviewBody({ d, existing }: { d: any; existing?: any }) {
  const { order, items, addons, payments, customer, outlet } = d;
  const addonByItem = new Map<string, any[]>();
  (addons ?? []).forEach((a: any) => {
    const arr = addonByItem.get(a.order_item_id) ?? []; arr.push(a); addonByItem.set(a.order_item_id, arr);
  });
  const paid = payments.find((p: any) => p.payment_status === "success");
  return (
    <div className="mt-4 rounded-3xl border-2 border-gold/30 bg-card p-5 shadow-inner">
      <div className="text-center">
        <p className="text-display text-2xl text-maroon">Telugu Food Club</p>
        <p className="text-[10px] uppercase tracking-widest text-saffron-deep">{outlet?.outlet_name ?? ""}</p>
      </div>
      <div className="my-3 border-t border-dashed border-gold/30" />
      <div className="grid grid-cols-2 gap-3 text-[11px]">
        <div><p className="font-bold uppercase text-maroon-deep/60">Outlet</p><p className="text-maroon">{outlet?.outlet_name}</p><p className="text-[10px] text-maroon-deep/60">{outlet?.city}</p></div>
        <div><p className="font-bold uppercase text-maroon-deep/60">Customer</p><p className="text-maroon">{customer?.full_name ?? "—"}</p><p className="text-[10px] text-maroon-deep/60">{customer?.phone ?? ""}</p></div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-[11px]">
        <div><p className="font-bold uppercase text-maroon-deep/60">Invoice #</p><p className="text-maroon">{existing?.invoice_number ?? "(not generated)"}</p></div>
        <div><p className="font-bold uppercase text-maroon-deep/60">Order #</p><p className="text-maroon">{order.order_number}</p></div>
      </div>
      <div className="my-3 border-t border-dashed border-gold/30" />
      <table className="w-full text-[10px]">
        <thead className="text-left text-maroon-deep/60"><tr><th className="py-1">Item</th><th>Qty</th><th>Rate</th><th className="text-right">Total</th></tr></thead>
        <tbody className="text-maroon">
          {items.flatMap((it: any) => [
            <tr key={it.id} className="border-t border-gold/15">
              <td className="py-1.5">{it.item_name_snapshot}{it.variant_name_snapshot ? ` — ${it.variant_name_snapshot}` : ""}</td>
              <td>{it.quantity}</td>
              <td>{fmt(it.unit_price_snapshot)}</td>
              <td className="text-right">{fmt(it.total_price)}</td>
            </tr>,
            ...(addonByItem.get(it.id) ?? []).map((a: any) => (
              <tr key={a.id} className="text-[10px] text-maroon-deep/70">
                <td className="py-0.5 pl-3">+ {a.addon_name_snapshot}</td>
                <td>{a.quantity}</td>
                <td>{fmt(a.price_snapshot)}</td>
                <td className="text-right">{fmt(Number(a.price_snapshot) * Number(a.quantity))}</td>
              </tr>
            )),
          ])}
        </tbody>
      </table>
      <div className="my-3 border-t border-dashed border-gold/30" />
      <div className="space-y-1 text-[11px]">
        {[["Subtotal", fmt(order.subtotal)], ["Tax", fmt(order.tax_amount)], ["Delivery", fmt(order.delivery_charge)], ["Discount", `- ${fmt(order.discount_amount)}`]].map(([k, v]) => (
          <div key={k as string} className="flex justify-between text-maroon"><span>{k}</span><span>{v}</span></div>
        ))}
      </div>
      <div className="my-2 border-t border-dashed border-gold/30" />
      <div className="flex justify-between text-display text-lg text-maroon"><span>Grand Total</span><span>{fmt(order.grand_total)}</span></div>
      {paid && (
        <div className="mt-3 rounded-xl bg-emerald-500/10 px-3 py-2 text-center text-[11px] font-semibold text-emerald-700">
          PAID via {paid.payment_gateway}{paid.transaction_id ? ` · TXN ${paid.transaction_id}` : ""}
        </div>
      )}
      <p className="mt-3 text-center text-[10px] italic text-maroon-deep/60">Thank you for ordering authentic Telugu food.</p>
    </div>
  );
}

export default InvoicesAdmin;

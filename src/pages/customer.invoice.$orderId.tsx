import { Link, useParams, useSearchParams } from "react-router-dom";
import { useServerFn } from "@/lib/react-start-mock";
import { useEffect, useState } from "react";
import { z } from "zod";
import { getCustomerInvoicePrintData } from "@/lib/invoices.functions";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft } from "lucide-react";
import { ThermalReceipt, A4Invoice } from "@/components/invoice-designs";

const searchSchema = z.object({
  format: z.enum(["thermal", "a4"]).optional().default("a4"),
  print: z.coerce.number().optional(),
});

function CustomerInvoicePage() {
  const { orderId = "" } = useParams<{ orderId: string }>();
  const [sp] = useSearchParams();
  const search = { format: (sp.get("format") as "thermal" | "a4") || "a4", print: Number(sp.get("print") || 0) };
  const [format, setFormat] = useState<"thermal" | "a4">(search.format ?? "a4");
  const fn = useServerFn(getCustomerInvoicePrintData);
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;
    const fetchInvoice = async () => {
      setIsLoading(true);
      try {
        const res = await fn({ data: { orderId } });
        if (active) setData(res);
      } catch (err: any) {
        if (active) setError(err);
      } finally {
        if (active) setIsLoading(false);
      }
    };
    fetchInvoice();
    return () => { active = false; };
  }, [orderId, fn]);

  useEffect(() => {
    if (data && search.print) {
      const t = setTimeout(() => window.print(), 350);
      return () => clearTimeout(t);
    }
  }, [data, search.print]);

  if (isLoading) return <p className="p-6 text-sm">Loading…</p>;
  if (error || !data) return <p className="p-6 text-sm text-destructive">Failed to load invoice.</p>;

  const { order, outlet, items, invoice, payment, customer } = data;
  const isThermal = format === "thermal";

  return (
    <div className="min-h-screen bg-muted">
      {/* Toolbar (hidden on print) */}
      <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-2 border-b bg-cream px-4 py-2">
        <Link to={`/customer/order/${orderId}`} className="inline-flex items-center gap-1 text-sm text-maroon"><ArrowLeft className="h-4 w-4" />Back to Order</Link>
        <div className="flex items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-md border border-gold/40 bg-white">
            <button onClick={() => setFormat("thermal")} className={`px-3 py-1 text-xs ${isThermal ? "bg-saffron text-cream" : "text-maroon"}`}>Thermal 80mm</button>
            <button onClick={() => setFormat("a4")} className={`px-3 py-1 text-xs ${!isThermal ? "bg-saffron text-cream" : "text-maroon"}`}>A4 Invoice</button>
          </div>
          <Button onClick={() => window.print()} size="sm"><Printer className="mr-1 h-4 w-4" />Print</Button>
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

      <div className="py-6 overflow-x-auto">
        {isThermal ? <ThermalReceipt {...{ order, outlet, items, invoice, payment, customer }} /> : <A4Invoice {...{ order, outlet, items, invoice, payment, customer }} />}
      </div>
    </div>
  );
}

export default CustomerInvoicePage;

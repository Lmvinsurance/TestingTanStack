import { Link } from "react-router-dom";;
import { useServerFn } from "@/lib/react-start-mock";
import { useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { ArrowLeft, Download, Upload, FileSpreadsheet, FileText, AlertCircle, CheckCircle2, Loader2, X, Database } from "lucide-react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { bulkInsertRows } from "@/lib/admin-bulk.functions";
import {
  BULK_MODULES,
  MODULE_LIST,
  buildCsvTemplate,
  downloadBlob,
  parseRow,
  type BulkModuleKey,
  type ModuleSpec,
} from "@/lib/bulk-templates";



function BulkUploadPage() {
  const [active, setActive] = useState<BulkModuleKey>("outlets");
  const spec = BULK_MODULES[active];

  return (
    <main className="min-h-screen bg-cream pb-10">
      <header className="sticky top-12 z-20 border-b border-gold/20 bg-cream/95 px-4 py-3 backdrop-blur md:top-0">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3">
          <Link to="/admin/dashboard" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-gold/40 text-maroon">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-display truncate text-base leading-tight text-maroon sm:text-lg">Bulk Upload</h1>
            <p className="truncate text-[10px] text-maroon-deep/60 sm:text-xs">
              Download templates, fill them in, and upload to insert many rows at once
            </p>
          </div>
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-saffron/20 text-saffron-deep">
            <Database className="h-4 w-4" />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl space-y-4 px-4 py-4">
        {/* Module tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {MODULE_LIST.map((m) => (
            <button
              key={m.key}
              onClick={() => setActive(m.key)}
              className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition ${
                active === m.key
                  ? "border-saffron bg-saffron text-cream shadow"
                  : "border-gold/30 bg-card text-maroon hover:bg-saffron/10"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <ModulePanel key={active} spec={spec} />
      </div>
    </main>
  );
}

function ModulePanel({ spec }: { spec: ModuleSpec }) {
  const bulkInsert = useServerFn(bulkInsertRows);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [rowErrors, setRowErrors] = useState<Record<number, string[]>>({});
  const [fileName, setFileName] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ inserted: number; failed: number; errors: { row: number; message: string }[] } | null>(null);

  const validCount = useMemo(
    () => rows.filter((_, i) => !rowErrors[i]?.length).length,
    [rows, rowErrors],
  );
  const invalidCount = rows.length - validCount;

  function reset() {
    setRows([]);
    setRowErrors({});
    setFileName("");
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function downloadCsv() {
    const blob = new Blob([buildCsvTemplate(spec)], { type: "text/csv;charset=utf-8;" });
    downloadBlob(`${spec.key}-template.csv`, blob);
  }

  function downloadXlsx() {
    const headers = spec.columns.map((c) => c.name);
    const exampleRow = spec.columns.map((c) => (c.example ?? "") as string | number | boolean);
    const hintRow = spec.columns.map((c) => {
      const parts = [c.required ? "required" : "optional", c.type];
      if (c.enumValues) parts.push(`one of: ${c.enumValues.join("|")}`);
      if (c.fk) parts.push(`FK → ${c.fk}`);
      if (c.hint) parts.push(c.hint);
      return parts.join(" • ");
    });
    const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow, hintRow]);
    // bold header
    const colWidths = headers.map((h, i) => ({
      wch: Math.max(h.length + 2, String(exampleRow[i] ?? "").length + 2, 14),
    }));
    (ws as XLSX.WorkSheet)["!cols"] = colWidths;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, spec.label.slice(0, 28));

    // Reference sheet for enums + FK
    const refRows: (string | number)[][] = [["Field", "Allowed values / Format"]];
    spec.columns.forEach((c) => {
      if (c.enumValues) refRows.push([c.name, c.enumValues.join(", ")]);
      else if (c.fk) refRows.push([c.name, `Lookup by ${c.fk}`]);
      else if (c.hint) refRows.push([c.name, c.hint]);
    });
    if (refRows.length > 1) {
      const refWs = XLSX.utils.aoa_to_sheet(refRows);
      XLSX.utils.book_append_sheet(wb, refWs, "Reference");
    }
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    downloadBlob(`${spec.key}-template.xlsx`, new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  }

  function handleFile(file: File) {
    setResult(null);
    setFileName(file.name);
    const name = file.name.toLowerCase();
    if (name.endsWith(".csv") || file.type === "text/csv") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => {
          ingestRaw(res.data as Record<string, unknown>[]);
        },
        error: (err) => toast.error(`CSV parse failed: ${err.message}`),
      });
    } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = new Uint8Array(ev.target?.result as ArrayBuffer);
          const wb = XLSX.read(data, { type: "array" });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
          ingestRaw(json);
        } catch (e) {
          toast.error(`XLSX parse failed: ${e instanceof Error ? e.message : "Unknown error"}`);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      toast.error("Please upload a .csv or .xlsx file");
    }
  }

  function ingestRaw(raw: Record<string, unknown>[]) {
    // Drop the hint-row that XLSX templates include (3rd line)
    const cleaned = raw.filter((r) => {
      const firstVal = Object.values(r)[0];
      if (typeof firstVal !== "string") return true;
      return !/^(required|optional)\s•/i.test(firstVal);
    });
    const parsed = cleaned.map((r) => parseRow(r, spec));
    const newRows = parsed.map((p) => p.row);
    const errs: Record<number, string[]> = {};
    parsed.forEach((p, i) => {
      if (p.errors.length) errs[i] = p.errors;
    });
    setRows(newRows);
    setRowErrors(errs);
    if (newRows.length === 0) toast.error("No rows found in file");
    else toast.success(`Parsed ${newRows.length} row${newRows.length === 1 ? "" : "s"}`);
  }

  async function handleSubmit() {
    const goodRows = rows.filter((_, i) => !rowErrors[i]?.length);
    if (goodRows.length === 0) {
      toast.error("No valid rows to upload");
      return;
    }
    setSubmitting(true);
    setResult(null);
    try {
      const res = await bulkInsert({ data: { module: spec.key, rows: goodRows } });
      setResult(res);
      if (res.inserted > 0) toast.success(`Inserted ${res.inserted} row${res.inserted === 1 ? "" : "s"}`);
      if (res.failed > 0) toast.error(`${res.failed} row${res.failed === 1 ? "" : "s"} failed`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="rounded-3xl border border-gold/25 bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-display text-xl text-maroon">{spec.label}</h2>
            <p className="mt-1 text-xs text-maroon-deep/60">{spec.description}</p>
            <p className="mt-2 text-[11px] text-maroon-deep/50">
              Target table: <span className="font-mono text-maroon">{spec.table}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={downloadCsv}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gold/40 bg-cream px-3 py-2 text-xs font-semibold text-maroon hover:bg-saffron/10"
            >
              <FileText className="h-3.5 w-3.5" /> CSV template
            </button>
            <button
              onClick={downloadXlsx}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gold/40 bg-cream px-3 py-2 text-xs font-semibold text-maroon hover:bg-saffron/10"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" /> XLSX template
            </button>
          </div>
        </div>
      </div>

      {/* Column reference */}
      <details className="rounded-3xl border border-gold/25 bg-card p-4 shadow-sm">
        <summary className="cursor-pointer text-xs font-semibold text-maroon">
          Show column reference ({spec.columns.length} columns)
        </summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[11px]">
            <thead className="text-maroon-deep/60">
              <tr className="border-b border-gold/20">
                <th className="py-1.5 pr-3">Column</th>
                <th className="py-1.5 pr-3">Type</th>
                <th className="py-1.5 pr-3">Required</th>
                <th className="py-1.5 pr-3">Notes</th>
                <th className="py-1.5 pr-3">Example</th>
              </tr>
            </thead>
            <tbody>
              {spec.columns.map((c) => (
                <tr key={c.name} className="border-b border-gold/10">
                  <td className="py-1.5 pr-3 font-mono text-maroon">{c.name}</td>
                  <td className="py-1.5 pr-3 text-maroon-deep/70">{c.type}</td>
                  <td className="py-1.5 pr-3">{c.required ? <span className="font-semibold text-red-600">yes</span> : <span className="text-maroon-deep/50">no</span>}</td>
                  <td className="py-1.5 pr-3 text-maroon-deep/70">
                    {c.fk && <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-blue-700">FK → {c.fk}</span>}
                    {c.enumValues && <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-amber-700">{c.enumValues.join(" | ")}</span>}
                    {!c.fk && !c.enumValues && (c.hint ?? "")}
                  </td>
                  <td className="py-1.5 pr-3 font-mono text-maroon-deep/60">{String(c.example ?? "")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      {/* Upload zone */}
      <div className="rounded-3xl border-2 border-dashed border-gold/40 bg-card p-6 text-center shadow-sm">
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        {fileName ? (
          <div className="flex items-center justify-center gap-3">
            <FileSpreadsheet className="h-5 w-5 text-saffron-deep" />
            <span className="text-sm font-semibold text-maroon">{fileName}</span>
            <button onClick={reset} className="grid h-7 w-7 place-items-center rounded-full border border-gold/40 text-maroon">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <>
            <Upload className="mx-auto h-8 w-8 text-saffron-deep/70" />
            <p className="mt-2 text-sm font-semibold text-maroon">Drop a CSV or XLSX file here</p>
            <p className="mt-1 text-[11px] text-maroon-deep/60">or click below to choose a file</p>
          </>
        )}
        <button
          onClick={() => fileRef.current?.click()}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-saffron to-saffron-deep px-4 py-2 text-xs font-semibold text-cream shadow"
        >
          <Upload className="h-3.5 w-3.5" /> Choose file
        </button>
      </div>

      {/* Preview */}
      {rows.length > 0 && (
        <div className="rounded-3xl border border-gold/25 bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 font-semibold text-emerald-700">
                <CheckCircle2 className="h-3 w-3" /> {validCount} valid
              </span>
              {invalidCount > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 font-semibold text-red-700">
                  <AlertCircle className="h-3 w-3" /> {invalidCount} invalid
                </span>
              )}
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting || validCount === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-maroon to-maroon-deep px-4 py-2 text-xs font-semibold text-cream shadow disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              Insert {validCount} row{validCount === 1 ? "" : "s"}
            </button>
          </div>

          <div className="mt-4 max-h-96 overflow-auto rounded-xl border border-gold/20">
            <table className="w-full text-left text-[11px]">
              <thead className="sticky top-0 bg-cream/95 text-maroon-deep/70">
                <tr className="border-b border-gold/30">
                  <th className="px-2 py-1.5">#</th>
                  {spec.columns.map((c) => (
                    <th key={c.name} className="px-2 py-1.5 font-mono">
                      {c.name}
                    </th>
                  ))}
                  <th className="px-2 py-1.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 200).map((r, i) => {
                  const errs = rowErrors[i] ?? [];
                  return (
                    <tr key={i} className={`border-b border-gold/10 ${errs.length ? "bg-red-50/60" : ""}`}>
                      <td className="px-2 py-1.5 text-maroon-deep/50">{i + 1}</td>
                      {spec.columns.map((c) => (
                        <td key={c.name} className="px-2 py-1.5 font-mono text-maroon-deep/80">
                          {r[c.name] === null || r[c.name] === undefined || r[c.name] === ""
                            ? <span className="text-maroon-deep/30">—</span>
                            : String(r[c.name])}
                        </td>
                      ))}
                      <td className="px-2 py-1.5">
                        {errs.length ? (
                          <span className="text-[10px] text-red-700">{errs.join("; ")}</span>
                        ) : (
                          <span className="text-emerald-600">OK</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {rows.length > 200 && (
              <p className="border-t border-gold/20 bg-cream/60 px-3 py-2 text-[11px] text-maroon-deep/60">
                Showing 200 of {rows.length} rows. All valid rows will be inserted.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="rounded-3xl border border-gold/25 bg-card p-4 shadow-sm">
          <h3 className="text-display text-base text-maroon">Upload result</h3>
          <div className="mt-2 flex gap-3 text-xs">
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 font-semibold text-emerald-700">
              Inserted: {result.inserted}
            </span>
            {result.failed > 0 && (
              <span className="rounded-full bg-red-500/10 px-2.5 py-1 font-semibold text-red-700">
                Failed: {result.failed}
              </span>
            )}
          </div>
          {result.errors.length > 0 && (
            <div className="mt-3 max-h-48 overflow-auto rounded-xl border border-red-200 bg-red-50 p-3 text-[11px] text-red-700">
              {result.errors.map((e, i) => (
                <div key={i}>
                  Row {e.row}: {e.message}
                </div>
              ))}
            </div>
          )}
          <button onClick={reset} className="mt-3 text-xs font-semibold text-saffron-deep">
            Upload another file
          </button>
        </div>
      )}

      <div className="rounded-3xl border border-gold/20 bg-cream/60 p-4 text-[11px] text-maroon-deep/70">
        <p className="font-semibold text-maroon">Tips</p>
        <ul className="mt-1 list-inside list-disc space-y-1">
          <li>Booleans accept <code className="font-mono">true/false</code>, <code className="font-mono">yes/no</code>, or <code className="font-mono">1/0</code>.</li>
          <li>Times use 24-hour <code className="font-mono">HH:MM</code> format.</li>
          <li>FK columns are matched on the value shown (slug, code, or name) — they are resolved to IDs server-side.</li>
          <li>Rows with validation errors are skipped; valid rows still upload.</li>
        </ul>
      </div>
    </div>
  );
}

export default BulkUploadPage;

import { useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { client } from "../api/client";
import AppHeader from "../components/AppHeader";
import { useEmployee } from "../hooks/useEmployee";

const TEMPLATE = `department,employee,metric,period,target,achieved,remarks
Sales,amit@palis.in,Revenue (₹),2026-09,2000000,1850000,On track
Sales,amit@palis.in,Orders Closed,2026-09,150,142,
Production,ravi@palis.in,Units Produced,2026-09,4200,3980,Line 2 downtime
Production,ravi@palis.in,Defect Rate (%),2026-09,2,1.8,`;

type RowError = { row: number; message: string };
type UploadResult = { updated: number; errors: RowError[] };

function downloadTemplate() {
  const blob = new Blob([TEMPLATE], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "kpi-upload-template.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function CsvUploadPage() {
  const { employee, loading: meLoading } = useEmployee();
  const [csv, setCsv] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [fatalError, setFatalError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const canUpload = !!employee && employee.role === "ADMIN";

  async function onFileChosen(file: File | undefined) {
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    setFatalError("");
    const text = await file.text();
    setCsv(text);
  }

  async function upload() {
    if (!csv) return;
    setUploading(true);
    setFatalError("");
    setResult(null);
    try {
      const { data } = await client.post<UploadResult>("/kpi/upload-csv", {
        csv,
      });
      setResult(data);
      setCsv(null);
      setFileName("");
      if (fileRef.current) fileRef.current.value = "";
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Upload failed — check the file and try again";
      setFatalError(msg);
    } finally {
      setUploading(false);
    }
  }

  if (!meLoading && employee && !canUpload) {
    return <Navigate to="/dashboard" replace />;
  }

  const dataRowCount = csv
    ? csv
        .trim()
        .split(/\r?\n/)
        .filter((l) => l.trim().length > 0).length - 1
    : 0;

  return (
    <div className="min-h-screen bg-white">
      <AppHeader />
      <div className="p-8 max-w-3xl">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-ink">
              Upload KPIs (CSV)
            </h1>
            <p className="text-sm text-muted mt-1">
              Bulk-update targets &amp; achievements for a whole period at once.
              Existing rows for the same employee + metric + period are
              overwritten.
            </p>
          </div>
          <Link
            to="/dashboard"
            className="text-sm font-medium text-primary hover:text-deep"
          >
            Back to dashboard
          </Link>
        </div>

        <div className="bg-panel border border-line rounded-lg p-5 mb-6 text-sm text-muted leading-relaxed">
          <p className="font-medium text-ink mb-2">Expected format</p>
          <p className="mb-2">
            Header row:{" "}
            <code className="font-mono text-xs bg-white border border-line rounded px-1.5 py-0.5">
              department,employee,metric,period,target,achieved,remarks
            </code>
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <b>department</b> and <b>metric</b> must match the seeded names
              (case-insensitive), e.g. <i>Sales</i>, <i>Revenue (₹)</i>.
            </li>
            <li>
              <b>employee</b> is matched by <b>email</b> (safest) or by exact
              name within that department.
            </li>
            <li>
              <b>period</b> is <span className="font-mono">YYYY-MM</span>;{" "}
              <b>remarks</b> is optional.
            </li>
          </ul>
          <button
            onClick={downloadTemplate}
            className="mt-3 text-sm font-medium text-primary hover:text-deep"
          >
            Download a template CSV
          </button>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => onFileChosen(e.target.files?.[0])}
            className="text-sm text-muted file:mr-3 file:px-4 file:py-2 file:rounded-md file:border-0 file:bg-primary file:text-white file:text-sm file:font-semibold file:hover:bg-deep file:cursor-pointer"
          />
          <button
            onClick={upload}
            disabled={!csv || uploading}
            className="px-4 py-2 rounded-md bg-primary text-white text-sm font-semibold hover:bg-deep disabled:opacity-50"
          >
            {uploading
              ? "Uploading…"
              : `Upload${csv ? ` (${dataRowCount} rows)` : ""}`}
          </button>
        </div>
        {fileName && (
          <p className="text-xs text-muted mt-2 font-mono">{fileName}</p>
        )}
        {fatalError && <p className="text-bad text-sm mt-4">{fatalError}</p>}

        {result && (
          <div className="mt-6 border border-line rounded-lg overflow-hidden">
            <div className="bg-panel px-4 py-3 border-b border-line flex items-center gap-6 text-sm">
              <span className="text-ink font-medium">
                Rows written:{" "}
                <span className="text-primary font-mono">{result.updated}</span>
              </span>
              <span className="text-muted">
                Skipped:{" "}
                <span
                  className={`font-mono ${result.errors.length ? "text-warn" : ""}`}
                >
                  {result.errors.length}
                </span>
              </span>
              {result.updated > 0 && (
                <Link
                  to="/dashboard"
                  className="ml-auto text-primary font-medium hover:text-deep"
                >
                  View live charts →
                </Link>
              )}
            </div>
            {result.errors.length > 0 && (
              <table className="w-full text-sm">
                <thead className="bg-white text-left text-muted">
                  <tr>
                    <th className="px-4 py-2 font-medium w-20">CSV row</th>
                    <th className="px-4 py-2 font-medium">Problem</th>
                  </tr>
                </thead>
                <tbody>
                  {result.errors.map((e, i) => (
                    <tr key={i} className="border-t border-line">
                      <td className="px-4 py-2 font-mono text-muted">
                        {e.row}
                      </td>
                      <td className="px-4 py-2 text-bad">{e.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

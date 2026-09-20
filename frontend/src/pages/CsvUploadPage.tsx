import { useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { client } from "../api/client";
import AppHeader from "../components/AppHeader";
import { useEmployee } from "../hooks/useEmployee";

const TEMPLATES: Record<string, string> = {
  Sales: `department,employee,metric,period,target,achieved,remarks
Sales,replace_me@email.com,Leads Generated,19-09-2026,100,90,
Sales,replace_me@email.com,Calls Made,19-09-2026,50,45,
Sales,replace_me@email.com,Orders Closed,19-09-2026,7,6,
Sales,replace_me@email.com,Revenue (₹),19-09-2026,75000,70000,On track`,

  Production: `department,employee,metric,period,target,achieved,remarks
Production,replace_me@email.com,Units Produced,19-09-2026,1000,950,
Production,replace_me@email.com,Defect Rate (%),19-09-2026,2,1.5,Line 2 check
Production,replace_me@email.com,On-time Delivery (%),19-09-2026,98,99,`,

  Service: `department,employee,metric,period,target,achieved,remarks
Service,replace_me@email.com,Complaints Closed,19-09-2026,20,18,
Service,replace_me@email.com,Avg Response Time (hrs),19-09-2026,4,3.5,
Service,replace_me@email.com,Repeat Complaints,19-09-2026,2,1,`,

  Purchase: `department,employee,metric,period,target,achieved,remarks
Purchase,replace_me@email.com,Cost Savings (₹),19-09-2026,5000,5200,
Purchase,replace_me@email.com,PO Completion (%),19-09-2026,100,95,
Purchase,replace_me@email.com,Supplier Score,19-09-2026,90,92,`,

  HR: `department,employee,metric,period,target,achieved,remarks
HR,replace_me@email.com,Attendance (%),19-09-2026,95,96,
HR,replace_me@email.com,Positions Filled,19-09-2026,5,4,
HR,replace_me@email.com,Retention (%),19-09-2026,90,95,`,

  Accounts: `department,employee,metric,period,target,achieved,remarks
Accounts,replace_me@email.com,Collections (₹),19-09-2026,100000,98000,
Accounts,replace_me@email.com,Payments Processed,19-09-2026,50,50,
Accounts,replace_me@email.com,Outstanding (₹),19-09-2026,20000,15000,`,
};

type RowError = { row: number; message: string };
type UploadResult = { updated: number; errors: RowError[] };
type CombinedError = RowError & { file: string };
type CombinedResult = { updated: number; errors: CombinedError[] };

function downloadTemplate(departmentName: string) {
  const csvContent = TEMPLATES[departmentName];
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `kpi-template-${departmentName.toLowerCase()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function CsvUploadPage() {
  const { employee, loading: meLoading } = useEmployee();
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<CombinedResult | null>(null);
  const [fatalError, setFatalError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const canUpload = !!employee && employee.role === "ADMIN";

  function onFilesChosen(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setFiles(Array.from(fileList));
    setResult(null);
    setFatalError("");
  }

  async function upload() {
    if (files.length === 0) return;
    setUploading(true);
    setFatalError("");
    setResult(null);

    let totalUpdated = 0;
    const allErrors: CombinedError[] = [];

    for (const file of files) {
      let csvString = "";

      try {
        if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
          const buffer = await file.arrayBuffer();
          const workbook = XLSX.read(buffer, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          csvString = XLSX.utils.sheet_to_csv(worksheet);
        } else {
          csvString = await file.text();
        }
      } catch (err) {
        allErrors.push({
          file: file.name,
          row: 0,
          message: "Could not read or parse file.",
        });
        continue;
      }

      try {
        const { data } = await client.post<UploadResult>("/kpi/upload-csv", {
          csv: csvString,
        });
        totalUpdated += data.updated;
        const fileErrors = data.errors.map((e) => ({ ...e, file: file.name }));
        allErrors.push(...fileErrors);
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response
            ?.data?.message ?? "Upload failed for this file.";
        allErrors.push({ file: file.name, row: 0, message: msg });
      }
    }

    setResult({ updated: totalUpdated, errors: allErrors });
    setFiles([]);
    if (fileRef.current) fileRef.current.value = "";
    setUploading(false);
  }

  if (!meLoading && employee && !canUpload) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-white">
      <AppHeader />
      <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-ink">
              Upload KPIs (CSV / Excel)
            </h1>
            <p className="text-sm text-muted mt-1 max-w-2xl">
              Bulk-update targets &amp; achievements for a specific date at
              once. Existing rows for the same employee + metric + period are
              overwritten.
            </p>
          </div>
          <Link
            to="/dashboard"
            className="text-sm font-medium text-primary hover:text-deep shrink-0 transition-colors"
          >
            &larr; Back to dashboard
          </Link>
        </div>

        <div className="bg-panel border border-line rounded-lg p-5 sm:p-6 mb-6 text-sm text-muted leading-relaxed shadow-sm">
          <p className="font-medium text-ink mb-2">Expected format</p>
          <div className="mb-3 overflow-x-auto pb-1">
            <span className="mr-2">Header row:</span>
            <code className="font-mono text-xs bg-white border border-line rounded px-1.5 py-0.5 whitespace-nowrap">
              department,employee,metric,period,target,achieved,remarks
            </code>
          </div>
          <ul className="list-disc pl-5 space-y-1.5 mb-5">
            <li>
              <b>department</b> and <b>metric</b> must match the seeded names
              (case-insensitive), e.g. <i>Sales</i>, <i>Revenue (₹)</i>.
            </li>
            <li>
              <b>employee</b> is matched by <b>email</b> (safest) or by exact
              name within that department.
            </li>
            <li>
              <b>period</b> is a specific date in{" "}
              <span className="font-mono">DD-MM-YYYY</span> (e.g.{" "}
              <span className="font-mono">19-09-2026</span>). Monthly and yearly
              reports are aggregated from these dates automatically.{" "}
              <b>remarks</b> is optional.
            </li>
          </ul>

          <div className="pt-4 border-t border-line">
            <p className="font-medium text-ink mb-3">
              Download a department template:
            </p>
            <div className="flex flex-wrap gap-2.5">
              {Object.keys(TEMPLATES).map((deptName) => (
                <button
                  key={deptName}
                  onClick={() => downloadTemplate(deptName)}
                  className="text-xs font-medium text-primary bg-white border border-primary/30 hover:border-primary hover:bg-primary/5 px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  {deptName}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="w-full sm:flex-1 sm:max-w-md">
            <input
              ref={fileRef}
              type="file"
              multiple
              accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xls,application/vnd.ms-excel"
              onChange={(e) => onFilesChosen(e.target.files)}
              className="w-full text-sm text-muted border border-line rounded-md bg-panel p-1 
                         file:mr-3 file:px-4 file:py-2 file:rounded-md file:border-0 
                         file:bg-primary file:text-white file:text-sm file:font-semibold 
                         file:hover:bg-deep file:cursor-pointer transition-all"
            />
          </div>
          <button
            onClick={upload}
            disabled={files.length === 0 || uploading}
            className="w-full sm:w-auto px-6 py-2.5 rounded-md bg-primary text-white text-sm font-semibold hover:bg-deep disabled:opacity-50 transition-colors"
          >
            {uploading
              ? "Uploading…"
              : `Upload${files.length > 0 ? ` (${files.length} file${files.length > 1 ? "s" : ""})` : ""}`}
          </button>
        </div>

        {files.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {files.map((f, i) => (
              <span
                key={i}
                className="inline-flex items-center px-2 py-1 rounded bg-panel border border-line text-xs font-mono text-muted"
              >
                {f.name}
              </span>
            ))}
          </div>
        )}

        {fatalError && (
          <div className="mt-4 p-3 border border-line bg-panel rounded-md">
            <p className="text-bad text-sm font-medium">{fatalError}</p>
          </div>
        )}

        {result && (
          <div className="mt-8 border border-line rounded-lg overflow-hidden shadow-sm">
            <div className="bg-panel px-4 py-3 sm:px-6 border-b border-line flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-sm">
              <span className="text-ink font-medium">
                Total rows written:{" "}
                <span className="text-primary font-mono text-base">
                  {result.updated}
                </span>
              </span>
              <span className="text-muted">
                Total skipped:{" "}
                <span
                  className={`font-mono text-base ${result.errors.length ? "text-warn font-semibold" : ""}`}
                >
                  {result.errors.length}
                </span>
              </span>
              {result.updated > 0 && (
                <Link
                  to="/dashboard"
                  className="sm:ml-auto text-primary font-medium hover:text-deep transition-colors"
                >
                  View live charts &rarr;
                </Link>
              )}
            </div>
            {result.errors.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[500px]">
                  <thead className="bg-white text-left text-muted border-b border-line">
                    <tr>
                      <th className="px-4 py-3 font-medium">File</th>
                      <th className="px-4 py-3 font-medium w-24">Row</th>
                      <th className="px-4 py-3 font-medium">Problem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {result.errors.map((e, i) => (
                      <tr key={i} className="hover:bg-panel transition-colors">
                        <td className="px-4 py-3 text-ink font-medium">
                          {e.file}
                        </td>
                        <td className="px-4 py-3 font-mono text-muted">
                          {e.row > 0 ? e.row : "—"}
                        </td>
                        <td className="px-4 py-3 text-bad font-medium">
                          {e.message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Download, History, Search } from "lucide-react";
import { downloadCsv, type AdminAuditLogRow } from "./types";

interface AdminAuditTabProps {
  auditLogs: AdminAuditLogRow[];
}

function getActionBadgeStyle(action: string): string {
  if (action.includes("DELETE") || action.includes("SUSPEND") || action.includes("CANCEL")) {
    return "bg-[#dc2626]/10 text-[#dc2626]";
  }
  if (
    action.includes("CREATE") ||
    action.includes("APPROVE") ||
    action.includes("ACTIVATE")
  ) {
    return "bg-[#16a34a]/10 text-[#15803d]";
  }
  if (action.includes("BROADCAST") || action.includes("EXTEND") || action.includes("RESET")) {
    return "bg-[#b45309]/10 text-[#b45309]";
  }
  return "bg-[#f4f4f5] text-[#525252]";
}

export function AdminAuditTab({ auditLogs }: AdminAuditTabProps) {
  const [query, setQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");

  const distinctActions = useMemo(
    () => Array.from(new Set(auditLogs.map((l) => l.action))).sort(),
    [auditLogs]
  );

  const filteredLogs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return auditLogs.filter((log) => {
      if (actionFilter !== "ALL" && log.action !== actionFilter) return false;
      if (!q) return true;
      return `${log.action} ${log.target} ${log.details} ${log.adminEmail}`
        .toLowerCase()
        .includes(q);
    });
  }, [actionFilter, auditLogs, query]);

  return (
    <div className="rounded-xl border border-[#171717]/8 bg-white">
      <div className="flex flex-col justify-between gap-3 border-b border-[#171717]/8 p-4 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search
              className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#737373]"
              strokeWidth={1.5}
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari toko, invoice, admin..."
              className="h-9 w-full rounded-lg border border-[#171717]/12 bg-[#fafafa] pr-3 pl-9 text-xs outline-none focus:border-[#171717] focus:bg-white"
            />
          </div>

          <select
            aria-label="Filter jenis aksi admin"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="h-9 cursor-pointer rounded-lg border border-[#171717]/12 bg-[#fafafa] px-3 text-xs font-medium text-[#171717] outline-none focus:border-[#171717]"
          >
            <option value="ALL">Semua aksi ({auditLogs.length})</option>
            {distinctActions.map((act) => (
              <option key={act} value={act}>
                {act}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          disabled={filteredLogs.length === 0}
          onClick={() =>
            downloadCsv(
              `ngeprint-audit-log-${new Date().toISOString().slice(0, 10)}.csv`,
              ["Waktu", "Admin", "Aksi", "Target", "Detail"],
              filteredLogs.map((l) => [
                new Date(l.createdAt).toLocaleString("id-ID"),
                l.adminEmail,
                l.action,
                l.target,
                l.details,
              ])
            )
          }
          className="btn-action inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-[#171717]/10 bg-white px-3 text-xs font-medium text-[#171717] hover:bg-[#f4f4f5] disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5 text-[#737373]" strokeWidth={1.5} />
          <span>Ekspor CSV</span>
        </button>
      </div>

      {filteredLogs.length === 0 ? (
        <div className="py-12 text-center text-xs text-[#737373]">
          <History
            className="mx-auto mb-2 h-5 w-5 text-[#a1a1aa]"
            strokeWidth={1.5}
          />
          <p>Belum ada catatan aktivitas admin yang sesuai filter.</p>
        </div>
      ) : (
        <div className="divide-y divide-[#171717]/8">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              className="flex flex-col justify-between gap-2 p-4 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={`rounded px-2 py-0.5 font-mono-num text-[11px] font-semibold ${getActionBadgeStyle(log.action)}`}
                  >
                    {log.action}
                  </span>
                  {log.target && (
                    <span className="font-medium text-[#171717]">
                      {log.target}
                    </span>
                  )}
                </div>
                {log.details && (
                  <p className="mt-1 text-xs text-[#525252]">{log.details}</p>
                )}
              </div>

              <div className="shrink-0 text-left sm:text-right">
                <p className="font-mono-num text-[11px] text-[#737373]">
                  {new Date(log.createdAt).toLocaleString("id-ID")}
                </p>
                <p className="font-mono-num text-[11px] text-[#525252]">
                  {log.adminEmail}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { Loader2, Save, RotateCcw } from "lucide-react";

interface StickySaveBarProps {
  saving: boolean;
  errorText?: string | null;
  onReset: () => void;
  onSave: () => void;
}

export function StickySaveBar({
  saving,
  errorText,
  onReset,
  onSave,
}: StickySaveBarProps) {
  return (
    <div className="no-print fixed right-3 bottom-[72px] left-3 z-50 mx-auto max-w-3xl lg:right-4 lg:bottom-4 lg:left-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#171717]/15 bg-[#1f1b16] px-4 py-3 text-white shadow-2xl">
        <div className="flex min-w-0 flex-1 items-center gap-2.5 text-xs">
          <span className="h-2 w-2 shrink-0 rounded-full bg-[#d9381e]" />
          <span className="truncate font-medium">
            {errorText ? errorText : "Ada perubahan pengaturan yang belum disimpan"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={onReset}
            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-white/15 px-3 text-xs font-medium text-white/85 hover:bg-white/10 disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>Batal</span>
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={onSave}
            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-[#d9381e] px-3.5 text-xs font-medium text-white hover:bg-[#be2e17] disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
            ) : (
              <Save className="h-3.5 w-3.5" strokeWidth={1.5} />
            )}
            <span>{saving ? "Menyimpan..." : "Simpan Perubahan"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

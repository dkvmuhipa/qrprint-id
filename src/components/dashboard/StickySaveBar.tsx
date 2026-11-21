"use client";

import { Loader2, Save, RotateCcw } from "lucide-react";

interface StickySaveBarProps {
  saving: boolean;
  onReset: () => void;
  onSave: () => void;
}

export function StickySaveBar({
  saving,
  onReset,
  onSave,
}: StickySaveBarProps) {
  return (
    <div className="no-print fixed right-4 bottom-4 left-4 z-40 mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#171717]/15 bg-[#1f1b16] px-4 py-3 text-white shadow-2xl">
        <div className="flex items-center gap-2.5 text-xs">
          <span className="h-2 w-2 rounded-full bg-[#d9381e]" />
          <span className="font-medium">
            Ada perubahan pengaturan yang belum disimpan
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

"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
const installListeners = new Set<() => void>();

function notifyInstallListeners() {
  for (const fn of installListeners) fn();
}

export function PwaRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          reg.update().catch(() => {});
        })
        .catch(() => {
          // Ignore registration errors in unsupported contexts
        });
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredInstallPrompt = e as BeforeInstallPromptEvent;
      notifyInstallListeners();
    };

    const onInstalled = () => {
      deferredInstallPrompt = null;
      notifyInstallListeners();
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  return null;
}

export function PwaInstallButton() {
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const sync = () => setCanInstall(Boolean(deferredInstallPrompt));
    sync();
    installListeners.add(sync);
    return () => {
      installListeners.delete(sync);
    };
  }, []);

  if (!canInstall) return null;

  async function handleInstall() {
    if (!deferredInstallPrompt) return;
    try {
      await deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      if (choice.outcome === "accepted") {
        deferredInstallPrompt = null;
        notifyInstallListeners();
      }
    } catch {
      // ignore
    }
  }

  return (
    <button
      type="button"
      onClick={handleInstall}
      title="Pasang Ngeprint sebagai aplikasi di perangkat ini"
      className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-[#d9381e]/30 bg-[#d9381e]/10 px-2.5 text-xs font-medium text-[#d9381e] transition-colors hover:bg-[#d9381e] hover:text-white"
    >
      <Download className="h-3.5 w-3.5" strokeWidth={1.6} />
      <span className="hidden sm:inline">Install App</span>
    </button>
  );
}

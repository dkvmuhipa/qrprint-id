"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import jsQR from "jsqr";
import {
  QrCode,
  Printer,
  Settings,
  Terminal,
  CreditCard,
  LogOut,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  Download,
  Banknote,
  FileText,
  ShieldCheck,
  XCircle,
  Loader2,
  AlertTriangle,
  Volume2,
  VolumeX,
  Search,
  Lock,
  Receipt,
  RotateCcw,
  X,
  ShoppingCart,
  Trash2,
  Bluetooth,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import { formatInvoicePlanLabel } from "@/lib/plans";
import {
  buildMiniQrEscPos,
  buildReceiptEscPos,
  printMiniQr58mmWindow,
  printReceipt58mmWindow,
  printViaRawBt,
  printViaWebBluetooth,
} from "@/lib/thermal-58mm";
import type { DashboardData, PrintJobItem } from "@/components/dashboard/types";
import { ReceiptModal } from "@/components/dashboard/ReceiptModal";
import { DailyRecapModal } from "@/components/dashboard/DailyRecapModal";
import { AgentTab } from "@/components/dashboard/AgentTab";
import { StickySaveBar } from "@/components/dashboard/StickySaveBar";
import { PwaInstallButton } from "@/components/PwaInstaller";
import { QueueTab } from "@/components/dashboard/QueueTab";
import { QrTab } from "@/components/dashboard/QrTab";
import { BillingTab } from "@/components/dashboard/BillingTab";
import { SettingsTab } from "@/components/dashboard/SettingsTab";
import {
  downloadAgentEnvFile,
  downloadShopPosterPng,
  exportShopJobsCsv,
  playCashierBell,
  type PosterThemeId,
} from "@/components/dashboard/helpers";

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTabParam = searchParams.get("tab");

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);
  const fetchingDashboardRef = useRef(false);
  const [tab, setTab] = useState<
    "queue" | "qr" | "billing" | "settings" | "agent"
  >(initialTabParam === "billing" ? "billing" : "queue");
  const [qrUrl, setQrUrl] = useState("");
  const [qrImage, setQrImage] = useState("");
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [busyJobId, setBusyJobId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const knownPaidJobIdsRef = useRef<Set<string> | null>(null);

  // Billing & Cart state
  const [creatingPlanId, setCreatingPlanId] = useState<string | null>(null);
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
  const [invoiceQrDataUrl, setInvoiceQrDataUrl] = useState<string>("");
  const [billingMsg, setBillingMsg] = useState<string | null>(null);
  const [cart, setCart] = useState<{
    planId: string | null;
    listener: boolean;
    extraPrinters: number;
    urlChange: boolean;
    pasFoto: boolean;
  }>({
    planId: null,
    listener: false,
    extraPrinters: 0,
    urlChange: false,
    pasFoto: false,
  });
  const [checkingOutCart, setCheckingOutCart] = useState(false);

  async function handleCheckoutCart() {
    const items: string[] = [];
    if (cart.planId) items.push(cart.planId);
    if (cart.listener) items.push("ADDON_LISTENER");
    if (cart.extraPrinters > 0) {
      items.push(
        cart.extraPrinters === 1
          ? "ADDON_PRINTER"
          : `ADDON_PRINTER*${cart.extraPrinters}`
      );
    }
    if (cart.urlChange) items.push("ADDON_URL_CHANGE");
    if (cart.pasFoto) items.push("ADDON_PASFOTO");
    if (items.length === 0) return;

    setCheckingOutCart(true);
    setBillingMsg(null);
    try {
      const res = await fetch("/api/shop/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const json = await res.json();
      if (res.ok) {
        setCart({
          planId: null,
          listener: false,
          extraPrinters: 0,
          urlChange: false,
          pasFoto: false,
        });
        setBillingMsg(
          `Invoice ${json.invoice?.invoiceCode || ""} berhasil dibuat. Silakan selesaikan pembayaran di atas.`
        );
        await fetchDashboard();
        if (typeof window !== "undefined") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      } else {
        setBillingMsg(json.error || "Gagal membuat tagihan keranjang.");
      }
    } catch {
      setBillingMsg("Tidak dapat terhubung ke server. Periksa koneksi Anda.");
    } finally {
      setCheckingOutCart(false);
    }
  }

  const [settingsForm, setSettingsForm] = useState({
    shopCode: "",
    name: "",
    address: "",
    qrisName: "",
    bwPrice: 500,
    colorPrice: 1500,
    photoPrice: 3000,
    duplexDiscount: 10,
    f4ExtraPrice: 100,
    bindingLakbanPrice: 3000,
    bindingMikaPrice: 5000,
    bindingSpiralPrice: 10000,
    bwPrinter: "Default Printer",
    colorPrinter: "Default Printer",
    photoPrinter: "Default Printer",
    bwPrinters: ["Default Printer"] as string[],
    colorPrinters: ["Default Printer"] as string[],
    photoPrinters: ["Default Printer"] as string[],
    thermalPrinter: "",
    autoPrintReceipt: false,
    isOpenManual: true,
    openHour: "",
    closeHour: "",
    closedMessage: "",
    staticQrisString: "",
    midtransServerKey: "",
    midtransIsProd: false,
  });
  const [settingsInitialized, setSettingsInitialized] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null);
  const [settingsErr, setSettingsErr] = useState<string | null>(null);
  const [decodingQris, setDecodingQris] = useState(false);
  const [qrisDecodeMsg, setQrisDecodeMsg] = useState<string | null>(null);

  // Password & modal state
  const [pwForm, setPwForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwIsError, setPwIsError] = useState(false);
  const [posterSize, setPosterSize] = useState<"A5" | "A4">("A5");
  const [posterTheme, setPosterTheme] = useState<PosterThemeId>("vermilion");
  const [downloadingPoster, setDownloadingPoster] = useState(false);
  const [receiptJob, setReceiptJob] = useState<PrintJobItem | null>(null);
  const [showDailyRecap, setShowDailyRecap] = useState(false);
  const [printingThermal, setPrintingThermal] = useState(false);
  const [thermalMsg, setThermalMsg] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);
  const [btDeviceName, setBtDeviceName] = useState<string | null>(null);

  function buildReceiptPayload(job: PrintJobItem) {
    return {
      shopName: data?.shop?.name || "Ngeprint",
      shopAddress: data?.shop?.address || "",
      jobCode: job.jobCode,
      createdAt: job.createdAt,
      customerName: job.customerName,
      fileName: job.fileName,
      pageCount: job.pageCount,
      pageRange: job.pageRange,
      copies: job.copies,
      colorMode: job.colorMode,
      paperSize: job.paperSize,
      duplex: job.duplex,
      bindingType: job.bindingType,
      bindingPrice: job.bindingPrice,
      paymentMethod: job.paymentMethod,
      totalPrice: job.totalPrice,
    };
  }

  function handlePrintReceipt58mm(job: PrintJobItem) {
    setThermalMsg(null);
    try {
      printReceipt58mmWindow(buildReceiptPayload(job));
      setThermalMsg({
        type: "ok",
        text: "Jendela cetak 58mm dibuka. Pilih printer thermal Bluetooth/USB Anda.",
      });
    } catch (err) {
      setThermalMsg({
        type: "err",
        text: err instanceof Error ? err.message : "Gagal membuka cetak 58mm.",
      });
    }
  }

  async function handlePrintReceiptBluetooth(job: PrintJobItem) {
    setPrintingThermal(true);
    setThermalMsg(null);
    try {
      const escpos = buildReceiptEscPos(buildReceiptPayload(job));
      const { deviceName } = await printViaWebBluetooth(escpos);
      setBtDeviceName(deviceName);
      setThermalMsg({
        type: "ok",
        text: `Struk 58mm terkirim ke Bluetooth (${deviceName}).`,
      });
    } catch (err) {
      setThermalMsg({
        type: "err",
        text: err instanceof Error ? err.message : "Gagal cetak via Bluetooth.",
      });
    } finally {
      setPrintingThermal(false);
    }
  }

  function handlePrintReceiptRawBt(job: PrintJobItem) {
    setThermalMsg(null);
    try {
      const escpos = buildReceiptEscPos(buildReceiptPayload(job));
      printViaRawBt(escpos);
      setThermalMsg({
        type: "ok",
        text: "Perintah ESC/POS dikirim ke aplikasi RawBT Android.",
      });
    } catch (err) {
      setThermalMsg({
        type: "err",
        text: err instanceof Error ? err.message : "Gagal kirim ke RawBT.",
      });
    }
  }

  function handlePrintMiniQr58mm() {
    if (!data?.shop || !qrImage) return;
    setThermalMsg(null);
    try {
      const pUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/s/${data.shop.shopCode}`
          : `/s/${data.shop.shopCode}`;
      printMiniQr58mmWindow({
        shopName: data.shop.name,
        shopAddress: data.shop.address,
        portalUrl: pUrl,
        bwPrice: data.shop.bwPrice,
        colorPrice: data.shop.colorPrice,
        qrDataUrl: qrImage,
      });
      setThermalMsg({
        type: "ok",
        text: "Jendela cetak Mini QR 58mm dibuka.",
      });
    } catch (err) {
      setThermalMsg({
        type: "err",
        text: err instanceof Error ? err.message : "Gagal membuka cetak Mini QR 58mm.",
      });
    }
  }

  async function handlePrintMiniQrBluetooth() {
    if (!data?.shop) return;
    setPrintingThermal(true);
    setThermalMsg(null);
    try {
      const pUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/s/${data.shop.shopCode}`
          : `/s/${data.shop.shopCode}`;
      const escpos = buildMiniQrEscPos({
        shopName: data.shop.name,
        shopAddress: data.shop.address,
        portalUrl: pUrl,
        bwPrice: data.shop.bwPrice,
        colorPrice: data.shop.colorPrice,
      });
      const { deviceName } = await printViaWebBluetooth(escpos);
      setBtDeviceName(deviceName);
      setThermalMsg({
        type: "ok",
        text: `Mini QR 58mm tercetak via Bluetooth (${deviceName}).`,
      });
    } catch (err) {
      setThermalMsg({
        type: "err",
        text: err instanceof Error ? err.message : "Gagal cetak Mini QR via Bluetooth.",
      });
    } finally {
      setPrintingThermal(false);
    }
  }

  function handlePrintMiniQrRawBt() {
    if (!data?.shop) return;
    setThermalMsg(null);
    try {
      const pUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/s/${data.shop.shopCode}`
          : `/s/${data.shop.shopCode}`;
      const escpos = buildMiniQrEscPos({
        shopName: data.shop.name,
        shopAddress: data.shop.address,
        portalUrl: pUrl,
        bwPrice: data.shop.bwPrice,
        colorPrice: data.shop.colorPrice,
      });
      printViaRawBt(escpos);
      setThermalMsg({
        type: "ok",
        text: "Mini QR 58mm dikirim ke aplikasi RawBT Android.",
      });
    } catch (err) {
      setThermalMsg({
        type: "err",
        text: err instanceof Error ? err.message : "Gagal kirim Mini QR ke RawBT.",
      });
    }
  }

  function buildSampleTestJob(): PrintJobItem {
    return {
      id: "test-58mm",
      jobCode: "NP-TEST",
      customerName: "Tes Printer 58mm",
      fileName: "Contoh-Dokumen-Skripsi.pdf",
      pageCount: 5,
      copies: 1,
      colorMode: "BW",
      paperSize: "A4",
      duplex: false,
      pageRange: "ALL",
      totalPrice: (data?.shop?.bwPrice || 500) * 5,
      paymentMethod: "QRIS",
      paymentStatus: "PAID",
      printStatus: "COMPLETED",
      storedFilePath: null,
      fileDeletedAt: null,
      createdAt: new Date().toISOString(),
    };
  }

  async function handleDownloadPosterPng() {
    if (!data?.shop || !qrImage) return;
    setDownloadingPoster(true);
    try {
      await downloadShopPosterPng({
        shop: data.shop,
        qrImage,
        qrUrl,
        posterSize,
        theme: posterTheme,
      });
    } finally {
      setDownloadingPoster(false);
    }
  }

  function handleDownloadAgentEnv() {
    if (!data?.shop) return;
    downloadAgentEnvFile(data.shop);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    setPwIsError(false);

    if (pwForm.newPassword.length < 6) {
      setPwIsError(true);
      setPwMsg("Kata sandi baru minimal 6 karakter.");
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwIsError(true);
      setPwMsg("Konfirmasi kata sandi baru tidak cocok.");
      return;
    }

    setSavingPw(true);
    try {
      const res = await fetch("/api/shop/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CHANGE_PASSWORD",
          currentPassword: pwForm.currentPassword,
          newPassword: pwForm.newPassword,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setPwIsError(true);
        setPwMsg(json.error || "Gagal mengganti kata sandi.");
      } else {
        setPwIsError(false);
        setPwMsg(json.message || "Kata sandi berhasil diperbarui.");
        setPwForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      }
    } catch {
      setPwIsError(true);
      setPwMsg("Tidak dapat terhubung ke server.");
    } finally {
      setSavingPw(false);
    }
  }

  async function handleDecodeQrisImage(file: File | null) {
    if (!file) return;
    setDecodingQris(true);
    setQrisDecodeMsg(null);
    try {
      const imgUrl = URL.createObjectURL(file);
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Gagal membaca gambar"));
        img.src = imgUrl;
      });
      const canvas = document.createElement("canvas");
      const maxDim = 1200;
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas tidak didukung");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imgData.data, imgData.width, imgData.height);
      URL.revokeObjectURL(imgUrl);

      if (!code || !code.data || !code.data.startsWith("000201")) {
        setQrisDecodeMsg(
          "QRIS tidak terbaca dari gambar. Pastikan foto QRIS jelas/tidak terpotong atau tempel string QRIS secara manual."
        );
      } else {
        setSettingsForm((prev) => ({ ...prev, staticQrisString: code.data }));
        setQrisDecodeMsg(
          "QRIS Toko berhasil terbaca. Klik 'Simpan pengaturan' di bawah untuk mengaktifkan."
        );
      }
    } catch {
      setQrisDecodeMsg("Gagal memproses gambar QRIS.");
    } finally {
      setDecodingQris(false);
    }
  }

  const fetchDashboard = useCallback(async () => {
    if (fetchingDashboardRef.current) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setConnectionError(true);
      setLoading(false);
      return;
    }
    fetchingDashboardRef.current = true;
    try {
      const res = await fetch("/api/shop/me", { cache: "no-store" });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (res.ok) {
        const json: DashboardData = await res.json();
        setConnectionError(false);
        const currentPaidIds = new Set(
          json.jobs
            .filter((j) => j.paymentStatus === "PAID")
            .map((j) => j.id)
        );
        if (knownPaidJobIdsRef.current !== null && soundEnabled) {
          let hasNewPaidJob = false;
          for (const id of currentPaidIds) {
            if (!knownPaidJobIdsRef.current.has(id)) {
              hasNewPaidJob = true;
              break;
            }
          }
          if (hasNewPaidJob) {
            playCashierBell();
          }
        }
        knownPaidJobIdsRef.current = currentPaidIds;

        setData(json);
        if (!settingsInitialized) {
          setSettingsForm({
            shopCode: json.shop.shopCode,
            name: json.shop.name,
            address: json.shop.address,
            qrisName: json.shop.qrisName,
            bwPrice: json.shop.bwPrice,
            colorPrice: json.shop.colorPrice,
            photoPrice: json.shop.photoPrice,
            duplexDiscount: json.shop.duplexDiscount,
            f4ExtraPrice: json.shop.f4ExtraPrice ?? 100,
            bindingLakbanPrice: json.shop.bindingLakbanPrice ?? 3000,
            bindingMikaPrice: json.shop.bindingMikaPrice ?? 5000,
            bindingSpiralPrice: json.shop.bindingSpiralPrice ?? 10000,
            bwPrinter: json.shop.bwPrinter,
            colorPrinter: json.shop.colorPrinter,
            photoPrinter: json.shop.photoPrinter || "Default Printer",
            bwPrinters: json.shop.bwPrinters || [json.shop.bwPrinter || "Default Printer"],
            colorPrinters: json.shop.colorPrinters || [json.shop.colorPrinter || "Default Printer"],
            photoPrinters: json.shop.photoPrinters || [json.shop.photoPrinter || "Default Printer"],
            thermalPrinter: json.shop.thermalPrinter || "",
            autoPrintReceipt: Boolean(json.shop.autoPrintReceipt),
            isOpenManual: json.shop.isOpenManual !== false,
            openHour: json.shop.openHour || "",
            closeHour: json.shop.closeHour || "",
            closedMessage: json.shop.closedMessage || "",
            staticQrisString: "",
            midtransServerKey: "",
            midtransIsProd: Boolean(json.shop.midtransIsProd),
          });
          setSettingsInitialized(true);
        }
      }
    } catch {
      // Gracefully handle transient network errors / server restarts during polling
      setConnectionError(true);
    } finally {
      fetchingDashboardRef.current = false;
      setLoading(false);
    }
  }, [router, settingsInitialized, soundEnabled]);

  useEffect(() => {
    fetchDashboard();
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      fetchDashboard();
    }, 3000);
    const onVisibility = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        fetchDashboard();
      }
    };
    const onOnline = () => {
      fetchDashboard();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
    };
  }, [fetchDashboard]);

  useEffect(() => {
    if (!data?.shop.shopCode || typeof window === "undefined") return;
    const url = `${window.location.origin}/s/${data.shop.shopCode}`;
    setQrUrl(url);
    QRCode.toDataURL(url, {
      width: 320,
      margin: 2,
      color: { dark: "#171717", light: "#ffffff" },
    })
      .then(setQrImage)
      .catch(() => {});
  }, [data?.shop.shopCode]);

  const activePendingInvoice = data?.invoices.find(
    (inv) => inv.status === "PENDING"
  );

  useEffect(() => {
    if (!activePendingInvoice) {
      setInvoiceQrDataUrl("");
      return;
    }
    if (
      activePendingInvoice.paymentProvider === "MIDTRANS" &&
      activePendingInvoice.qrisUrl
    ) {
      setInvoiceQrDataUrl(activePendingInvoice.qrisUrl);
      return;
    }
    if (!activePendingInvoice.qrisString) {
      setInvoiceQrDataUrl("");
      return;
    }
    QRCode.toDataURL(activePendingInvoice.qrisString, {
      width: 280,
      margin: 2,
      color: { dark: "#171717", light: "#ffffff" },
    })
      .then(setInvoiceQrDataUrl)
      .catch(() => setInvoiceQrDataUrl(""));
  }, [activePendingInvoice]);

  async function handleCreateSubscriptionInvoice(planId: string) {
    setCreatingPlanId(planId);
    setBillingMsg(null);
    try {
      const res = await fetch("/api/shop/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      if (res.ok) {
        await fetchDashboard();
      }
    } catch {
      setBillingMsg("Tidak dapat terhubung ke server. Periksa koneksi Anda.");
    } finally {
      setCreatingPlanId(null);
    }
  }

  async function handleInvoiceAction(
    invoiceId: string,
    action: "CHECK_STATUS" | "CANCEL"
  ) {
    setPayingInvoiceId(invoiceId);
    setBillingMsg(null);
    try {
      const res = await fetch("/api/shop/subscription", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId, action }),
      });
      const json = await res.json();
      if (res.ok && json.paid) {
        setBillingMsg(
          `Pembayaran berhasil. Paket toko Anda kini aktif pada paket ${json.shop.plan}.`
        );
      } else if (action === "CHECK_STATUS" && !json.paid) {
        setBillingMsg(
          json.message || "Pembayaran belum terkonfirmasi dari Midtrans."
        );
      }
      await fetchDashboard();
    } catch {
      setBillingMsg("Tidak dapat terhubung ke server. Periksa koneksi Anda.");
    } finally {
      setPayingInvoiceId(null);
    }
  }

  async function handleJobAction(jobId: string, action: string) {
    setBusyJobId(jobId);
    try {
      await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      await fetchDashboard();
    } catch {
      setConnectionError(true);
    } finally {
      setBusyJobId(null);
    }
  }

  function handleResetSettings() {
    if (!data?.shop) return;
    const s = data.shop;
    setSettingsForm({
      shopCode: s.shopCode,
      name: s.name,
      address: s.address,
      qrisName: s.qrisName,
      bwPrice: s.bwPrice,
      colorPrice: s.colorPrice,
      photoPrice: s.photoPrice,
      duplexDiscount: s.duplexDiscount,
      f4ExtraPrice: s.f4ExtraPrice ?? 100,
      bindingLakbanPrice: s.bindingLakbanPrice ?? 3000,
      bindingMikaPrice: s.bindingMikaPrice ?? 5000,
      bindingSpiralPrice: s.bindingSpiralPrice ?? 10000,
      bwPrinter: s.bwPrinter,
      colorPrinter: s.colorPrinter,
      photoPrinter: s.photoPrinter || "Default Printer",
      bwPrinters: s.bwPrinters || [s.bwPrinter || "Default Printer"],
      colorPrinters: s.colorPrinters || [s.colorPrinter || "Default Printer"],
      photoPrinters: s.photoPrinters || [s.photoPrinter || "Default Printer"],
      thermalPrinter: s.thermalPrinter || "",
      autoPrintReceipt: Boolean(s.autoPrintReceipt),
      isOpenManual: s.isOpenManual !== false,
      openHour: s.openHour || "",
      closeHour: s.closeHour || "",
      closedMessage: s.closedMessage || "",
      staticQrisString: "",
      midtransServerKey: "",
      midtransIsProd: Boolean(s.midtransIsProd),
    });
    setSettingsMsg(null);
  }

  const hasUnsavedSettings = Boolean(
    settingsInitialized &&
      data?.shop &&
      (settingsForm.shopCode.trim() !== (data.shop.shopCode || "").trim() ||
        settingsForm.name.trim() !== (data.shop.name || "").trim() ||
        settingsForm.address.trim() !== (data.shop.address || "").trim() ||
        settingsForm.qrisName.trim() !== (data.shop.qrisName || "").trim() ||
        Number(settingsForm.bwPrice) !== Number(data.shop.bwPrice) ||
        Number(settingsForm.colorPrice) !== Number(data.shop.colorPrice) ||
        Number(settingsForm.photoPrice) !== Number(data.shop.photoPrice) ||
        Number(settingsForm.duplexDiscount) !== Number(data.shop.duplexDiscount) ||
        Number(settingsForm.f4ExtraPrice) !==
          Number(data.shop.f4ExtraPrice ?? 100) ||
        Number(settingsForm.bindingLakbanPrice) !==
          Number(data.shop.bindingLakbanPrice ?? 3000) ||
        Number(settingsForm.bindingMikaPrice) !==
          Number(data.shop.bindingMikaPrice ?? 5000) ||
        Number(settingsForm.bindingSpiralPrice) !==
          Number(data.shop.bindingSpiralPrice ?? 10000) ||
        settingsForm.bwPrinter !== data.shop.bwPrinter ||
        settingsForm.colorPrinter !== data.shop.colorPrinter ||
        settingsForm.photoPrinter !==
          (data.shop.photoPrinter || "Default Printer") ||
        (settingsForm.thermalPrinter || "").trim() !==
          (data.shop.thermalPrinter || "").trim() ||
        Boolean(settingsForm.autoPrintReceipt) !==
          Boolean(data.shop.autoPrintReceipt) ||
        Boolean(settingsForm.isOpenManual) !==
          (data.shop.isOpenManual !== false) ||
        (settingsForm.openHour || "").trim() !==
          (data.shop.openHour || "").trim() ||
        (settingsForm.closeHour || "").trim() !==
          (data.shop.closeHour || "").trim() ||
        (settingsForm.closedMessage || "").trim() !==
          (data.shop.closedMessage || "").trim() ||
        Boolean(settingsForm.midtransIsProd) !==
          Boolean(data.shop.midtransIsProd) ||
        settingsForm.staticQrisString.trim() !== "" ||
        settingsForm.midtransServerKey.trim() !== "" ||
        JSON.stringify(settingsForm.bwPrinters) !==
          JSON.stringify(
            data.shop.bwPrinters || [data.shop.bwPrinter || "Default Printer"]
          ) ||
        JSON.stringify(settingsForm.colorPrinters) !==
          JSON.stringify(
            data.shop.colorPrinters || [
              data.shop.colorPrinter || "Default Printer",
            ]
          ) ||
        JSON.stringify(settingsForm.photoPrinters) !==
          JSON.stringify(
            data.shop.photoPrinters || [
              data.shop.photoPrinter || "Default Printer",
            ]
          ))
  );

  async function handleSaveSettings(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const currentCode = data?.shop.shopCode || "";
    const changeCount = data?.shop.shopCodeChangeCount ?? 0;
    const isChangingSlug =
      changeCount < 1 &&
      settingsForm.shopCode.trim().toLowerCase() !== currentCode.toLowerCase();

    if (isChangingSlug) {
      const ok = window.confirm(
        `Ubah URL portal pelanggan menjadi "/s/${settingsForm.shopCode.trim()}"?\n\nPerhatian: Perubahan URL hanya bisa dilakukan 1x gratis. Setelah disimpan, URL akan terkunci dan perubahan berikutnya dikenakan biaya Rp 37.000.`
      );
      if (!ok) return;
    }

    setSavingSettings(true);
    setSettingsMsg(null);
    setSettingsErr(null);
    try {
      const payload: Record<string, unknown> = {
        ...(isChangingSlug ? { shopCode: settingsForm.shopCode } : {}),
        name: settingsForm.name,
        address: settingsForm.address,
        qrisName: settingsForm.qrisName,
        bwPrice: settingsForm.bwPrice,
        colorPrice: settingsForm.colorPrice,
        photoPrice: settingsForm.photoPrice,
        duplexDiscount: settingsForm.duplexDiscount,
        f4ExtraPrice: settingsForm.f4ExtraPrice,
        bindingLakbanPrice: settingsForm.bindingLakbanPrice,
        bindingMikaPrice: settingsForm.bindingMikaPrice,
        bindingSpiralPrice: settingsForm.bindingSpiralPrice,
        bwPrinter: settingsForm.bwPrinter,
        colorPrinter: settingsForm.colorPrinter,
        photoPrinter: settingsForm.photoPrinter,
        bwPrinters: settingsForm.bwPrinters,
        colorPrinters: settingsForm.colorPrinters,
        photoPrinters: settingsForm.photoPrinters,
        thermalPrinter: settingsForm.thermalPrinter,
        autoPrintReceipt: settingsForm.autoPrintReceipt,
        isOpenManual: settingsForm.isOpenManual,
        openHour: settingsForm.openHour,
        closeHour: settingsForm.closeHour,
        closedMessage: settingsForm.closedMessage,
        midtransIsProd: settingsForm.midtransIsProd,
      };
      if (settingsForm.staticQrisString.trim() !== "") {
        payload.staticQrisString = settingsForm.staticQrisString.trim();
      }
      if (settingsForm.midtransServerKey.trim() !== "") {
        payload.midtransServerKey = settingsForm.midtransServerKey.trim();
      }
      const res = await fetch("/api/shop/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const resJson = await res.json().catch(() => ({}));
      if (res.ok) {
        setSettingsMsg("Pengaturan toko, QRIS & printer telah disimpan");
        setSettingsErr(null);
        setQrisDecodeMsg(null);
        // Re-fetch and force-sync settingsForm with the exact saved server state
        const freshRes = await fetch("/api/shop/me", { cache: "no-store" });
        if (freshRes.ok) {
          const freshJson: DashboardData = await freshRes.json();
          setData(freshJson);
          const s = freshJson.shop;
          setSettingsForm({
            shopCode: s.shopCode,
            name: s.name,
            address: s.address,
            qrisName: s.qrisName,
            bwPrice: s.bwPrice,
            colorPrice: s.colorPrice,
            photoPrice: s.photoPrice,
            duplexDiscount: s.duplexDiscount,
            f4ExtraPrice: s.f4ExtraPrice ?? 100,
            bindingLakbanPrice: s.bindingLakbanPrice ?? 3000,
            bindingMikaPrice: s.bindingMikaPrice ?? 5000,
            bindingSpiralPrice: s.bindingSpiralPrice ?? 10000,
            bwPrinter: s.bwPrinter,
            colorPrinter: s.colorPrinter,
            photoPrinter: s.photoPrinter || "Default Printer",
            bwPrinters: s.bwPrinters || [s.bwPrinter || "Default Printer"],
            colorPrinters: s.colorPrinters || [
              s.colorPrinter || "Default Printer",
            ],
            photoPrinters: s.photoPrinters || [
              s.photoPrinter || "Default Printer",
            ],
            thermalPrinter: s.thermalPrinter || "",
            autoPrintReceipt: Boolean(s.autoPrintReceipt),
            isOpenManual: s.isOpenManual !== false,
            openHour: s.openHour || "",
            closeHour: s.closeHour || "",
            closedMessage: s.closedMessage || "",
            staticQrisString: "",
            midtransServerKey: "",
            midtransIsProd: Boolean(s.midtransIsProd),
          });
        } else {
          await fetchDashboard();
        }
      } else {
        const errMsg = resJson.error || "Gagal menyimpan pengaturan";
        setSettingsMsg(errMsg);
        setSettingsErr(errMsg);
      }
    } catch {
      const errMsg = "Tidak dapat terhubung ke server. Periksa koneksi Anda.";
      setSettingsMsg(errMsg);
      setSettingsErr(errMsg);
    } finally {
      setSavingSettings(false);
    }
  }

  const [togglingOpen, setTogglingOpen] = useState(false);

  async function handleQuickToggleOpen() {
    if (!data?.shop || togglingOpen) return;
    const nextOpen = data.shop.isOpenManual === false;
    setTogglingOpen(true);
    try {
      const res = await fetch("/api/shop/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOpenManual: nextOpen }),
      });
      if (res.ok) {
        setSettingsForm((prev) => ({ ...prev, isOpenManual: nextOpen }));
        await fetchDashboard();
      }
    } catch {
      setConnectionError(true);
    } finally {
      setTogglingOpen(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Proceed to login screen even if server is unreachable
    }
    router.push("/login");
    router.refresh();
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  }

  if (loading || !data) {
    return (
      <div className="bg-app flex min-h-screen items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 rounded-xl border border-[#171717]/8 bg-white px-6 py-4 text-center text-sm text-[#171717]">
          {connectionError && !loading ? (
            <>
              <span className="font-medium text-[#dc2626]">
                Tidak dapat terhubung ke server
              </span>
              <span className="text-xs text-[#737373]">
                Pastikan server berjalan dan koneksi internet stabil.
              </span>
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  fetchDashboard();
                }}
                className="cursor-pointer rounded-lg bg-[#171717] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#2e2e2e]"
              >
                Coba lagi
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2.5">
              <Loader2
                className="h-4 w-4 animate-spin text-[#737373]"
                strokeWidth={1.5}
              />
              <span>Memuat dashboard toko...</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  const { shop, entitlement, plans, invoices, stats, jobs } = data;
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000";
  const dryRunCmd = `node print-agent/agent.mjs --url=${origin} --key=${shop.agentKey} --dry-run`;
  const liveCmd = `node print-agent/agent.mjs --url=${origin} --key=${shop.agentKey} --live`;

  const pendingInvoiceCount = invoices.filter(
    (inv) => inv.status === "PENDING"
  ).length;

  const NAV_ITEMS = [
    {
      id: "queue" as const,
      label: "Antrean cetak",
      icon: Printer,
      count: stats.activeQueue,
    },
    {
      id: "qr" as const,
      label: "Poster QR kasir",
      icon: QrCode,
    },
    {
      id: "billing" as const,
      label: "Langganan & paket",
      icon: CreditCard,
      count: pendingInvoiceCount,
    },
    {
      id: "settings" as const,
      label: "Tarif & printer",
      icon: Settings,
    },
    {
      id: "agent" as const,
      label: "Windows Print Agent",
      icon: Terminal,
    },
  ];

  return (
    <div className="bg-app flex min-h-screen flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="no-print hidden w-64 shrink-0 flex-col justify-between border-r border-[#171717]/8 bg-white p-4 lg:flex">
        <div>
          <div className="flex items-center justify-between px-2 py-1.5">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#171717] text-white">
                <Printer className="h-4 w-4" strokeWidth={1.5} />
              </div>
              <span className="text-base font-semibold text-[#171717]">
                Ngeprint
              </span>
            </Link>
            <span className="font-mono-num text-xs text-[#737373]">
              {shop.shopCode}
            </span>
          </div>

          <div className="mt-4 rounded-xl border border-[#171717]/8 bg-[#fafafa] p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-medium text-[#171717]">
                {shop.name}
              </p>
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 font-mono-num text-[11px] font-medium ${
                  entitlement.canAcceptJobs
                    ? "bg-[#16a34a]/10 text-[#16a34a]"
                    : "bg-[#dc2626]/10 text-[#dc2626]"
                }`}
              >
                {entitlement.plan.id}
              </span>
            </div>
            <p className="mt-1 text-xs text-[#737373]">
              {entitlement.plan.id === "LIFETIME"
                ? "Aktif selamanya"
                : entitlement.isExpired
                ? "Masa aktif berakhir"
                : entitlement.plan.id === "DEMO"
                ? `Sisa ${entitlement.hoursLeft ?? 24} jam · ${entitlement.quotaUsed}/${entitlement.quotaLimit} cetak`
                : `Sisa ${entitlement.daysLeft ?? 0} hari`}
            </p>
            <div className="mt-2.5 flex items-center gap-2 border-t border-[#171717]/8 pt-2 text-xs">
              <span
                className={`h-2 w-2 rounded-full ${
                  shop.isAgentOnline ? "bg-[#16a34a]" : "bg-[#b45309]"
                }`}
              />
              <span className="text-[#525252]">
                {shop.isAgentOnline
                  ? "Print Agent aktif"
                  : "Print Agent offline"}
              </span>
            </div>
            <button
              type="button"
              disabled={togglingOpen}
              onClick={handleQuickToggleOpen}
              className={`mt-2.5 flex h-8 w-full cursor-pointer items-center justify-between rounded-lg border px-2.5 text-[11px] font-medium transition-colors disabled:opacity-60 ${
                shop.isOpenManual !== false
                  ? "border-[#16a34a]/30 bg-[#16a34a]/10 text-[#15803d] hover:bg-[#16a34a]/15"
                  : "border-[#dc2626]/30 bg-[#dc2626]/10 text-[#dc2626] hover:bg-[#dc2626]/15"
              }`}
            >
              <span>
                {shop.isOpenManual !== false
                  ? "● Toko Buka (Terima Order)"
                  : "● Toko Tutup Sementara"}
              </span>
              <span className="text-[10px] underline">
                {togglingOpen ? "..." : shop.isOpenManual !== false ? "Tutup" : "Buka"}
              </span>
            </button>
          </div>

          <p className="mt-6 mb-2 px-2 text-xs text-[#737373]">Menu toko</p>
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={`flex h-9 w-full cursor-pointer items-center justify-between rounded-lg px-2.5 text-sm transition-colors duration-150 ${
                    active
                      ? "bg-[#f4f4f5] font-medium text-[#171717]"
                      : "text-[#525252] hover:bg-[#fafafa] hover:text-[#171717]"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span className="flex w-4 items-center justify-center">
                      <Icon
                        className="h-4 w-4 text-[#737373]"
                        strokeWidth={1.5}
                      />
                    </span>
                    <span>{item.label}</span>
                  </span>
                  {item.count !== undefined && item.count > 0 && (
                    <span className="font-mono-num text-xs text-[#d9381e]">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="space-y-1 border-t border-[#171717]/8 pt-3">
          <div className="px-2.5 pb-1">
            <PwaInstallButton />
          </div>
          <Link
            href={`/s/${shop.shopCode}`}
            target="_blank"
            className="flex h-9 items-center justify-between rounded-lg px-2.5 text-xs font-medium text-[#525252] hover:bg-[#f4f4f5] hover:text-[#171717]"
          >
            <span>Buka portal pelanggan</span>
            <ExternalLink
              className="h-3.5 w-3.5 text-[#737373]"
              strokeWidth={1.5}
            />
          </Link>
          <button
            onClick={handleLogout}
            className="flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-xs text-[#737373] hover:bg-[#f4f4f5] hover:text-[#dc2626]"
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>Keluar akun</span>
          </button>
        </div>
      </aside>

      {/* Compact Mobile Header (Tabs moved to thumb-friendly Bottom Nav) */}
      <header className="no-print sticky top-0 z-30 border-b border-[#171717]/8 bg-white lg:hidden">
        <div className="flex h-14 items-center justify-between gap-2 px-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#171717] text-white"
            >
              <Printer className="h-4 w-4" strokeWidth={1.5} />
            </Link>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[#171717]">
                {shop.name}
              </p>
              <p className="font-mono-num truncate text-[11px] text-[#737373]">
                {shop.shopCode} · {entitlement.plan.name}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              disabled={togglingOpen}
              onClick={handleQuickToggleOpen}
              className={`inline-flex h-9 cursor-pointer items-center rounded-lg border px-2.5 text-[11px] font-medium disabled:opacity-60 ${
                shop.isOpenManual !== false
                  ? "border-[#16a34a]/30 bg-[#16a34a]/10 text-[#15803d]"
                  : "border-[#dc2626]/30 bg-[#dc2626]/10 text-[#dc2626]"
              }`}
            >
              {shop.isOpenManual !== false ? "Buka" : "Tutup"}
            </button>
            <PwaInstallButton />
            <Link
              href={`/s/${shop.shopCode}`}
              target="_blank"
              aria-label="Buka portal pelanggan"
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#171717]/10 bg-[#fafafa] px-2.5 text-xs font-medium text-[#171717]"
            >
              <span className="hidden min-[380px]:inline">Portal</span>
              <ExternalLink
                className="h-3.5 w-3.5 text-[#737373]"
                strokeWidth={1.5}
              />
            </Link>
            <button
              onClick={handleLogout}
              aria-label="Keluar"
              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-[#171717]/10 text-[#525252]"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </header>

      {/* Native-App Style Fixed Bottom Navigation for Mobile Kasir */}
      <nav
        aria-label="Navigasi Dashboard"
        className="no-print fixed right-0 bottom-0 left-0 z-40 border-t border-[#171717]/10 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      >
        <div className="grid grid-cols-5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            const shortLabel =
              item.id === "queue"
                ? "Antrean"
                : item.id === "qr"
                ? "QR"
                : item.id === "billing"
                ? "Paket"
                : item.id === "settings"
                ? "Atur"
                : "Agent";
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`relative flex min-h-[56px] cursor-pointer flex-col items-center justify-center gap-1 px-1 py-1.5 text-[10px] font-medium transition-colors ${
                  active ? "text-[#d9381e]" : "text-[#737373]"
                }`}
              >
                <div className="relative">
                  <Icon className="h-4 w-4" strokeWidth={active ? 2 : 1.5} />
                  {item.count !== undefined && item.count > 0 && (
                    <span className="font-mono-num absolute -top-1.5 -right-2.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#d9381e] px-1 text-[9px] font-bold text-white">
                      {item.count > 9 ? "9+" : item.count}
                    </span>
                  )}
                </div>
                <span className="truncate">{shortLabel}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Content Fluid Area (reserves bottom nav height on mobile) */}
      <main className="flex-1 px-3.5 pt-5 pb-24 sm:px-8 lg:py-8">
        <div className="mx-auto max-w-5xl">
          {/* SaaS Subscription Alert Banner if Expired, Quota Exceeded, or Pending Invoice */}
          {(!entitlement.canAcceptJobs || activePendingInvoice) &&
            tab !== "billing" && (
              <div className="no-print mb-6 flex flex-col justify-between gap-3 rounded-xl border border-[#d9381e]/25 bg-[#d9381e]/5 p-4 sm:flex-row sm:items-center">
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    className="mt-0.5 h-4 w-4 shrink-0 text-[#d9381e]"
                    strokeWidth={1.5}
                  />
                  <div className="text-xs">
                    <p className="font-medium text-[#171717]">
                      {!entitlement.canAcceptJobs
                        ? entitlement.blockReason
                        : `Anda memiliki tagihan paket ${activePendingInvoice?.plan} (${activePendingInvoice?.invoiceCode}) yang menunggu pembayaran`}
                    </p>
                    <p className="mt-0.5 text-[#525252]">
                      {!entitlement.canAcceptJobs
                        ? "Portal scan QR pelanggan sedang dikunci sementara hingga paket diperbarui."
                        : "Selesaikan pembayaran QRIS untuk mengaktifkan kuota dan masa aktif penuh."}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setTab("billing")}
                  className="btn-action h-8 shrink-0 cursor-pointer rounded-lg bg-[#d9381e] px-3.5 text-xs font-medium text-white hover:bg-[#be2e17]"
                >
                  Buka Langganan & Paket
                </button>
              </div>
            )}

          {/* Soft Anti-Churn Renewal Reminder Banner (H-3 for paid plans, <=6h for Demo) */}
          {entitlement.canAcceptJobs &&
            !activePendingInvoice &&
            ((shop.plan !== "DEMO" &&
              entitlement.daysLeft !== null &&
              entitlement.daysLeft <= 3) ||
              (shop.plan === "DEMO" &&
                entitlement.hoursLeft !== null &&
                entitlement.hoursLeft <= 6)) && (
              <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#b45309]/30 bg-[#fffbeb] p-4 text-xs">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle
                    className="mt-0.5 h-4 w-4 shrink-0 text-[#b45309]"
                    strokeWidth={1.5}
                  />
                  <div>
                    <p className="font-medium text-[#171717]">
                      {shop.plan === "DEMO"
                        ? `Masa uji coba Demo tinggal ${entitlement.hoursLeft} jam lagi`
                        : `Masa aktif paket ${entitlement.plan.name} tinggal ${entitlement.daysLeft} hari lagi`}
                    </p>
                    <p className="mt-0.5 text-[#525252]">
                      Perpanjang lebih awal agar portal QR cetak pelanggan di
                      meja kasir tidak sempat berhenti.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTab("billing")}
                  className="btn-action h-8 shrink-0 cursor-pointer rounded-lg bg-[#171717] px-3.5 text-xs font-medium text-white hover:bg-[#171717]/90"
                >
                  Perpanjang Sekarang
                </button>
              </div>
            )}

          {/* Page Header */}
          <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-medium tracking-[-0.01em] text-[#171717]">
                {tab === "queue"
                  ? "Antrean & riwayat cetak"
                  : tab === "qr"
                  ? "Poster QR meja kasir"
                  : tab === "billing"
                  ? "Langganan & paket SaaS"
                  : tab === "settings"
                  ? "Tarif cetak & printer"
                  : "Koneksi Windows Print Agent"}
              </h1>
              <p className="mt-0.5 text-xs text-[#737373]">{shop.address}</p>
            </div>

            {tab === "queue" && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    const next = !soundEnabled;
                    setSoundEnabled(next);
                    if (next) playCashierBell();
                  }}
                  title="Bunyikan notifikasi suara saat ada pesanan lunas masuk"
                  className={`btn-action inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border px-3 text-xs font-medium ${
                    soundEnabled
                      ? "border-[#171717]/15 bg-white text-[#171717] hover:bg-[#f4f4f5]"
                      : "border-[#171717]/10 bg-[#fafafa] text-[#737373]"
                  }`}
                >
                  {soundEnabled ? (
                    <Volume2 className="h-3.5 w-3.5 text-[#16a34a]" strokeWidth={1.5} />
                  ) : (
                    <VolumeX className="h-3.5 w-3.5 text-[#737373]" strokeWidth={1.5} />
                  )}
                  <span>{soundEnabled ? "Suara aktif" : "Suara senyap"}</span>
                </button>

                <button
                  onClick={() => setShowDailyRecap(true)}
                  className="btn-action inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-[#171717]/15 bg-white px-3 text-xs font-medium text-[#171717] hover:bg-[#f4f4f5]"
                >
                  <Receipt className="h-3.5 w-3.5 text-[#d9381e]" strokeWidth={1.5} />
                  <span>Rekap Hari Ini (58mm)</span>
                </button>

                <button
                  disabled={jobs.length === 0}
                  onClick={() => exportShopJobsCsv(shop.shopCode, jobs)}
                  className="btn-action inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-[#171717]/10 bg-white px-3 text-xs font-medium text-[#171717] hover:bg-[#f4f4f5] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Download className="h-3.5 w-3.5 text-[#737373]" strokeWidth={1.5} />
                  <span>Ekspor Omzet CSV</span>
                </button>

                <button
                  onClick={fetchDashboard}
                  className="btn-action inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-[#171717]/10 bg-white px-3.5 text-xs font-medium text-[#171717] hover:bg-[#f4f4f5]"
                >
                  <RefreshCw
                    className="h-3.5 w-3.5 text-[#737373]"
                    strokeWidth={1.5}
                  />
                  <span>Perbarui</span>
                </button>
              </div>
            )}
          </div>

          {/* KPI Stats Row */}
          <div className="no-print mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-xl border border-[#171717]/8 bg-white p-4">
              <p className="text-xs text-[#737373]">Omzet hari ini</p>
              <p className="font-mono-num mt-2 text-2xl font-medium text-[#171717]">
                {formatRupiah(stats.todayRevenue)}
              </p>
              <p className="font-mono-num mt-1 text-xs text-[#737373]">
                Kumulatif {formatRupiah(stats.totalRevenue)}
              </p>
            </div>

            <div className="rounded-xl border border-[#171717]/8 bg-white p-4">
              <p className="text-xs text-[#737373]">Antrean aktif</p>
              <p className="font-mono-num mt-2 text-2xl font-medium text-[#d9381e]">
                {stats.activeQueue}
              </p>
              <p className="mt-1 text-xs text-[#737373]">
                Pembaruan otomatis 3 detik
              </p>
            </div>

            <div className="rounded-xl border border-[#171717]/8 bg-white p-4">
              <p className="text-xs text-[#737373]">Paket & kuota cetak</p>
              <p className="font-mono-num mt-2 text-xl font-medium text-[#171717]">
                {entitlement.plan.name}
              </p>
              <p className="font-mono-num mt-1 text-xs text-[#737373]">
                {entitlement.quotaLimit !== null
                  ? `${entitlement.quotaUsed} / ${entitlement.quotaLimit} cetakan terpakai`
                  : `${stats.completedCount} cetakan selesai (Unlimited)`}
              </p>
            </div>

            <div className="rounded-xl border border-[#171717]/8 bg-white p-4">
              <p className="text-xs text-[#737373]">Status Print Agent</p>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    shop.isAgentOnline ? "bg-[#16a34a]" : "bg-[#b45309]"
                  }`}
                />
                <span className="font-mono-num text-xl font-medium text-[#171717]">
                  {shop.isAgentOnline ? "Online" : "Offline"}
                </span>
              </div>
              <p className="mt-1 text-xs text-[#737373]">
                {(shop.effectiveMaxPrinters !== undefined
                  ? shop.effectiveMaxPrinters
                  : entitlement.plan.maxPrinters) !== null
                  ? `Maks. ${
                      shop.effectiveMaxPrinters !== undefined
                        ? shop.effectiveMaxPrinters
                        : entitlement.plan.maxPrinters
                    } printer aktif${
                      (shop.extraPrinterSlots || 0) > 0
                        ? ` (+${shop.extraPrinterSlots} add-on)`
                        : ""
                    }`
                  : "Multi-printer tanpa batas"}
              </p>
            </div>
          </div>

          {/* TAB 1: PRINT QUEUE */}
          {tab === "queue" && (
            <QueueTab
              shop={shop}
              stats={stats}
              jobs={jobs}
              busyJobId={busyJobId}
              onNavigateTab={setTab}
              onSelectReceiptJob={setReceiptJob}
              onJobAction={handleJobAction}
            />
          )}

          {/* TAB 2: SHOP QR POSTER */}
          {tab === "qr" && (
            <QrTab
              shop={shop}
              qrImage={qrImage}
              qrUrl={qrUrl}
              posterSize={posterSize}
              posterTheme={posterTheme}
              downloadingPoster={downloadingPoster}
              printingThermal={printingThermal}
              thermalMsg={thermalMsg}
              copiedText={copiedText}
              onSetPosterSize={setPosterSize}
              onSetPosterTheme={setPosterTheme}
              onDownloadPosterPng={handleDownloadPosterPng}
              onCopyUrl={copyToClipboard}
              onPrintMiniQr58mm={handlePrintMiniQr58mm}
              onPrintMiniQrBluetooth={handlePrintMiniQrBluetooth}
              onPrintMiniQrRawBt={handlePrintMiniQrRawBt}
            />
          )}

          {/* TAB 3: SAAS SUBSCRIPTION & BILLING */}
          {tab === "billing" && (
            <BillingTab
              shop={shop}
              entitlement={entitlement}
              plans={plans}
              invoices={invoices}
              activePendingInvoice={activePendingInvoice}
              invoiceQrDataUrl={invoiceQrDataUrl}
              billingMsg={billingMsg}
              payingInvoiceId={payingInvoiceId}
              checkingOutCart={checkingOutCart}
              cart={cart}
              setCart={setCart}
              onInvoiceAction={handleInvoiceAction}
              onCheckoutCart={handleCheckoutCart}
            />
          )}

          {/* TAB 4: SETTINGS & PRICING */}
          {tab === "settings" && (
            <SettingsTab
              shop={shop}
              entitlement={entitlement}
              origin={origin}
              settingsForm={settingsForm}
              setSettingsForm={setSettingsForm}
              savingSettings={savingSettings}
              settingsMsg={settingsMsg}
              decodingQris={decodingQris}
              qrisDecodeMsg={qrisDecodeMsg}
              creatingPlanId={creatingPlanId}
              printingThermal={printingThermal}
              thermalMsg={thermalMsg}
              copiedText={copiedText}
              pwForm={pwForm}
              setPwForm={setPwForm}
              savingPw={savingPw}
              pwMsg={pwMsg}
              pwIsError={pwIsError}
              onSaveSettings={handleSaveSettings}
              onChangePassword={handleChangePassword}
              onDecodeQrisImage={handleDecodeQrisImage}
              onCreateSubscriptionInvoice={handleCreateSubscriptionInvoice}
              onNavigateTab={setTab}
              onCopy={copyToClipboard}
              onRefreshDashboard={fetchDashboard}
              onTestPrint58mm={handlePrintReceipt58mm}
              onTestPrintBluetooth={handlePrintReceiptBluetooth}
              buildSampleTestJob={buildSampleTestJob}
            />
          )}

          {/* TAB 5: WINDOWS PRINT AGENT */}
          {tab === "agent" && (
            <AgentTab
              shop={shop}
              entitlement={entitlement}
              dryRunCmd={dryRunCmd}
              liveCmd={liveCmd}
              copiedText={copiedText}
              onCopy={copyToClipboard}
              onDownloadEnv={handleDownloadAgentEnv}
            />
          )}
        </div>
      </main>

      {/* STICKY SAVE BAR FOR UNSAVED SETTINGS */}
      {tab === "settings" && hasUnsavedSettings && (
        <StickySaveBar
          saving={savingSettings}
          errorText={settingsErr}
          onReset={() => {
            setSettingsErr(null);
            handleResetSettings();
          }}
          onSave={() => handleSaveSettings()}
        />
      )}

      {/* DAILY CLOSING RECAP MODAL (58mm THERMAL / WA) */}
      {showDailyRecap && (
        <DailyRecapModal
          shop={shop}
          stats={stats}
          copiedText={copiedText}
          onClose={() => setShowDailyRecap(false)}
          onCopyWa={copyToClipboard}
        />
      )}

      {/* RECEIPT / NOTA CETAK MODAL */}
      {receiptJob && (
        <ReceiptModal
          shop={shop}
          receiptJob={receiptJob}
          printingThermal={printingThermal}
          btDeviceName={btDeviceName}
          thermalMsg={thermalMsg}
          copiedText={copiedText}
          onClose={() => setReceiptJob(null)}
          onPrint58mm={handlePrintReceipt58mm}
          onPrintBluetooth={handlePrintReceiptBluetooth}
          onPrintRawBt={handlePrintReceiptRawBt}
          onCopyWa={copyToClipboard}
        />
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-app flex min-h-screen items-center justify-center">
          <div className="flex items-center gap-2.5 rounded-xl border border-[#171717]/8 bg-white px-5 py-3.5 text-sm text-[#171717]">
            <Loader2
              className="h-4 w-4 animate-spin text-[#737373]"
              strokeWidth={1.5}
            />
            <span>Memuat dashboard toko...</span>
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}

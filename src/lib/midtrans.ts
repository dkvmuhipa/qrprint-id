import crypto from "crypto";

export interface MidtransConfig {
  serverKey: string;
  isProduction: boolean;
}

export function resolveMidtransConfig(shop: {
  midtransServerKey?: string | null;
  midtransIsProd?: boolean;
}): MidtransConfig | null {
  const key = (shop.midtransServerKey || process.env.MIDTRANS_SERVER_KEY || "").trim();
  if (!key) return null;

  // Auto-detect sandbox if key starts with SB-Mid-
  const isProd = key.startsWith("SB-Mid-")
    ? false
    : Boolean(shop.midtransIsProd || process.env.MIDTRANS_IS_PRODUCTION === "true");

  return {
    serverKey: key,
    isProduction: isProd,
  };
}

function getBaseUrl(isProduction: boolean): string {
  return isProduction
    ? "https://api.midtrans.com"
    : "https://api.sandbox.midtrans.com";
}

function getAuthHeader(serverKey: string): string {
  return `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}`;
}

export interface MidtransQrisResult {
  orderId: string;
  qrisUrl: string | null;
  qrisString: string | null;
  transactionStatus: string;
}

export async function createMidtransQrisCharge(
  config: MidtransConfig,
  params: {
    orderId: string;
    grossAmount: number;
    customerName: string;
    itemName: string;
  }
): Promise<MidtransQrisResult> {
  const url = `${getBaseUrl(config.isProduction)}/v2/charge`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: getAuthHeader(config.serverKey),
    },
    body: JSON.stringify({
      payment_type: "qris",
      transaction_details: {
        order_id: params.orderId,
        gross_amount: Math.round(params.grossAmount),
      },
      item_details: [
        {
          id: params.orderId,
          price: Math.round(params.grossAmount),
          quantity: 1,
          name: params.itemName.slice(0, 50),
        },
      ],
      customer_details: {
        first_name: (params.customerName || "Pelanggan").slice(0, 40),
      },
      qris: {
        acquirer: "gopay",
      },
    }),
  });

  const data = await res.json();

  if (!res.ok || (data.status_code && !["200", "201"].includes(String(data.status_code)))) {
    throw new Error(
      data.status_message || `Midtrans error (${data.status_code || res.status})`
    );
  }

  const actions: Array<{ name?: string; url?: string }> = Array.isArray(
    data.actions
  )
    ? data.actions
    : [];
  const qrAction = actions.find((a) => a.name === "generate-qr-code");

  return {
    orderId: data.order_id || params.orderId,
    qrisUrl: qrAction?.url || null,
    qrisString: data.qr_string || null,
    transactionStatus: data.transaction_status || "pending",
  };
}

export async function checkMidtransOrderStatus(
  config: MidtransConfig,
  orderId: string
): Promise<{
  transactionStatus: string;
  fraudStatus?: string;
} | null> {
  const url = `${getBaseUrl(config.isProduction)}/v2/${encodeURIComponent(
    orderId
  )}/status`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: getAuthHeader(config.serverKey),
    },
    cache: "no-store",
  });

  if (!res.ok) return null;
  const data = await res.json();
  if (!data.transaction_status) return null;

  return {
    transactionStatus: String(data.transaction_status),
    fraudStatus: data.fraud_status ? String(data.fraud_status) : undefined,
  };
}

export function verifyMidtransSignature(params: {
  orderId: string;
  statusCode: string;
  grossAmount: string;
  serverKey: string;
  signatureKey: string;
}): boolean {
  const raw = `${params.orderId}${params.statusCode}${params.grossAmount}${params.serverKey}`;
  const expected = crypto.createHash("sha512").update(raw).digest("hex");
  if (expected.length !== params.signatureKey.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(params.signatureKey)
  );
}

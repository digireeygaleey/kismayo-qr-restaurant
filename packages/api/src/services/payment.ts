import crypto from 'crypto';

const EDAHAB_API = 'https://edahab.net/api/api';
const MERCHANT_ID = process.env.EDAHAB_MERCHANT_ID;
const API_KEY = process.env.EDAHAB_API_KEY;

function generateHash(amount: string, timestamp: string): string {
  const data = `${MERCHANT_ID}${amount}${timestamp}${API_KEY}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

export async function initiateEdahabPayment(phone: string, amount: number, orderId: string) {
  if (!MERCHANT_ID || !API_KEY) {
    return {
      success: false,
      message: 'eDahab not configured. Use cash payment.',
      invoiceId: null,
    };
  }

  const timestamp = Date.now().toString();
  const hash = generateHash(amount.toString(), timestamp);

  const response = await fetch(`${EDAHAB_API}/IssueInvoice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      merchantid: MERCHANT_ID,
      amount,
      phone,
      description: `Order #${orderId}`,
      hash,
      timestamp,
      callbackurl: `${process.env.API_URL}/api/payments/callback`,
    }),
  });

  return response.json();
}

export function verifyPaymentCallback(body: { amount: string; timestamp: string; hash: string }) {
  const hash = generateHash(body.amount, body.timestamp);
  return hash === body.hash;
}

const EVC_PLUS_API = 'https://api.hormuud.com/api/v1';
const EVC_PLUS_MERCHANT = process.env.EVC_PLUS_MERCHANT_ID;
const EVC_PLUS_API_KEY = process.env.EVC_PLUS_API_KEY;

function generateEvcHash(phone: string, amount: string, timestamp: string): string {
  const data = `${EVC_PLUS_MERCHANT}${phone}${amount}${timestamp}${EVC_PLUS_API_KEY}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

export async function initiateEvcPlusPayment(phone: string, amount: number, orderId: string) {
  if (!EVC_PLUS_MERCHANT || !EVC_PLUS_API_KEY) {
    return {
      success: false,
      message: 'EVC Plus not configured. Use cash payment.',
      invoiceId: null,
    };
  }

  const timestamp = Date.now().toString();
  const hash = generateEvcHash(phone, amount.toString(), timestamp);

  try {
    const response = await fetch(`${EVC_PLUS_API}/invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${EVC_PLUS_API_KEY}`,
      },
      body: JSON.stringify({
        merchantId: EVC_PLUS_MERCHANT,
        phoneNumber: phone,
        amount,
        description: `Order #${orderId}`,
        hash,
        timestamp,
        callbackUrl: `${process.env.API_URL}/api/payments/callback`,
        reference: orderId,
      }),
    });

    const data: any = await response.json();
    return {
      success: data.status === 'Success' || data.status === 'Pending',
      message: data.message || 'Payment initiated',
      invoiceId: data.invoiceId || data.id || null,
      redirectUrl: data.redirectUrl || null,
    };
  } catch {
    return {
      success: false,
      message: 'EVC Plus API unavailable. Try again later.',
      invoiceId: null,
    };
  }
}

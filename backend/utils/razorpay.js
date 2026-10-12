import Razorpay from 'razorpay';
import dotenv from 'dotenv';

dotenv.config();

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

// Public key id is safe to expose to the browser (needed by Razorpay checkout).
export const razorpayKeyId = keyId || null;

let razorpay = null;

if (keyId && keySecret) {
  razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  console.log('[Payments] Razorpay client initialized.');
} else {
  console.warn('[Payments] RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing — online payment collection is disabled.');
  if (process.env.NODE_ENV === 'production') {
    console.error('[Payments] ⚠️  WARNING: Running in production without Razorpay keys! No payments can be collected.');
  }
}

// ---------------------------------------------------------------------------
// Resilient order creation — timeout + retry
// ---------------------------------------------------------------------------
const RZP_TIMEOUT_MS = 10_000; // 10 seconds per attempt
const RZP_MAX_RETRIES = 2;     // 1 initial + 1 retry
const RZP_RETRY_BASE_MS = 800; // exponential backoff starting point

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Create a Razorpay order with timeout protection and automatic retry on
 * transient failures (network errors, 5xx from Razorpay).
 *
 * @param {{ amount: number, currency?: string, receipt?: string, notes?: object }} opts
 * @returns {Promise<object>} The Razorpay order object
 * @throws {Error} With `.statusCode` if Razorpay returned an HTTP error
 */
export const createRazorpayOrder = async (opts) => {
  if (!razorpay) {
    const err = new Error('Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env');
    err.statusCode = 503;
    throw err;
  }

  const payload = {
    amount: opts.amount,
    currency: opts.currency || 'INR',
    receipt: opts.receipt,
    notes: opts.notes || {},
  };

  let lastError;
  for (let attempt = 0; attempt <= RZP_MAX_RETRIES; attempt++) {
    try {
      const order = await Promise.race([
        razorpay.orders.create(payload),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Razorpay API timed out')), RZP_TIMEOUT_MS)
        ),
      ]);
      return order;
    } catch (err) {
      lastError = err;
      const status = err.statusCode || err.status || 0;
      const isRetryable =
        err.message === 'Razorpay API timed out' ||
        err.code === 'ECONNRESET' ||
        err.code === 'ETIMEDOUT' ||
        err.code === 'ENOTFOUND' ||
        (status >= 500 && status < 600);

      if (!isRetryable || attempt === RZP_MAX_RETRIES) break;

      const delay = RZP_RETRY_BASE_MS * Math.pow(2, attempt);
      console.warn(`[Payments] Razorpay attempt ${attempt + 1} failed (${err.message}), retrying in ${delay}ms…`);
      await sleep(delay);
    }
  }

  // Enrich the final error for the caller
  if (!lastError.statusCode) lastError.statusCode = 502;
  throw lastError;
};

export default razorpay;

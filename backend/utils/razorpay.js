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
}

export default razorpay;

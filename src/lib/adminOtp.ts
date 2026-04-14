/**
 * Admin OTP utilities.
 *
 * Flow:
 *  1. After email+password sign-in, if the user is an admin we generate a
 *     6-digit OTP, send it via email, and store a SHA-256 hash of the OTP
 *     (keyed with userId + expiry) in sessionStorage.
 *  2. The user enters the OTP on the login page. We recompute the hash and
 *     compare — if it matches and hasn't expired we write an "verified" marker
 *     to sessionStorage.
 *  3. AdminRoute reads that marker via `isAdminOtpVerified()` to decide
 *     whether to render the page.
 *
 * Security notes:
 *  - The OTP hash is one-way (SHA-256) so an attacker who reads sessionStorage
 *    cannot reverse it.
 *  - OTPs expire after 10 minutes.
 *  - The verified flag is scoped to the current browser tab session
 *    (sessionStorage) so it clears on tab/window close.
 */

const OTP_PENDING_KEY = "admin_otp_pending";
const OTP_VERIFIED_KEY = "admin_otp_verified";
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface PendingOtp {
  userId: string;
  hash: string; // hex-encoded SHA-256 of (otp + userId + expiry)
  expiry: number; // Unix ms
}

interface VerifiedOtp {
  userId: string;
}

// ── Crypto helpers ──────────────────────────────────────────────────────────

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── Public API ──────────────────────────────────────────────────────────────

/** Generate a cryptographically random 6-digit OTP. */
export function generateOtp(): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return String(100000 + (arr[0] % 900000));
}

/**
 * Store a pending OTP challenge in sessionStorage so we can verify it later.
 * Call this right after sending the OTP email.
 */
export async function storePendingOtp(userId: string, otp: string): Promise<void> {
  const expiry = Date.now() + OTP_TTL_MS;
  const hash = await sha256(otp + userId + String(expiry));
  const pending: PendingOtp = { userId, hash, expiry };
  sessionStorage.setItem(OTP_PENDING_KEY, JSON.stringify(pending));
}

/**
 * Verify the OTP the user typed.
 * Returns `true` and writes the verified marker if the OTP is correct and
 * hasn't expired. Returns `false` otherwise.
 */
export async function verifyOtp(userId: string, otp: string): Promise<boolean> {
  const raw = sessionStorage.getItem(OTP_PENDING_KEY);
  if (!raw) return false;

  let pending: PendingOtp;
  try {
    pending = JSON.parse(raw) as PendingOtp;
  } catch {
    return false;
  }

  if (pending.userId !== userId) return false;
  if (Date.now() > pending.expiry) {
    sessionStorage.removeItem(OTP_PENDING_KEY);
    return false;
  }

  const expectedHash = await sha256(otp + userId + String(pending.expiry));
  if (expectedHash !== pending.hash) return false;

  // Mark as verified for this session
  sessionStorage.removeItem(OTP_PENDING_KEY);
  const verified: VerifiedOtp = { userId };
  sessionStorage.setItem(OTP_VERIFIED_KEY, JSON.stringify(verified));
  return true;
}

/** Check whether the current session has a valid OTP verification for the given user. */
export function isAdminOtpVerified(userId: string): boolean {
  const raw = sessionStorage.getItem(OTP_VERIFIED_KEY);
  if (!raw) return false;
  try {
    const verified = JSON.parse(raw) as VerifiedOtp;
    return verified.userId === userId;
  } catch {
    return false;
  }
}

/** Clear OTP state (call on sign-out). */
export function clearAdminOtp(): void {
  sessionStorage.removeItem(OTP_PENDING_KEY);
  sessionStorage.removeItem(OTP_VERIFIED_KEY);
}

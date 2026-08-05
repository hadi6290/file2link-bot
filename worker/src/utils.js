// توابع کمکی مشترک

const TOKEN_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/**
 * تولید توکن کوتاه، تصادفی و غیرقابل حدس با استفاده از
 * Web Crypto API (crypto.getRandomValues) که در Cloudflare Workers
 * به‌صورت بومی در دسترس است.
 * طول پیش‌فرض: 10 کاراکتر (فضای نمونه بسیار بزرگ‌تر از حداقل 6 کاراکتر خواسته‌شده)
 */
export function generateToken(length = 10) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let token = "";
  for (let i = 0; i < length; i++) {
    token += TOKEN_CHARS[bytes[i] % TOKEN_CHARS.length];
  }
  return token;
}

/**
 * تبدیل حجم فایل (بایت) به فرمت خوانا برای انسان
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return "نامشخص";
  const units = ["بایت", "کیلوبایت", "مگابایت", "گیگابایت"];
  let size = bytes;
  let i = 0;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(2)} ${units[i]}`;
}

export function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

/**
 * جلوگیری از تزریق HTML در نام فایل هنگام رندر صفحه دانلود
 */
export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export const MAX_TELEGRAM_BOT_FILE_SIZE = 20 * 1024 * 1024; // 20MB
export const LINK_EXPIRE_SECONDS = 24 * 60 * 60; // 24 ساعت

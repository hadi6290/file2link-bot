import { callTelegramApi, extractFileFromMessage } from "./telegram.js";
import {
  generateToken,
  formatFileSize,
  nowSeconds,
  LINK_EXPIRE_SECONDS,
  MAX_TELEGRAM_BOT_FILE_SIZE,
} from "./utils.js";

const WELCOME_TEXT =
  "سلام! 👋\n" +
  "من ربات File2Link هستم.\n\n" +
  "هر فایلی (سند، عکس، ویدیو، صدا یا voice) برایم بفرستید، " +
  "یک لینک دانلود مستقیم برایتان می‌سازم که هرکسی بدون نیاز به تلگرام می‌تواند از آن استفاده کند.\n\n" +
  "⚠️ به دلیل محدودیت خودِ Telegram Bot API، حداکثر حجم قابل پردازش ۲۰ مگابایت است.\n" +
  "⏳ هر لینک پس از ۲۴ ساعت به‌صورت خودکار منقضی می‌شود.";

/**
 * پردازش یک آپدیت دریافتی از Telegram (که از مسیر /webhook می‌آید)
 */
export async function handleUpdate(update, env, workerOrigin) {
  const message = update.message;
  if (!message || !message.chat) return;

  const chatId = message.chat.id;
  const botToken = env.BOT_TOKEN;

  try {
    if (message.text === "/start" || message.text === "/help") {
      await callTelegramApi(botToken, "sendMessage", {
        chat_id: chatId,
        text: WELCOME_TEXT,
      });
      return;
    }

    const fileInfo = extractFileFromMessage(message);

    if (!fileInfo) {
      await callTelegramApi(botToken, "sendMessage", {
        chat_id: chatId,
        text: "لطفاً یک فایل (سند، عکس، ویدیو، صوت یا voice) ارسال کنید.",
      });
      return;
    }

    if (fileInfo.file_size && fileInfo.file_size > MAX_TELEGRAM_BOT_FILE_SIZE) {
      await callTelegramApi(botToken, "sendMessage", {
        chat_id: chatId,
        text:
          "❌ حجم این فایل بیشتر از ۲۰ مگابایت است.\n" +
          "Telegram Bot API به هیچ رباتی اجازه دانلود فایل‌های بزرگ‌تر از ۲۰ مگابایت را نمی‌دهد " +
          "(این محدودیت مستقل از Cloudflare است و از سمت خود تلگرام اعمال می‌شود).",
      });
      return;
    }

    const token = generateToken(10);
    const created_at = nowSeconds();
    const expire_at = created_at + LINK_EXPIRE_SECONDS;

    const record = {
      file_id: fileInfo.file_id,
      file_name: fileInfo.file_name,
      file_size: fileInfo.file_size,
      created_at,
      expire_at,
      downloads: 0,
    };

    // ذخیره در KV با expirationTtl هم‌راستا با انقضای لینک
    // (کمی بیشتر از 24 ساعت نگه می‌داریم تا پیام "منقضی شده" به‌درستی نمایش داده شود)
    await env.LINKS.put(token, JSON.stringify(record), {
      expirationTtl: LINK_EXPIRE_SECONDS + 600,
    });

    const downloadPageUrl = `${workerOrigin}/d/${token}`;

    await callTelegramApi(botToken, "sendMessage", {
      chat_id: chatId,
      text:
        "✅ فایل شما با موفقیت پردازش شد!\n\n" +
        `📄 نام فایل: ${fileInfo.file_name}\n` +
        `📦 حجم فایل: ${formatFileSize(fileInfo.file_size)}\n` +
        "⏳ زمان انقضا: ۲۴ ساعت دیگر\n\n" +
        `🔗 لینک دانلود:\n${downloadPageUrl}`,
      reply_markup: {
        inline_keyboard: [
          [{ text: "⬇️ باز کردن صفحه دانلود", url: downloadPageUrl }],
        ],
      },
      disable_web_page_preview: true,
    });
  } catch (err) {
    console.error("handleUpdate error:", err);
    try {
      await callTelegramApi(botToken, "sendMessage", {
        chat_id: chatId,
        text: "⚠️ خطایی رخ داد. لطفاً دوباره تلاش کنید.",
      });
    } catch (_) {
      // اگر ارسال پیام خطا هم شکست بخورد، فقط لاگ می‌کنیم
    }
  }
}

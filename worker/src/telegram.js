// لایه ارتباط با Telegram Bot API
// نکته امنیتی: BOT_TOKEN فقط در سمت سرور (این Worker) استفاده می‌شود
// و هرگز به کلاینت/مرورگر کاربر ارسال نمی‌شود.

const API_ROOT = "https://api.telegram.org/bot";
const FILE_ROOT = "https://api.telegram.org/file/bot";

export async function callTelegramApi(botToken, method, params = {}) {
  const res = await fetch(`${API_ROOT}${botToken}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!data.ok) {
    throw new Error(
      `Telegram API error on ${method}: ${data.description || "unknown"}`
    );
  }
  return data.result;
}

export async function getFileInfo(botToken, fileId) {
  const res = await fetch(
    `${API_ROOT}${botToken}/getFile?file_id=${encodeURIComponent(fileId)}`
  );
  const data = await res.json();
  if (!data.ok) {
    throw new Error(`getFile failed: ${data.description || "unknown"}`);
  }
  return data.result; // شامل file_path
}

export function buildFileDownloadUrl(botToken, filePath) {
  return `${FILE_ROOT}${botToken}/${filePath}`;
}

/**
 * استخراج file_id / file_name / file_size از انواع پیام‌های حاوی فایل:
 * document, video, audio, voice, photo, animation
 */
export function extractFileFromMessage(message) {
  if (!message) return null;

  if (message.document) {
    const d = message.document;
    return {
      file_id: d.file_id,
      file_name: d.file_name || `file_${d.file_unique_id}`,
      file_size: d.file_size || 0,
    };
  }

  if (message.video) {
    const v = message.video;
    return {
      file_id: v.file_id,
      file_name: v.file_name || `video_${v.file_unique_id}.mp4`,
      file_size: v.file_size || 0,
    };
  }

  if (message.audio) {
    const a = message.audio;
    return {
      file_id: a.file_id,
      file_name: a.file_name || `audio_${a.file_unique_id}.mp3`,
      file_size: a.file_size || 0,
    };
  }

  if (message.voice) {
    const v = message.voice;
    return {
      file_id: v.file_id,
      file_name: `voice_${v.file_unique_id}.ogg`,
      file_size: v.file_size || 0,
    };
  }

  if (message.animation) {
    const a = message.animation;
    return {
      file_id: a.file_id,
      file_name: a.file_name || `animation_${a.file_unique_id}.gif`,
      file_size: a.file_size || 0,
    };
  }

  if (message.photo && message.photo.length > 0) {
    // بزرگ‌ترین سایز عکس، آخرین آیتم آرایه است
    const largest = message.photo[message.photo.length - 1];
    return {
      file_id: largest.file_id,
      file_name: `photo_${largest.file_unique_id}.jpg`,
      file_size: largest.file_size || 0,
    };
  }

  return null;
}

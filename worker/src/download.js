import { getFileInfo, buildFileDownloadUrl } from "./telegram.js";
import { renderDownloadPage, renderErrorPage } from "./pages.js";
import { nowSeconds } from "./utils.js";

const RATE_LIMIT_MAX_PER_MINUTE = 15;

/**
 * GET /d/:token -> صفحه HTML دانلود
 */
export async function handleDownloadPage(request, env, url) {
  const token = decodeURIComponent(url.pathname.split("/d/")[1] || "");
  if (!token) {
    return htmlResponse(
      renderErrorPage("درخواست نامعتبر", "توکن ارسال نشده است.", "❌"),
      400
    );
  }

  const raw = await env.LINKS.get(token);
  if (!raw) {
    return htmlResponse(
      renderErrorPage(
        "لینک یافت نشد",
        "این لینک وجود ندارد، اشتباه است یا حذف شده است.",
        "🔍"
      ),
      404
    );
  }

  const record = JSON.parse(raw);
  const now = nowSeconds();

  if (record.expire_at < now) {
    return htmlResponse(
      renderErrorPage(
        "لینک منقضی شده",
        "مدت اعتبار این لینک (۲۴ ساعت) به پایان رسیده و دیگر قابل استفاده نیست.",
        "⏳"
      ),
      410
    );
  }

  return htmlResponse(renderDownloadPage(record, token), 200);
}

/**
 * GET /download/:token -> استریم مستقیم فایل از سرورهای تلگرام
 */
export async function handleDownload(request, env, url, ctx) {
  const token = decodeURIComponent(url.pathname.split("/download/")[1] || "");
  if (!token) {
    return new Response("Bad request", { status: 400 });
  }

  // --- نرخ‌محدودسازی ساده بر اساس IP + توکن ---
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const rlKey = `rl:${ip}:${token}`;
  const rlRaw = await env.LINKS.get(rlKey);
  const rlCount = rlRaw ? parseInt(rlRaw, 10) : 0;

  if (rlCount >= RATE_LIMIT_MAX_PER_MINUTE) {
    return new Response(
      "تعداد درخواست‌های شما بیش از حد مجاز است. کمی صبر کنید و دوباره تلاش کنید.",
      { status: 429, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }

  ctx.waitUntil(
    env.LINKS.put(rlKey, String(rlCount + 1), { expirationTtl: 60 })
  );

  // --- خواندن رکورد از KV ---
  const raw = await env.LINKS.get(token);
  if (!raw) {
    return new Response("لینک یافت نشد", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const record = JSON.parse(raw);
  const now = nowSeconds();

  if (record.expire_at < now) {
    return new Response("این لینک منقضی شده است", {
      status: 410,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // --- دریافت مسیر فایل از تلگرام و استریم آن ---
  let fileInfo;
  try {
    fileInfo = await getFileInfo(env.BOT_TOKEN, record.file_id);
  } catch (err) {
    console.error("getFile failed:", err);
    return new Response("خطا در دریافت فایل از تلگرام", {
      status: 502,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const fileUrl = buildFileDownloadUrl(env.BOT_TOKEN, fileInfo.file_path);
  const fileRes = await fetch(fileUrl);

  if (!fileRes.ok || !fileRes.body) {
    return new Response("خطا در دریافت محتوای فایل از تلگرام", {
      status: 502,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // افزایش شمارنده دانلود به‌صورت غیرمسدودکننده (best-effort)
  ctx.waitUntil(
    (async () => {
      try {
        record.downloads = (record.downloads || 0) + 1;
        const remainingTtl = record.expire_at - now;
        await env.LINKS.put(token, JSON.stringify(record), {
          expirationTtl: remainingTtl > 60 ? remainingTtl : 60,
        });
      } catch (e) {
        console.error("Failed to increment download counter:", e);
      }
    })()
  );

  const contentType = fileRes.headers.get("Content-Type") || "application/octet-stream";
  const contentLength = fileRes.headers.get("Content-Length");
  const safeFileName = encodeURIComponent(record.file_name || "file");

  const headers = {
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename*=UTF-8''${safeFileName}`,
    "Cache-Control": "no-store",
  };
  if (contentLength) headers["Content-Length"] = contentLength;

  return new Response(fileRes.body, { status: 200, headers });
}

function htmlResponse(html, status) {
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

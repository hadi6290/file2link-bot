import { handleUpdate } from "./bot.js";
import { handleDownloadPage, handleDownload } from "./download.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    try {
      // --- Webhook تلگرام ---
      if (url.pathname === "/webhook" && request.method === "POST") {
        // اگر WEBHOOK_SECRET تنظیم شده باشد، هدر امنیتی تلگرام بررسی می‌شود
        if (env.WEBHOOK_SECRET) {
          const secretHeader = request.headers.get(
            "X-Telegram-Bot-Api-Secret-Token"
          );
          if (secretHeader !== env.WEBHOOK_SECRET) {
            return new Response("Forbidden", { status: 403 });
          }
        }

        let update;
        try {
          update = await request.json();
        } catch (_) {
          return new Response("Bad request", { status: 400 });
        }

        // پردازش آپدیت به‌صورت غیرمسدودکننده تا پاسخ سریع 200 به تلگرام برگردد
        ctx.waitUntil(handleUpdate(update, env, url.origin));
        return new Response("OK", { status: 200 });
      }

      // --- صفحه دانلود HTML ---
      if (url.pathname.startsWith("/d/")) {
        return await handleDownloadPage(request, env, url);
      }

      // --- استریم مستقیم فایل ---
      if (url.pathname.startsWith("/download/")) {
        return await handleDownload(request, env, url, ctx);
      }

      if (url.pathname === "/" || url.pathname === "") {
        return new Response("File2Link Bot Worker is running ✅", {
          status: 200,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }

      return new Response("Not found", { status: 404 });
    } catch (err) {
      console.error("Unhandled error:", err);
      return new Response("Internal Server Error", { status: 500 });
    }
  },
};

import { formatFileSize, escapeHtml } from "./utils.js";

const BASE_STYLE = `
  :root {
    --bg: #0f1117;
    --card-bg: #171a23;
    --accent: #4f8cff;
    --accent-2: #6ee7b7;
    --danger: #ff6b6b;
    --text: #e8eaf0;
    --text-dim: #9aa0ae;
    --border: #262b38;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Tahoma, "Vazirmatn", "Segoe UI", sans-serif;
    background: radial-gradient(circle at top, #1a1e29, var(--bg));
    color: var(--text);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }
  .card {
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 32px 24px;
    max-width: 420px;
    width: 100%;
    text-align: center;
    box-shadow: 0 20px 60px rgba(0,0,0,0.45);
  }
  .logo {
    width: 64px; height: 64px;
    margin: 0 auto 16px;
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    border-radius: 16px;
    display: flex; align-items: center; justify-content: center;
    font-size: 30px;
  }
`;

export function renderDownloadPage(record, token) {
  const fileName = escapeHtml(record.file_name || "file");
  const fileSize = formatFileSize(record.file_size);
  const expireAtMs = record.expire_at * 1000;

  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>دانلود فایل | ${fileName}</title>
<style>
${BASE_STYLE}
  h1 { font-size: 18px; font-weight: 600; word-break: break-word; margin-bottom: 6px; }
  .size { color: var(--text-dim); font-size: 14px; margin-bottom: 20px; }
  .countdown {
    background: #1e2330;
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 12px;
    font-size: 13px;
    color: var(--text-dim);
    margin-bottom: 24px;
  }
  .countdown span { color: var(--accent-2); font-weight: 700; font-family: monospace; }
  .countdown.expired span { color: var(--danger); }
  .download-btn {
    display: block;
    width: 100%;
    padding: 16px;
    background: linear-gradient(135deg, var(--accent), #3b6fd8);
    color: #fff;
    text-decoration: none;
    border-radius: 14px;
    font-size: 16px;
    font-weight: 700;
    border: none;
    cursor: pointer;
    transition: transform 0.15s ease, opacity 0.15s ease;
  }
  .download-btn:active { transform: scale(0.97); }
  .download-btn.disabled { opacity: 0.45; pointer-events: none; }
  .footer { margin-top: 20px; font-size: 12px; color: var(--text-dim); }
  .downloads { margin-top: 10px; font-size: 12px; color: var(--text-dim); }
</style>
</head>
<body>
  <div class="card">
    <div class="logo">📁</div>
    <h1>${fileName}</h1>
    <div class="size">حجم فایل: ${fileSize}</div>
    <div class="countdown" id="countdownBox">
      زمان باقی‌مانده تا انقضا: <span id="timer">در حال محاسبه...</span>
    </div>
    <a href="/download/${token}" class="download-btn" id="downloadBtn">⬇️ دانلود فایل</a>
    <div class="downloads">تعداد دانلود تاکنون: ${record.downloads || 0}</div>
    <div class="footer">File2Link • ذخیره‌سازی فقط روی سرورهای تلگرام</div>
  </div>

<script>
  var expireAt = ${expireAtMs};
  var timerEl = document.getElementById('timer');
  var box = document.getElementById('countdownBox');
  var btn = document.getElementById('downloadBtn');

  function pad(n) { return String(n).padStart(2, '0'); }

  function tick() {
    var diff = expireAt - Date.now();
    if (diff <= 0) {
      timerEl.textContent = 'منقضی شده';
      box.classList.add('expired');
      btn.textContent = '❌ لینک منقضی شده';
      btn.classList.add('disabled');
      clearInterval(interval);
      return;
    }
    var h = Math.floor(diff / 3600000);
    var m = Math.floor((diff % 3600000) / 60000);
    var s = Math.floor((diff % 60000) / 1000);
    timerEl.textContent = pad(h) + ' ساعت ' + pad(m) + ' دقیقه ' + pad(s) + ' ثانیه';
  }
  tick();
  var interval = setInterval(tick, 1000);
</script>
</body>
</html>`;
}

export function renderErrorPage(title, message, statusEmoji = "⚠️") {
  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<style>
${BASE_STYLE}
  h1 { font-size: 20px; margin-bottom: 8px; }
  p { color: var(--text-dim); font-size: 14px; line-height: 1.8; }
  .icon { font-size: 48px; margin-bottom: 16px; }
</style>
</head>
<body>
  <div class="card">
    <div class="icon">${statusEmoji}</div>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(message)}</p>
  </div>
</body>
</html>`;
}

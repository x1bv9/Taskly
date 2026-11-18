/* Taskly common helpers */
(function () {
  'use strict';
  // Footer year
  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = String(new Date().getFullYear()); });

  // FAQ accordion
  document.querySelectorAll('.faq-q').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = btn.closest('.faq-item');
      if (item) item.classList.toggle('open');
    });
  });

  window.BizStore = {
    get: function (key, fallback) {
      try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
      catch (e) { return fallback; }
    },
    set: function (key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); return true; }
      catch (e) { window.BizToast('保存に失敗しました。ブラウザの保存容量を超えている可能性があります。'); return false; }
    },
    remove: function (key) { try { localStorage.removeItem(key); } catch (e) {} }
  };

  var toastTimer = null;
  window.BizToast = function (msg) {
    var t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2600);
  };

  window.BizFmt = {
    yen: function (n) { var v = Math.round(Number(n) || 0); return v.toLocaleString('ja-JP') + '円'; },
    num: function (n) { return (Number(n) || 0).toLocaleString('ja-JP'); },
    pct: function (n) { return (Math.round((Number(n) || 0) * 10) / 10).toLocaleString('ja-JP') + '%'; }
  };

  // Safe text setter (XSS: never inject user input via innerHTML)
  window.BizSetText = function (el, text) { if (el) el.textContent = text == null ? '' : String(text); };

  window.BizDownload = function (filename, text, mime) {
    var blob = new Blob([text], { type: mime || 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 500);
  };

  // PWA: register service worker (path resolved from this script location)
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    try {
      var swUrl = new URL('sw.js', document.currentScript ? document.currentScript.src.replace(/assets\/js\/common\.js.*$/, '') : location.href).href;
      navigator.serviceWorker.register(swUrl).catch(function () { /* optional feature */ });
    } catch (e) { /* ignore */ }
  }

  window.BizCsvCell = function (v) {
    var s = String(v == null ? '' : v);
    if (/[",\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
})();

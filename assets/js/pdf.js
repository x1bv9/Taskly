/* PDF direct download for document tools (estimate / invoice / report).
   How it works:
   1. Clone the A4 preview sheet into a fixed-width (794px = A4 at 96dpi)
      off-screen container at the document origin, so capture coordinates
      never depend on the on-screen layout or scroll position.
   2. Render the clone with html2canvas (vendored locally, no CDN).
   3. Verify the canvas actually contains drawn content; if it is blank,
      abort with an error instead of downloading an empty PDF.
   4. Place the image into a jsPDF A4 document, slicing across pages
      when the sheet is taller than one page, and save it.
   Japanese is rendered as an image of the on-screen preview, so no
   embedded Japanese font is needed and text cannot garble. */
(function () {
  'use strict';

  function sanitize(name) {
    return String(name || 'document').replace(/[\\/:*?"<>|\s]+/g, '_').replace(/^_+|_+$/g, '') || 'document';
  }

  function canvasHasContent(canvas) {
    try {
      var ctx = canvas.getContext('2d');
      var data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      var dark = 0, total = canvas.width * canvas.height;
      for (var i = 0; i < data.length; i += 4 * 53) {
        if (data[i] < 200 || data[i + 1] < 200 || data[i + 2] < 200) dark++;
      }
      var sampled = Math.ceil(data.length / 4 / 53);
      return sampled > 0 && (dark / sampled) > 0.001 && total > 0;
    } catch (e) {
      return true; // if inspection itself fails, do not block generation
    }
  }

  window.BizPdfDownload = function (sheet, filenameBase, done) {
    function finish(ok) { if (done) done(ok); }
    if (!sheet) { if (window.BizToast) BizToast('プレビューが見つかりません'); finish(false); return; }
    if (!window.html2canvas || !window.jspdf) {
      if (window.BizToast) BizToast('PDFライブラリの読み込みに失敗しました。「印刷」ボタンからお試しください');
      finish(false); return;
    }

    var holder = document.createElement('div');
    holder.style.cssText = 'position:absolute;left:0;top:0;width:794px;background:#ffffff;z-index:-1;overflow:hidden;';
    // Same compact metrics as the @media print rules, so the downloaded
    // PDF and the printed PDF have the same layout.
    var compact = document.createElement('style');
    compact.textContent = '.pdf-clone{font-size:12.5px!important;line-height:1.5!important;padding:36px 34px!important}' +
      '.pdf-clone h1{font-size:20px!important;margin:0 0 14px!important}' +
      '.pdf-clone h2{margin:14px 0 8px!important}' +
      '.pdf-clone th,.pdf-clone td{padding:6px 8px!important}';
    holder.appendChild(compact);
    var clone = sheet.cloneNode(true);
    clone.removeAttribute('id');
    clone.classList.add('pdf-clone');
    clone.style.cssText += ';width:794px;min-height:auto;margin:0;box-shadow:none;border:none;';
    holder.appendChild(clone);
    document.body.appendChild(holder);
    var prevScroll = window.scrollY;
    window.scrollTo(0, 0);

    window.html2canvas(clone, { scale: 2, backgroundColor: '#ffffff', logging: false, width: 794, windowWidth: 794 }).then(function (canvas) {
      if (!canvasHasContent(canvas)) throw new Error('blank canvas');
      var jsPDF = window.jspdf.jsPDF;
      var pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      var pageW = 210, pageH = 297;
      var fullH = canvas.height * pageW / canvas.width; // height at full A4 width
      if (fullH <= pageH * 1.6) {
        // Fit on a single page: shrink (and center) when slightly too tall.
        var w = pageW, h = fullH, x = 0;
        if (h > pageH) { h = pageH; w = canvas.width * pageH / canvas.height; x = (pageW - w) / 2; }
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.98), 'JPEG', x, 0, w, h);
      } else {
        // Very long documents only: slice across pages.
        var slicePx = Math.floor(canvas.width * pageH / pageW);
        var rendered = 0, page = 0;
        while (rendered < canvas.height) {
          var sh = Math.min(slicePx, canvas.height - rendered);
          var pc = document.createElement('canvas');
          pc.width = canvas.width; pc.height = sh;
          pc.getContext('2d').drawImage(canvas, 0, rendered, canvas.width, sh, 0, 0, canvas.width, sh);
          if (page > 0) pdf.addPage();
          pdf.addImage(pc.toDataURL('image/jpeg', 0.98), 'JPEG', 0, 0, pageW, sh * pageW / canvas.width);
          rendered += sh; page++;
        }
      }
      pdf.save(sanitize(filenameBase) + '.pdf');
      if (window.BizToast) BizToast('PDFをダウンロードしました');
      finish(true);
    }).catch(function () {
      if (window.BizToast) BizToast('PDFの生成に失敗しました。「印刷」ボタンからPDF保存をお試しください');
      finish(false);
    }).finally(function () {
      holder.remove();
      window.scrollTo(0, prevScroll);
    });
  };
})();

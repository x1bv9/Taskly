/* Shared logic for estimate / invoice document tools */
(function () {
  'use strict';
  window.BizDocumentTool = function (cfg) {
    // cfg: {prefix, kindLabel, extraFields:[ids], bank:bool}
    var draftKey = 'biztools_' + cfg.prefix + '_draft';
    var savedKey = 'biztools_' + cfg.prefix + '_saved';
    var form = document.getElementById('doc-form');
    var itemsBody = document.getElementById('items-body');
    var errorBox = document.getElementById('error-box');

    function field(id) { return document.getElementById(id); }
    function val(id) { var el = field(id); return el ? el.value.trim() : ''; }

    function addItemRow(data) {
      data = data || {};
      var tr = document.createElement('tr');
      tr.className = 'item-row';
      var tdName = document.createElement('td');
      var inName = document.createElement('input'); inName.type = 'text'; inName.className = 'it-name'; inName.placeholder = '商品・サービス名'; inName.value = data.name || '';
      tdName.appendChild(inName);
      var tdQty = document.createElement('td');
      var inQty = document.createElement('input'); inQty.type = 'number'; inQty.className = 'it-qty'; inQty.min = '0'; inQty.step = 'any'; inQty.value = data.quantity != null ? data.quantity : 1;
      tdQty.appendChild(inQty);
      var tdPrice = document.createElement('td');
      var inPrice = document.createElement('input'); inPrice.type = 'number'; inPrice.className = 'it-price'; inPrice.min = '0'; inPrice.step = '1'; inPrice.value = data.unitPrice != null ? data.unitPrice : '';
      tdPrice.appendChild(inPrice);
      var tdRate = document.createElement('td');
      var sel = document.createElement('select'); sel.className = 'it-rate';
      [10, 8, 0].forEach(function (r) { var o = document.createElement('option'); o.value = String(r); o.textContent = r + '%'; sel.appendChild(o); });
      sel.value = String(data.taxRate != null ? data.taxRate : 10);
      tdRate.appendChild(sel);
      var tdAmt = document.createElement('td'); tdAmt.className = 'num it-amount'; tdAmt.textContent = '0円';
      var tdDel = document.createElement('td');
      var del = document.createElement('button'); del.type = 'button'; del.className = 'btn btn-danger btn-small'; del.textContent = '削除';
      del.addEventListener('click', function () { tr.remove(); if (!itemsBody.querySelector('.item-row')) addItemRow(); update(); });
      tdDel.appendChild(del);
      [tdName, tdQty, tdPrice, tdRate, tdAmt, tdDel].forEach(function (td) { tr.appendChild(td); });
      [inName, inQty, inPrice, sel].forEach(function (el) { el.addEventListener('input', update); el.addEventListener('change', update); });
      itemsBody.appendChild(tr);
      return tr;
    }

    function collectItems() {
      var items = [];
      itemsBody.querySelectorAll('.item-row').forEach(function (tr) {
        items.push({
          name: tr.querySelector('.it-name').value.trim(),
          quantity: Number(tr.querySelector('.it-qty').value) || 0,
          unitPrice: Number(tr.querySelector('.it-price').value) || 0,
          taxRate: Number(tr.querySelector('.it-rate').value) || 0
        });
      });
      return items;
    }

    function collect() {
      var data = { items: collectItems() };
      form.querySelectorAll('[data-field]').forEach(function (el) { data[el.getAttribute('data-field')] = el.value; });
      return data;
    }

    function apply(data) {
      if (!data) return;
      form.querySelectorAll('[data-field]').forEach(function (el) {
        var k = el.getAttribute('data-field');
        if (data[k] != null) el.value = data[k];
      });
      itemsBody.textContent = '';
      (data.items && data.items.length ? data.items : [{}]).forEach(addItemRow);
      update();
    }

    function validate(data) {
      var errs = [];
      if (!data.issuerName) errs.push('発行者の会社名または氏名を入力してください。');
      if (!data.clientName) errs.push((cfg.prefix === 'estimate' ? '取引先' : '請求先') + 'の会社名を入力してください。');
      if (!data.docDate) errs.push('発行日を入力してください。');
      data.items.forEach(function (it, i) {
        if (it.quantity < 0) errs.push((i + 1) + '行目：数量は0以上にしてください。');
        if (it.unitPrice < 0) errs.push((i + 1) + '行目：単価は0以上にしてください。');
      });
      return errs;
    }

    function setText(id, txt) { var el = field(id); if (el) el.textContent = txt == null ? '' : String(txt); }

    function update() {
      var data = collect();
      var result = BizCalc.calcTax(data.items);
      // form-side line amounts
      var rows = itemsBody.querySelectorAll('.item-row');
      rows.forEach(function (tr, i) { tr.querySelector('.it-amount').textContent = BizFmt.yen(result.lines[i] ? result.lines[i].amount : 0); });
      setText('sum-subtotal', BizFmt.yen(result.subtotal));
      setText('sum-tax', BizFmt.yen(result.taxTotal));
      setText('sum-total', BizFmt.yen(result.total));
      var detailEl = field('sum-tax-detail');
      if (detailEl) {
        detailEl.textContent = '';
        result.taxDetails.forEach(function (d) {
          var div = document.createElement('div'); div.className = 'summary-row';
          var s1 = document.createElement('span'); s1.textContent = d.rate + '%対象 ' + BizFmt.yen(d.base);
          var s2 = document.createElement('span'); s2.textContent = '消費税 ' + BizFmt.yen(d.tax);
          div.appendChild(s1); div.appendChild(s2); detailEl.appendChild(div);
        });
      }
      renderPreview(data, result);
      BizStore.set(draftKey, data);
      var errs = validate(data);
      if (errorBox) {
        if (errs.length && data._touched) { errorBox.textContent = errs.join(' '); errorBox.classList.add('show'); }
        else errorBox.classList.remove('show');
      }
      return { data: data, result: result, errors: errs };
    }

    function renderPreview(data, result) {
      setText('pv-title', cfg.kindLabel);
      setText('pv-number', (cfg.prefix === 'estimate' ? '見積書番号: ' : '請求書番号: ') + (data.docNumber || '—'));
      setText('pv-date', '発行日: ' + (data.docDate || '—'));
      setText('pv-client', (data.clientName || '（取引先未入力）') + (data.clientPerson ? '　' + data.clientPerson + ' 様' : ' 御中'));
      setText('pv-client-address', data.clientAddress || '');
      setText('pv-subject', data.subject ? '件名: ' + data.subject : '');
      setText('pv-total', BizFmt.yen(result.total));
      setText('pv-issuer', [data.issuerName, data.issuerAddress, data.issuerTel ? 'TEL: ' + data.issuerTel : '', data.issuerEmail || '', data.issuerReg ? '登録番号: ' + data.issuerReg : ''].filter(Boolean).join('\n'));
      setText('pv-valid', cfg.prefix === 'estimate' ? ('有効期限: ' + (data.validDate || '—')) : ('支払期限: ' + (data.validDate || '—')));
      var tbody = field('pv-items'); tbody.textContent = '';
      result.lines.forEach(function (ln) {
        var tr = document.createElement('tr');
        [ln.name || '—', String(ln.quantity), BizFmt.num(ln.unitPrice), ln.taxRate + '%', BizFmt.yen(ln.amount)].forEach(function (v, idx) {
          var td = document.createElement('td'); if (idx > 0) td.className = 'num'; td.textContent = v; tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      var sum = field('pv-summary'); sum.textContent = '';
      function row(k, v, cls) { var d = document.createElement('div'); d.className = 'summary-row' + (cls ? ' ' + cls : ''); var a = document.createElement('span'); a.textContent = k; var b = document.createElement('span'); b.textContent = v; d.appendChild(a); d.appendChild(b); sum.appendChild(d); }
      row('小計', BizFmt.yen(result.subtotal));
      result.taxDetails.forEach(function (d) { row(d.rate + '%対象 ' + BizFmt.yen(d.base) + ' の消費税', BizFmt.yen(d.tax)); });
      row('消費税合計', BizFmt.yen(result.taxTotal));
      row('合計', BizFmt.yen(result.total), 'total');
      setText('pv-notes', data.notes || '');
      if (cfg.prefix === 'estimate') setText('pv-payment', data.paymentTerms ? '支払条件: ' + data.paymentTerms : '');
      if (cfg.bank) {
        var bankTxt = [data.bankName, data.bankBranch, data.bankType, data.bankNumber, data.bankHolder].filter(Boolean).join(' ');
        setText('pv-bank', bankTxt ? '振込先: ' + bankTxt : '');
      }
    }

    function renderSavedList() {
      var list = field('saved-list'); if (!list) return;
      var saved = BizStore.get(savedKey, {});
      list.textContent = '';
      var names = Object.keys(saved);
      if (!names.length) { var p = document.createElement('p'); p.textContent = '保存済みの' + cfg.kindLabel + 'はありません。'; list.appendChild(p); return; }
      names.forEach(function (name) {
        var div = document.createElement('div'); div.className = 'summary-row';
        var s = document.createElement('span'); s.textContent = name;
        var wrap = document.createElement('span');
        var load = document.createElement('button'); load.type = 'button'; load.className = 'btn btn-outline btn-small'; load.textContent = '読込';
        load.addEventListener('click', function () { apply(BizStore.get(savedKey, {})[name]); BizToast('読み込みました'); });
        var del = document.createElement('button'); del.type = 'button'; del.className = 'btn btn-danger btn-small'; del.textContent = '削除';
        del.addEventListener('click', function () { var s2 = BizStore.get(savedKey, {}); delete s2[name]; BizStore.set(savedKey, s2); renderSavedList(); BizToast('削除しました'); });
        wrap.appendChild(load); wrap.appendChild(document.createTextNode(' ')); wrap.appendChild(del);
        div.appendChild(s); div.appendChild(wrap); list.appendChild(div);
      });
    }

    // wiring
    document.getElementById('add-item').addEventListener('click', function () { addItemRow(); update(); });
    form.querySelectorAll('[data-field]').forEach(function (el) { el.addEventListener('input', update); el.addEventListener('change', update); });
    document.getElementById('btn-print').addEventListener('click', function () {
      var u = update(); u.data._touched = true;
      var errs = validate(u.data);
      if (errs.length) { errorBox.textContent = errs.join(' '); errorBox.classList.add('show'); BizToast('入力内容を確認してください'); return; }
      window.print();
    });
    var pdfBtn = document.getElementById('btn-pdf');
    if (pdfBtn) pdfBtn.addEventListener('click', function () {
      var u = update(); u.data._touched = true;
      var errs = validate(u.data);
      if (errs.length) { errorBox.textContent = errs.join(' '); errorBox.classList.add('show'); BizToast('入力内容を確認してください'); return; }
      pdfBtn.disabled = true; pdfBtn.textContent = 'PDF生成中…';
      var base = cfg.kindLabel + (u.data.docNumber ? '_' + u.data.docNumber : '');
      BizPdfDownload(document.getElementById('print-sheet'), base, function () {
        pdfBtn.disabled = false; pdfBtn.textContent = 'PDFダウンロード';
      });
    });
    document.getElementById('btn-reset').addEventListener('click', function () {
      if (!window.confirm('入力内容をリセットしますか？')) return;
      form.querySelectorAll('[data-field]').forEach(function (el) { el.value = ''; });
      itemsBody.textContent = ''; addItemRow();
      var today = new Date(); var iso = today.toISOString().slice(0, 10);
      if (field('doc-date')) field('doc-date').value = iso;
      BizStore.remove(draftKey); update(); BizToast('リセットしました');
    });
    var saveBtn = document.getElementById('btn-save-named');
    if (saveBtn) saveBtn.addEventListener('click', function () {
      var nameEl = field('save-name'); var name = nameEl ? nameEl.value.trim() : '';
      if (!name) { BizToast('保存名を入力してください'); return; }
      var saved = BizStore.get(savedKey, {}); saved[name] = collect();
      if (BizStore.set(savedKey, saved)) { BizToast('「' + name + '」として保存しました'); renderSavedList(); }
    });

    // init
    var draft = BizStore.get(draftKey, null);
    if (draft && (draft.issuerName || draft.clientName || (draft.items && draft.items.length))) apply(draft);
    else { addItemRow(); var d = field('doc-date'); if (d && !d.value) d.value = new Date().toISOString().slice(0, 10); update(); }
    renderSavedList();
  };
})();

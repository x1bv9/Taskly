/* Delivery note tool (self-contained; item rows follow the document.js pattern) */
(function () {
  'use strict';
  var draftKey = 'taskly_delivery_draft';
  var savedKey = 'taskly_delivery_saved';
  var itemsBody = document.getElementById('items-body');
  var errorBox = document.getElementById('error-box');
  var touched = false;

  function $(id) { return document.getElementById(id); }
  function val(id) { var el = $(id); return el ? el.value.trim() : ''; }
  function setText(id, txt) { var el = $(id); if (el) el.textContent = txt == null ? '' : String(txt); }

  var FIELD_IDS = {
    issuerName: 'd-issuer-name', issuerPostal: 'd-issuer-postal', issuerAddress: 'd-issuer-address',
    issuerTel: 'd-issuer-tel', issuerFax: 'd-issuer-fax',
    clientName: 'd-client-name', clientPerson: 'd-client-person', clientPostal: 'd-client-postal',
    clientAddress: 'd-client-address', docNumber: 'd-doc-number', docDate: 'd-doc-date',
    subject: 'd-subject', notes: 'd-notes'
  };

  function addItemRow(data) {
    data = data || {};
    var tr = document.createElement('tr');
    tr.className = 'item-row';
    var tdCode = document.createElement('td');
    var inCode = document.createElement('input'); inCode.type = 'text'; inCode.className = 'it-code'; inCode.placeholder = '品番'; inCode.value = data.code || '';
    tdCode.appendChild(inCode);
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
    [tdCode, tdName, tdQty, tdPrice, tdRate, tdAmt, tdDel].forEach(function (td) { tr.appendChild(td); });
    [inCode, inName, inQty, inPrice, sel].forEach(function (el) { el.addEventListener('input', update); el.addEventListener('change', update); });
    itemsBody.appendChild(tr);
    return tr;
  }

  function collectItems() {
    var items = [];
    itemsBody.querySelectorAll('.item-row').forEach(function (tr) {
      items.push({
        code: tr.querySelector('.it-code').value.trim(),
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
    Object.keys(FIELD_IDS).forEach(function (k) { data[k] = val(FIELD_IDS[k]); });
    return data;
  }

  function apply(data) {
    if (!data) return;
    Object.keys(FIELD_IDS).forEach(function (k) {
      var el = $(FIELD_IDS[k]);
      if (el && data[k] != null) el.value = data[k];
    });
    itemsBody.textContent = '';
    (data.items && data.items.length ? data.items : [{}]).forEach(addItemRow);
    update();
  }

  function validate(data) {
    var errs = [];
    if (!data.issuerName) errs.push('発行者の会社名または氏名を入力してください。');
    if (!data.clientName) errs.push('納品先の会社名を入力してください。');
    if (!data.docDate) errs.push('納品日を入力してください。');
    data.items.forEach(function (it, i) {
      if (it.quantity < 0) errs.push((i + 1) + '行目：数量は0以上にしてください。');
      if (it.unitPrice < 0) errs.push((i + 1) + '行目：単価は0以上にしてください。');
    });
    return errs;
  }

  function fmtJP(d) {
    if (!d) return '—';
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
    if (!m) return d;
    return m[1] + '年' + Number(m[2]) + '月' + Number(m[3]) + '日';
  }

  function renderPreview(data, result) {
    setText('pv-number', '納品書番号：' + (data.docNumber || '—'));
    setText('pv-date', '納品日：' + fmtJP(data.docDate));
    setText('pv-client', (data.clientName || '（納品先未入力）') + (data.clientPerson ? '　' + data.clientPerson + ' 様' : ' 御中'));
    setText('pv-client-postal', data.clientPostal ? '〒' + data.clientPostal : '');
    setText('pv-client-address', data.clientAddress || '');
    setText('pv-greeting', '下記の通り納品いたします。');
    setText('pv-subject', data.subject ? '件名：' + data.subject : '');
    setText('pv-issuer-name', data.issuerName || '');
    setText('pv-issuer', [data.issuerPostal ? '〒' + data.issuerPostal : '', data.issuerAddress || '', data.issuerTel ? 'TEL：' + data.issuerTel : '', data.issuerFax ? 'FAX：' + data.issuerFax : ''].filter(Boolean).join('\n'));
    var tbody = $('pv-items'); tbody.textContent = '';
    var hasReduced = false, hasExempt = false;
    result.lines.forEach(function (ln, i) {
      if (ln.taxRate === 8) hasReduced = true;
      if (ln.taxRate === 0) hasExempt = true;
      var marker = ln.taxRate === 8 ? ' ※' : (ln.taxRate === 0 ? ' （非課税）' : '');
      var tr = document.createElement('tr');
      [data.items[i] ? data.items[i].code : '', (ln.name || '—') + marker, String(ln.quantity), BizFmt.num(ln.unitPrice), BizFmt.yen(ln.amount)].forEach(function (v, idx) {
        var td = document.createElement('td'); if (idx >= 2) td.className = 'num'; td.textContent = v; tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    var MINROWS = 8;
    for (var i = result.lines.length; i < MINROWS; i++) {
      var btr = document.createElement('tr'); btr.className = 'pv-blank';
      for (var j = 0; j < 5; j++) btr.appendChild(document.createElement('td'));
      tbody.appendChild(btr);
    }
    var notes = [];
    if (hasReduced) notes.push('※は軽減税率対象品目です。');
    if (hasExempt) notes.push('（非課税）の品目は消費税の対象外です。');
    setText('pv-taxnote', notes.join(' '));
    var sum = $('pv-summary'); sum.textContent = '';
    function row(k, v, cls) { var d = document.createElement('div'); d.className = 'summary-row' + (cls ? ' ' + cls : ''); var a = document.createElement('span'); a.textContent = k; var b = document.createElement('span'); b.textContent = v; d.appendChild(a); d.appendChild(b); sum.appendChild(d); }
    row('小計', BizFmt.yen(result.subtotal));
    row('消費税', BizFmt.yen(result.taxTotal));
    row('合計', BizFmt.yen(result.total), 'total');
    setText('pv-taxbreak', result.taxDetails.length ? '消費税内訳：' + result.taxDetails.map(function (d) { return d.rate + '%対象 ' + BizFmt.yen(d.base) + '（消費税 ' + BizFmt.yen(d.tax) + '）'; }).join('　') : '');
    setText('pv-notes', data.notes || '');
  }

  function update() {
    var data = collect();
    var result = BizCalc.calcTax(data.items);
    var rows = itemsBody.querySelectorAll('.item-row');
    rows.forEach(function (tr, i) { tr.querySelector('.it-amount').textContent = BizFmt.yen(result.lines[i] ? result.lines[i].amount : 0); });
    setText('sum-subtotal', BizFmt.yen(result.subtotal));
    setText('sum-tax', BizFmt.yen(result.taxTotal));
    setText('sum-total', BizFmt.yen(result.total));
    var detailEl = $('sum-tax-detail');
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
      if (errs.length && touched) { errorBox.textContent = errs.join(' '); errorBox.classList.add('show'); }
      else errorBox.classList.remove('show');
    }
    return { data: data, result: result, errors: errs };
  }

  function renderSavedList() {
    var list = $('saved-list'); if (!list) return;
    var saved = BizStore.get(savedKey, {});
    list.textContent = '';
    var names = Object.keys(saved);
    if (!names.length) { var p = document.createElement('p'); p.textContent = '保存済みの納品書はありません。'; list.appendChild(p); return; }
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
  $('add-item').addEventListener('click', function () { addItemRow(); update(); });
  Object.keys(FIELD_IDS).forEach(function (k) {
    var el = $(FIELD_IDS[k]);
    if (el) { el.addEventListener('input', update); el.addEventListener('change', update); }
  });
  $('btn-print').addEventListener('click', function () {
    touched = true;
    var u = update();
    if (u.errors.length) { errorBox.textContent = u.errors.join(' '); errorBox.classList.add('show'); BizToast('入力内容を確認してください'); return; }
    window.print();
  });
  var pdfBtn = $('btn-pdf');
  pdfBtn.addEventListener('click', function () {
    touched = true;
    var u = update();
    if (u.errors.length) { errorBox.textContent = u.errors.join(' '); errorBox.classList.add('show'); BizToast('入力内容を確認してください'); return; }
    pdfBtn.disabled = true; pdfBtn.textContent = 'PDF生成中…';
    var base = '納品書' + (u.data.docNumber ? '_' + u.data.docNumber : '');
    BizPdfDownload($('print-sheet'), base, function () {
      pdfBtn.disabled = false; pdfBtn.textContent = 'PDFダウンロード';
    });
  });
  $('btn-reset').addEventListener('click', function () {
    if (!window.confirm('入力内容をリセットしますか？')) return;
    Object.keys(FIELD_IDS).forEach(function (k) { var el = $(FIELD_IDS[k]); if (el) el.value = ''; });
    itemsBody.textContent = ''; addItemRow();
    $('d-doc-date').value = new Date().toISOString().slice(0, 10);
    touched = false;
    BizStore.remove(draftKey); update(); BizToast('リセットしました');
  });
  $('btn-save-named').addEventListener('click', function () {
    var name = $('save-name').value.trim();
    if (!name) { BizToast('保存名を入力してください'); return; }
    var saved = BizStore.get(savedKey, {}); saved[name] = collect();
    if (BizStore.set(savedKey, saved)) { BizToast('「' + name + '」として保存しました'); renderSavedList(); }
  });

  // init
  var draft = BizStore.get(draftKey, null);
  if (draft && (draft.issuerName || draft.clientName || (draft.items && draft.items.length))) apply(draft);
  else { addItemRow(); $('d-doc-date').value = new Date().toISOString().slice(0, 10); update(); }
  renderSavedList();
})();

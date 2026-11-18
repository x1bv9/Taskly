/* Receipt tool (auto-save only; tax-included amount with breakdown) */
(function () {
  'use strict';
  var draftKey = 'biztools_receipt_draft';
  var errorBox = document.getElementById('error-box');
  var touched = false;

  function $(id) { return document.getElementById(id); }
  function val(id) { var el = $(id); return el ? el.value.trim() : ''; }
  function setText(id, txt) { var el = $(id); if (el) el.textContent = txt == null ? '' : String(txt); }

  var FIELD_IDS = {
    payee: 'rc-payee', amount: 'rc-amount', rate: 'rc-rate', date: 'rc-date', number: 'rc-number',
    proviso: 'rc-proviso', issuerName: 'rc-issuer-name', issuerPostal: 'rc-issuer-postal',
    issuerAddress: 'rc-issuer-address', issuerTel: 'rc-issuer-tel'
  };

  function collect() {
    var data = {};
    Object.keys(FIELD_IDS).forEach(function (k) { data[k] = val(FIELD_IDS[k]); });
    data.amountNum = Math.trunc(Number(data.amount) || 0);
    data.rateNum = Number(data.rate) || 0;
    return data;
  }

  // Tax-included breakdown (integer math):
  // tax = floor(amount * rate / (100 + rate)); base = amount - tax.
  function breakdown(amount, rate) {
    if (!amount || amount <= 0 || !rate) return { base: amount > 0 ? amount : 0, tax: 0 };
    var tax = Math.floor(amount * rate / (100 + rate));
    return { base: amount - tax, tax: tax };
  }

  function validate(data) {
    var errs = [];
    if (!data.payee) errs.push('宛名を入力してください。');
    if (!data.amount) errs.push('金額（税込）を入力してください。');
    else if (data.amountNum <= 0) errs.push('金額（税込）は1円以上にしてください。');
    if (!data.date) errs.push('発行日を入力してください。');
    if (!data.issuerName) errs.push('発行者の会社名または氏名を入力してください。');
    return errs;
  }

  function fmtJP(d) {
    if (!d) return '—';
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
    if (!m) return d;
    return m[1] + '年' + Number(m[2]) + '月' + Number(m[3]) + '日';
  }

  function update() {
    var data = collect();
    var bd = breakdown(data.amountNum, data.rateNum);
    setText('rc-sum-base', BizFmt.yen(bd.base));
    setText('rc-sum-tax', BizFmt.yen(bd.tax));
    setText('rc-sum-total', BizFmt.yen(data.amountNum));

    setText('pv-date', '発行日：' + fmtJP(data.date));
    setText('pv-number', '領収書番号：' + (data.number || '—'));
    setText('pv-payee', data.payee || '（宛名未入力）');
    setText('pv-amount', data.amountNum > 0 ? '¥' + BizFmt.num(data.amountNum) + '-' : '¥—');
    setText('pv-proviso', data.proviso ? '但し書き：' + data.proviso : '');
    if (data.rateNum > 0) {
      setText('pv-breakdown', '内訳：税抜金額 ' + BizFmt.yen(bd.base) + '　消費税額 ' + BizFmt.yen(bd.tax) + '（税率' + data.rateNum + '%）');
    } else {
      setText('pv-breakdown', '内訳：税抜金額 ' + BizFmt.yen(bd.base) + '　消費税額 0円（対象外）');
    }
    $('pv-stamp-wrap').classList.toggle('hidden', !(data.amountNum >= 50000));
    setText('pv-issuer-name', data.issuerName || '');
    setText('pv-issuer', [data.issuerPostal ? '〒' + data.issuerPostal : '', data.issuerAddress || '', data.issuerTel ? 'TEL：' + data.issuerTel : ''].filter(Boolean).join('\n'));

    BizStore.set(draftKey, data);
    var errs = validate(data);
    if (errorBox) {
      if (errs.length && touched) { errorBox.textContent = errs.join(' '); errorBox.classList.add('show'); }
      else errorBox.classList.remove('show');
    }
    return { data: data, errors: errs };
  }

  // wiring
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
    var base = '領収書' + (u.data.number ? '_' + u.data.number : '');
    BizPdfDownload($('print-sheet'), base, function () {
      pdfBtn.disabled = false; pdfBtn.textContent = 'PDFダウンロード';
    });
  });
  $('btn-reset').addEventListener('click', function () {
    if (!window.confirm('入力内容をリセットしますか？')) return;
    Object.keys(FIELD_IDS).forEach(function (k) { var el = $(FIELD_IDS[k]); if (el) el.value = ''; });
    $('rc-rate').value = '10';
    $('rc-date').value = new Date().toISOString().slice(0, 10);
    touched = false;
    BizStore.remove(draftKey); update(); BizToast('リセットしました');
  });

  // init
  var draft = BizStore.get(draftKey, null);
  if (draft && (draft.payee || draft.amount || draft.issuerName)) {
    Object.keys(FIELD_IDS).forEach(function (k) {
      var el = $(FIELD_IDS[k]);
      if (el && draft[k] != null) el.value = draft[k];
    });
    update();
  } else {
    $('rc-date').value = new Date().toISOString().slice(0, 10);
    update();
  }
})();

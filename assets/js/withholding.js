(function () {
  'use strict';
  var draftKey = 'biztools_withholding_draft';
  function $(id) { return document.getElementById(id); }
  function radioVal(name) {
    var el = document.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : '';
  }
  function setRadio(name, value) {
    var els = document.querySelectorAll('input[name="' + name + '"]');
    els.forEach(function (el) { el.checked = el.value === String(value); });
  }

  // Rates as integer fractions: 10.21% = 1021/10000, 20.42% = 2042/10000.
  // Tax amounts are truncated to whole yen.
  function calcTax(amount, kind) {
    if (kind === 'judicial') {
      if (amount <= 10000) return 0;
      return Math.floor((amount - 10000) * 1021 / 10000);
    }
    if (amount <= 1000000) return Math.floor(amount * 1021 / 10000);
    return Math.floor((amount - 1000000) * 2042 / 10000) + 102100;
  }

  function formulaText(amount, kind, tax) {
    if (kind === 'judicial') {
      if (amount <= 10000) return '支払金額が10,000円以下のため、源泉徴収税額は0円です。';
      return '計算式：（支払金額 ' + BizFmt.yen(amount) + ' − 10,000円）× 10.21% ＝ ' + BizFmt.yen(tax) + '（小数点以下切り捨て）';
    }
    if (amount <= 1000000) {
      return '計算式：支払金額 ' + BizFmt.yen(amount) + ' × 10.21% ＝ ' + BizFmt.yen(tax) + '（小数点以下切り捨て）';
    }
    return '計算式：（支払金額 ' + BizFmt.yen(amount) + ' − 1,000,000円）× 20.42% ＋ 102,100円 ＝ ' + BizFmt.yen(tax) + '（小数点以下切り捨て）';
  }

  function readInput() {
    return { raw: $('w-amount').value, kind: radioVal('w-kind') || 'general' };
  }

  function validate(inp) {
    var errs = [];
    if (inp.raw === '' || inp.raw == null) { errs.push('支払金額を入力してください。'); return errs; }
    var n = Number(inp.raw);
    if (!isFinite(n)) errs.push('支払金額は数値で入力してください。');
    else if (n < 0) errs.push('支払金額は0以上で入力してください。');
    else if (!Number.isInteger(n)) errs.push('支払金額は整数（円単位）で入力してください。');
    return errs;
  }

  function update() {
    var inp = readInput();
    var errs = validate(inp);
    var eb = $('error-box');
    if (errs.length) { eb.textContent = errs.join(' '); eb.classList.add('show'); } else eb.classList.remove('show');
    if (errs.length) {
      $('r-amount').textContent = '—';
      $('r-tax').textContent = '—';
      $('r-net').textContent = '—';
      $('formula-text').textContent = '支払金額を入力すると、適用した計算式と結果が表示されます。';
      return { inp: inp, errs: errs };
    }
    var amount = Number(inp.raw);
    var tax = calcTax(amount, inp.kind);
    var net = amount - tax;
    $('r-amount').textContent = BizFmt.yen(amount);
    $('r-tax').textContent = BizFmt.yen(tax);
    $('r-net').textContent = BizFmt.yen(net);
    $('formula-text').textContent = formulaText(amount, inp.kind, tax);
    BizStore.set(draftKey, { amount: inp.raw, kind: inp.kind });
    return { inp: inp, tax: tax, net: net, errs: errs };
  }

  $('w-amount').addEventListener('input', update);
  $('w-amount').addEventListener('change', update);
  document.querySelectorAll('input[name="w-kind"]').forEach(function (el) {
    el.addEventListener('change', update);
  });
  $('btn-reset').addEventListener('click', function () {
    if (!window.confirm('入力をリセットしますか？')) return;
    $('w-amount').value = '';
    setRadio('w-kind', 'general');
    BizStore.remove(draftKey);
    update();
  });

  var draft = BizStore.get(draftKey, null);
  if (draft) {
    if (draft.amount != null) $('w-amount').value = draft.amount;
    if (draft.kind) setRadio('w-kind', draft.kind);
  }
  update();
})();

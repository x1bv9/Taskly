(function () {
  'use strict';
  var draftKey = 'taskly_tax_draft';
  function $(id) { return document.getElementById(id); }
  function radioVal(name) {
    var el = document.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : '';
  }
  function setRadio(name, value) {
    var els = document.querySelectorAll('input[name="' + name + '"]');
    els.forEach(function (el) { el.checked = el.value === String(value); });
  }
  var modeLabels = { floor: '切り捨て', ceil: '切り上げ', round: '四捨五入' };

  // Integer-based division with rounding mode. num, den are non-negative integers.
  function divRound(num, den, mode) {
    var q = Math.floor(num / den);
    var r = num - q * den;
    if (mode === 'ceil') return r > 0 ? q + 1 : q;
    if (mode === 'round') return r * 2 >= den ? q + 1 : q;
    return q;
  }

  function calc(amount, dir, rate, mode) {
    var excl, tax, incl;
    if (dir === 'toIncl') {
      excl = amount;
      tax = divRound(amount * rate, 100, mode);
      incl = excl + tax;
    } else {
      incl = amount;
      excl = divRound(amount * 100, 100 + rate, mode);
      tax = incl - excl;
    }
    return { excl: excl, tax: tax, incl: incl };
  }

  function readInput() {
    return {
      raw: $('t-amount').value,
      dir: radioVal('t-dir') || 'toIncl',
      rate: Number(radioVal('t-rate')) || 10,
      mode: $('t-round').value
    };
  }

  function validate(inp) {
    var errs = [];
    if (inp.raw === '' || inp.raw == null) { errs.push('金額を入力してください。'); return errs; }
    var n = Number(inp.raw);
    if (!isFinite(n)) errs.push('金額は数値で入力してください。');
    else if (n < 0) errs.push('金額は0以上で入力してください。');
    else if (!Number.isInteger(n)) errs.push('金額は整数（円単位）で入力してください。');
    return errs;
  }

  function renderCompare(inp, amount) {
    var tbody = $('compare-body');
    tbody.textContent = '';
    [10, 8].forEach(function (rate) {
      var r = calc(amount, inp.dir, rate, inp.mode);
      var tr = document.createElement('tr');
      if (rate === inp.rate) tr.style.fontWeight = '700';
      [rate + '%' + (rate === inp.rate ? '（選択中）' : ''), BizFmt.yen(r.excl), BizFmt.yen(r.tax), BizFmt.yen(r.incl)].forEach(function (v, i) {
        var td = document.createElement('td');
        if (i > 0) td.className = 'num';
        td.textContent = v;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }

  function formulaText(inp, amount, r) {
    var ml = modeLabels[inp.mode] || '切り捨て';
    if (inp.dir === 'toIncl') {
      return '消費税額 ＝ 税抜価格 ' + BizFmt.yen(amount) + ' × ' + inp.rate + '% ＝ ' + BizFmt.yen(r.tax) +
        '（端数は' + ml + '）／ 税込価格 ＝ 税抜価格 ＋ 消費税額 ＝ ' + BizFmt.yen(r.incl) +
        '（税込価格 ＝ 税抜価格 × ' + (inp.rate === 10 ? '1.10' : '1.08') + '）';
    }
    return '税抜価格 ＝ 税込価格 ' + BizFmt.yen(amount) + ' ÷ ' + (inp.rate === 10 ? '1.10' : '1.08') + ' ＝ ' + BizFmt.yen(r.excl) +
      '（端数は' + ml + '）／ 消費税額 ＝ 税込価格 − 税抜価格 ＝ ' + BizFmt.yen(r.tax);
  }

  function update() {
    var inp = readInput();
    var errs = validate(inp);
    var eb = $('error-box');
    if (errs.length) { eb.textContent = errs.join(' '); eb.classList.add('show'); } else eb.classList.remove('show');
    if (errs.length) {
      $('r-excl').textContent = '—';
      $('r-tax').textContent = '—';
      $('r-incl').textContent = '—';
      $('formula-text').textContent = '金額を入力すると、計算式と結果が表示されます。';
      var tbody = $('compare-body'); tbody.textContent = '';
      return { inp: inp, errs: errs };
    }
    var amount = Number(inp.raw);
    var r = calc(amount, inp.dir, inp.rate, inp.mode);
    $('r-excl').textContent = BizFmt.yen(r.excl);
    $('r-tax').textContent = BizFmt.yen(r.tax);
    $('r-incl').textContent = BizFmt.yen(r.incl);
    $('formula-text').textContent = formulaText(inp, amount, r);
    renderCompare(inp, amount);
    BizStore.set(draftKey, { amount: inp.raw, dir: inp.dir, rate: inp.rate, mode: inp.mode });
    return { inp: inp, r: r, errs: errs };
  }

  $('t-amount').addEventListener('input', update);
  $('t-amount').addEventListener('change', update);
  document.querySelectorAll('input[name="t-dir"], input[name="t-rate"]').forEach(function (el) {
    el.addEventListener('change', update);
  });
  $('t-round').addEventListener('change', update);
  $('btn-reset').addEventListener('click', function () {
    if (!window.confirm('入力をリセットしますか？')) return;
    $('t-amount').value = '';
    setRadio('t-dir', 'toIncl');
    setRadio('t-rate', '10');
    $('t-round').value = 'floor';
    BizStore.remove(draftKey);
    update();
  });

  var draft = BizStore.get(draftKey, null);
  if (draft) {
    if (draft.amount != null) $('t-amount').value = draft.amount;
    if (draft.dir) setRadio('t-dir', draft.dir);
    if (draft.rate) setRadio('t-rate', draft.rate);
    if (draft.mode) $('t-round').value = draft.mode;
  }
  update();
})();

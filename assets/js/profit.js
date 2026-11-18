(function () {
  'use strict';
  var draftKey = 'taskly_profit_draft';
  var compareKey = 'taskly_profit_compare';
  function $(id) { return document.getElementById(id); }
  function num(id) { return Number($(id).value) || 0; }

  function readInput() {
    return {
      name: $('p-name').value.trim(),
      price: num('p-price'), cost: num('p-cost'), quantity: num('p-qty') || 1,
      feeRate: num('p-fee-rate'), otherExpenses: num('p-other')
    };
  }

  function validate(inp) {
    var errs = [];
    if (inp.price < 0 || inp.cost < 0 || inp.otherExpenses < 0) errs.push('金額は0以上で入力してください。');
    if (inp.quantity <= 0) errs.push('販売数量は1以上で入力してください。');
    if (inp.feeRate < 0 || inp.feeRate >= 100) errs.push('手数料率は0以上100未満で入力してください。');
    if (inp.price === 0 && inp.cost === 0) errs.push('販売価格と原価を入力してください。');
    return errs;
  }

  function drawChart(r) {
    var canvas = $('profit-chart'); if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    var data = [
      { label: '売上', value: Math.max(r.sales, 0), color: '#2563eb' },
      { label: '総原価', value: Math.max(r.totalCost, 0), color: '#64748b' },
      { label: '総経費', value: Math.max(r.totalExpenses, 0), color: '#f59e0b' },
      { label: '粗利益', value: Math.max(r.grossProfit, 0), color: r.grossProfit >= 0 ? '#059669' : '#dc2626' }
    ];
    var max = Math.max.apply(null, data.map(function (d) { return d.value; }).concat([1]));
    var base = H - 44, top = 18, bw = 74, gap = (W - 80 - bw * data.length) / (data.length - 1 || 1);
    ctx.strokeStyle = '#cbd5e1'; ctx.beginPath(); ctx.moveTo(30, base); ctx.lineTo(W - 10, base); ctx.stroke();
    ctx.font = '13px sans-serif'; ctx.textAlign = 'center';
    data.forEach(function (d, i) {
      var x = 44 + i * (bw + gap);
      var h = Math.round((base - top) * d.value / max);
      ctx.fillStyle = d.color; ctx.fillRect(x, base - h, bw, h);
      ctx.fillStyle = '#0f172a'; ctx.fillText(BizFmt.num(d.value) + '円', x + bw / 2, base - h - 6);
      ctx.fillStyle = '#475569'; ctx.fillText(d.label, x + bw / 2, base + 22);
    });
    if (r.grossProfit < 0) { ctx.fillStyle = '#dc2626'; ctx.textAlign = 'left'; ctx.fillText('※ 粗利益がマイナスのためグラフは0で表示しています', 34, 16); }
  }

  function update() {
    var inp = readInput();
    var errs = validate(inp);
    var eb = $('error-box');
    if (errs.length) { eb.textContent = errs.join(' '); eb.classList.add('show'); } else eb.classList.remove('show');
    var r = BizCalc.calcProfit(inp);
    $('r-sales').textContent = BizFmt.yen(r.sales);
    $('r-cost').textContent = BizFmt.yen(r.totalCost);
    $('r-expenses').textContent = BizFmt.yen(r.totalExpenses) + '（手数料 ' + BizFmt.yen(r.fee) + '）';
    $('r-gross').textContent = BizFmt.yen(r.grossProfit);
    $('r-margin').textContent = BizFmt.pct(r.margin);
    $('r-costrate').textContent = BizFmt.pct(r.costRate);
    $('r-perunit').textContent = BizFmt.yen(Math.round(r.perUnitProfit));
    drawChart(r);
    BizStore.set(draftKey, inp);
    return { inp: inp, r: r, errs: errs };
  }

  function doReverse() {
    var inp = readInput();
    var tm = Number($('rev-margin').value);
    if (isFinite(tm) && $('rev-margin').value !== '') {
      var p1 = BizCalc.priceForMargin({ cost: inp.cost, quantity: inp.quantity, feeRate: inp.feeRate, otherExpenses: inp.otherExpenses, targetMargin: tm });
      $('rev-margin-result').textContent = p1 == null ? '計算できません（目標利益率＋手数料率が100%以上です）' : '必要販売価格: ' + BizFmt.yen(p1) + '（1個あたり）';
    }
    var tp = Number($('rev-profit').value);
    if (isFinite(tp) && $('rev-profit').value !== '') {
      var p2 = BizCalc.priceForProfit({ cost: inp.cost, quantity: inp.quantity, feeRate: inp.feeRate, otherExpenses: inp.otherExpenses, targetProfit: tp });
      $('rev-profit-result').textContent = p2 == null ? '計算できません（手数料率が100%以上です）' : '必要販売価格: ' + BizFmt.yen(p2) + '（1個あたり）';
    }
  }

  function renderCompare() {
    var tbody = $('compare-body'); tbody.textContent = '';
    var list = BizStore.get(compareKey, []);
    if (!list.length) {
      var tr = document.createElement('tr'); var td = document.createElement('td'); td.colSpan = 7; td.textContent = '比較表はまだ空です。「比較表に追加」ボタンで商品を追加してください。'; tr.appendChild(td); tbody.appendChild(tr); return;
    }
    list.forEach(function (row, idx) {
      var r = BizCalc.calcProfit(row);
      var tr = document.createElement('tr');
      [row.name || '（無名）', BizFmt.yen(row.price), BizFmt.yen(row.cost), String(row.quantity), BizFmt.yen(r.grossProfit), BizFmt.pct(r.margin)].forEach(function (v, i) {
        var td = document.createElement('td'); if (i > 0) td.className = 'num'; td.textContent = v; tr.appendChild(td);
      });
      var td = document.createElement('td');
      var del = document.createElement('button'); del.type = 'button'; del.className = 'btn btn-danger btn-small'; del.textContent = '削除';
      del.addEventListener('click', function () { var l = BizStore.get(compareKey, []); l.splice(idx, 1); BizStore.set(compareKey, l); renderCompare(); });
      td.appendChild(del); tr.appendChild(td); tbody.appendChild(tr);
    });
  }

  ['p-name', 'p-price', 'p-cost', 'p-qty', 'p-fee-rate', 'p-other'].forEach(function (id) {
    $(id).addEventListener('input', update); $(id).addEventListener('change', update);
  });
  $('btn-reverse').addEventListener('click', doReverse);
  $('btn-add-compare').addEventListener('click', function () {
    var u = update(); if (u.errs.length) { BizToast('入力を確認してください'); return; }
    var list = BizStore.get(compareKey, []); list.push(u.inp);
    if (BizStore.set(compareKey, list)) { BizToast('比較表に追加しました'); renderCompare(); }
  });
  $('btn-csv').addEventListener('click', function () {
    var u = update(); var inp = u.inp, r = u.r;
    var rows = [
      ['項目', '値'],
      ['商品名', inp.name], ['販売価格（1個）', inp.price], ['原価（1個）', inp.cost], ['販売数量', inp.quantity],
      ['手数料率（%）', inp.feeRate], ['その他経費', inp.otherExpenses],
      ['売上金額', r.sales], ['総原価', r.totalCost], ['総経費', r.totalExpenses], ['粗利益', r.grossProfit],
      ['利益率（%）', Math.round(r.margin * 10) / 10], ['原価率（%）', Math.round(r.costRate * 10) / 10], ['1商品あたり利益', Math.round(r.perUnitProfit)]
    ];
    var csv = '﻿' + rows.map(function (row) { return row.map(BizCsvCell).join(','); }).join('\r\n');
    BizDownload('profit-result.csv', csv, 'text/csv;charset=utf-8');
    BizToast('CSVをダウンロードしました');
  });
  $('btn-reset').addEventListener('click', function () {
    if (!window.confirm('入力をリセットしますか？')) return;
    ['p-name', 'p-price', 'p-cost', 'p-other', 'p-fee-rate'].forEach(function (id) { $(id).value = ''; });
    $('p-qty').value = '1'; BizStore.remove(draftKey); update();
  });

  var draft = BizStore.get(draftKey, null);
  if (draft) { $('p-name').value = draft.name || ''; $('p-price').value = draft.price || ''; $('p-cost').value = draft.cost || ''; $('p-qty').value = draft.quantity || 1; $('p-fee-rate').value = draft.feeRate || ''; $('p-other').value = draft.otherExpenses || ''; }
  update(); renderCompare();
})();

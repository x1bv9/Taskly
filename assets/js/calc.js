/* BizTools calculation core - pure functions, testable in Node.
   Tax method (estimate & invoice):
   - Unit prices are TAX-EXCLUDED (税抜).
   - Line amount = quantity * unitPrice (integer yen, inputs are integers).
   - Subtotal per tax rate = sum of line amounts for that rate.
   - Consumption tax per rate = floor(subtotalPerRate * rate / 100).
   - Total = subtotal (all rates) + total tax.
   All money math uses integers / floor to avoid floating point errors.
*/
(function (global) {
  'use strict';
  function toInt(v) { var n = Number(v); if (!isFinite(n)) return 0; return Math.trunc(n); }
  function toNum(v) { var n = Number(v); if (!isFinite(n)) return 0; return n; }

  function calcTax(items) {
    var byRate = {}; // rate -> subtotal
    var subtotal = 0;
    var lines = [];
    (items || []).forEach(function (it) {
      var qty = toNum(it.quantity);
      var price = toInt(it.unitPrice);
      var rate = toInt(it.taxRate);
      var amount = Math.round(qty * price); // qty may be decimal (e.g. 1.5 hours)
      lines.push({ name: it.name || '', quantity: qty, unitPrice: price, taxRate: rate, amount: amount });
      subtotal += amount;
      if (!byRate[rate]) byRate[rate] = 0;
      byRate[rate] += amount;
    });
    var taxDetails = [];
    var taxTotal = 0;
    Object.keys(byRate).map(Number).sort(function (a, b) { return b - a; }).forEach(function (rate) {
      var base = byRate[rate];
      var tax = Math.floor(base * rate / 100);
      taxTotal += tax;
      taxDetails.push({ rate: rate, base: base, tax: tax });
    });
    return { lines: lines, subtotal: subtotal, byRate: byRate, taxDetails: taxDetails, taxTotal: taxTotal, total: subtotal + taxTotal };
  }

  function calcProfit(input) {
    var price = toNum(input.price), cost = toNum(input.cost), qty = toNum(input.quantity);
    var feeRate = toNum(input.feeRate), other = toNum(input.otherExpenses);
    var sales = Math.round(price * qty);
    var totalCost = Math.round(cost * qty);
    var fee = Math.floor(sales * feeRate / 100);
    var totalExpenses = fee + Math.round(other);
    var gross = sales - totalCost - totalExpenses;
    var margin = sales > 0 ? (gross / sales * 100) : 0;
    var costRate = sales > 0 ? (totalCost / sales * 100) : 0;
    var perUnit = qty > 0 ? (gross / qty) : 0;
    return { sales: sales, totalCost: totalCost, fee: fee, totalExpenses: totalExpenses, grossProfit: gross, margin: margin, costRate: costRate, perUnitProfit: perUnit };
  }

  /* Price needed for target margin (%):
     P = (cost + other/qty) / (1 - feeRate/100 - targetMargin/100) */
  function priceForMargin(input) {
    var cost = toNum(input.cost), qty = toNum(input.quantity) || 1;
    var feeRate = toNum(input.feeRate), other = toNum(input.otherExpenses);
    var target = toNum(input.targetMargin);
    var denom = 1 - feeRate / 100 - target / 100;
    if (denom <= 0) return null;
    // 浮動小数点誤差でちょうど1000円のはずが1000.0000000000002となり
    // ceilで1001円になるのを防ぐ (1e-9の余裕を引いてから切り上げ)
    return Math.ceil((cost + other / qty) / denom - 1e-9);
  }

  /* Price needed for target total profit (yen):
     P = (targetProfit + totalCost + other) / (qty * (1 - feeRate/100)) */
  function priceForProfit(input) {
    var cost = toNum(input.cost), qty = toNum(input.quantity) || 1;
    var feeRate = toNum(input.feeRate), other = toNum(input.otherExpenses);
    var target = toNum(input.targetProfit);
    var denom = qty * (1 - feeRate / 100);
    if (denom <= 0) return null;
    // priceForMargin と同じ理由で、浮動小数点誤差による1円の切り上げ過ぎを防ぐ
    return Math.ceil((target + cost * qty + other) / denom - 1e-9);
  }

  var api = { calcTax: calcTax, calcProfit: calcProfit, priceForMargin: priceForMargin, priceForProfit: priceForProfit, toInt: toInt, toNum: toNum };
  global.BizCalc = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

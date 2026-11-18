(function () {
  'use strict';
  var draftKey = 'taskly_report_draft';
  var savedKey = 'taskly_report_saved';
  var TEMPLATES = {
    general: { label: '一般業務報告書', title: '業務報告書', headings: { work: '業務内容', result: '作業実績', issue: '問題点', improve: '改善案', next: '次回の予定' }, samples: { work: '本日の主な業務内容を記入してください。', result: '完了した作業と成果を記入してください。', issue: '特になし', improve: '業務効率化の案があれば記入してください。', next: '明日の予定を記入してください。' } },
    sales: { label: '営業報告書', title: '営業報告書', headings: { work: '訪問・商談内容', result: '営業実績', issue: '課題・懸念点', improve: '改善策', next: '次回の訪問・予定' }, samples: { work: '訪問先と商談内容を記入してください。', result: '受注・見積提出などの実績を記入してください。', issue: '顧客からの要望や競合情報など', improve: 'フォロー方法の改善案など', next: '次回訪問日と目的' } },
    restaurant: { label: '飲食店営業報告書', title: '飲食店営業報告書', headings: { work: '営業内容（ランチ/ディナー等）', result: '売上・客数実績', issue: '問題点（廃棄・クレーム等）', improve: '改善案', next: '明日の予定・仕込み' }, samples: { work: '営業時間帯ごとの状況を記入してください。', result: '売上、客数、客単価を記入してください。', issue: '材料廃棄や設備トラブルなど', improve: 'メニューやオペレーションの改善案', next: '仕込みと予約状況' } },
    completion: { label: '作業完了報告書', title: '作業完了報告書', headings: { work: '作業内容', result: '完了実績・検収結果', issue: '発生した問題', improve: '再発防止・改善案', next: '残作業・今後の予定' }, samples: { work: '実施した作業の詳細を記入してください。', result: '完了範囲と確認結果を記入してください。', issue: '特になし', improve: '手順の改善点など', next: '残作業があれば記入してください。' } },
    daily: { label: '日報', title: '日報', headings: { work: '今日の業務', result: '今日の成果', issue: '困ったこと', improve: '工夫・改善', next: '明日の予定' }, samples: { work: '今日取り組んだことを記入してください。', result: '今日の成果を記入してください。', issue: '特になし', improve: '気づきや工夫を記入してください。', next: '明日の予定を記入してください。' } }
  };
  var current = 'general';
  var lastSamples = {};
  function $(id) { return document.getElementById(id); }
  var textFields = ['work', 'result', 'issue', 'improve', 'next'];

  function collect() {
    var d = { template: current, title: $('r-title').value, reporter: $('r-reporter').value, dept: $('r-dept').value, date: $('r-date').value, notes: $('r-notes').value };
    textFields.forEach(function (k) { d[k] = $('r-' + k).value; });
    return d;
  }
  function applyTemplate(key, forceSamples) {
    current = key; var t = TEMPLATES[key];
    $('template-select').value = key;
    textFields.forEach(function (k) {
      var label = document.querySelector('label[for="r-' + k + '"]');
      if (label) label.textContent = t.headings[k];
      var pvLabel = $('pv-h-' + k); if (pvLabel) pvLabel.textContent = t.headings[k];
      var el = $('r-' + k);
      el.placeholder = t.samples[k];
      if (forceSamples || !el.value || el.value === lastSamples[k]) el.value = t.samples[k];
    });
    lastSamples = t.samples;
    if (!$('r-title').value || Object.keys(TEMPLATES).some(function (kk) { return TEMPLATES[kk].title === $('r-title').value; })) $('r-title').value = t.title;
    update();
  }
  function setPv(id, txt) { var el = $(id); if (el) el.textContent = txt || ''; }
  function update() {
    var d = collect();
    setPv('pv-title', d.title || TEMPLATES[current].title);
    setPv('pv-meta', [d.date ? '報告日: ' + d.date : '', d.reporter ? '報告者: ' + d.reporter : '', d.dept ? '所属: ' + d.dept : ''].filter(Boolean).join('　'));
    textFields.forEach(function (k) { setPv('pv-' + k, d[k]); });
    setPv('pv-notes', d.notes);
    $('pv-notes-wrap').classList.toggle('hidden', !d.notes);
    BizStore.set(draftKey, d);
  }
  function renderSaved() {
    var list = $('saved-list'); list.textContent = '';
    var saved = BizStore.get(savedKey, {}); var names = Object.keys(saved);
    if (!names.length) { var p = document.createElement('p'); p.textContent = '保存済みの報告書はありません。'; list.appendChild(p); return; }
    names.forEach(function (name) {
      var div = document.createElement('div'); div.className = 'summary-row';
      var s = document.createElement('span'); s.textContent = name;
      var wrap = document.createElement('span');
      var load = document.createElement('button'); load.type = 'button'; load.className = 'btn btn-outline btn-small'; load.textContent = '読込';
      load.addEventListener('click', function () {
        var d = BizStore.get(savedKey, {})[name]; if (!d) return;
        $('r-title').value = d.title || ''; $('r-reporter').value = d.reporter || ''; $('r-dept').value = d.dept || ''; $('r-date').value = d.date || ''; $('r-notes').value = d.notes || '';
        textFields.forEach(function (k) { $('r-' + k).value = d[k] || ''; });
        applyTemplate(d.template || 'general', false); update(); BizToast('読み込みました');
      });
      var del = document.createElement('button'); del.type = 'button'; del.className = 'btn btn-danger btn-small'; del.textContent = '削除';
      del.addEventListener('click', function () { var s2 = BizStore.get(savedKey, {}); delete s2[name]; BizStore.set(savedKey, s2); renderSaved(); });
      wrap.appendChild(load); wrap.appendChild(document.createTextNode(' ')); wrap.appendChild(del);
      div.appendChild(s); div.appendChild(wrap); list.appendChild(div);
    });
  }
  ['r-title', 'r-reporter', 'r-dept', 'r-date', 'r-notes'].concat(textFields.map(function (k) { return 'r-' + k; })).forEach(function (id) {
    $(id).addEventListener('input', update);
  });
  $('template-select').addEventListener('change', function () { applyTemplate(this.value, false); BizToast('テンプレートを切り替えました'); });
  $('btn-print').addEventListener('click', function () {
    if (!$('r-reporter').value.trim()) { $('error-box').textContent = '報告者名を入力してください。'; $('error-box').classList.add('show'); return; }
    $('error-box').classList.remove('show'); window.print();
  });
  $('btn-pdf').addEventListener('click', function () {
    if (!$('r-reporter').value.trim()) { $('error-box').textContent = '報告者名を入力してください。'; $('error-box').classList.add('show'); return; }
    $('error-box').classList.remove('show');
    var btn = $('btn-pdf'); btn.disabled = true; btn.textContent = 'PDF生成中…';
    var base = ($('r-title').value.trim() || '業務報告書') + ($('r-date').value ? '_' + $('r-date').value : '');
    BizPdfDownload($('print-sheet'), base, function () { btn.disabled = false; btn.textContent = 'PDFダウンロード'; });
  });
  $('btn-reset').addEventListener('click', function () {
    if (!window.confirm('入力内容をリセットしますか？')) return;
    ['r-title', 'r-reporter', 'r-dept', 'r-notes'].concat(textFields.map(function (k) { return 'r-' + k; })).forEach(function (id) { $(id).value = ''; });
    BizStore.remove(draftKey); applyTemplate(current, true);
  });
  $('btn-save-named').addEventListener('click', function () {
    var name = $('save-name').value.trim(); if (!name) { BizToast('保存名を入力してください'); return; }
    var saved = BizStore.get(savedKey, {}); saved[name] = collect();
    if (BizStore.set(savedKey, saved)) { BizToast('保存しました'); renderSaved(); }
  });
  // init
  var draft = BizStore.get(draftKey, null);
  if (draft) {
    $('r-title').value = draft.title || ''; $('r-reporter').value = draft.reporter || ''; $('r-dept').value = draft.dept || ''; $('r-date').value = draft.date || ''; $('r-notes').value = draft.notes || '';
    textFields.forEach(function (k) { $('r-' + k).value = draft[k] || ''; });
    applyTemplate(draft.template || 'general', false);
    // restore exact draft texts after template sample logic
    textFields.forEach(function (k) { $('r-' + k).value = draft[k] || ''; });
    update();
  } else {
    $('r-date').value = new Date().toISOString().slice(0, 10);
    applyTemplate('general', true);
  }
  renderSaved();
})();

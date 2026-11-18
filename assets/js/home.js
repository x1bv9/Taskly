(function () {
  'use strict';
  var input = document.getElementById('tool-search');
  var cards = Array.prototype.slice.call(document.querySelectorAll('[data-search]'));
  var noResult = document.getElementById('search-no-result');
  var currentCat = 'all';
  function apply() {
    var q = input ? input.value.trim().toLowerCase() : '';
    var visible = 0;
    cards.forEach(function (c) {
      var matchText = !q || c.getAttribute('data-search').toLowerCase().indexOf(q) >= 0;
      var matchCat = currentCat === 'all' || c.getAttribute('data-cat') === currentCat;
      var show = matchText && matchCat;
      c.classList.toggle('hidden', !show);
      if (show) visible++;
    });
    if (noResult) noResult.classList.toggle('hidden', visible !== 0);
  }
  if (input) input.addEventListener('input', apply);
  document.querySelectorAll('[data-cat-filter]').forEach(function (chip) {
    chip.addEventListener('click', function () {
      document.querySelectorAll('[data-cat-filter]').forEach(function (c) { c.classList.remove('active'); });
      chip.classList.add('active');
      currentCat = chip.getAttribute('data-cat-filter');
      apply();
    });
  });
})();

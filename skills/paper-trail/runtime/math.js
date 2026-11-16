/* math.js - render .tex spans with KaTeX (classic script, works over file://) */
(function () {
  function render() {
    if (!window.katex) return;
    document.querySelectorAll('.tex').forEach(function (el) {
      if (el.dataset.rendered) return;
      var tex = el.textContent;
      try {
        katex.render(tex, el, {
          displayMode: el.dataset.display === '1',
          throwOnError: false,
          strict: false,
          trust: true,
          macros: { '\\R': '\\mathbb{R}' }
        });
        el.dataset.rendered = '1';
      } catch (e) {
        el.textContent = '[tex] ' + tex;
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
})();

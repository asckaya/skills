/* flow_cps / 共享脚本：进度条 · 目录高亮 · 图片放大 · 回到顶部 */
(function () {
  'use strict';

  /* ---------- 1. 阅读进度条 ---------- */
  var prog = document.getElementById('prog');
  function onScroll() {
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    var p = max > 0 ? (h.scrollTop / max) * 100 : 0;
    if (prog) prog.style.width = p.toFixed(2) + '%';
  }

  /* ---------- 2. 目录高亮 ----------
     关键：只调 nav 自己的 scrollTop，绝不调用 scrollIntoView
     （scrollIntoView 会连带滚动页面容器，导致滚轮"弹回"） */
  var nav = document.querySelector('nav.toc');
  var links = Array.prototype.slice.call(document.querySelectorAll('nav.toc a[href^="#"]'));
  var targets = links.map(function (a) {
    var id = a.getAttribute('href').slice(1);
    return { a: a, el: document.getElementById(id) };
  }).filter(function (t) { return !!t.el; });
  var current = null;

  function keepLinkVisible(a) {
    if (!nav) return;
    var navBox = nav.getBoundingClientRect();
    var r = a.getBoundingClientRect();
    var pad = 60;
    if (r.top < navBox.top + pad) {
      nav.scrollTop += r.top - (navBox.top + pad);
    } else if (r.bottom > navBox.bottom - pad) {
      nav.scrollTop += r.bottom - (navBox.bottom - pad);
    }
  }

  function highlight() {
    var y = window.scrollY + 120;
    var cur = null;
    for (var i = 0; i < targets.length; i++) {
      if (targets[i].el.getBoundingClientRect().top + window.scrollY <= y) cur = targets[i];
    }
    if (!cur && targets.length) cur = targets[0];
    if (cur === current) return;
    links.forEach(function (a) { a.classList.remove('on'); });
    current = cur;
    if (cur) {
      cur.a.classList.add('on');
      keepLinkVisible(cur.a);
    }
  }

  /* ---------- 3. 滚动节流：一帧一次 ---------- */
  var ticking = false;
  function onScrollAll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      onScroll();
      highlight();
      toggleTop();
      ticking = false;
    });
  }

  /* ---------- 4. 图片放大 ---------- */
  var lb = document.getElementById('lb');
  if (lb) {
    var lbImg = lb.querySelector('img');
    Array.prototype.forEach.call(document.querySelectorAll('figure img'), function (img) {
      img.addEventListener('click', function () {
        lbImg.src = img.src;
        lbImg.alt = img.alt || '';
        lb.classList.add('on');
      });
    });
    lb.addEventListener('click', function () { lb.classList.remove('on'); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') lb.classList.remove('on');
    });
  }

  /* ---------- 5. 回到顶部 ---------- */
  var top = document.getElementById('totop');
  function toggleTop() {
    if (top) top.classList.toggle('on', window.scrollY > 600);
  }
  if (top) {
    top.addEventListener('click', function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  window.addEventListener('scroll', onScrollAll, { passive: true });
  window.addEventListener('resize', onScrollAll);
  onScrollAll();
})();

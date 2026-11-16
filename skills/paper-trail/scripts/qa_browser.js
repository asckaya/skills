/* qa_browser.js - in-browser dynamic self-check
   Usage: launch_browser to open the page, paste this whole block into evaluate_browser.
   All keys must be true; any false maps to one entry under "Known traps" in SKILL.md. */
(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const out = {};

  // 0) stylesheet / scripts applied
  const h2 = document.querySelector('h2');
  out.cssLoaded = !!h2 && getComputedStyle(h2).fontWeight >= 700 &&
                  getComputedStyle(document.body).margin === '0px';

  // 1) horizontal overflow
  const vw = window.innerWidth;
  const wide = [...document.querySelectorAll('main *')]
    .filter((el) => el.getBoundingClientRect().right > vw + 2)
    .map((el) => el.tagName + '.' + (el.className || ''));
  out.noOverflowX = document.documentElement.scrollWidth <= vw + 1 && wide.length === 0;
  out._wide = wide.slice(0, 5);

  // 2) images actually loaded
  // skip the lightbox placeholder (no src)
  const imgs = [...document.querySelectorAll('img[src]')].filter((i) => i.getAttribute('src'));
  out.figsLoaded = imgs.every((i) => i.complete && i.naturalWidth > 0);
  out._broken = imgs.filter((i) => !i.complete || !i.naturalWidth).map((i) => i.getAttribute('src'));

  // 3) scroll stability: scripts must not yank the page back
  document.documentElement.style.scrollBehavior = 'auto';
  const target = Math.min(4000, document.documentElement.scrollHeight - window.innerHeight - 10);
  window.scrollTo(0, target);
  await wait(420);
  out.scrollStable = Math.abs(window.scrollY - target) <= 2;
  out._scroll = { target: Math.round(target), actual: Math.round(window.scrollY) };

  // 4) TOC highlight follows
  const on = document.querySelector('nav.toc a.on');
  out.tocActive = !!on && !!document.querySelector(on.getAttribute('href'));
  out._active = on && on.textContent.trim();

  // 5) widgets, if present
  const widgets = [...document.querySelectorAll('cps-budget,cps-noise,cps-traj,ui-tabs')];
  out.widgets = widgets.length === 0 ? 'n/a' : widgets.every((w) => w.children.length > 0 || w.classList.contains('cps-traj'));
  out._widgets = widgets.map((w) => w.tagName.toLowerCase() + ':' + (w.children.length > 0));

  // 6) equation blocks fit
  out.eqFits = [...document.querySelectorAll('.eqb')]
    .every((e) => e.scrollWidth <= e.clientWidth + 2 || getComputedStyle(e).overflowX === 'auto');

  window.scrollTo(0, 0);
  return JSON.stringify(out, null, 1);
})()

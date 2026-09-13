/* Shared, non-blocking motion layer. No listeners cancel clicks or form events. */
(() => {
  'use strict';
  if (!window.matchMedia || !window.IntersectionObserver || !Element.prototype.animate) return;
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;
  const running = new Map();
  let observer, mutations, ambientObserver;
  let seen = new WeakSet();

  function finishAll() {
    for (const animation of running.values()) animation.cancel();
    running.clear();
  }
  function reveal(element, delay = 0) {
    if (preference.matches || document.hidden || element.contains(document.activeElement)) return;
    // Animate the inner content of interactive cards so pointer/focus hit areas stay fixed.
    const target = element.querySelector('.course-content') || element;
    const animation = target.animate([
      { opacity: 0, transform: 'translate3d(0,16px,0)' },
      { opacity: 1, transform: 'translate3d(0,0,0)' }
    ], { duration: 520, delay, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' });
    running.set(element, animation);
    const clear = () => { if (running.get(element) === animation) running.delete(element); };
    animation.onfinish = clear;
    animation.oncancel = clear;
  }
  function observe(element) {
    if (seen.has(element)) return;
    seen.add(element);
    observer.observe(element);
  }
  function observeCards(container) {
    for (const element of container.children) {
      if (element.matches('.hover-card, .course-card-enhanced')) observe(element);
    }
  }
  function stop() {
    observer?.disconnect(); mutations?.disconnect(); ambientObserver?.disconnect();
    observer = mutations = ambientObserver = null;
    root.classList.remove('motion-enabled');
    document.querySelectorAll('.motion-in-view').forEach(el => el.classList.remove('motion-in-view'));
    finishAll();
  }
  function start() {
    stop();
    if (preference.matches) return;
    seen = new WeakSet();
    observer = new IntersectionObserver(entries => {
      let index = 0;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer?.unobserve(entry.target);
        reveal(entry.target, Math.min(index++ * 65, 195));
      }
    }, { threshold: .08 });
    // Do not animate fields, hidden form steps, loading overlays, or their parents.
    document.querySelectorAll('h1, #courses h2, #admission h2, .filter-section-simple, .contact-card, .stat-counter')
      .forEach(observe);
    const containers = [...document.querySelectorAll('#cardContainer, #coursesContainer')];
    containers.forEach(observeCards);
    mutations = new MutationObserver(records => {
      if (preference.matches || !observer) return;
      for (const record of records) observeCards(record.target);
      for (const [element, animation] of running) {
        if (!element.isConnected) { animation.cancel(); running.delete(element); }
      }
    });
    containers.forEach(container => mutations.observe(container, { childList: true }));
    ambientObserver = new IntersectionObserver(entries => {
      for (const entry of entries) entry.target.classList.toggle('motion-in-view', entry.isIntersecting);
    });
    document.querySelectorAll('.hero-bg, .courses-hero, .contact-hero').forEach(el => ambientObserver.observe(el));
    root.classList.add('motion-enabled');
  }
  const visibility = () => {
    root.classList.toggle('motion-paused', document.hidden);
    if (document.hidden) finishAll();
  };
  document.addEventListener('visibilitychange', visibility);
  document.addEventListener('focusin', event => {
    for (const [element, animation] of running) {
      if (element.contains(event.target)) { animation.cancel(); running.delete(element); }
    }
  });
  window.addEventListener('beforeprint', finishAll);
  preference.addEventListener?.('change', start);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { visibility(); start(); }, { once:true });
  else { visibility(); start(); }
})();

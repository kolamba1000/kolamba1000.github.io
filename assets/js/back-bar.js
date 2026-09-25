// Строка «← Все кейсы» на странице кейса закреплена под шапкой: при прокрутке вниз прячется за шапку,
// при прокрутке вверх появляется (предложение пользователя 26.09.2026, docs/handoff-main.md, «Рамка страницы кейса»).
// Без JavaScript строка просто закреплена и видна всегда.
(() => {
  const bar = document.querySelector('.back-bar');
  if (!bar) return;
  let lastY = window.scrollY;
  let ticking = false;

  const update = () => {
    ticking = false;
    const y = window.scrollY;
    bar.classList.toggle('is-stuck', y > 1);
    if (y <= bar.offsetHeight) bar.classList.remove('is-hidden'); // у начала страницы видна всегда
    else if (y > lastY + 2) bar.classList.add('is-hidden');
    else if (y < lastY - 2) bar.classList.remove('is-hidden');
    lastY = y;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  // фокус с клавиатуры на «← Все кейсы» показывает строку
  bar.addEventListener('focusin', () => bar.classList.remove('is-hidden'));
  update();
})();

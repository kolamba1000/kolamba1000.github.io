// Переключатель языка ведёт на то же место страницы другого языка, а не в её начало.
// Структура страниц RU и EN одинаковая: запоминаем номер секции и долю её высоты
// (а не пиксели: английский текст короче, секции разной высоты). Без JavaScript переход в начало страницы.
(() => {
  const KEY = 'lang-scroll';
  const blocks = () => [...document.querySelectorAll('main > *, main section, footer')];
  // закреплённые сверху шапка и строка «← Все кейсы» закрывают начало видимой области
  const offset = () => ['.site-header', '.back-bar'].reduce((h, s) => h + ((document.querySelector(s) || {}).offsetHeight || 0), 0);

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a.lang__link');
    if (!link || link.hasAttribute('aria-current') || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (window.scrollY < 1) return;
    const y = window.scrollY + offset();
    const list = blocks();
    // самый глубоко вложенный блок, в котором находится верх видимой области под шапкой
    let index = -1;
    list.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      if (r.top + window.scrollY <= y && r.bottom + window.scrollY > y) index = i;
    });
    if (index < 0) return;
    const r = list[index].getBoundingClientRect();
    const state = { path: new URL(link.href).pathname, index, count: list.length, fraction: (y - (r.top + window.scrollY)) / r.height };
    try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  });

  let state = null;
  try { state = JSON.parse(sessionStorage.getItem(KEY)); sessionStorage.removeItem(KEY); } catch {}
  if (!state || state.path !== location.pathname || location.hash) return;

  const restore = () => {
    const list = blocks();
    if (list.length !== state.count) return; // структура не совпала: остаёмся в начале
    const r = list[state.index].getBoundingClientRect();
    window.scrollTo({ top: r.top + window.scrollY + state.fraction * r.height - offset(), behavior: 'instant' });
  };
  let userScrolled = false;
  const stop = () => { userScrolled = true; };
  ['wheel', 'touchstart', 'keydown'].forEach((type) => window.addEventListener(type, stop, { once: true, passive: true }));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', restore, { once: true }); else restore();
  // после загрузки шрифтов высоты секций уточняются: поправляем, если человек ещё не прокручивал сам
  if (document.fonts) document.fonts.ready.then(() => { if (!userScrolled) restore(); });
})();

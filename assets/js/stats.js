// Статистика GoatCounter (https://kolamba1000.goatcounter.com, без cookies; docs/handoff-build.md, «Статистика»).
// Просмотры страниц считает сам count.js. Здесь события:
//   read/<страница>/<NN>           секция впервые показалась на экране хотя бы наполовину (глубина прочтения),
//                                   title = «NN · заголовок секции»; по одному событию на секцию за просмотр
//   click/contact/<канал>/<место>  Telegram, почта, LinkedIn в шапке, подвале или на странице
//   click/resume/<язык>            «Скачать резюме»
//   click/zoom/<страница>/<экран>  экран открыт крупно
//   click/pager/<откуда>→<куда>    «Другие кейсы»
//   click/lang/<откуда>→<куда>     переключатель языка
// Свои визиты не считаются после открытия https://kolamba1000.github.io/#toggle-goatcounter (запоминается в браузере).
// На localhost count.js ничего не отправляет.
(() => {
  const page = location.pathname;
  // count.js грузится асинхронно: события до его загрузки ждут в очереди (до 20 с)
  const queue = [];
  let waited = 0;
  const flush = () => {
    const gc = window.goatcounter;
    if (gc && typeof gc.count === 'function') {
      while (queue.length) gc.count(queue.shift());
    } else if (waited < 20000) {
      waited += 250;
      setTimeout(flush, 250);
    }
  };
  const send = (path, title) => {
    queue.push({ path, title: title || page, event: true });
    if (queue.length === 1) flush();
  };

  // ---------- Глубина прочтения по секциям ----------
  const sections = [...document.querySelectorAll('main article > section, main > section, footer .contacts')];
  const seen = new Set();
  const title = (section, i) => {
    const h = section.querySelector('h1, h2');
    const text = h ? h.textContent.replace(/[ ⁠­]/g, (c) => (c === ' ' ? ' ' : '')).trim().slice(0, 70) : '';
    return String(i + 1).padStart(2, '0') + (text ? ' · ' + text : '');
  };
  if (sections.length && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const i = sections.indexOf(entry.target);
        if (seen.has(i) || !entry.isIntersecting) return;
        // Высокая секция считается прочитанной, когда заняла половину экрана
        const need = Math.min(entry.boundingClientRect.height, window.innerHeight) * 0.5;
        if (entry.intersectionRect.height < need) return;
        seen.add(i);
        observer.unobserve(entry.target);
        send(`read${page}${String(i + 1).padStart(2, '0')}`, title(entry.target, i));
      });
    }, { threshold: Array.from({ length: 21 }, (_, k) => k / 20) });
    sections.forEach((s) => observer.observe(s));
  }

  // ---------- Нажатия ----------
  const place = (el) => (el.closest('.site-header') ? 'header' : el.closest('.site-footer') ? 'footer' : 'page');
  const lang = (href) => (href.startsWith('/ru/') ? 'ru' : href.startsWith('/en/') ? 'en' : '');
  document.addEventListener('click', (event) => {
    const a = event.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (href.startsWith('https://t.me/')) send(`click/contact/telegram/${place(a)}`);
    else if (href.startsWith('mailto:')) send(`click/contact/email/${place(a)}`);
    else if (href.includes('linkedin.com')) send(`click/contact/linkedin/${place(a)}`);
    else if (href.includes('/assets/resume/')) send(`click/resume/${href.includes('-en.') ? 'en' : 'ru'}`);
    else if (a.classList.contains('zoom')) send(`click/zoom${page}${(href.match(/([a-z0-9-]+?)-\d+\.jpg$/) || [, 'screen'])[1]}`);
    else if (a.classList.contains('pager-link')) send(`click/pager${page}→${href}`);
    else if (a.classList.contains('lang__link') && !a.hasAttribute('aria-current')) send(`click/lang/${lang(page) || 'root'}→${lang(href) || href}`);
  }, true);
})();

// Статистика GoatCounter (https://kolamba1000.goatcounter.com, без cookies; docs/handoff-build.md, «Статистика»).
// Просмотры страниц считает сам count.js. Здесь события:
//   read/<страница>/<NN>           секция впервые показалась на экране хотя бы наполовину (глубина прочтения),
//                                   title = «NN · заголовок секции»; по одному событию на секцию за просмотр
//   click/contact/<канал>/<место>  Telegram, почта, LinkedIn в шапке, подвале или на странице
//   click/resume/<язык>            «Скачать резюме»
//   click/zoom/<страница>/<экран>  экран открыт крупно
//   click/pager/<откуда>→<куда>    «Другие кейсы»
//   click/lang/<откуда>→<куда>     переключатель языка
// Устройство: два-три события на просмотр, когда страница впервые видна (как просмотр в count.js):
//   device/<режим>/<ввод>/<ориентация>   режим сайта по точкам перелома CSS: phone до 767, tablet 768–1279,
//                                        desktop от 1280; ввод: touch, mouse, hybrid (мышь и сенсор), none;
//                                        ориентация экрана: portrait, landscape
//   window/<режим>/<группа>              ширина окна браузера по группам вокруг макетов 390, 768 и 1440:
//                                        0-359, 360-389, 390-429, 430-767, 768-1023, 1024-1279,
//                                        1280-1439, 1440-1919, 1920+
//   screen/<ширина>x<высота>@<плотность>  только сенсорные (touch): экран в CSS-пикселях в вертикальном виде,
//                                        плотность округлена до 1, 1.25, 1.5, 2, 2.5 или 3+
// И не больше одного раза за просмотр каждое:
//   device/rotate/<режим>-<ориентация>→<режим>-<ориентация>   экран повернули
//   device/resize/<режим>→<режим>        окно изменили так, что сменился режим сайта (без поворота)
// Всё определяется медиавыражениями и размерами экрана, без cookies и хранилищ; значения сгруппированы
// и отправляются отдельными событиями, поэтому в отчёте не складываются в описание одного человека.
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
    else if (href.includes('/assets/resume/')) send(`click/resume/${/-en\.pdf$/i.test(href) ? 'en' : 'ru'}`);
    else if (a.classList.contains('zoom')) send(`click/zoom${page}${(href.match(/([a-z0-9-]+?)-\d+\.jpg$/) || [, 'screen'])[1]}`);
    else if (a.classList.contains('pager-link')) send(`click/pager${page}→${href}`);
    else if (a.classList.contains('lang__link') && !a.hasAttribute('aria-current')) send(`click/lang/${lang(page) || 'root'}→${lang(href) || href}`);
  }, true);

  // ---------- Устройство ----------
  const mq = (query) => window.matchMedia(query).matches;
  // Режим и ввод теми же медиавыражениями, что и в CSS сайта
  const mode = () => (mq('(min-width: 1280px)') ? 'desktop' : mq('(min-width: 768px)') ? 'tablet' : 'phone');
  const input = () => {
    if (mq('(pointer: coarse)')) return 'touch';
    if (mq('(pointer: fine)')) return mq('(any-pointer: coarse)') ? 'hybrid' : 'mouse';
    return 'none';
  };
  // Ориентация экрана, а не окна: узкое высокое окно на мониторе остаётся landscape
  const orient = () => {
    const type = screen.orientation && screen.orientation.type;
    if (type) return type.startsWith('portrait') ? 'portrait' : 'landscape';
    return mq('(orientation: portrait)') ? 'portrait' : 'landscape';
  };
  const windowGroups = [
    [360, 'phone', '0-359'], [390, 'phone', '360-389'], [430, 'phone', '390-429'], [768, 'phone', '430-767'],
    [1024, 'tablet', '768-1023'], [1280, 'tablet', '1024-1279'],
    [1440, 'desktop', '1280-1439'], [1920, 'desktop', '1440-1919'], [Infinity, 'desktop', '1920+'],
  ];
  const dpr = () => {
    const ratio = window.devicePixelRatio || 1;
    if (ratio >= 2.75) return '3+';
    return String([1, 1.25, 1.5, 2, 2.5].reduce((a, b) => (Math.abs(b - ratio) <= Math.abs(a - ratio) ? b : a)));
  };
  const names = {
    phone: 'телефон', tablet: 'планшет', desktop: 'десктоп',
    touch: 'сенсор', mouse: 'мышь', hybrid: 'мышь и сенсор', none: 'без указателя',
    portrait: 'вертикально', landscape: 'горизонтально',
  };
  const state = () => ({ mode: mode(), orient: orient() });

  const device = () => {
    const now = state();
    const how = input();
    send(`device/${now.mode}/${how}/${now.orient}`, `Устройство · ${names[now.mode]} · ${names[how]} · ${names[now.orient]}`);
    // innerWidth, как в медиавыражениях: вместе с полосой прокрутки
    const [, group, range] = windowGroups.find(([max]) => window.innerWidth < max);
    send(`window/${group}/${range}`, `Окно ${range.replace('-', '–')} px · ${names[group]}`);
    // Экран только у сенсорных: там он почти равен окну и называет модель. На десктопе сайт живёт
    // по окну, а размер монитора дал бы только шум. Телефон и планшет поворачивают: одна модель остаётся одной строкой
    if (how === 'touch') {
      let [w, h] = [screen.width, screen.height];
      if (w > h) [w, h] = [h, w];
      const ratio = dpr();
      send(`screen/${w}x${h}@${ratio}`, `Экран ${w}×${h} · плотность ${ratio}`);
    }

    // Поворот и смена режима: по одному разу за просмотр, когда размеры успокоились
    let last = now;
    let rotated = false;
    let resized = false;
    let timer;
    const check = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const next = state();
        if (next.orient !== last.orient) {
          if (!rotated) {
            rotated = true;
            send(`device/rotate/${last.mode}-${last.orient}→${next.mode}-${next.orient}`,
              `Поворот · ${names[last.mode]} ${names[last.orient]} → ${names[next.mode]} ${names[next.orient]}`);
          }
        } else if (next.mode !== last.mode && !resized) {
          resized = true;
          send(`device/resize/${last.mode}→${next.mode}`, `Окно изменено · ${names[last.mode]} → ${names[next.mode]}`);
        }
        last = next;
      }, 500);
    };
    window.addEventListener('resize', check);
    if (screen.orientation) screen.orientation.addEventListener('change', check);
  };
  // Как count.js: страницу, открытую в фоновой вкладке, считаем, когда её впервые показали
  if (document.visibilityState === 'visible' || !('visibilityState' in document)) device();
  else {
    const shown = () => {
      if (document.visibilityState !== 'visible') return;
      document.removeEventListener('visibilitychange', shown);
      device();
    };
    document.addEventListener('visibilitychange', shown);
  }
})();

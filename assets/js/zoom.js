// Экран кейса крупно в окне поверх страницы (Figma «v2 (по ревью)» 153:154, 153:159; приближение 171:154, 171:1768; docs/screens.md).
// Разметка: <a class="zoom" href="полная.jpg" data-zoom-src="полная.webp" data-zoom-width="1200"><picture>…</picture>…</a>
// Без JavaScript ссылка просто открывает картинку.
// Приближение (компьютер: мышь и окно от 768 px): плашка «− 100% + | По размеру окна» (шаг 25%), клик по экрану (200% в точке клика,
// повторный клик: по размеру окна), перетаскивание мышью, клавиши + − 0. 100% = экран в размере десктопного макета
// (data-zoom-width). На тач-экранах плашки нет: приближают двумя пальцами.
// Страница может отключить окно на узких экранах: data-zoom-from="768" у контейнера экранов (Shifted: скриншоты телефона
// на телефоне и так почти в натуральную величину, решение пользователя 26.09.2026). Уже этой ширины ссылка теряет адрес
// и становится обычной картинкой: не нажимается, без значка и остановки Tab, скринридер читает только alt. Шире: ссылка снова работает.
(() => {
  const links = document.querySelectorAll('a.zoom');
  if (!links.length) return;

  // Узко: ссылка подменяется обёрткой <span class="zoom"> с тем же содержимым (ссылка без адреса считалась бы
  // «некликабельной ссылкой» у поисковиков). Шире: ссылка возвращается на место со своими обработчиками
  const gated = [...links].filter((link) => link.closest('[data-zoom-from]'));
  if (gated.length) {
    const from = matchMedia(`(min-width: ${gated[0].closest('[data-zoom-from]').dataset.zoomFrom}px)`);
    const spans = new Map(gated.map((link) => {
      const span = document.createElement('span');
      span.className = link.className;
      return [link, span];
    }));
    const apply = () => spans.forEach((span, link) => {
      const [on, off] = from.matches ? [link, span] : [span, link];
      if (on.isConnected) return;
      off.replaceWith(on);
      on.append(...off.childNodes);
      const more = on.querySelector('.visually-hidden');
      if (more) more.hidden = on === span;
    });
    apply();
    from.addEventListener('change', apply);
  }

  if (typeof HTMLDialogElement !== 'function') return;

  const ru = document.documentElement.lang === 'ru';
  const text = ru
    ? { close: 'Закрыть', hint: 'Экран шире телефона: листайте вбок', zoom: 'Масштаб', out: 'Уменьшить', in: 'Увеличить', fit: 'По размеру окна' }
    : { close: 'Close', hint: 'The screen is wider than your phone: scroll sideways', zoom: 'Zoom', out: 'Zoom out', in: 'Zoom in', fit: 'Fit to window' };

  const icon = (d) => `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="${d}" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const dialog = document.createElement('dialog');
  dialog.className = 'lightbox';
  dialog.innerHTML =
    '<button class="lightbox__close" type="button">' +
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
    '</button>' +
    '<div class="lightbox__scroll"><figure class="lightbox__figure"><img class="lightbox__img" alt="" draggable="false"><p class="lightbox__hint"></p></figure></div>' +
    '<div class="lightbox__zoom" role="toolbar">' +
    `<button class="lightbox__zoom-btn" type="button" data-zoom="out">${icon('M5 10H15')}</button>` +
    '<output class="lightbox__level" aria-live="polite"></output>' +
    `<button class="lightbox__zoom-btn" type="button" data-zoom="in">${icon('M10 5V15M5 10H15')}</button>` +
    '<span class="lightbox__divider" aria-hidden="true"></span>' +
    `<button class="lightbox__zoom-btn" type="button" data-zoom="fit">${icon('M16 8H12V4M4 12H8V16M12 8L17 3M8 12L3 17')}</button>` +
    '</div>';
  document.body.append(dialog);

  const close = dialog.querySelector('.lightbox__close');
  const scroll = dialog.querySelector('.lightbox__scroll');
  const img = dialog.querySelector('.lightbox__img');
  const bar = dialog.querySelector('.lightbox__zoom');
  const level = dialog.querySelector('.lightbox__level');
  const btn = { out: bar.querySelector('[data-zoom="out"]'), in: bar.querySelector('[data-zoom="in"]'), fit: bar.querySelector('[data-zoom="fit"]') };
  close.setAttribute('aria-label', text.close);
  bar.setAttribute('aria-label', text.zoom);
  btn.out.setAttribute('aria-label', text.out);
  btn.in.setAttribute('aria-label', text.in);
  btn.fit.setAttribute('aria-label', text.fit);
  dialog.querySelector('.lightbox__hint').textContent = text.hint;

  const updateHint = () => dialog.classList.toggle('lightbox--wide', scroll.scrollWidth > scroll.clientWidth + 1);

  // ---------- Приближение ----------
  const STEPS = [1, 1.25, 1.5, 1.75, 2]; // шаг 25% (просьба пользователя 26.09.2026)
  const desktop = matchMedia('(hover: hover) and (pointer: fine) and (min-width: 768px)');
  let designWidth = 1200; // ширина экрана в макете десктопа, px
  let scale = null;        // null: по размеру окна; иначе доля от designWidth
  let fitScale = 1;

  const measureFit = () => {
    if (scale === null) fitScale = img.getBoundingClientRect().width / designWidth || 1;
  };
  const current = () => (scale === null ? fitScale : scale);
  const nextUp = () => STEPS.find((s) => s > current() + 0.01);
  const nextDown = () => [...STEPS].reverse().find((s) => s < current() - 0.01 && s > fitScale + 0.01);

  const render = () => {
    const on = desktop.matches;
    dialog.classList.toggle('lightbox--zoomable', on && !!nextUp());
    dialog.classList.toggle('lightbox--zoomed', scale !== null);
    level.textContent = Math.round(current() * 100) + '%';
    btn.in.disabled = !nextUp();
    btn.out.disabled = scale === null;
    btn.fit.disabled = scale === null;
  };

  // Точка (fx, fy) картинки в долях остаётся под точкой экрана (x, y) после смены масштаба
  const setScale = (value, x, y) => {
    const before = img.getBoundingClientRect();
    const fx = (x - before.left) / before.width;
    const fy = (y - before.top) / before.height;
    scale = value;
    if (scale === null) {
      img.style.removeProperty('width');
    } else {
      img.style.width = Math.round(designWidth * scale) + 'px';
    }
    render();
    const after = img.getBoundingClientRect();
    scroll.scrollLeft += after.left + fx * after.width - x;
    scroll.scrollTop += after.top + fy * after.height - y;
    measureFit();
    updateHint();
  };
  const viewCenter = () => {
    const r = scroll.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  };
  const zoomIn = () => { const s = nextUp(); if (s) setScale(s, ...viewCenter()); };
  const zoomOut = () => { if (scale !== null) setScale(nextDown() || null, ...viewCenter()); };
  const zoomFit = () => { if (scale !== null) setScale(null, ...viewCenter()); };

  btn.in.addEventListener('click', zoomIn);
  btn.out.addEventListener('click', zoomOut);
  btn.fit.addEventListener('click', zoomFit);

  // Клик по экрану: 200% в точке клика, повторный клик: по размеру окна. Перетаскивание двигает увеличенный экран
  let drag = null;
  img.addEventListener('pointerdown', (event) => {
    if (!desktop.matches || event.button !== 0 || event.pointerType !== 'mouse') return;
    drag = { x: event.clientX, y: event.clientY, left: scroll.scrollLeft, top: scroll.scrollTop, moved: false };
    if (scale !== null) try { img.setPointerCapture(event.pointerId); } catch {}
  });
  img.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    if (scale !== null && drag.moved) {
      dialog.classList.add('lightbox--dragging');
      scroll.scrollLeft = drag.left - dx;
      scroll.scrollTop = drag.top - dy;
    }
  });
  const endDrag = () => { drag = null; dialog.classList.remove('lightbox--dragging'); };
  img.addEventListener('pointerup', (event) => {
    if (!drag) return;
    const click = !drag.moved;
    endDrag();
    if (!click) return;
    if (scale !== null) setScale(null, event.clientX, event.clientY);
    else if (STEPS[STEPS.length - 1] > fitScale + 0.01) setScale(STEPS[STEPS.length - 1], event.clientX, event.clientY);
  });
  img.addEventListener('pointercancel', endDrag);

  dialog.addEventListener('keydown', (event) => {
    if (!desktop.matches || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === '+' || event.key === '=') { event.preventDefault(); zoomIn(); }
    else if (event.key === '-' || event.key === '_') { event.preventDefault(); zoomOut(); }
    else if (event.key === '0') { event.preventDefault(); zoomFit(); }
  });

  // ---------- Открыть и закрыть ----------
  links.forEach((link) => {
    link.addEventListener('click', (event) => {
      if (!link.hasAttribute('href') || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      const preview = link.querySelector('img');
      designWidth = Number(link.dataset.zoomWidth) || 1200;
      scale = null;
      img.style.removeProperty('width');
      img.src = link.dataset.zoomSrc || link.href;
      img.alt = preview ? preview.alt : '';
      img.style.setProperty('--zoom-width', designWidth);
      // пропорции полной картинки из атрибутов превью (у телефонного кадрирования они свои, у <source>)
      img.setAttribute('width', preview.getAttribute('width'));
      img.setAttribute('height', preview.getAttribute('height'));
      dialog.setAttribute('aria-label', img.alt);
      document.documentElement.classList.add('is-locked');
      dialog.showModal();
      scroll.scrollTo(0, 0);
      close.focus();
      const ready = () => { measureFit(); render(); updateHint(); };
      if (img.complete) ready(); else img.addEventListener('load', ready, { once: true });
    });
  });

  close.addEventListener('click', () => dialog.close());
  // Нажатие на тёмный фон вокруг экрана закрывает окно
  scroll.addEventListener('click', (event) => {
    if (event.target === scroll || event.target.classList.contains('lightbox__figure')) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('is-locked');
    dialog.classList.remove('lightbox--wide', 'lightbox--zoomed', 'lightbox--zoomable', 'lightbox--dragging');
    img.removeAttribute('src');
    img.style.removeProperty('width');
    scale = null;
  });
  window.addEventListener('resize', () => {
    if (!dialog.open) return;
    measureFit();
    render();
    updateHint();
  });
})();

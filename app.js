/* Олимпиадный старт. 7 класс — логика приложения (без внешних библиотек). */
(function () {
  'use strict';

  const COURSE = window.COURSE, FIGS = window.FIGS, CAP = window.FIG_CAP, ICONS = window.ICONS;
  const CLASSIC = new Set(window.CLASSIC || []);
  const LESSONS = [];
  const LBY = {};
  COURSE.sections.forEach((s) => s.lessons.forEach((l, i) => { l.sec = s; l.n = i + 1; l.idx = LESSONS.length; LESSONS.push(l); LBY[l.id] = l; }));

  const TOPICS = {
    logic: 'Условие и доказательство', search: 'Перебор, схемы, маленькие случаи', parity: 'Чётность',
    div: 'Делимость и остатки', dirichlet: 'Принцип Дирихле', invariant: 'Инварианты',
    extreme: 'Принцип крайнего', geom: 'Геометрия', mix: 'Испытания'
  };
  const RANKS = ['Новичок', 'Исследователь', 'Решатель задач', 'Молодой олимпиадник'];
  const TYPE_NAMES = {
    one: 'Выбери один ответ', multi: 'Выбери все верные ответы', tf: 'Верно или неверно', num: 'Впиши число',
    order: 'Расставь по порядку', fill: 'Заполни пропуски', err: 'Найди ошибку', text: 'Короткий текстовый ответ'
  };

  // ---------- мелкие помощники ----------
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const icon = (n, cls) => `<svg class="ic ${cls || ''}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;
  const plural = (n, f) => { const a = Math.abs(n) % 100, b = a % 10; return a > 10 && a < 20 ? f[2] : b === 1 ? f[0] : b >= 2 && b <= 4 ? f[1] : f[2]; };
  const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  const parseNum = (s) => { s = String(s).trim().replace(/[\s\u00a0°]/g, '').replace(',', '.').replace(/[−–—]/g, '-'); return /^-?\d+(\.\d+)?$/.test(s) ? parseFloat(s) : NaN; };
  const fmtNum = (n) => { const p = String(Math.abs(n)).split('.'); p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0'); return (n < 0 ? '−' : '') + p.join(','); };
  const ymd = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const today = () => ymd(new Date());
  const dayDiff = (a, b) => { const p = (s) => { const x = s.split('-').map(Number); return Date.UTC(x[0], x[1] - 1, x[2]); }; return Math.round((p(b) - p(a)) / 864e5); };
  const figHTML = (name) => (name && FIGS[name]) ? `<figure class="figure">${FIGS[name]()}<figcaption>${CAP[name] || ''}</figcaption></figure>` : '';
  const lname = (l) => (l.challenge ? 'испытание раздела ' + l.sec.id : 'урок ' + l.sec.id + '.' + l.n);
  const originLabel = (key) => CLASSIC.has(key) ? 'Известный сюжет математических кружков, учебная формулировка' : 'Авторская учебная задача';

  // ---------- сохранение ----------
  const KEY = 'olimp-start-7-v1';
  let memOnly = false;
  const defaults = () => ({ v: 1, xp: 0, goal: 30, days: {}, streak: 0, best: 0, lastDay: null, vacation: false, done: {}, pos: {}, tasks: {}, mistakes: [], lastTraining: null, lastVisit: null });
  function load() {
    try {
      localStorage.setItem(KEY + '-test', '1'); localStorage.removeItem(KEY + '-test');
      const raw = localStorage.getItem(KEY);
      if (raw) { const d = JSON.parse(raw); if (d && typeof d === 'object') return Object.assign(defaults(), d); }
    } catch (e) { memOnly = true; }
    return defaults();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { memOnly = true; } }
  let state = load();

  // ---------- серия, XP, звания ----------
  function markActive() {
    const t = today();
    if (!(t in state.days)) state.days[t] = 0;
    if (state.lastDay === t) return;
    if (!state.lastDay) state.streak = 1;
    else { const gap = dayDiff(state.lastDay, t); state.streak = (gap <= 3 || state.vacation) ? state.streak + 1 : 1; }
    state.lastDay = t;
    if (state.streak > state.best) state.best = state.streak;
  }
  function shownStreak() {
    if (!state.lastDay) return 0;
    const gap = dayDiff(state.lastDay, today());
    return (gap <= 3 || state.vacation) ? state.streak : 0;
  }
  const todayXP = () => state.days[today()] || 0;
  function addXP(n) {
    if (!(n > 0)) return;
    markActive();
    const t = today(), before = state.days[t] || 0;
    state.xp += n; state.days[t] = before + n;
    if (before < state.goal && before + n >= state.goal) toast('Дневная цель выполнена', 'target');
    save(); renderHeader();
  }
  const secDone = (s) => s.lessons.filter((l) => state.done[l.id]).length;
  const rankIdx = () => COURSE.sections.filter((s) => secDone(s) === s.lessons.length).length;
  const doneCount = () => LESSONS.filter((l) => state.done[l.id]).length;
  const isUnlocked = (l) => l.idx === 0 || !!state.done[LESSONS[l.idx - 1].id];
  const nextLesson = () => LESSONS.find((l) => !state.done[l.id]) || null;
  const needTraining = () => state.mistakes.length > 0 && dayDiff(state.lastTraining || state.mistakes.reduce((m, x) => (x.at < m ? x.at : m), today()), today()) >= 3;

  function findTask(id) {
    const p = id.split('.'); const l = LBY[p[0]];
    if (!l) return null; const t = l.tasks[+p[1]];
    return t ? { lesson: l, task: t } : null;
  }
  function recordMistake(id, ansHtml) {
    let m = state.mistakes.find((x) => x.id === id);
    if (!m) { m = { id, ans: ansHtml, at: today(), streak: 0, tries: 0 }; state.mistakes.push(m); }
    else { m.ans = ansHtml; m.streak = 0; }
    save();
  }

  // ---------- окно подтверждения и уведомления ----------
  function modal(o) {
    return new Promise((res) => {
      const root = $('#modal');
      root.innerHTML = `<div class="modal-back" data-close="1"></div><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-t"><h2 id="modal-t">${o.title}</h2><div class="content">${o.body || ''}</div><div class="modal-actions">${o.actions.map((a, i) => `<button type="button" class="btn ${a.cls || ''}" data-m="${i}">${a.label}</button>`).join('')}</div></div>`;
      root.hidden = false;
      const prev = document.activeElement;
      const close = (v) => {
        root.hidden = true; root.innerHTML = ''; root.onclick = null; document.removeEventListener('keydown', onKey, true);
        if (prev && document.contains(prev) && prev.focus) prev.focus();
        res(v);
      };
      const onKey = (e) => {
        if (e.key === 'Escape') { e.preventDefault(); close(null); }
        else if (e.key === 'Tab') {
          const f = Array.from(root.querySelectorAll('button')); if (!f.length) return;
          const i = f.indexOf(document.activeElement);
          e.preventDefault(); f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
        }
      };
      root.onclick = (e) => {
        const b = e.target.closest('[data-m]');
        if (b) close(o.actions[+b.dataset.m].value);
        else if (e.target.dataset && e.target.dataset.close) close(null);
      };
      document.addEventListener('keydown', onKey, true);
      const fb = root.querySelector(`[data-m="${o.focus || 0}"]`); if (fb) fb.focus();
    });
  }
  function toast(msg, ic) {
    const box = $('#toasts'); const el = document.createElement('div');
    el.className = 'toast'; el.innerHTML = icon(ic || 'sparkles') + '<span>' + msg + '</span>';
    box.appendChild(el); setTimeout(() => el.remove(), 3600);
  }

  // ---------- шапка ----------
  let view = { name: 'home' };
  let ctx = null; // состояние открытого урока или тренировки
  function renderHeader() {
    const s = shownStreak();
    $('#chips').innerHTML =
      `<span class="chip streak" title="Серия дней">${icon(state.vacation ? 'tree-palm' : 'flame')}<span>${s}</span><span class="sr-only"> ${plural(s, ['день', 'дня', 'дней'])} подряд</span></span>` +
      `<span class="chip goal" title="Цель на сегодня">${icon('target')}<span>${todayXP()}/${state.goal}</span><span class="sr-only"> XP сегодня</span></span>` +
      `<span class="chip xp" title="Всего XP">${icon('star')}<span>${state.xp}</span><span class="sr-only"> XP всего</span></span>`;
    const tabs = [['home', 'Путь', 'map'], ['mistakes', 'Мои ошибки', 'circle-alert'], ['profile', 'Профиль', 'user']];
    const cur = view.name === 'train' ? 'mistakes' : view.name === 'lesson' ? 'home' : view.name;
    $('#tabs').innerHTML = tabs.map((t) => `<button type="button" class="tab" data-act="go" data-to="${t[0]}" ${cur === t[0] ? 'aria-current="page"' : ''}>${icon(t[2])}<span>${t[1]}</span>${t[0] === 'mistakes' && state.mistakes.length ? `<span class="badge" aria-label="в списке: ${state.mistakes.length}">${state.mistakes.length}</span>` : ''}</button>`).join('');
  }

  // ---------- навигация ----------
  function go(name, arg) {
    if (name === 'lesson') { openLesson(arg); return; }
    if (name === 'train') { startTraining(); return; }
    view = { name }; ctx = null; render(true);
  }
  function render(top, focusSel) {
    const app = $('#app');
    const html = view.name === 'home' ? homeHTML() : view.name === 'mistakes' ? mistakesHTML() : view.name === 'profile' ? profileHTML()
      : view.name === 'lesson' ? lessonHTML() : view.name === 'train' ? trainHTML() : '';
    app.innerHTML = html;
    renderHeader();
    if (top) {
      window.scrollTo(0, 0);
      const h = app.querySelector('h1'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    }
    if (focusSel) {
      const el = app.querySelector(focusSel);
      if (el) { if (!el.hasAttribute('tabindex') && !/^(BUTTON|INPUT|SELECT|TEXTAREA|A)$/.test(el.tagName)) el.setAttribute('tabindex', '-1'); el.focus({ preventScroll: true }); if (el.dataset.scroll !== 'no') el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
    }
  }

  // =====================================================================
  // ГЛАВНЫЙ ЭКРАН: карта пути
  // =====================================================================
  let welcomeBack = false;
  function ringHTML(val, goal) {
    const r = 26, c = 2 * Math.PI * r, k = Math.min(1, goal ? val / goal : 0);
    return `<svg class="ring" viewBox="0 0 64 64" aria-hidden="true"><circle class="bg" cx="32" cy="32" r="${r}"/><circle class="fg" cx="32" cy="32" r="${r}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - k)).toFixed(1)}"/></svg>`;
  }
  function homeHTML() {
    const nx = nextLesson(), dn = doneCount(), rk = rankIdx(), s = shownStreak(), tx = todayXP();
    const paused = nx && state.pos[nx.id];
    let hero;
    if (!nx) {
      hero = `<p class="eyebrow">${COURSE.module}</p><h1>Модуль пройден</h1><p>Все 30 уроков позади. Уроки можно повторять, а ошибки — тренировать: так навык держится дольше.</p><div class="bar" role="img" aria-label="Пройдено 30 из 30 уроков"><i style="width:100%"></i></div><div class="row"><button class="btn" data-act="go" data-to="mistakes">${icon('dumbbell')}Мои ошибки</button><button class="btn ghost" data-act="go" data-to="profile">Статистика</button></div>`;
    } else {
      const label = paused ? 'Продолжить урок' : dn === 0 ? 'Начать первый урок' : 'Продолжить';
      hero = `<p class="eyebrow">${COURSE.module}</p><h1>${dn === 0 ? 'Олимпиадный старт' : 'Звание: ' + RANKS[rk]}</h1>` +
        `<p>${dn === 0 ? '30 коротких уроков по 8–12 минут: чётность, остатки, перебор, принцип Дирихле, инварианты и геометрия. В каждом — объяснение, разобранный пример и задания с проверкой.' : `Пройдено ${dn} из 30 ${plural(30, ['урока', 'уроков', 'уроков'])}. Дальше — урок ${nx.sec.id}.${nx.n}: «${nx.short}».`}</p>` +
        `<div class="bar" role="img" aria-label="Пройдено ${dn} из 30 уроков"><i style="width:${(dn / 30 * 100).toFixed(1)}%"></i></div>` +
        `<div class="row"><button class="btn" data-act="lesson" data-id="${nx.id}">${icon('play')}${label}</button>` +
        `<button class="btn ghost" data-act="train" ${state.mistakes.length ? '' : 'disabled'}>${icon('dumbbell')}Тренировка ошибок</button></div>`;
    }
    let banners = '';
    if (welcomeBack) banners += `<div class="banner blue">${icon('heart-handshake')}<div><b>С возвращением.</b> Перерывы — это нормально. Начни с короткого повторения или продолжи с того места, где была остановка.</div></div>`;
    if (needTraining()) banners += `<div class="banner warm">${icon('dumbbell')}<div><b>Пора повторить ошибки.</b> В списке ${state.mistakes.length} ${plural(state.mistakes.length, ['задание', 'задания', 'заданий'])}. Короткая тренировка в немного изменённом виде поможет закрепить тему.<div class="row"><button class="btn sm" data-act="train">Начать тренировку</button></div></div></div>`;
    if (memOnly) banners += `<div class="banner warm">${icon('info')}<div>В этом браузере сохранение недоступно (например, включён приватный режим). Прогресс будет храниться только до закрытия вкладки.</div></div>`;

    const goalDone = tx >= state.goal;
    const side =
      `<div class="card"><p class="eyebrow">Цель на сегодня</p><div class="goalbox">${ringHTML(tx, state.goal)}<div><div class="stat-n">${tx} XP</div><div class="stat-l">из ${state.goal} · ${goalDone ? 'цель выполнена' : 'осталось ' + (state.goal - tx)}</div></div></div></div>` +
      `<div class="card"><p class="eyebrow">Серия</p><div class="stat-n">${icon(state.vacation ? 'tree-palm' : 'flame')}${s} ${plural(s, ['день', 'дня', 'дней'])}</div><div class="stat-l">${state.vacation ? 'Каникулы: серия на паузе' : 'Пропуск до двух дней серию не обнуляет'}</div></div>` +
      `<div class="card full"><p class="eyebrow">Мои ошибки</p>${state.mistakes.length ? `<p class="small">В списке ${state.mistakes.length} ${plural(state.mistakes.length, ['задание', 'задания', 'заданий'])}. Задание уходит из списка после двух верных решений подряд.</p><div class="row"><button class="btn sm blue" data-act="train">${icon('dumbbell')}Тренировка ошибок</button><button class="btn sm ghost" data-act="go" data-to="mistakes">Список</button></div>` : '<p class="small muted">Список пуст. Ошибки будут собираться здесь, чтобы к ним можно было вернуться.</p>'}</div>`;

    const shifts = [0, 1, 2, 1, 0, 1, 2, 1, 0, 1];
    const cur = nx ? nx.id : null;
    const secs = COURSE.sections.map((sc) => {
      const d = secDone(sc);
      const rows = sc.lessons.map((l, i) => {
        const done = !!state.done[l.id], lock = !isUnlocked(l), isCur = l.id === cur;
        const st = done ? 'пройден' : lock ? 'закрыт' : state.pos[l.id] ? 'на паузе' : 'открыт';
        const ic = done ? 'check' : lock ? 'lock' : l.challenge ? 'trophy' : 'play';
        return `<li class="node-row ${lock ? 'is-lock' : ''}"><div class="node-slot"><button type="button" class="node ${done ? 'done' : lock ? 'lock' : ''} ${isCur ? 'cur' : ''} ${l.challenge ? 'chal' : ''}" style="--sh:${shifts[i]}" data-act="node" data-id="${l.id}" aria-label="${l.challenge ? 'Испытание' : 'Урок ' + l.n}: ${esc(l.title)} — ${st}">${icon(ic)}</button></div>` +
          `<div class="node-cap"><b>${l.challenge ? '' : l.n + '. '}${l.short}</b><span>${l.min} мин · ${st}</span></div></li>`;
      }).join('');
      return `<section class="sec sec-${sc.id}" aria-labelledby="sec-h-${sc.id}"><div class="sec-head"><p class="eyebrow">Раздел ${sc.id} · ${sc.level} уровень</p><h2 id="sec-h-${sc.id}">${sc.title}</h2><p>${sc.desc}</p><div class="bar" role="img" aria-label="Пройдено ${d} из 10"><i style="width:${d * 10}%"></i></div><span class="cnt">${d} из 10</span></div><ol class="path">${rows}</ol></section>`;
    }).join('');

    return `<div class="wrap"><div class="home"><div class="herocol">${banners}<section class="card hero">${hero}</section></div><aside class="side" aria-label="Сегодня">${side}</aside><div class="maincol">${secs}</div></div></div>`;
  }

  async function nodeSheet(id) {
    const l = LBY[id], done = !!state.done[id], lock = !isUnlocked(l), paused = !!state.pos[id];
    const prev = l.idx > 0 ? LESSONS[l.idx - 1] : null;
    const kind = l.challenge ? 'Испытание: одна большая задача по шагам' : 'Мини-урок: объяснение, пример, тренировка, итог';
    let body = `<p class="eyebrow">Раздел ${l.sec.id} · ${l.challenge ? 'испытание' : 'урок ' + l.n + ' из 10'}</p><p><b>${l.title}</b></p><p class="muted small">${kind} · около ${l.min} минут · тема: ${TOPICS[l.topic]}</p>`;
    let actions;
    if (lock) {
      body += `<p>Этот урок откроется после урока «${prev.short}». Уроки идут по порядку: каждый опирается на предыдущие.</p>`;
      actions = [{ label: 'Понятно', cls: 'ghost', value: null }];
    } else {
      if (done) body += '<p class="small">Урок пройден. Повторение полезно, но XP за повтор не начисляются.</p>';
      if (paused) body += '<p class="small">Урок на паузе — можно продолжить с того же места.</p>';
      actions = [{ label: done ? 'Повторить' : paused ? 'Продолжить' : 'Начать', value: 'go' }, { label: 'Закрыть', cls: 'ghost', value: null }];
    }
    const r = await modal({ title: l.challenge ? 'Испытание' : 'Урок ' + l.sec.id + '.' + l.n, body, actions });
    if (r === 'go') openLesson(id);
  }

  // =====================================================================
  // ЗАДАНИЯ: состояние, проверка, отображение
  // =====================================================================
  function newTV(task, mode) {
    const tv = { task, mode, attempts: 0, hints: 0, st: 'ask', wrong: false, msg: '', gained: 0 };
    const t = task.type;
    if (t === 'one' || t === 'multi') { const idx = task.opts.map((_, i) => i); tv.ord = task.noShuffle ? idx : shuffle(idx); tv.sel = t === 'multi' ? [] : null; }
    else if (t === 'tf' || t === 'err') tv.sel = null;
    else if (t === 'num' || t === 'text') tv.val = '';
    else if (t === 'order') { const idx = task.items.map((_, i) => i); let p; do { p = shuffle(idx); } while (p.every((v, i) => v === i)); tv.perm = p; }
    else if (t === 'fill') { tv.vals = task.parts.filter((p) => typeof p === 'object').map(() => ''); tv.bad = []; }
    return tv;
  }
  function ready(tv) {
    switch (tv.task.type) {
      case 'one': case 'tf': case 'err': return tv.sel !== null;
      case 'multi': return tv.sel.length > 0;
      case 'num': return tv.val.trim() !== '';
      case 'order': return true;
      case 'fill': return tv.vals.every((v) => String(v).trim() !== '');
      case 'text': return tv.val.trim().length >= 8;
    }
    return false;
  }
  const gapsOf = (task) => task.parts.filter((p) => typeof p === 'object');
  function isCorrect(tv) {
    const t = tv.task;
    switch (t.type) {
      case 'one': case 'err': case 'tf': return tv.sel === t.a;
      case 'multi': return tv.sel.length === t.a.length && t.a.every((i) => tv.sel.indexOf(i) >= 0);
      case 'num': return Math.abs(parseNum(tv.val) - t.a) < 1e-9;
      case 'order': return tv.perm.every((v, i) => v === i);
      case 'fill': {
        const g = gapsOf(t); tv.bad = [];
        g.forEach((gp, i) => { const ok = gp.gap === 'num' ? Math.abs(parseNum(tv.vals[i]) - gp.a) < 1e-9 : String(tv.vals[i]) === String(gp.a); if (!ok) tv.bad.push(i); });
        return tv.bad.length === 0;
      }
    }
    return false;
  }
  function fillText(t, vals, mark) {
    let k = 0;
    return t.parts.map((p) => {
      if (typeof p === 'string') return p;
      const i = k++; const v = vals ? vals[i] : null;
      const s = p.gap === 'num' ? (vals ? esc(v) : fmtNum(p.a)) : (vals ? (p.opts[+v] || '…') : p.opts[p.a]);
      return mark ? '<b><u>' + s + '</u></b>' : s;
    }).join('');
  }
  function ansHTML(tv) {
    const t = tv.task;
    switch (t.type) {
      case 'one': return t.opts[tv.sel];
      case 'multi': return tv.sel.slice().sort((a, b) => a - b).map((i) => t.opts[i]).join('; ');
      case 'tf': return tv.sel ? 'Верно' : 'Неверно';
      case 'num': return esc(tv.val) + (t.unit || '');
      case 'order': return '<ol>' + tv.perm.map((i) => '<li>' + t.items[i] + '</li>').join('') + '</ol>';
      case 'fill': return fillText(t, tv.vals, true);
      case 'err': return 'Строка ' + (tv.sel + 1) + ': ' + t.lines[tv.sel];
      case 'text': return esc(tv.val);
    }
    return '';
  }
  function correctHTML(t) {
    switch (t.type) {
      case 'one': return t.opts[t.a];
      case 'multi': return t.a.map((i) => t.opts[i]).join('; ');
      case 'tf': return t.a ? 'Верно' : 'Неверно';
      case 'num': return fmtNum(t.a) + (t.unit || '');
      case 'order': return '<ol>' + t.items.map((s) => '<li>' + s + '</li>').join('') + '</ol>';
      case 'fill': return fillText(t, null, true);
      case 'err': return 'Строка ' + (t.a + 1) + ': ' + t.lines[t.a];
      case 'text': return t.sample;
    }
    return '';
  }
  const wrongMsg = (t) => ({
    one: 'Этот вариант не подходит. Перечитай условие и попробуй другой.',
    multi: 'Набор пока не тот: отмечено не всё верное или есть лишнее.',
    num: 'Число пока другое. Проверь рассуждение шаг за шагом.',
    order: 'Порядок пока не тот. Подумай, что из чего следует.',
    fill: 'Не все пропуски заполнены верно — они подсвечены.',
    err: 'В этой строке ошибки нет. Проверь остальные.'
  }[t.type]);

  function inputsHTML(tv) {
    const t = tv.task, off = tv.st !== 'ask', dis = off ? 'disabled' : '';
    const shownOk = tv.st === 'right' || tv.st === 'shown';
    if (t.type === 'one' || t.type === 'multi') {
      const multi = t.type === 'multi';
      return `<div class="opts" role="group" aria-label="Варианты ответа">` + tv.ord.map((i) => {
        const sel = multi ? tv.sel.indexOf(i) >= 0 : tv.sel === i;
        const good = multi ? t.a.indexOf(i) >= 0 : t.a === i;
        let cls = sel ? 'sel' : '';
        if (shownOk) cls = good ? 'ok' : (sel ? 'bad' : '');
        return `<button type="button" class="opt ${multi ? 'box' : ''} ${cls}" data-act="pick" data-i="${i}" data-fid="o${i}" aria-pressed="${sel}" ${dis}><span class="mark">${icon('check')}</span><span>${t.opts[i]}</span></button>`;
      }).join('') + '</div>';
    }
    if (t.type === 'tf') {
      return `<div class="opts tf" role="group" aria-label="Верно или неверно">` + [true, false].map((v) => {
        const sel = tv.sel === v; let cls = sel ? 'sel' : '';
        if (shownOk) cls = t.a === v ? 'ok' : (sel ? 'bad' : '');
        return `<button type="button" class="opt ${cls}" data-act="pick" data-i="${v ? 1 : 0}" data-fid="o${v ? 1 : 0}" aria-pressed="${sel}" ${dis}><span class="mark">${icon('check')}</span><span>${v ? 'Верно' : 'Неверно'}</span></button>`;
      }).join('') + '</div>';
    }
    if (t.type === 'err') {
      return `<div class="opts" role="group" aria-label="Строки решения">` + t.lines.map((ln, i) => {
        const sel = tv.sel === i; let cls = sel ? 'sel' : '';
        if (shownOk) cls = t.a === i ? 'ok' : (sel ? 'bad' : '');
        return `<button type="button" class="opt ${cls}" data-act="pick" data-i="${i}" data-fid="o${i}" aria-pressed="${sel}" ${dis}><span class="num">${i + 1}.</span><span>${ln}</span></button>`;
      }).join('') + '</div>';
    }
    if (t.type === 'num') {
      const cls = tv.st === 'right' ? 'right' : (tv.wrong ? 'wrong' : '');
      return `<div><label class="numwrap"><span class="sr-only">Твой ответ</span><input class="in num ${cls}" type="text" inputmode="decimal" autocomplete="off" data-in="num" data-fid="num" value="${esc(tv.val)}" placeholder="число" ${dis}>${t.unit ? `<span class="unit">${t.unit}</span>` : ''}</label></div>`;
    }
    if (t.type === 'order') {
      return `<ol class="ord ${tv.st === 'right' ? 'done' : ''}">` + tv.perm.map((it, pos) =>
        `<li><span>${t.items[it]}</span>${off ? '<span></span>' : `<span class="mv"><button type="button" data-act="mv" data-p="${pos}" data-d="-1" data-fid="u${pos}" aria-label="Поднять строку ${pos + 1} выше" ${pos === 0 ? 'disabled' : ''}>${icon('arrow-up')}</button><button type="button" data-act="mv" data-p="${pos}" data-d="1" data-fid="d${pos}" aria-label="Опустить строку ${pos + 1} ниже" ${pos === tv.perm.length - 1 ? 'disabled' : ''}>${icon('arrow-down')}</button></span>`}</li>`).join('') + '</ol>';
    }
    if (t.type === 'fill') {
      let k = 0;
      const body = t.parts.map((p) => {
        if (typeof p === 'string') return p;
        const i = k++; const bad = tv.wrong && tv.bad.indexOf(i) >= 0; const cls = tv.st === 'right' ? 'right' : (bad ? 'wrong' : '');
        if (p.gap === 'num') return `<input class="in gap ${cls}" type="text" inputmode="decimal" autocomplete="off" data-in="gap" data-g="${i}" data-fid="g${i}" value="${esc(tv.vals[i])}" aria-label="Пропуск ${i + 1}: число" ${dis}>`;
        return `<select class="in gap ${cls}" data-in="gap" data-g="${i}" data-fid="g${i}" aria-label="Пропуск ${i + 1}: выбери вариант" ${dis}><option value="">выбери…</option>${p.opts.map((o, j) => `<option value="${j}" ${String(tv.vals[i]) === String(j) ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
      }).join('');
      return `<p class="fillp">${body}</p>`;
    }
    if (t.type === 'text') {
      return `<label><span class="sr-only">Твой ответ</span><textarea class="in" data-in="text" data-fid="txt" placeholder="Запиши своё объяснение одной-тремя фразами" ${dis}>${esc(tv.val)}</textarea></label>`;
    }
    return '';
  }

  function hintsHTML(tv) {
    const t = tv.task; let h = '';
    if (tv.hints >= 1 && t.h1) h += `<div class="hintbox">${icon('lightbulb')}<div><b>Подсказка 1 — направление</b>${t.h1}</div></div>`;
    if (tv.hints >= 2 && t.h2) h += `<div class="hintbox">${icon('lightbulb')}<div><b>Подсказка 2 — сильнее</b>${t.h2}</div></div>`;
    return h ? `<div class="hints" id="hints" aria-live="polite">${h}</div>` : '';
  }

  function feedbackHTML(tv, id) {
    const t = tv.task, m = tv.mode;
    const xp = tv.gained ? `<span class="xp">${icon('star')}+${tv.gained} XP</span>` : '';
    const nextBtn = `<button type="button" class="btn" data-act="next" data-fid="next">Дальше${icon('arrow-right')}</button>`;
    if (tv.st === 'ask') {
      if (tv.wrong) return `<div class="fb fb-try" id="${id}" role="status"><h3>${icon('rotate-ccw')}Пока не сошлось</h3><p>${wrongMsg(t)} Ошибка — это подсказка, где искать.${m === 'lesson' || m === 'challenge' ? ' Можно попробовать ещё раз или взять подсказку.' : ''}</p></div>`;
      return '';
    }
    if (tv.st === 'self') {
      return `<div class="fb fb-sol" id="${id}" role="status"><h3>${icon('eye')}Сравни с образцом</h3><p class="small">Текстовые ответы программа не оценивает автоматически — оценка здесь честная и твоя собственная.</p><div class="ans"><b class="small muted">Образец ответа</b><br>${t.sample}</div><p><b>Проверь по пунктам:</b></p><ul class="selfcheck">${t.checks.map((c, i) => `<li><label><input type="checkbox" data-chk="${i}"><span>${c}</span></label></li>`).join('')}</ul><div class="row"><button type="button" class="btn" data-act="selfok" data-fid="selfok">${icon('check')}Совпало по смыслу</button><button type="button" class="btn ghost" data-act="selfgap">Есть пробел</button></div></div>`;
    }
    if (tv.st === 'right') {
      let extra = '';
      if (m === 'train') extra = tv.closed ? '<p><b>Ошибка закрыта:</b> два верных решения подряд. Задание убрано из списка.</p>' : `<p class="small">Верных решений подряд: ${tv.streakNow} из 2. Задание останется в списке до второго верного решения.</p>`;
      const title = t.type === 'text' ? 'Отлично, смысл совпал' : (tv.attempts > 1 ? 'Верно — получилось со второго захода' : 'Верно');
      return `<div class="fb fb-ok" id="${id}" role="status"><h3>${icon('circle-check')}${title}${xp}</h3>${t.ex ? `<p>${t.ex}</p>` : ''}${extra}<div class="row end">${nextBtn}</div></div>`;
    }
    // shown
    let head, intro = '';
    if (t.type === 'text') { head = 'Образец ответа'; intro = tv.gap ? '<p>Хорошо, что пробел замечен: это и есть работа над ошибкой.</p>' : ''; }
    else if (m === 'sim' || m === 'train') head = 'Здесь ответ другой';
    else if (tv.auto) { head = 'Здесь ответ другой'; intro = '<p class="small">В заданиях «верно — неверно» второй попытки нет, поэтому сразу разбираем решение.</p>'; }
    else head = 'Разбор решения';
    let after = '';
    if (m === 'train') after = '<p class="small">Счётчик верных решений для этого задания начнётся заново. Оно ещё встретится в тренировке.</p>';
    else if (m === 'lesson' || m === 'challenge') after = '<p class="small">Задание добавлено в «Мои ошибки» — к нему можно будет вернуться в тренировке.</p>';
    const canSim = (m === 'lesson' || m === 'challenge') && t.sim && !ctx.sim;
    const btn = canSim ? `<button type="button" class="btn blue" data-act="sim" data-fid="next">Похожая задача${icon('arrow-right')}</button>` : nextBtn;
    return `<div class="fb fb-sol" id="${id}" role="status"><h3>${icon('book-open')}${head}${xp}</h3>${intro}<div class="ans"><b class="small muted">${t.type === 'text' ? 'Образец' : 'Верный ответ'}</b><br>${correctHTML(t)}</div>${t.ex ? `<p>${t.ex}</p>` : ''}${after}<div class="row end">${btn}</div></div>`;
  }

  function taskCardHTML(tv, o) {
    const t = tv.task, m = tv.mode;
    const canHint = (m === 'lesson' || m === 'challenge') && tv.st === 'ask';
    let hintBtn = '';
    if (canHint) {
      const pen = m === 'challenge';
      if (tv.hints === 0) hintBtn = `<button type="button" class="btn hint" data-act="hint" data-fid="hint">${icon('lightbulb')}Подсказка${pen ? ' (−5 очков)' : ''}</button>`;
      else if (tv.hints === 1) hintBtn = `<button type="button" class="btn hint" data-act="hint" data-fid="hint">${icon('lightbulb')}Ещё подсказка${pen ? ' (−5 очков)' : ''}</button>`;
      else hintBtn = `<button type="button" class="btn ghost" data-act="show" data-fid="hint">${icon('eye')}Показать решение${pen ? ' (−10 очков)' : ''}</button>`;
    }
    const checkLabel = t.type === 'text' ? 'Сравнить с образцом' : 'Проверить';
    const actions = tv.st === 'ask' ? `<div class="actions">${hintBtn}<button type="button" class="btn" data-act="check" data-fid="check">${checkLabel}</button></div>` : '';
    const msg = tv.msg && tv.st === 'ask' ? `<p class="msg" id="msg" role="alert">${tv.msg}</p>` : '';
    return `<article class="card task ${o.cls || ''}" id="${o.id}">` +
      (o.head ? `<p class="lead">${o.head}</p>` : '') +
      `<div class="q content" id="${o.id}-q" tabindex="-1">${t.q}</div>` +
      `<p class="task-type">${TYPE_NAMES[t.type]}</p>` + figHTML(t.fig) + inputsHTML(tv) + hintsHTML(tv) + msg + actions + feedbackHTML(tv, o.id + '-fb') +
      (o.origin ? `<p class="origin">${o.origin}</p>` : '') + '</article>';
  }

  // =====================================================================
  // УРОК
  // =====================================================================
  function openLesson(id) {
    const l = LBY[id]; if (!l || !isUnlocked(l)) return;
    const steps = [];
    if (l.challenge) { steps.push({ k: 'intro' }); l.tasks.forEach((_, i) => steps.push({ k: 'task', i })); }
    else { l.screens.forEach((_, i) => steps.push({ k: 'screen', i })); steps.push({ k: 'example' }); l.tasks.forEach((_, i) => steps.push({ k: 'task', i })); }
    steps.push({ k: 'final' });
    const pos = state.pos[id];
    ctx = {
      mode: 'lesson', lesson: l, steps, i: pos ? Math.min(pos.i + (pos.a ? 1 : 0), steps.length - 1) : 0,
      ch: pos && pos.ch ? pos.ch : { hints: 0, shown: 0 },
      counts: pos && pos.counts ? pos.counts : { self: 0, hint: 0, shown: 0 },
      xp: pos && pos.xp ? pos.xp : 0, replay: !!state.done[id], exN: 1, main: null, sim: null, finished: false
    };
    view = { name: 'lesson' };
    enterStep();
  }
  function savePos() {
    if (!ctx || ctx.mode !== 'lesson' || ctx.finished) return;
    state.pos[ctx.lesson.id] = { i: ctx.i, ch: ctx.ch, counts: ctx.counts, xp: ctx.xp, a: !!ctx.answered };
    save();
  }
  function enterStep() {
    const s = ctx.steps[ctx.i];
    ctx.main = null; ctx.sim = null; ctx.exN = 1; ctx.answered = false;
    if (s.k === 'task') { ctx.taskId = ctx.lesson.id + '.' + s.i; ctx.main = newTV(ctx.lesson.tasks[s.i], ctx.lesson.challenge ? 'challenge' : 'lesson'); }
    if (s.k === 'final') finishLesson(); else savePos();
    render(true);
  }
  function finishLesson() {
    if (ctx.finished) return;
    ctx.finished = true;
    const l = ctx.lesson, first = !state.done[l.id];
    ctx.first = first; ctx.bonus = 0; ctx.rankUp = false;
    delete state.pos[l.id];
    if (first) {
      const before = rankIdx();
      ctx.bonus = l.challenge ? Math.max(10, 50 - 5 * ctx.ch.hints - 10 * ctx.ch.shown) : 20;
      state.done[l.id] = { at: today() };
      addXP(ctx.bonus);
      ctx.rankUp = rankIdx() > before;
    }
    markActive(); save();
  }
  function settleMain(tv, result) {
    const id = ctx.taskId;
    ctx.counts[result]++; ctx.answered = true;
    if (!state.tasks[id]) {
      const first = result !== 'shown' && tv.attempts <= 1 && tv.hints === 0;
      state.tasks[id] = { st: result, first };
      if (!ctx.lesson.challenge && !ctx.replay) {
        const g = result === 'shown' ? 0 : first ? 10 : 5;
        if (g) { tv.gained = g; ctx.xp += g; addXP(g); }
      }
    }
    save(); savePos();
  }

  function lessonHTML() {
    const l = ctx.lesson, s = ctx.steps[ctx.i], n = ctx.steps.length;
    const pct = (ctx.i / (n - 1) * 100).toFixed(1);
    const tasksN = l.tasks.length;
    let phase = '', body = '';
    const backBtn = ctx.i > 0 && (s.k === 'screen' || s.k === 'example') ? `<button type="button" class="btn ghost" data-act="back">Назад</button>` : '';

    if (s.k === 'screen') {
      const sc = l.screens[s.i];
      phase = `Объяснение · экран ${s.i + 1} из ${l.screens.length}`;
      body = `<article class="card"><h1>${sc.h}</h1><div class="content">${sc.t}</div>${figHTML(sc.fig)}</article><div class="actions">${backBtn}<button type="button" class="btn" data-act="next" data-fid="next">Дальше${icon('arrow-right')}</button></div>`;
    } else if (s.k === 'example') {
      const ex = l.example, all = ctx.exN >= ex.steps.length;
      phase = 'Разобранный пример';
      const steps = ex.steps.slice(0, ctx.exN).map((st, i) => `<li class="${/идея|замечаем/i.test(st[0]) ? 'idea' : ''}" ${i === ctx.exN - 1 ? 'id="ex-last" tabindex="-1"' : ''}><span class="st">${st[0]}</span><div class="content">${st[1]}</div></li>`).join('');
      body = `<article class="card"><p class="eyebrow">Разбираем вместе</p><h1>Пример</h1><div class="q content">${ex.task}</div>${figHTML(ex.fig)}<ol class="ex-steps">${steps}</ol><p class="origin">${originLabel(l.id + '.ex')}</p></article>` +
        `<div class="actions">${backBtn}${all ? `<button type="button" class="btn" data-act="next" data-fid="next">К тренировке${icon('arrow-right')}</button>` : `<button type="button" class="btn" data-act="exnext" data-fid="exnext">Следующий шаг (${ctx.exN} из ${ex.steps.length})</button>`}</div>`;
    } else if (s.k === 'intro') {
      phase = 'Испытание · условие';
      body = `<article class="card"><p class="eyebrow">${l.sec.id === 3 ? 'Испытание модуля' : 'Испытание раздела ' + l.sec.id}</p><h1>${l.title}</h1><div class="q content">${l.intro.task}</div>${figHTML(l.intro.fig)}<p class="origin">${originLabel(l.id + '.in')}</p></article>` +
        `<article class="card"><h2>Как устроено испытание</h2><div class="content"><p>${l.intro.note}</p><ul class="plain"><li>Задача разбита на ${tasksN} ${plural(tasksN, ['шаг', 'шага', 'шагов'])}. Каждый шаг проверяется.</li><li>За испытание даётся до 50 XP. Подсказка уменьшает итог на 5, показанное решение — на 10, но меньше 10 XP не будет.</li><li>В конце — полное решение в чистовом виде.</li></ul></div></article>` +
        `<div class="actions"><button type="button" class="btn" data-act="next" data-fid="next">Начать испытание${icon('arrow-right')}</button></div>`;
    } else if (s.k === 'task') {
      const t = l.tasks[s.i];
      phase = l.challenge ? `Испытание · шаг ${s.i + 1} из ${tasksN}` : `Тренировка · задание ${s.i + 1} из ${tasksN}`;
      const fid = ctx.sim ? 'none' : 'task-fb';
      body = (l.challenge ? `<details class="more card"><summary>Условие всей задачи</summary><div class="content">${l.intro.task}</div></details>` : '') +
        taskCardHTML(ctx.main, { id: 'task', head: t.lead || '', origin: l.challenge ? '' : originLabel(ctx.taskId), fid }) +
        (ctx.sim ? taskCardHTML(ctx.sim, { id: 'sim', cls: 'simcard', head: 'Похожая задача', origin: 'Авторская учебная задача. За верный ответ +5 XP' }) : '');
    } else {
      phase = 'Итог';
      body = finalHTML();
    }

    return `<div class="wrap"><div class="lesson sec-${l.sec.id}">` +
      `<div class="l-top"><button type="button" class="btn ghost sm" data-act="pause">${icon('pause')}Пауза</button><div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}" aria-label="Прогресс урока"><i style="width:${pct}%"></i></div><span class="cnt">${ctx.i + 1}/${n}</span></div>` +
      `<p class="phase"><span class="tag ${l.challenge ? 'warn' : 'ok'}">Раздел ${l.sec.id} · ${l.challenge ? 'испытание' : 'урок ' + l.n}</span><span>${phase}</span>${ctx.replay && s.k !== 'final' ? '<span class="tag">повторение</span>' : ''}</p>` +
      body + '</div></div>';
  }

  function finalHTML() {
    const l = ctx.lesson, c = ctx.counts, nxt = LESSONS[l.idx + 1];
    const total = ctx.xp + ctx.bonus;
    let top;
    if (l.challenge) {
      top = `<div class="bigicon">${icon('trophy')}</div><h1>Испытание пройдено</h1>` +
        (ctx.first ? `<div class="xpline">${icon('star')}+${ctx.bonus} XP за испытание</div><p class="small muted">Расчёт: 50 − 5 × ${ctx.ch.hints} (${plural(ctx.ch.hints, ['подсказка', 'подсказки', 'подсказок'])}) − 10 × ${ctx.ch.shown} (${plural(ctx.ch.shown, ['показанное решение', 'показанных решения', 'показанных решений'])}), но не меньше 10.</p>` : '<p class="small muted">Это повторное прохождение: XP за повтор не начисляются.</p>');
    } else {
      top = `<div class="bigicon">${icon('circle-check')}</div><h1>Урок пройден</h1>` +
        (ctx.first ? `<div class="xpline">${icon('star')}+${total} XP: ${ctx.xp} за задания и 20 за урок</div>` : '<p class="small muted">Это повторение: XP за повтор не начисляются, зато закрепляется навык.</p>');
    }
    const stats = `<div class="summary-stats"><div class="sstat a"><b>${c.self}</b><span>решено самостоятельно</span></div><div class="sstat b"><b>${c.hint}</b><span>решено с подсказкой</span></div><div class="sstat c"><b>${c.shown}</b><span>разобрано решение</span></div></div>`;
    let rank = '';
    if (ctx.rankUp) rank = `<div class="banner warm">${icon('award')}<div><b>Новое звание: ${RANKS[rankIdx()]}.</b> ${rankIdx() === 3 ? 'Модуль 1 пройден целиком.' : 'Раздел ' + l.sec.id + ' пройден, открыт следующий.'}</div></div>`;
    const sum = `<article class="card"><p class="eyebrow">Главная мысль</p><div class="content"><p><b>${l.summary}</b></p></div></article>`;
    const wr = l.challenge ? `<article class="card"><h2>Полное решение</h2><div class="writeup content">${l.writeup}</div><p class="small muted">Сравни эту запись со своими шагами: в чистовом решении у каждого вывода названа причина.</p></article>` : '';
    const mis = c.shown ? `<p class="small muted">Разобранные задания сохранены в «Моих ошибках». Ошибки — рабочий материал, а не оценка.</p>` : '';
    const end = !nxt && ctx.first ? '<article class="card"><h2>Модуль 1 пройден</h2><div class="content"><p>Теперь знакомы основные идеи: разбор условия, перебор, чётность, остатки, принцип Дирихле, инварианты, принцип крайнего и базовая геометрия. Это основа, на которой строится дальнейшая подготовка. Результат на олимпиаде зависит от многих вещей, поэтому обещать его нельзя — но узнавать эти идеи в задачах и записывать короткое доказательство теперь должно быть проще.</p></div></article>' : '';
    const btns = `<div class="actions">${nxt ? `<button type="button" class="btn ghost" data-act="go" data-to="home">На карту</button><button type="button" class="btn" data-act="lesson" data-id="${nxt.id}" data-fid="next">Следующий урок${icon('arrow-right')}</button>` : `<button type="button" class="btn" data-act="go" data-to="home" data-fid="next">На карту</button>`}</div>`;
    return rank + `<article class="card">${top}${stats}${mis}</article>` + sum + wr + end + btns;
  }

  // =====================================================================
  // ТРЕНИРОВКА ОШИБОК
  // =====================================================================
  function startTraining() {
    if (!state.mistakes.length) { go('mistakes'); return; }
    const q = state.mistakes.slice().sort((a, b) => a.streak - b.streak || (a.at < b.at ? -1 : 1)).slice(0, 6).map((m) => m.id);
    ctx = { mode: 'train', queue: q, i: 0, okN: 0, closed: 0, main: null, sim: null, done: false };
    state.lastTraining = today(); save();
    view = { name: 'train' };
    trainEnter();
  }
  function trainEnter() {
    while (ctx.i < ctx.queue.length) {
      const m = state.mistakes.find((x) => x.id === ctx.queue[ctx.i]); const f = m && findTask(m.id);
      if (m && f) {
        const useSim = f.task.sim && m.tries % 2 === 0;
        ctx.m = m; ctx.src = f; ctx.variant = useSim ? 'sim' : 'orig';
        ctx.main = newTV(useSim ? f.task.sim : f.task, 'train');
        render(true); return;
      }
      ctx.i++;
    }
    ctx.done = true; ctx.main = null; render(true);
  }
  function settleTrain(tv, ok) {
    const m = ctx.m; m.tries++;
    if (ok) {
      m.streak++; tv.st = 'right'; tv.streakNow = m.streak; tv.gained = 5; ctx.okN++;
      if (m.streak >= 2) { state.mistakes = state.mistakes.filter((x) => x !== m); ctx.closed++; tv.closed = true; }
      addXP(5);
    } else { m.streak = 0; tv.st = 'shown'; }
    markActive(); save();
    render(false, '#task-fb');
  }
  function trainHTML() {
    if (ctx.done) {
      const left = state.mistakes.length, n = ctx.queue.length;
      return `<div class="wrap"><div class="lesson"><article class="card"><div class="bigicon">${icon('dumbbell')}</div><h1>Тренировка завершена</h1><div class="summary-stats"><div class="sstat a"><b>${ctx.okN}</b><span>верно из ${n}</span></div><div class="sstat b"><b>${ctx.closed}</b><span>${plural(ctx.closed, ['ошибка закрыта', 'ошибки закрыты', 'ошибок закрыто'])}</span></div><div class="sstat c"><b>${left}</b><span>осталось в списке</span></div></div><p>${left ? 'Задание уходит из списка после двух верных решений подряд, поэтому часть заданий встретится ещё раз — в другом виде.' : 'Список ошибок пуст. Это результат работы, а не везения.'}</p></article><div class="actions"><button type="button" class="btn ghost" data-act="go" data-to="home">На карту</button>${left ? `<button type="button" class="btn" data-act="train" data-fid="next">Ещё один круг</button>` : ''}</div></div></div>`;
    }
    const n = ctx.queue.length, l = ctx.src.lesson;
    const pct = (ctx.i / n * 100).toFixed(1);
    return `<div class="wrap"><div class="lesson sec-${l.sec.id}">` +
      `<div class="l-top"><button type="button" class="btn ghost sm" data-act="go" data-to="mistakes">${icon('x')}Закончить</button><div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}" aria-label="Прогресс тренировки"><i style="width:${pct}%"></i></div><span class="cnt">${ctx.i + 1}/${n}</span></div>` +
      `<p class="phase"><span class="tag blue">Тренировка ошибок</span><span>${l.challenge ? lname(l) : TOPICS[l.topic] + ' · ' + lname(l)}</span></p><h1 class="sr-only">Тренировка ошибок, задание ${ctx.i + 1} из ${n}</h1>` +
      taskCardHTML(ctx.main, { id: 'task', head: ctx.variant === 'sim' ? 'Похожая задача — в изменённом виде' : 'То же задание — ещё раз', origin: 'Без подсказок: одна попытка. За верный ответ +5 XP' }) +
      '</div></div>';
  }

  // =====================================================================
  // МОИ ОШИБКИ
  // =====================================================================
  function mistakesHTML() {
    const ms = state.mistakes;
    let list;
    if (!ms.length) {
      list = `<div class="card empty"><div class="bigicon">${icon('circle-check')}</div><h2>Список пуст</h2><p class="muted">Когда в уроке встретится ошибка или будет открыто решение, задание появится здесь. Ошибки — обычная часть учёбы: по ним видно, что стоит повторить.</p><div class="row" style="justify-content:center"><button class="btn" data-act="go" data-to="home">К урокам</button></div></div>`;
    } else {
      list = '<div class="mist">' + ms.slice().reverse().map((m) => {
        const f = findTask(m.id); if (!f) return '';
        const t = f.task, l = f.lesson;
        return `<article class="card"><div class="head"><span class="tag blue">${TOPICS[l.topic]}</span><span class="tag">${lname(l)}</span><span class="dots" aria-label="Верных решений подряд: ${m.streak} из 2">подряд верно <i class="${m.streak >= 1 ? 'on' : ''}"></i><i class="${m.streak >= 2 ? 'on' : ''}"></i></span></div>` +
          `<div class="q content">${t.q}</div>${figHTML(t.fig)}` +
          `<div class="kv"><div class="mine content"><b class="k">Мой ответ</b>${m.ans}</div></div>` +
          `<details class="more"><summary>Верный ответ и объяснение</summary><div class="kv"><div class="right content"><b class="k">${t.type === 'text' ? 'Образец ответа' : 'Верный ответ'}</b>${correctHTML(t)}</div>${t.ex ? `<div class="why content"><b class="k">Объяснение</b>${t.ex}</div>` : ''}</div></details></article>`;
      }).join('') + '</div>';
    }
    return `<div class="wrap"><div class="lesson"><h1>Мои ошибки</h1><p class="muted">Здесь собраны задания, где ответ не сошёлся или было открыто решение. Задание уходит из списка после двух верных решений подряд в тренировке.</p>` +
      (ms.length ? `<div class="banner ${needTraining() ? 'warm' : ''}">${icon('dumbbell')}<div><b>${needTraining() ? 'Пора потренироваться.' : 'Тренировка ошибок.'}</b> До шести заданий за раз, в немного изменённом виде: похожая задача или то же задание с другим порядком ответов.<div class="row"><button class="btn sm" data-act="train">${icon('play')}Тренировка ошибок (${ms.length})</button></div></div></div>` : '') +
      list + '</div></div>';
  }

  // =====================================================================
  // ПРОФИЛЬ
  // =====================================================================
  function profileHTML() {
    const tk = Object.keys(state.tasks).map((id) => ({ id, r: state.tasks[id], f: findTask(id) })).filter((x) => x.f);
    const self = tk.filter((x) => x.r.st === 'self').length, hint = tk.filter((x) => x.r.st === 'hint').length, shown = tk.filter((x) => x.r.st === 'shown').length;
    const solved = self + hint, first = tk.filter((x) => x.r.first).length, all = tk.length;
    const rk = rankIdx(), dn = doneCount(), s = shownStreak();
    const days = Object.keys(state.days).length;
    const pctOf = (a) => all ? Math.round(a / all * 100) : 0;

    const ranks = RANKS.map((r, i) => `<li class="${i <= rk ? 'on' : ''} ${i === rk ? 'now' : ''}">${icon(i <= rk ? 'award' : 'lock')}${r}<span>${i === 0 ? 'с самого начала' : 'после раздела ' + i}</span></li>`).join('');

    const byTopic = {};
    tk.forEach((x) => { const tp = x.f.lesson.topic; (byTopic[tp] = byTopic[tp] || { n: 0, ok: 0 }); byTopic[tp].n++; if (x.r.first) byTopic[tp].ok++; });
    const rows = Object.keys(byTopic).map((k) => ({ k, n: byTopic[k].n, ok: byTopic[k].ok, p: Math.round(byTopic[k].ok / byTopic[k].n * 100) })).sort((a, b) => a.p - b.p);
    const chart = rows.length ? '<div class="chart">' + rows.map((r, i) => {
      const weak = r.p < 70 && r.n >= 3;
      return `<div class="rowc ${weak ? 'weak' : ''}"><b>${TOPICS[r.k]}${weak ? ' <span class="tag warn">стоит повторить</span>' : ''}</b><span class="v">${r.ok} из ${r.n} · ${r.p}%</span><div class="bar" role="img" aria-label="${TOPICS[r.k]}: ${r.p}% с первой попытки"><i style="width:${Math.max(r.p, 2)}%"></i></div></div>`;
    }).join('') + '</div><p class="small muted">Полоска — доля заданий темы, решённых с первой попытки без подсказок. Короткие полоски показывают, что стоит повторить.</p>'
      : '<p class="muted">Диаграмма появится после первых решённых заданий.</p>';

    const tri = `<div class="tri"><div class="line a"><span>Решено самостоятельно</span><span>${self}</span><div class="bar"><i style="width:${pctOf(self)}%"></i></div></div><div class="line b"><span>Решено с подсказкой</span><span>${hint}</span><div class="bar"><i style="width:${pctOf(hint)}%"></i></div></div><div class="line c"><span>Разобрано решение</span><span>${shown}</span><div class="bar"><i style="width:${pctOf(shown)}%"></i></div></div></div>`;

    const goals = [10, 20, 30, 50].map((g) => `<button type="button" data-act="goal" data-g="${g}" aria-pressed="${state.goal === g}">${g}</button>`).join('');

    return `<div class="wrap"><h1>Профиль</h1>` +
      `<div class="grid2">` +
      `<section class="card span2"><p class="eyebrow">Звание</p><h2>${RANKS[rk]}</h2><div class="statgrid"><div class="sstat"><b>${state.xp}</b><span>XP всего</span></div><div class="sstat"><b>${dn}/30</b><span>уроков пройдено</span></div><div class="sstat"><b>${s}</b><span>${plural(s, ['день', 'дня', 'дней'])} подряд</span></div><div class="sstat"><b>${days}</b><span>${plural(days, ['учебный день', 'учебных дня', 'учебных дней'])} всего</span></div></div><ul class="ranks">${ranks}</ul></section>` +
      `<section class="card"><h2>Задания</h2><div class="statgrid" style="grid-template-columns:repeat(2,minmax(0,1fr))"><div class="sstat a"><b>${solved}</b><span>задач решено</span></div><div class="sstat"><b>${first}</b><span>с первой попытки${all ? ' · ' + pctOf(first) + '%' : ''}</span></div></div>${tri}<p class="small muted">«С первой попытки» — верный ответ сразу и без подсказок. «Самостоятельно» — без подсказок, возможно со второго захода.</p></section>` +
      `<section class="card"><h2>Слабые и сильные темы</h2>${chart}</section>` +
      `<section class="card"><h2>Настройки</h2>` +
      `<div class="set"><h3>Дневная цель, XP</h3><p class="small muted">Один урок без ошибок даёт примерно 70–80 XP, так что цель в 30 XP — это около половины урока.</p><div class="seg" role="group" aria-label="Дневная цель">${goals}</div></div>` +
      `<div class="set"><h3>Режим «Каникулы»</h3><p class="small muted">Пока режим включён, серия дней не сбрасывается, сколько бы дней ни прошло. Пригодится в поездке или во время болезни.</p><button type="button" class="switch" role="switch" aria-checked="${state.vacation}" data-act="vac"><i></i><span>${state.vacation ? 'Включён' : 'Выключен'}</span></button></div>` +
      `<div class="set"><h3>Копия прогресса</h3><p class="small muted">Прогресс хранится только в этом браузере. Файл с копией поможет перенести его на другое устройство.</p><div class="row"><button type="button" class="btn ghost sm" data-act="export">Сохранить копию в файл</button><label class="btn ghost sm" style="cursor:pointer">Загрузить копию<input type="file" accept="application/json,.json" data-in="import" class="sr-only"></label></div></div>` +
      `<div class="set"><h3>Сброс</h3><p class="small muted">Удаляет уроки, XP, серию и список ошибок на этом устройстве.</p><div><button type="button" class="btn danger sm" data-act="reset">${icon('rotate-ccw')}Сбросить прогресс</button></div></div></section>` +
      `<section class="card"><h2>Как это работает</h2><div class="content"><ul class="tight"><li><b>10 XP</b> — верно с первой попытки без подсказок; <b>5 XP</b> — верно с подсказкой или не с первой попытки; <b>+20 XP</b> — за пройденный урок; <b>до 50 XP</b> — за испытание.</li><li>За ошибки XP не отнимаются. За повтор пройденного урока XP не начисляются.</li><li>Серия считает дни занятий. Пропуск до двух дней подряд серию не обнуляет.</li><li>Текстовые ответы программа не оценивает сама: она показывает образец и список для самопроверки.</li><li>Регистрации нет. Данные никуда не отправляются и лежат в памяти этого браузера. Напоминания показываются только внутри приложения.</li><li>Задачи составлены для этого приложения и помечены как авторские учебные. Известные сюжеты математических кружков (например, про хамелеонов или стаканы) помечены отдельно; конкретным олимпиадам задачи не приписываются.</li><li>Приложение помогает освоить идеи и оформление решений, но не обещает мест и дипломов.</li></ul></div></section>` +
      `</div></div>`;
  }

  function exportProgress() {
    try {
      const blob = new Blob([JSON.stringify(state, null, 1)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'olimpiadnyj-start-progress-' + today() + '.json';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      toast('Копия прогресса сохранена в файл', 'check');
    } catch (e) { toast('Не получилось сохранить файл в этом браузере', 'info'); }
  }
  function importProgress(file) {
    const rd = new FileReader();
    rd.onload = async () => {
      let d = null;
      try { d = JSON.parse(String(rd.result)); } catch (e) { d = null; }
      if (!d || typeof d !== 'object' || typeof d.xp !== 'number' || typeof d.done !== 'object' || !Array.isArray(d.mistakes)) { toast('Это не файл с копией прогресса', 'info'); return; }
      const r = await modal({ title: 'Загрузить копию прогресса?', body: '<p>Текущий прогресс на этом устройстве будет заменён данными из файла.</p>', actions: [{ label: 'Отмена', cls: 'ghost', value: null }, { label: 'Загрузить', value: 'ok' }] });
      if (r !== 'ok') return;
      state = Object.assign(defaults(), d); save(); toast('Прогресс загружен', 'check'); go('profile');
    };
    rd.readAsText(file);
  }

  // =====================================================================
  // ДЕЙСТВИЯ
  // =====================================================================
  const active = () => (ctx ? (ctx.sim || ctx.main) : null);
  const activeId = () => (ctx && ctx.sim ? 'sim' : 'task');
  function rerenderTask(focus) { render(false, focus); }

  function onCheck() {
    const tv = active(); if (!tv || tv.st !== 'ask') return;
    const t = tv.task, cid = activeId();
    tv.msg = '';
    if (t.type === 'text') {
      if (!ready(tv)) { tv.msg = 'Сначала запиши свой ответ — хотя бы одну фразу.'; return rerenderTask('#msg'); }
      tv.st = 'self'; markActive(); save(); return rerenderTask('#' + cid + '-fb');
    }
    if (!ready(tv)) { tv.msg = t.type === 'fill' ? 'Заполни все пропуски.' : t.type === 'num' ? 'Впиши число в поле ответа.' : 'Сначала выбери ответ.'; return rerenderTask('#msg'); }
    if (t.type === 'num' && isNaN(parseNum(tv.val))) { tv.msg = 'Здесь нужно число, например 12 или 5,5.'; return rerenderTask('#msg'); }
    if (t.type === 'fill' && gapsOf(t).some((g, i) => g.gap === 'num' && isNaN(parseNum(tv.vals[i])))) { tv.msg = 'В числовые пропуски нужно вписать числа.'; return rerenderTask('#msg'); }
    tv.attempts++; markActive();
    const ok = isCorrect(tv);
    if (tv.mode === 'train') return settleTrain(tv, ok);
    if (tv.mode === 'sim') {
      tv.st = ok ? 'right' : 'shown';
      const rec = state.tasks[ctx.taskId];
      if (ok && rec && !rec.sim) { rec.sim = true; tv.gained = 5; ctx.xp += 5; addXP(5); }
      save(); savePos(); return rerenderTask('#sim-fb');
    }
    if (ok) { tv.st = 'right'; tv.wrong = false; settleMain(tv, tv.hints ? 'hint' : 'self'); }
    else {
      if (tv.attempts === 1) recordMistake(ctx.taskId, ansHTML(tv));
      if (t.type === 'tf') { tv.st = 'shown'; tv.auto = true; settleMain(tv, 'shown'); }
      else tv.wrong = true;
    }
    save();
    rerenderTask('#task-fb');
  }
  async function onShow() {
    const tv = active(); if (!tv || tv.st !== 'ask') return;
    if (tv.mode === 'challenge') {
      const r = await modal({ title: 'Показать решение этого шага?', body: '<p>Итог испытания уменьшится на 10 очков. Возможно, стоит сначала попробовать ещё раз — подсказки уже открыты.</p>', actions: [{ label: 'Попробую ещё', cls: 'ghost', value: null }, { label: 'Показать решение', value: 'ok' }] });
      if (r !== 'ok') return;
      ctx.ch.shown++;
    }
    if (tv.attempts === 0 || tv.task.type === 'text') recordMistake(ctx.taskId, tv.task.type === 'text' && tv.val.trim() ? esc(tv.val) : '<i>Решение открыто без ответа</i>');
    tv.st = 'shown'; tv.wrong = false; markActive();
    settleMain(tv, 'shown');
    rerenderTask('#task-fb');
  }
  function clearWrong(tv) {
    if (tv.wrong || tv.msg) {
      tv.wrong = false; tv.msg = '';
      const fb = $('#' + activeId() + '-fb'); if (fb) fb.remove();
      const mg = $('#msg'); if (mg) mg.remove();
      document.querySelectorAll('.in.wrong').forEach((e) => e.classList.remove('wrong'));
    }
  }

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
    const act = b.dataset.act, tv = active();
    switch (act) {
      case 'go': go(b.dataset.to); break;
      case 'home': go('home'); break;
      case 'lesson': openLesson(b.dataset.id); break;
      case 'node': nodeSheet(b.dataset.id); break;
      case 'train': startTraining(); break;
      case 'pick': {
        if (!tv || tv.st !== 'ask') break;
        const t = tv.task, i = +b.dataset.i;
        if (t.type === 'multi') { const k = tv.sel.indexOf(i); if (k >= 0) tv.sel.splice(k, 1); else tv.sel.push(i); }
        else if (t.type === 'tf') tv.sel = i === 1;
        else tv.sel = i;
        tv.wrong = false; tv.msg = '';
        render(false, `#${activeId()} [data-fid="${b.dataset.fid}"]`);
        break;
      }
      case 'mv': {
        if (!tv || tv.st !== 'ask') break;
        const p = +b.dataset.p, d = +b.dataset.d, q = p + d;
        if (q < 0 || q >= tv.perm.length) break;
        const x = tv.perm[p]; tv.perm[p] = tv.perm[q]; tv.perm[q] = x;
        tv.wrong = false; tv.msg = '';
        const stillOk = (d < 0 && q > 0) || (d > 0 && q < tv.perm.length - 1);
        render(false, `#${activeId()} [data-fid="${stillOk ? (d < 0 ? 'u' : 'd') + q : (d < 0 ? 'd' : 'u') + q}"]`);
        break;
      }
      case 'check': onCheck(); break;
      case 'hint': {
        if (!tv || tv.st !== 'ask' || tv.hints >= 2) break;
        tv.hints++; tv.msg = '';
        if (tv.mode === 'challenge') { ctx.ch.hints++; savePos(); }
        markActive(); save();
        render(false, '#hints');
        break;
      }
      case 'show': onShow(); break;
      case 'sim': ctx.sim = newTV(ctx.main.task.sim, 'sim'); render(false, '#sim-q'); break;
      case 'selfok': {
        if (!tv || tv.st !== 'self') break;
        tv.attempts = 1;
        if (tv.mode === 'train') { settleTrain(tv, true); break; }
        tv.st = 'right'; settleMain(tv, tv.hints ? 'hint' : 'self'); render(false, '#task-fb'); break;
      }
      case 'selfgap': {
        if (!tv || tv.st !== 'self') break;
        tv.attempts = 1; tv.gap = true;
        if (tv.mode === 'train') { settleTrain(tv, false); break; }
        recordMistake(ctx.taskId, esc(tv.val)); tv.st = 'shown'; settleMain(tv, 'shown'); render(false, '#task-fb'); break;
      }
      case 'next': {
        if (!ctx) break;
        if (ctx.mode === 'train') { ctx.i++; trainEnter(); break; }
        if (ctx.i < ctx.steps.length - 1) { ctx.i++; enterStep(); }
        break;
      }
      case 'back': if (ctx && ctx.i > 0) { ctx.i--; enterStep(); } break;
      case 'exnext': ctx.exN++; render(false, '#ex-last'); break;
      case 'pause': {
        savePos();
        modal({ title: 'Пауза', body: '<p>Прогресс урока сохранён. Можно отдохнуть и вернуться позже — урок продолжится с этого же шага.</p>', actions: [{ label: 'Продолжить урок', value: null }, { label: 'Выйти на карту', cls: 'ghost', value: 'exit' }] })
          .then((r) => { if (r === 'exit') go('home'); });
        break;
      }
      case 'goal': state.goal = +b.dataset.g; save(); render(false, `[data-act="goal"][data-g="${state.goal}"]`); toast('Дневная цель: ' + state.goal + ' XP', 'target'); break;
      case 'vac': {
        state.vacation = !state.vacation;
        if (!state.vacation && state.streak > 0 && state.lastDay && dayDiff(state.lastDay, today()) > 3) { const y = new Date(); y.setDate(y.getDate() - 1); state.lastDay = ymd(y); }
        save(); render(false, '[data-act="vac"]');
        toast(state.vacation ? 'Каникулы включены: серия на паузе' : 'Каникулы выключены', 'tree-palm');
        break;
      }
      case 'export': exportProgress(); break;
      case 'reset': {
        modal({ title: 'Сбросить весь прогресс?', body: '<p>Будут удалены пройденные уроки, XP, серия и список ошибок на этом устройстве. Отменить это действие нельзя.</p>', focus: 0, actions: [{ label: 'Отмена', cls: 'ghost', value: null }, { label: 'Да, сбросить', cls: 'danger', value: 'ok' }] })
          .then((r) => { if (r === 'ok') { state = defaults(); state.lastVisit = today(); save(); welcomeBack = false; go('home'); toast('Прогресс сброшен', 'rotate-ccw'); } });
        break;
      }
    }
  });

  document.addEventListener('input', (e) => {
    const el = e.target, k = el.dataset ? el.dataset.in : null; if (!k) return;
    const tv = active();
    if (k === 'import') { if (el.files && el.files[0]) importProgress(el.files[0]); el.value = ''; return; }
    if (!tv || tv.st !== 'ask') return;
    if (k === 'num' || k === 'text') tv.val = el.value;
    else if (k === 'gap') tv.vals[+el.dataset.g] = el.value;
    clearWrong(tv);
  });
  document.addEventListener('change', (e) => {
    const el = e.target; if (!el.dataset || el.dataset.in !== 'gap') return;
    const tv = active(); if (!tv || tv.st !== 'ask') return;
    tv.vals[+el.dataset.g] = el.value; clearWrong(tv);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const el = e.target; if (!el.dataset) return;
    if (el.dataset.in === 'num' || (el.dataset.in === 'gap' && el.tagName === 'INPUT')) { e.preventDefault(); onCheck(); }
  });
  window.addEventListener('pagehide', () => { savePos(); save(); });

  // ---------- запуск ----------
  (function init() {
    const t = today();
    if (state.lastVisit && dayDiff(state.lastVisit, t) > 2 && doneCount() > 0) welcomeBack = true;
    state.lastVisit = t; save();
    render(true);
  })();
})();

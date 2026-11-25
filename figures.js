/* Чертежи и схемы (SVG). window.FIGS[name]() -> строка SVG, window.FIG_CAP[name] -> подпись. */
(function () {
  const r1 = (v) => Math.round(v * 10) / 10;
  const rad = (d) => (d * Math.PI) / 180;
  const svg = (w, h, body, label) =>
    `<svg class="fig" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label || 'Схема'}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
  const line = (x1, y1, x2, y2, cls) => `<line x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}" class="${cls || 'f-l'}"/>`;
  const txt = (x, y, s, cls, anchor) => `<text x="${r1(x)}" y="${r1(y)}" class="${cls || 'f-t'}" text-anchor="${anchor || 'middle'}">${s}</text>`;
  const dot = (x, y, r, cls) => `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r || 3.5}" class="${cls || 'f-dot'}"/>`;
  const poly = (pts, cls) => `<polygon points="${pts.map((p) => r1(p[0]) + ',' + r1(p[1])).join(' ')}" class="${cls || 'f-shape'}"/>`;
  const rect = (x, y, w, h, cls, rx) => `<rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" rx="${rx || 0}" class="${cls || 'f-shape'}"/>`;
  // точка на луче из (cx, cy) под углом a (градусы, против часовой стрелки)
  const pt = (cx, cy, r, a) => [cx + r * Math.cos(rad(a)), cy - r * Math.sin(rad(a))];
  const arc = (cx, cy, r, a1, a2, cls) => {
    const p1 = pt(cx, cy, r, a1), p2 = pt(cx, cy, r, a2);
    const large = a2 - a1 > 180 ? 1 : 0;
    return `<path d="M${r1(p1[0])} ${r1(p1[1])} A${r} ${r} 0 ${large} 0 ${r1(p2[0])} ${r1(p2[1])}" class="${cls || 'f-arc'}"/>`;
  };
  const sector = (cx, cy, r, a1, a2, cls) => {
    const p1 = pt(cx, cy, r, a1), p2 = pt(cx, cy, r, a2);
    const large = a2 - a1 > 180 ? 1 : 0;
    return `<path d="M${r1(cx)} ${r1(cy)} L${r1(p1[0])} ${r1(p1[1])} A${r} ${r} 0 ${large} 0 ${r1(p2[0])} ${r1(p2[1])} Z" class="${cls || 'f-sec-a'}"/>`;
  };
  // штрих на отрезке (отметка равных отрезков)
  const tick = (x1, y1, x2, y2, n) => {
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
    const ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
    let out = '';
    const k = n || 1;
    for (let i = 0; i < k; i++) {
      const off = (i - (k - 1) / 2) * 5;
      const cx = mx + ux * off, cy = my + uy * off;
      out += line(cx - nx * 6, cy - ny * 6, cx + nx * 6, cy + ny * 6, 'f-tick');
    }
    return out;
  };

  // ---------- клетчатая бумага ----------
  function gridFig(cols, rows, draw, label, cell) {
    const c = cell || 34, pad = 16;
    const W = cols * c + pad * 2, H = rows * c + pad * 2;
    const X = (x) => pad + x * c, Y = (y) => pad + (rows - y) * c;
    let g = '';
    for (let i = 0; i <= cols; i++) g += line(X(i), Y(0), X(i), Y(rows), 'f-grid');
    for (let j = 0; j <= rows; j++) g += line(X(0), Y(j), X(cols), Y(j), 'f-grid');
    const api = {
      X, Y, c,
      P: (pts) => pts.map((p) => [X(p[0]), Y(p[1])]),
      poly: (pts, cls) => poly(pts.map((p) => [X(p[0]), Y(p[1])]), cls),
      seg: (a, b, cls) => line(X(a[0]), Y(a[1]), X(b[0]), Y(b[1]), cls),
      dots: (pts) => pts.map((p) => dot(X(p[0]), Y(p[1]), 3.5)).join('')
    };
    return svg(W, H, g + draw(api), label);
  }
  const gridPolyFig = (cols, rows, pts, label) =>
    gridFig(cols, rows, (g) => g.poly(pts, 'f-shape-a') + g.dots(pts), label);

  function board(opts) {
    const c = 40, pad = 10, n = 5;
    let b = '';
    for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) {
      const dark = (r + k) % 2 === 0;
      const cut = opts.cut && opts.cut[0] === r && opts.cut[1] === k;
      let cls = opts.color ? (dark ? 'f-cell-d' : 'f-cell-l') : 'f-cell-l';
      if (cut) cls = 'f-cell-cut';
      b += rect(pad + k * c, pad + r * c, c, c, cls);
      if (cut) b += line(pad + k * c + 8, pad + r * c + 8, pad + k * c + c - 8, pad + r * c + c - 8, 'f-cutx') + line(pad + k * c + c - 8, pad + r * c + 8, pad + k * c + 8, pad + r * c + c - 8, 'f-cutx');
    }
    if (opts.extra) b += opts.extra(pad, c);
    return svg(n * c + pad * 2, n * c + pad * 2, b, opts.label);
  }

  const F = {};
  const CAP = {};

  // ================= Раздел 1 =================
  F.euler = () => svg(340, 190,
    `<circle cx="122" cy="95" r="82" class="f-ring-a"/><circle cx="218" cy="95" r="82" class="f-ring-b"/>` +
    txt(86, 90, 'только', 'f-ts') + txt(86, 107, 'математика', 'f-ts') +
    txt(170, 100, 'оба', 'f-tb') +
    txt(254, 90, 'только', 'f-ts') + txt(254, 107, 'шахматы', 'f-ts'),
    'Два пересекающихся круга: математический кружок и шахматный кружок');
  CAP.euler = 'Общая часть кругов — те, кто ходит в оба кружка. При сложении списков они посчитаны дважды.';

  F.handshake = () => {
    const names = ['А', 'Б', 'В', 'Г', 'Д'];
    const pts = names.map((_, i) => pt(170, 100, 72, 90 - i * 72));
    let b = '';
    for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) b += line(pts[i][0], pts[i][1], pts[j][0], pts[j][1], 'f-l-thin');
    pts.forEach((p, i) => {
      const o = pt(170, 100, 92, 90 - i * 72);
      b += dot(p[0], p[1], 6, 'f-dot-a') + txt(o[0], o[1] + 5, names[i], 'f-tb');
    });
    return svg(340, 200, b, 'Пять точек, каждая соединена с каждой: десять линий');
  };
  CAP.handshake = 'Пять человек — пять точек. Каждая линия — одно рукопожатие, всего 10 линий.';

  F.tree = () => {
    let b = '';
    const top = [170, 18];
    const l1 = [[60, 62], [170, 62], [280, 62]];
    const digits = ['1', '2', '3'];
    b += dot(top[0], top[1], 4, 'f-dot');
    l1.forEach((p, i) => {
      b += line(top[0], top[1], p[0], p[1] - 14, 'f-l-thin');
      b += `<circle cx="${p[0]}" cy="${p[1]}" r="14" class="f-node-a"/>` + txt(p[0], p[1] + 5, digits[i], 'f-tb');
      const rest = digits.filter((d) => d !== digits[i]);
      rest.forEach((d, k) => {
        const x = p[0] + (k === 0 ? -28 : 28), y = 116;
        b += line(p[0], p[1] + 14, x, y - 13, 'f-l-thin');
        b += `<circle cx="${x}" cy="${y}" r="13" class="f-node-b"/>` + txt(x, y + 5, d, 'f-tb');
        const last = rest[1 - k];
        b += line(x, y + 13, x, 150, 'f-l-thin');
        b += `<circle cx="${x}" cy="163" r="13" class="f-node-c"/>` + txt(x, 168, last, 'f-tb');
        b += txt(x, 200, digits[i] + d + last, 'f-ts');
      });
    });
    return svg(340, 210, b, 'Дерево вариантов для трёхзначных чисел из цифр 1, 2, 3');
  };
  CAP.tree = 'Каждый путь сверху вниз — одно число. Путей 3 · 2 · 1 = 6.';

  F.tableWho = () => {
    const cols = ['', 'кошка', 'собака', 'попугай'], rows = ['Аня', 'Боря', 'Вера'];
    const w0 = 66, w = 84, h = 36, x0 = 6, y0 = 6;
    const marks = { '0-1': '−', '1-0': '−', '1-1': '−' };
    let b = '';
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      const x = x0 + (c === 0 ? 0 : w0 + (c - 1) * w), ww = c === 0 ? w0 : w, y = y0 + r * h;
      b += rect(x, y, ww, h, r === 0 || c === 0 ? 'f-cell-h' : 'f-cell-l');
      let s = '';
      if (r === 0) s = cols[c]; else if (c === 0) s = rows[r - 1]; else s = marks[(r - 1) + '-' + (c - 1)] || '';
      if (s) b += txt(x + ww / 2, y + h / 2 + 5, s, r === 0 || c === 0 ? 'f-ts' : 'f-tb');
    }
    return svg(x0 * 2 + w0 + 3 * w, y0 * 2 + 4 * h, b, 'Таблица: Аня, Боря, Вера и животные. Отмечены клетки «нет» из условия');
  };
  CAP.tableWho = 'В таблицу занесены условия: у Ани не собака, у Бори не собака и не кошка.';

  F.segments = () => {
    let b = '';
    b += txt(8, 43, 'Вася', 'f-ts', 'start') + rect(62, 28, 170, 22, 'f-bar-a', 4);
    b += txt(8, 93, 'Петя', 'f-ts', 'start') + rect(62, 78, 170, 22, 'f-bar-a', 4) + rect(232, 78, 56, 22, 'f-bar-c', 4);
    b += txt(260, 94, '6', 'f-tb');
    b += `<path d="M300 28 q12 0 12 12 v12 q0 12 10 12 q-10 0 -10 12 v12 q0 12 -12 12" class="f-arc"/>`;
    b += txt(330, 60, 'вместе', 'f-ts', 'start') + txt(330, 78, '40', 'f-tb', 'start');
    return svg(390, 126, b, 'Схема из отрезков: у Пети на 6 марок больше, вместе 40');
  };
  CAP.segments = 'Если убрать «лишние» 6 марок, останутся два равных отрезка.';

  const pairRow = (x0, y, n, hl) => {
    let b = '';
    for (let i = 0; i < n; i++) {
      const x = x0 + i * 26 + Math.floor(i / 2) * 14;
      const lone = n % 2 === 1 && i === n - 1;
      if (i % 2 === 0 && !lone) b += rect(x - 12, y - 14, 50, 28, 'f-pair', 14);
      b += dot(x, y, 8, lone && hl ? 'f-dot-c' : 'f-dot-a');
    }
    return b;
  };
  F.pairs = () => svg(340, 130,
    pairRow(28, 34, 8, true) + txt(318, 39, '8', 'f-tb') +
    pairRow(28, 92, 7, true) + txt(318, 97, '7', 'f-tb'),
    'Восемь точек разбиты на пары; у семи точек одна осталась без пары');
  CAP.pairs = 'Восемь предметов разбились на пары. Из семи один остался без пары.';

  F.pairs2 = () => {
    let b = pairRow(24, 50, 5, true) + pairRow(214, 50, 3, true);
    b += txt(176, 56, '+', 'f-tb');
    // одиночки: x для 5 -> i=4: 24+4*26+2*14=156 ; для 3 -> i=2: 214+52+14=280
    b += `<path d="M156 62 Q218 122 280 62" class="f-arc-c"/>`;
    b += txt(218, 116, 'новая пара', 'f-ts');
    return svg(340, 130, b, 'Пять и три точки: два предмета без пары образуют новую пару');
  };
  CAP.pairs2 = '5 + 3: у каждого нечётного числа один предмет без пары, вместе они дают пару. Сумма чётна.';

  // ================= Раздел 2 =================
  F.remdots = () => {
    let b = '';
    for (let g = 0; g < 3; g++) {
      const x0 = 14 + g * 96;
      b += rect(x0, 16, 86, 34, 'f-pair', 17);
      for (let i = 0; i < 5; i++) b += dot(x0 + 13 + i * 15, 33, 5.5, 'f-dot-a');
    }
    b += dot(318, 33, 5.5, 'f-dot-c') + dot(336, 33, 5.5, 'f-dot-c');
    b += txt(57, 76, '5', 'f-ts') + txt(153, 76, '5', 'f-ts') + txt(249, 76, '5', 'f-ts') + txt(327, 76, 'остаток 2', 'f-ts');
    return svg(380, 88, b, '17 точек: три группы по пять и ещё две точки');
  };
  CAP.remdots = '17 = 5 · 3 + 2: три полных пятёрки и остаток 2.';

  F.boxes = () => {
    let b = '';
    const counts = [2, 1, 1];
    counts.forEach((n, i) => {
      const x = 16 + i * 108;
      b += rect(x, 24, 92, 70, i === 0 ? 'f-box-hl' : 'f-box', 12);
      for (let k = 0; k < n; k++) {
        const px = x + 46 + (k - (n - 1) / 2) * 26;
        b += `<path d="M${px - 6} 80 L${px - 6} 48 L${px} 36 L${px + 6} 48 L${px + 6} 80 Z" class="f-pencil"/>`;
      }
      b += txt(x + 46, 114, 'пенал ' + (i + 1), 'f-ts');
    });
    return svg(340, 124, b, 'Три пенала и четыре карандаша: в одном пенале два карандаша');
  };
  CAP.boxes = 'Четыре карандаша в трёх пеналах: в каком-то пенале карандашей не меньше двух.';

  F.numline = () => {
    const X = (v) => 20 + (v - 12) * 11.4;
    let b = line(X(12), 70, X(41), 70, 'f-l');
    [14, 21, 28, 35].forEach((v) => { b += line(X(v), 63, X(v), 77, 'f-l-thin') + txt(X(v), 96, v, 'f-ts'); });
    [17, 24, 31, 38].forEach((v, i) => {
      const main = i === 0 || i === 3;
      b += dot(X(v), 70, main ? 6 : 4, main ? 'f-dot-c' : 'f-dot');
      if (main) b += txt(X(v), 56 - 30, v, 'f-tb');
      if (i < 3) b += `<path d="M${r1(X(v))} 62 Q${r1(X(v + 3.5))} 30 ${r1(X(v + 7))} 62" class="f-arc-c"/>` + txt(X(v + 3.5), 40, '+7', 'f-ts');
    });
    return svg(360, 106, b, 'Числовая прямая: от 17 до 38 три шага по 7');
  };
  CAP.numline = 'Числа 17 и 38 одинаково «отстоят» от чисел, кратных 7. От 17 до 38 — ровно три шага по 7.';

  // ================= Раздел 3 =================
  F.glasses = () => {
    let b = '';
    for (let i = 0; i < 7; i++) {
      const x = 28 + i * 46, flipped = i < 2;
      b += flipped
        ? `<path d="M${x - 9} 30 L${x + 9} 30 L${x + 14} 74 L${x - 14} 74 Z" class="f-glass-f"/>`
        : `<path d="M${x - 14} 30 L${x - 9} 74 L${x + 9} 74 L${x + 14} 30" class="f-glass"/>`;
    }
    b += line(8, 76, 332, 76, 'f-l-thin');
    b += txt(51, 98, 'перевёрнуты', 'f-ts') + txt(212, 98, 'стоят правильно', 'f-ts');
    return svg(340, 108, b, 'Семь стаканов, два из них перевёрнуты вверх дном');
  };
  CAP.glasses = 'После первого хода перевёрнуты два стакана из семи.';

  F.knight = () => board({
    color: true, label: 'Конь на тёмной клетке, все клетки, куда он может пойти, светлые',
    extra: (pad, c) => {
      const ctr = (r, k) => [pad + k * c + c / 2, pad + r * c + c / 2];
      let b = '';
      [[0, 1], [0, 3], [1, 0], [1, 4], [3, 0], [3, 4], [4, 1], [4, 3]].forEach((p) => { const q = ctr(p[0], p[1]); b += dot(q[0], q[1], 7, 'f-dot-c'); });
      const k = ctr(2, 2);
      b += `<circle cx="${k[0]}" cy="${k[1]}" r="15" class="f-node-w"/>` + txt(k[0], k[1] + 6, 'К', 'f-tb');
      return b;
    }
  });
  CAP.knight = 'Конь (К) стоит на тёмной клетке. Все клетки, куда он может пойти, — светлые.';

  F.circleKids = () => {
    const h = [150, 142, 138, 147, 135, 144];
    let b = `<circle cx="170" cy="100" r="68" class="f-ring-n"/>`;
    h.forEach((v, i) => {
      const p = pt(170, 100, 68, 90 - i * 60);
      b += `<circle cx="${r1(p[0])}" cy="${r1(p[1])}" r="20" class="${i === 0 ? 'f-node-c' : 'f-node-w'}"/>` + txt(p[0], p[1] + 5, v, 'f-ts');
    });
    return svg(340, 200, b, 'Шесть ребят по кругу, рост в сантиметрах; самый высокий выделен');
  };
  CAP.circleKids = 'Рост в сантиметрах. У самого высокого (150) оба соседа ниже.';

  F.straight = () => svg(340, 90,
    line(30, 64, 310, 64) + arc(170, 64, 30, 0, 180, 'f-arc-a') + dot(170, 64) +
    txt(30, 84, 'A', 'f-tb') + txt(170, 84, 'O', 'f-tb') + txt(310, 84, 'B', 'f-tb') + txt(170, 24, '180°', 'f-ts'),
    'Развёрнутый угол AOB, 180 градусов');
  CAP.straight = 'Развёрнутый угол AOB: его стороны OA и OB образуют прямую.';

  F.adjacent = () => {
    const O = [170, 120], B = pt(170, 120, 105, 60);
    return svg(340, 150,
      sector(O[0], O[1], 34, 60, 180, 'f-sec-a') + sector(O[0], O[1], 44, 0, 60, 'f-sec-b') +
      line(30, 120, 310, 120) + line(O[0], O[1], B[0], B[1]) + dot(O[0], O[1]) +
      txt(30, 142, 'A', 'f-tb') + txt(170, 142, 'O', 'f-tb') + txt(310, 142, 'C', 'f-tb') + txt(B[0] + 14, B[1] + 4, 'B', 'f-tb'),
      'Смежные углы AOB и BOC');
  };
  CAP.adjacent = 'Углы AOB и BOC смежные: сторона OB общая, стороны OA и OC образуют прямую.';

  F.vertical = () => {
    const O = [170, 95];
    const a1 = pt(O[0], O[1], 130, 15), a2 = pt(O[0], O[1], 130, 195), b1 = pt(O[0], O[1], 92, 70), b2 = pt(O[0], O[1], 92, 250);
    const lab = (a, n, r) => { const p = pt(O[0], O[1], r, a); return txt(p[0], p[1] + 5, n, 'f-tb'); };
    return svg(340, 190,
      sector(O[0], O[1], 30, 15, 70, 'f-sec-a') + sector(O[0], O[1], 30, 195, 250, 'f-sec-a') +
      sector(O[0], O[1], 22, 70, 195, 'f-sec-b') + sector(O[0], O[1], 22, 250, 375, 'f-sec-b') +
      line(a1[0], a1[1], a2[0], a2[1]) + line(b1[0], b1[1], b2[0], b2[1]) + dot(O[0], O[1]) +
      lab(42.5, '1', 46) + lab(132.5, '2', 40) + lab(222.5, '3', 46) + lab(312.5, '4', 40),
      'Две пересекающиеся прямые и четыре угла: 1, 2, 3, 4');
  };
  CAP.vertical = 'Углы 1 и 3 вертикальные, углы 2 и 4 тоже. Углы 1 и 2 смежные.';

  F.bisectors = () => {
    const O = [170, 130];
    const B = pt(O[0], O[1], 112, 50), M = pt(O[0], O[1], 112, 115), Nn = pt(O[0], O[1], 120, 25);
    return svg(340, 160,
      arc(O[0], O[1], 30, 50, 115, 'f-arc-a') + arc(O[0], O[1], 36, 115, 180, 'f-arc-a') +
      arc(O[0], O[1], 48, 0, 25, 'f-arc-b') + arc(O[0], O[1], 54, 25, 50, 'f-arc-b') +
      line(30, 130, 310, 130) + line(O[0], O[1], B[0], B[1]) +
      line(O[0], O[1], M[0], M[1], 'f-l-c') + line(O[0], O[1], Nn[0], Nn[1], 'f-l-c') + dot(O[0], O[1]) +
      txt(30, 152, 'A', 'f-tb') + txt(170, 152, 'O', 'f-tb') + txt(310, 152, 'C', 'f-tb') +
      txt(B[0] + 12, B[1], 'B', 'f-tb') + txt(M[0] - 10, M[1] - 4, 'M', 'f-tb') + txt(Nn[0] + 14, Nn[1] + 4, 'N', 'f-tb'),
      'Смежные углы AOB и BOC и их биссектрисы OM и ON');
  };
  CAP.bisectors = 'OM — биссектриса угла AOB, ON — биссектриса угла BOC.';

  F.tri180 = () => {
    const A = [20, 130], C = [150, 130], B = [97, 38.2], Q = [258, 130];
    return svg(340, 150,
      sector(A[0], A[1], 28, 0, 50, 'f-sec-a') + sector(C[0], C[1], 28, 120, 180, 'f-sec-c') + sector(B[0], B[1], 26, 230, 300, 'f-sec-b') +
      poly([A, B, C], 'f-outline') +
      sector(Q[0], Q[1], 44, 0, 50, 'f-sec-a') + sector(Q[0], Q[1], 44, 50, 120, 'f-sec-b') + sector(Q[0], Q[1], 44, 120, 180, 'f-sec-c') +
      line(196, 130, 320, 130) + dot(Q[0], Q[1]),
      'Три угла треугольника, приложенные друг к другу, образуют развёрнутый угол');
  };
  CAP.tri180 = 'Три угла треугольника, приложенные вершинами друг к другу, составляют развёрнутый угол.';

  F.triParallel = () => {
    const A = [40, 140], C = [280, 140], B = [190, 45];
    return svg(340, 170,
      sector(A[0], A[1], 34, 0, 32.3, 'f-sec-a') + sector(C[0], C[1], 30, 133.5, 180, 'f-sec-c') +
      sector(B[0], B[1], 34, 180, 212.3, 'f-sec-a') + sector(B[0], B[1], 24, 212.3, 313.5, 'f-sec-b') + sector(B[0], B[1], 30, 313.5, 360, 'f-sec-c') +
      line(40, 45, 320, 45, 'f-l-dash') + poly([A, B, C], 'f-outline') +
      txt(28, 158, 'A', 'f-tb') + txt(292, 158, 'C', 'f-tb') + txt(190, 32, 'B', 'f-tb'),
      'Треугольник ABC и прямая через вершину B, параллельная стороне AC');
  };
  CAP.triParallel = 'Через вершину B проведена прямая, параллельная AC. Одинаково закрашенные углы равны.';

  F.exterior = () => {
    const A = [40, 140], C = [220, 140], D = [320, 140], B = [150, 40];
    return svg(340, 170,
      sector(C[0], C[1], 32, 0, 125, 'f-sec-c') + sector(C[0], C[1], 24, 125, 180, 'f-sec-a') +
      poly([A, B, C], 'f-outline') + line(C[0], C[1], D[0], D[1], 'f-l-dash') +
      txt(28, 158, 'A', 'f-tb') + txt(150, 28, 'B', 'f-tb') + txt(220, 160, 'C', 'f-tb') + txt(322, 160, 'D', 'f-tb'),
      'Треугольник ABC, сторона AC продолжена за точку C; внешний угол BCD');
  };
  CAP.exterior = 'Угол BCD — внешний угол треугольника ABC при вершине C.';

  F.quad = () => {
    const A = [40, 132], B = [92, 34], C = [262, 50], D = [300, 140];
    return svg(340, 170,
      poly([A, B, C], 'f-shape-a') + poly([A, C, D], 'f-shape-b') + line(A[0], A[1], C[0], C[1], 'f-l-dash') + poly([A, B, C, D], 'f-outline') +
      txt(26, 148, 'A', 'f-tb') + txt(84, 26, 'B', 'f-tb') + txt(274, 42, 'C', 'f-tb') + txt(312, 156, 'D', 'f-tb'),
      'Четырёхугольник ABCD, диагональ AC делит его на два треугольника');
  };
  CAP.quad = 'Диагональ AC делит четырёхугольник на два треугольника.';

  F.star = () => {
    const O = [170, 128], R = 108, r = R * 0.382;
    const names = ['A', 'B', 'C', 'D', 'E'];
    const V = names.map((_, i) => pt(O[0], O[1], R, 90 - i * 72));
    const M = pt(O[0], O[1], r, 54), Nn = pt(O[0], O[1], r, 126);
    let b = poly([V[0], M, Nn], 'f-shape-a');
    [[0, 2], [0, 3], [1, 3], [1, 4], [2, 4]].forEach((p) => { b += line(V[p[0]][0], V[p[0]][1], V[p[1]][0], V[p[1]][1]); });
    V.forEach((p, i) => { const q = pt(O[0], O[1], R + 14, 90 - i * 72); b += txt(q[0], q[1] + 5, names[i], 'f-tb'); });
    b += dot(M[0], M[1], 3) + dot(Nn[0], Nn[1], 3) + txt(M[0] + 13, M[1] - 6, 'M', 'f-tb') + txt(Nn[0] - 13, Nn[1] - 6, 'N', 'f-tb');
    return svg(340, 250, b, 'Пятиконечная звезда ABCDE; отрезок BE пересекает AC в точке M и AD в точке N');
  };
  CAP.star = 'Звезда из отрезков AC, AD, BD, BE, CE. M — точка пересечения AC и BE, N — точка пересечения AD и BE.';

  F.incenter = () => {
    const A = [50, 150], B = [270, 150], C = [140.6, 20.6], I = [147.5, 99.3];
    return svg(340, 176,
      arc(A[0], A[1], 30, 0, 27.5, 'f-arc-a') + arc(A[0], A[1], 36, 27.5, 55, 'f-arc-a') +
      arc(B[0], B[1], 34, 135, 157.5, 'f-arc-b') + arc(B[0], B[1], 40, 157.5, 180, 'f-arc-b') +
      poly([A, B, C], 'f-outline') + line(A[0], A[1], I[0], I[1], 'f-l-c') + line(B[0], B[1], I[0], I[1], 'f-l-c') + dot(I[0], I[1]) +
      txt(38, 168, 'A', 'f-tb') + txt(282, 168, 'B', 'f-tb') + txt(140, 13, 'C', 'f-tb') + txt(148, 90, 'I', 'f-tb'),
      'Треугольник ABC, биссектрисы углов A и B пересекаются в точке I');
  };
  CAP.incenter = 'AI и BI — биссектрисы углов A и B.';

  F.isosceles = () => {
    const A = [170, 24], B = [84, 150], C = [256, 150];
    return svg(340, 190,
      sector(B[0], B[1], 28, 0, 55.7, 'f-sec-a') + sector(C[0], C[1], 28, 124.3, 180, 'f-sec-a') + sector(A[0], A[1], 26, 235.7, 304.3, 'f-sec-c') +
      poly([A, B, C], 'f-outline') + tick(A[0], A[1], B[0], B[1]) + tick(A[0], A[1], C[0], C[1]) +
      txt(112, 78, 'боковая', 'f-ts', 'end') + txt(112, 94, 'сторона', 'f-ts', 'end') +
      txt(228, 78, 'боковая', 'f-ts', 'start') + txt(228, 94, 'сторона', 'f-ts', 'start') +
      txt(170, 176, 'основание', 'f-ts'),
      'Равнобедренный треугольник: две равные боковые стороны и основание');
  };
  CAP.isosceles = 'Боковые стороны отмечены штрихами. Углы при основании закрашены одинаково.';

  F.chase36 = () => {
    const B = [95, 228], C = [225, 228], A = [160, 28], D = [200.2, 151.6];
    return svg(320, 256,
      poly([A, B, C], 'f-outline') + line(B[0], B[1], D[0], D[1]) +
      tick(A[0], A[1], D[0], D[1]) + tick(B[0], B[1], D[0], D[1]) + tick(B[0], B[1], C[0], C[1]) + dot(D[0], D[1]) +
      txt(160, 18, 'A', 'f-tb') + txt(82, 244, 'B', 'f-tb') + txt(238, 244, 'C', 'f-tb') + txt(216, 150, 'D', 'f-tb'),
      'Треугольник ABC, точка D на стороне AC; отрезки AD, BD и BC равны');
  };
  CAP.chase36 = 'Равные отрезки AD, BD и BC отмечены штрихами. По условию ещё AB = AC.';

  F.chase25 = () => {
    const A = [30, 150], C = [310, 150], B = [108.7, 56.1], D = [187.5, 150];
    return svg(340, 180,
      sector(C[0], C[1], 46, 155, 180, 'f-sec-a') +
      poly([A, B, C], 'f-outline') + line(B[0], B[1], D[0], D[1]) + tick(B[0], B[1], D[0], D[1]) + tick(D[0], D[1], C[0], C[1]) + dot(D[0], D[1]) +
      txt(20, 168, 'A', 'f-tb') + txt(104, 44, 'B', 'f-tb') + txt(320, 168, 'C', 'f-tb') + txt(187.5, 172, 'D', 'f-tb'),
      'Треугольник ABC, точка D на стороне AC; отрезки BD и DC равны');
  };
  CAP.chase25 = 'Точка D лежит на стороне AC, отрезки BD и DC равны.';

  F.areaHalf = () => gridFig(4, 3, (g) => g.poly([[0, 0], [4, 0], [4, 3]], 'f-shape-a') + g.poly([[0, 0], [4, 0], [4, 3], [0, 3]], 'f-outline') + g.seg([0, 0], [4, 3], 'f-l'),
    'Прямоугольник 4 на 3, разрезанный диагональю на два равных треугольника');
  CAP.areaHalf = 'Диагональ делит прямоугольник 4 × 3 на два равных треугольника площади 6.';

  F.gridSplit = () => gridFig(6, 3, (g) => g.poly([[0, 0], [2, 0], [2, 3]], 'f-shape-a') + g.poly([[2, 0], [6, 0], [2, 3]], 'f-shape-b') + g.poly([[0, 0], [6, 0], [2, 3]], 'f-outline') + g.seg([2, 3], [2, 0], 'f-l-dash') + g.dots([[0, 0], [6, 0], [2, 3]]),
    'Треугольник на клетчатой бумаге, разделённый вертикальным отрезком на два прямоугольных треугольника');
  CAP.gridSplit = 'Отрезок из верхней вершины делит треугольник на два прямоугольных.';

  F.gridFrame = () => gridFig(4, 3, (g) =>
    g.poly([[0, 0], [4, 0], [4, 1]], 'f-shape-n') + g.poly([[4, 1], [4, 3], [1, 3]], 'f-shape-n') + g.poly([[0, 0], [1, 3], [0, 3]], 'f-shape-n') +
    g.poly([[0, 0], [4, 1], [1, 3]], 'f-shape-a') + g.poly([[0, 0], [4, 0], [4, 3], [0, 3]], 'f-outline-dash') + g.dots([[0, 0], [4, 1], [1, 3]]),
    'Треугольник на клетчатой бумаге, обведённый прямоугольником 4 на 3', 40);
  CAP.gridFrame = 'Треугольник обведён прямоугольником 4 × 3. Серым показаны три лишних треугольника.';

  F.gridTriC = () => gridPolyFig(5, 4, [[0, 0], [5, 0], [2, 4]], 'Треугольник на клетчатой бумаге: основание 5 клеток, верхняя вершина на высоте 4 клетки');
  F.gridTriD = () => gridPolyFig(7, 2, [[0, 0], [7, 0], [3, 2]], 'Треугольник на клетчатой бумаге: основание 7 клеток, верхняя вершина на высоте 2 клетки');
  F.gridQuadA = () => gridPolyFig(4, 4, [[1, 0], [4, 1], [3, 4], [0, 3]], 'Четырёхугольник на клетчатой бумаге внутри квадрата 4 на 4');
  F.gridQuadB = () => gridPolyFig(3, 3, [[1, 0], [3, 1], [2, 3], [0, 2]], 'Четырёхугольник на клетчатой бумаге внутри квадрата 3 на 3');
  CAP.gridTriC = CAP.gridTriD = CAP.gridQuadA = CAP.gridQuadB = 'Сторона клетки равна 1. Вершины фигуры — в узлах сетки.';

  F.midSquare = () => {
    const s = 150, x = 95, y = 14;
    const m = [[x + s / 2, y], [x + s, y + s / 2], [x + s / 2, y + s], [x, y + s / 2]];
    return svg(340, 178, poly(m, 'f-shape-a') + rect(x, y, s, s, 'f-outline') + m.map((p) => dot(p[0], p[1])).join(''),
      'Квадрат, середины сторон которого последовательно соединены отрезками');
  };
  CAP.midSquare = 'Середины сторон квадрата соединены по порядку.';

  F.midSquare5 = () => gridFig(5, 5, (g) => g.poly([[2.5, 0], [5, 2.5], [2.5, 5], [0, 2.5]], 'f-shape-a') + g.poly([[0, 0], [5, 0], [5, 5], [0, 5]], 'f-outline') + g.dots([[2.5, 0], [5, 2.5], [2.5, 5], [0, 2.5]]),
    'Доска 5 на 5, середины сторон соединены отрезками');
  CAP.midSquare5 = 'Середины сторон доски 5 × 5 соединены по порядку.';

  F.tromino = () => {
    const c = 26, x0 = 12, y0 = 12;
    let b = '';
    for (let r = 0; r < 5; r++) for (let k = 0; k < 5; k++) b += rect(x0 + k * c, y0 + r * c, c, c, 'f-cell-l');
    const ux = 210, uy = 50;
    b += rect(ux, uy, c, c, 'f-cell-a') + rect(ux, uy + c, c, c, 'f-cell-a') + rect(ux + c, uy + c, c, c, 'f-cell-a');
    b += txt(ux + c, uy + 2 * c + 24, 'уголок', 'f-ts');
    return svg(320, 154, b, 'Квадрат 5 на 5 и уголок из трёх клеток');
  };
  CAP.tromino = 'Слева квадрат 5 × 5, справа «уголок» из трёх клеток.';

  F.trominoes = () => {
    const c = 40, x0 = 110, y0 = 12;
    const a = [[0, 0], [1, 0], [1, 1]], bb = [[0, 1], [0, 2], [1, 2]];
    let b = '';
    a.forEach((p) => { b += rect(x0 + p[1] * c, y0 + p[0] * c, c, c, 'f-cell-a'); });
    bb.forEach((p) => { b += rect(x0 + p[1] * c, y0 + p[0] * c, c, c, 'f-cell-b'); });
    return svg(340, 104, b, 'Прямоугольник 2 на 3, разрезанный на два уголка');
  };
  CAP.trominoes = 'Прямоугольник 2 × 3 разрезан на два уголка.';

  F.board5plain = () => board({ color: false, label: 'Доска 5 на 5' });
  CAP.board5plain = 'Доска 5 × 5: всего 25 клеток.';
  F.board5 = () => board({ color: true, label: 'Доска 5 на 5 в шахматной раскраске, угловые клетки тёмные' });
  CAP.board5 = 'Шахматная раскраска: угловые клетки чёрные.';
  F.board5cut = () => board({ color: true, cut: [0, 1], label: 'Доска 5 на 5 в шахматной раскраске, вырезана белая клетка рядом с угловой' });
  CAP.board5cut = 'Вырезана белая клетка, соседняя с угловой (отмечена крестиком).';

  window.FIGS = F;
  window.FIG_CAP = CAP;
})();

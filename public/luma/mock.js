// The Luma interface rebuilt in HTML: the Mac window (rail, header block, eight sections) and the phone app (tab bar,
// four screens). It follows the app's own tokens, so it reads as the real thing in both languages and can be animated
// piece by piece. Everything is drawn at the app's real size (Mac 1280×800, phone 390×844) and scaled to fit.

const tr = (ru, en) => (lang === "en" ? en : ru);

/** Blocks that arrive one after another when a screen opens: `a(i)` gives the class and the order. */
const a = (i) => `class="a" style="--i:${i}"`;
const ac = (i, cls) => `class="a ${cls}" style="--i:${i}"`;

// ------------------------------------------------------------------ shared data

const HABITS = () => [
  {
    id: "ex",
    name: tr("Зарядка", "Morning workout"),
    icon: "dumbbell",
    c: "var(--c-green)",
    unit: tr("ч", "h"),
    goal: 1,
    streak: 2,
  },
  {
    id: "en",
    name: tr("Английские слова", "English words"),
    icon: "book-open",
    c: "var(--c-violet)",
    unit: "",
    goal: 20,
    streak: 12,
  },
  {
    id: "rd",
    name: tr("Чтение", "Reading"),
    icon: "book",
    c: "var(--c-yellow)",
    unit: tr("ч", "h"),
    goal: 0.5,
    streak: 1,
  },
  {
    id: "yo",
    name: tr("Йога", "Yoga"),
    icon: "heart-pulse",
    c: "var(--c-teal)",
    unit: tr("ч", "h"),
    goal: 1,
    streak: 4,
  },
  {
    id: "ph",
    name: tr("Без телефона после 23:00", "No phone after 23:00"),
    icon: "moon",
    c: "var(--c-pink)",
    unit: tr("ч", "h"),
    goal: 1,
    streak: 0,
  },
];
const num = (n, d = 2) =>
  n.toLocaleString(lang === "en" ? "en-US" : "ru-RU", { minimumFractionDigits: d, maximumFractionDigits: d });
const money = (n) => (lang === "en" ? `$${num(n)}` : `${num(n)} $`);

// ------------------------------------------------------------------ the Mac window

const RAIL = [
  ["home", "layout-grid", "Главная", "Home"],
  ["habits", "repeat", "Привычки", "Habits"],
  ["projects", "folder-kanban", "Проекты", "Projects"],
  ["calendar", "calendar-days", "Календарь", "Calendar"],
  ["tasks", "list-todo", "Задачи", "Tasks"],
  ["health", "heart-pulse", "Здоровье", "Health"],
  ["board", "layout-dashboard", "Доска", "Board"],
  ["notes", "notebook-pen", "Заметки", "Notes"],
  ["finance", "wallet", "Финансы", "Finance"],
  ["nutrition", "apple", "Питание", "Nutrition"],
];
const RAIL_BOTTOM = [
  ["analytics", "chart-column", "Аналитика", "Analytics"],
  ["settings", "settings", "Настройки", "Settings"],
];

/** The window: the window-buttons block, the dark rail, the header block and the page. */
function macShell() {
  let r = 0;
  const item = ([id, icon, ru, en]) =>
    `<span class="lm-ri" data-id="${id}" style="--r:${r++}">${ic(icon, 18)}<i>${tr(ru, en)}</i></span>`;
  return `<div class="lm">
    <div class="lm-dots"><i></i><i></i><i></i></div>
    <aside class="lm-rail">
      <img class="lm-logo" src="assets/logo.png" alt="" />
      <span class="lm-rail-hl"></span>
      <div class="lm-rail-top">${RAIL.map(item).join("")}</div>
      <div class="lm-rail-bottom">${RAIL_BOTTOM.map(item).join("")}</div>
    </aside>
    <div class="lm-head"></div>
    <div class="lm-body"></div>
  </div>`;
}

const pill = (icon, text, cls = "") => `<span class="lm-pill ${cls}">${icon ? ic(icon, 15) : ""}${text}</span>`;
const settings = () => pill("sliders-horizontal", tr("Настройки", "Settings"), "dark");
const agent = () => pill("sparkles", "ag_luma", "hl ag");

/** The grey header block of each section: its name, its buttons and (in most sections) a second row. */
function macHead(id) {
  const name = (RAIL.concat(RAIL_BOTTOM).find((r) => r[0] === id) || RAIL[0]).slice(1);
  const title = pill(name[0], tr(name[1], name[2]), "title");
  const one = (right) => `<div class="lm-hrow one">${title}<span class="sp"></span>${right}</div>`;
  const two = (right, row2) =>
    `<div class="lm-hrow">${title}<div class="lm-hcut"><span class="sp"></span>${right}</div>${agent()}</div><div class="lm-hrow2">${row2}</div>`;
  const date = tr("Воскресенье, 1 ноября", "Sunday, 1 November");
  const range = (a, b) =>
    `<span class="lm-pill">${ic("chevron-left", 14)}<b>${a}</b>${ic("chevron-right", 14)}</span>${b}`;
  switch (id) {
    case "home":
      return one(`${pill("calendar", date)}${settings()}${agent()}`);
    case "habits":
      return two(
        `${pill("chart-column", tr("Аналитика", "Analytics"), "grey")}${pill("plus", tr("Привычка", "Habit"), "dark")}${settings()}`,
        `${pill("calendar", tr("19 окт. — 1 нояб. 2026", "19 Oct — 1 Nov 2026"))}<span class="sp"></span>
         <span class="lm-pill"><span class="mut">${tr("Выберите привычку", "Pick a habit")}</span>${ic("chevron-down", 14)}<span class="lm-sep"></span><b class="mono">0:00:00</b><span class="lm-play">${ic("play", 12)}</span></span>
         <span class="lm-pill mono">${tr("сегодня", "today")} <b data-hab-count>3 / 5</b><span class="lm-sep"></span>${ic("flame", 13, "fl")} ${tr("серия", "streak")} 2</span>`,
      );
    case "projects":
      return two(
        `${pill("plus", tr("Новый проект", "New project"), "dark")}${settings()}`,
        `<span class="lm-seg"><b>${tr("Активные", "Active")}</b><span>${tr("Что в работе", "In progress")}</span><span>${tr("Запланированные", "Planned")}</span><span>${tr("На паузе", "Paused")}</span><span>${tr("Все", "All")}</span></span>
         <span class="lm-pill wide">${ic("search", 14)}<span class="mut">${tr("Найти", "Search")}</span></span><span class="sp"></span>
         ${pill("", tr("Все группы", "All groups"), "dark")}${pill("", tr("Рабочие", "Work"))}${pill("", tr("Для себя", "Personal"))}`,
      );
    case "tasks":
      return two(
        `${pill("chart-column", tr("Аналитика", "Analytics"), "grey")}${settings()}`,
        `${range(tr("Воскресенье, 1 ноября 2026", "Sunday, 1 November 2026"), "")}<span class="sp"></span>${pill("", tr("Сегодня", "Today"), "ghost")}`,
      );
    case "finance":
      return two(
        `<span class="lm-round">${ic("arrow-down-up", 15)}</span><span class="lm-round">${ic("download", 15)}</span>${pill("chart-column", tr("Аналитика", "Analytics"), "grey")}${settings()}`,
        `${range(tr("30 дней", "30 days"), "")}${pill("", tr("с <b>1 нояб. 2026</b>", "from <b>1 Nov 2026</b>"))}${pill("", tr("по <b>30 нояб. 2026</b>", "to <b>30 Nov 2026</b>"))}<span class="sp"></span>
         <span class="lm-seg"><b>${tr("Все", "All")}</b><span>${tr("Расходы", "Expenses")}</span><span>${tr("Доходы", "Income")}</span></span>
         <span class="lm-pill">${tr("Все категории", "All categories")}${ic("chevron-down", 14)}</span>`,
      );
    case "nutrition":
      return two(
        `${pill("library", tr("Продукты", "Foods"), "grey")}<span class="lm-round">${ic("download", 15)}</span>${pill("chart-column", tr("Аналитика", "Analytics"), "grey")}${settings()}`,
        `${range(tr("воскресенье", "Sunday"), "")}${pill("", tr("1 нояб. 2026", "1 Nov 2026"))}`,
      );
    case "health":
      return two(
        `${pill("library", tr("Упражнения", "Exercises"), "grey")}${pill("list-todo", tr("Программы", "Programs"), "grey")}${pill("chart-column", tr("Аналитика", "Analytics"), "grey")}${settings()}`,
        `${range(tr("воскресенье", "Sunday"), "")}${pill("", tr("1 нояб. 2026", "1 Nov 2026"))}`,
      );
    case "analytics":
      return two(
        settings(),
        `<span class="lm-seg"><b>${tr("Обзор", "Overview")}</b><span>${tr("Время", "Time")}</span><span>${tr("Итоги и советник", "Reviews and advisor")}</span></span><span class="sp"></span>
         ${range(tr("28 дней", "28 days"), "")}${pill("", tr("с <b>5 окт. 2026</b>", "from <b>5 Oct 2026</b>"))}${pill("", tr("по <b>1 нояб. 2026</b>", "to <b>1 Nov 2026</b>"))}`,
      );
  }
  return one(`${settings()}${agent()}`);
}

const cardHead = (title, note, arrow = true) =>
  `<div class="lm-ch"><b>${title}</b>${note ? `<span class="mono mut">${note}</span>` : ""}<span class="sp"></span>${arrow ? `<span class="lm-arrow">${ic("arrow-up-right", 13)}</span>` : ""}</div>`;
const check = (on) => `<span class="lm-cb${on ? " on" : ""}">${ic("check", 12)}</span>`;
const bar = (v, color = "var(--ink)") => `<span class="lm-bar"><i style="--v:${v};background:${color}"></i></span>`;

// ---------- Home

function homeBody() {
  const days = [];
  for (let d = 1; d <= 30; d++) days.push(d);
  const lit = [3, 6, 10, 11, 12, 13];
  const wd = tr("пн вт ср чт пт сб вс", "mo tu we th fr sa su").split(" ");
  const cal = `<div class="lm-cal">${wd.map((w) => `<span class="wd">${w}</span>`).join("")}${"<span></span>".repeat(6)}${days
    .map(
      (d) => `<span class="day${lit.includes(d) ? " sel" : ""}${d === 1 ? " today" : ""}" style="--d:${d}">${d}</span>`,
    )
    .join("")}</div>`;
  const events = [
    [
      tr("3 нояб.", "3 Nov"),
      `<span class="mono mut">11:00</span> ${tr("Собеседование в Авито", "Interview at Avito")}`,
    ],
    [tr("6 нояб.", "6 Nov"), tr("ДР Маши", "Masha's birthday")],
    [tr("10 нояб.", "10 Nov"), tr("Поездка в Казань", "Trip to Kazan")],
    [tr("11 нояб.", "11 Nov"), tr("Сдать лендинг", "Hand in the landing page")],
  ];
  const todos = [
    [tr("отклики по работе", "job applications"), false],
    [tr("английский", "English"), false],
    [tr("чтение 3ч", "reading 3h"), false],
    [tr("трекер — свой проект", "tracker — my own project"), true],
    [tr("купить зубную пасту", "buy toothpaste"), false],
  ];
  const tails = [
    [tr("31 окт.", "31 Oct"), tr("английский 1ч", "English 1h")],
    [tr("31 окт.", "31 Oct"), tr("закончить парсер фото", "finish the photo parser")],
    [tr("30 окт.", "30 Oct"), tr("растяжка", "stretching")],
    [tr("29 окт.", "29 Oct"), tr("английский", "English")],
  ];
  const inbox = [
    tr("Спросить Диму про рекомендацию в Авито", "Ask Dima for a referral at Avito"),
    tr("Книга «Deep Work» — перечитать главу про ритуалы", "“Deep Work” — reread the chapter on rituals"),
    tr("Идея: виджет таймера в строке меню macOS", "Idea: a timer widget in the macOS menu bar"),
  ];
  const habits = HABITS();
  const hv = [
    ["1 / 1 " + habits[0].unit, true],
    ["0 / 20", false],
    ["0,67 / 0,5 " + habits[2].unit, true],
    ["0 / 1 " + habits[3].unit, false],
    ["0 / 1 " + habits[4].unit, false],
  ];
  const projects = [
    [tr("Сайт Luma", "Luma website"), 0.5, "3/6", "var(--c-blue)"],
    [tr("Поиск работы", "Job search"), 0.33, "1/3", "var(--c-blue)"],
    [tr("Фриланс: лендинг для кафе", "Freelance: café landing"), 0, "0/2", "var(--c-blue)"],
  ];
  // the week's hours as a line
  const pts = [
    [30, 18],
    [88, 52],
    [146, 30],
    [204, 26],
    [262, 55],
    [320, 84],
    [378, 72],
  ];
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ");
  return `<div class="lm-home">
    <div class="col">
      <div ${ac(0, "lm-card dark cal-card")}>${cardHead(tr("Календарь", "Calendar"), tr("ноябрь", "November"))}${cal}
        <div class="lm-events" data-events>${events.map(([d, x]) => `<div class="ev"><span class="lm-chip">${d}</span>• ${x}</div>`).join("")}</div>
      </div>
      <div ${ac(1, "lm-card line")}>${cardHead(tr("Часы за неделю", "Hours this week"), "36:55")}
        <svg class="lm-line" viewBox="0 0 408 110"><path class="area" d="${line} L378,104 L30,104 Z"/><path class="ln" d="${line}"/>
        <line x1="0" x2="408" y1="50" y2="50" class="norm"/><text x="400" y="44" text-anchor="end" class="avg">${tr("среднее 5:16", "average 5:16")}</text>${pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="${i === 6 ? 7 : 5}" class="${i === 6 ? "now" : ""}"/>`).join("")}</svg>
        <div class="lm-axis">${tr("Пн Вт Ср Чт Пт Сб Вс", "Mo Tu We Th Fr Sa Su")
          .split(" ")
          .map((d, i) => `<span${i === 6 ? ' class="now"' : ""}>${d}</span>`)
          .join("")}</div>
      </div>
    </div>
    <div class="col">
      <div ${ac(2, "lm-card dark")}>${cardHead(tr("Дела на сегодня", "Today"), `<span data-todo-count>1 / 5</span>`)}
        <div class="lm-todos" data-todos>${todos.map(([x, on]) => `<div class="td${on ? " done" : ""}">${check(on)}<span>${x}</span></div>`).join("")}</div>
        <div class="td add">${ic("plus", 16)}<span>${tr("Новое дело", "New task")}</span></div>
      </div>
      <div ${ac(3, "lm-card grey")}>${cardHead(tr("Хвосты", "Leftovers"), tr("5 дел прошлых дней", "5 tasks from past days"))}
        <span class="lm-pill out sm">${ic("arrow-down-to-line", 14)}${tr("Перенести на сегодня · 5", "Move to today · 5")}</span>
        ${tails.map(([d, x]) => `<div class="tl"><span class="lm-chip">${d}</span>${x}</div>`).join("")}
      </div>
      <div ${ac(4, "lm-card dark")}>${cardHead(tr("Входящие", "Inbox"), tr("3 не разобрано", "3 to sort"))}
        <div class="lm-input">${tr("Что пришло в голову?", "What's on your mind?")}<span class="lm-plus">${ic("plus", 13)}</span></div>
        ${inbox.map((x) => `<div class="ib">• ${x}</div>`).join("")}
      </div>
    </div>
    <div class="col narrow">
      <div ${ac(5, "lm-watch")}><svg class="rg" viewBox="0 0 200 200"><circle cx="100" cy="100" r="88" class="tr"/><circle cx="100" cy="100" r="88" class="arc"/></svg>
        <div class="in"><span>${tr("Секундомер", "Stopwatch")}</span><b class="mono">0:00:00</b><small class="mono">1:38 / 6:00</small><span class="lm-play big">${ic("play", 14)}</span></div>
      </div>
      <div ${ac(5, "lm-bind")}>${tr("К чему привязать", "Link to")}${ic("chevron-down", 14)}</div>
      <div ${ac(6, "lm-card grey")} data-money-card>${cardHead(tr("Деньги", "Money"), tr("сегодня", "today"))}
        <div class="lm-money"><b class="mono" data-money>${money(116.62)}</b><span class="mono">${tr("баланс месяца", "month balance")} −${money(116.62)}</span></div>
        <div class="lm-inrow"><div class="lm-input out">${tr("Что и сколько: кофе 250", "What and how much: coffee 250")}</div><span class="lm-plus">${ic("plus", 14)}</span></div>
      </div>
      <div ${ac(7, "lm-card line")} data-habits-card>${cardHead(tr("Привычки", "Habits"), `<span data-hab-count>2 / 5</span>`)}
        ${habits
          .map(
            (h, i) =>
              `<div class="hb${hv[i][1] ? " done" : ""}" data-h="${h.id}">${check(hv[i][1])}<span class="lm-tile" style="background:${h.c}">${ic(h.icon, 12)}</span><span class="nm">${h.name}</span><span class="mono mut" data-hv>${hv[i][0]}</span>${h.streak ? `<span class="stk mono">${ic("flame", 11, "fl")}${h.streak}</span>` : `<span class="stk"></span>`}</div>`,
          )
          .join("")}
      </div>
      <div ${ac(8, "lm-card grey")}>${cardHead(tr("Проекты", "Projects"), tr("5 активных", "5 active"))}
        ${projects.map(([n, v, c, col]) => `<div class="pj"><i style="background:${col}"></i><span>${n}</span>${bar(v)}<span class="mono">${c}</span></div>`).join("")}
      </div>
    </div>
  </div>`;
}

// ---------- Habits

function habitsBody() {
  const habits = HABITS();
  const days = 14;
  const wd = tr("пн вт ср чт пт сб вс", "mo tu we th fr sa su").split(" ");
  const groups = [
    [tr("ЗДОРОВЬЕ", "HEALTH"), "var(--c-green)", [0, 3]],
    [tr("УЧЁБА", "STUDY"), "var(--c-violet)", [1]],
    [tr("ЛИЧНОЕ", "PERSONAL"), "var(--c-yellow)", [2, 4]],
  ];
  const pattern = {
    ex: "10010011011011",
    en: "29 27 21 0 26 0 17 15 17 21 17 21 16 0".split(" "),
    rd: "0,42 0 0,48 0 0,52 0,68 0 0 0,48 0,45 0 0,33 0,45 0,67".split(" "),
    yo: "10111010110100",
    ph: "00001011101100",
  };
  const cell = (h, i) => {
    const p = pattern[h.id];
    const v = Array.isArray(p) ? p[i] : p[i] === "1" ? "1" : "0";
    return v === "0" ? `<span class="c"></span>` : `<span class="c on">${v}</span>`;
  };
  const head = Array.from({ length: days }, (_, i) => {
    const d = 19 + i;
    const date = d > 31 ? d - 31 : d;
    const today = i === days - 1;
    return `<span class="dh${today ? " today" : ""}"><b>${date}</b>${today ? tr("нояб.", "Nov") : wd[i % 7]}</span>`;
  }).join("");
  const totals = {
    ex: ["21 " + tr("ч", "h"), 11],
    en: ["410", 12],
    rd: ["8,98 " + tr("ч", "h"), 4],
    yo: ["14 " + tr("ч", "h"), 6],
    ph: ["14 " + tr("ч", "h"), 4],
  };
  let rows = "";
  let n = 1;
  for (const [g, col, ids] of groups) {
    rows += `<div ${ac(n++, "gh")}><i style="background:${col}"></i>${g}</div>`;
    for (const k of ids) {
      const h = habits[k];
      rows += `<div ${ac(n++, "hr")} data-h="${h.id}">
        <span class="hn"><span class="lm-tile" style="background:${h.c}">${ic(h.icon, 13)}</span><span>${h.name}</span>${h.streak ? `<small>${ic("flame", 11, "fl")}${h.streak}</small>` : ""}</span>
        ${Array.from({ length: days - 1 }, (_, i) => cell(h, i)).join("")}${cell(h, days - 1).replace('class="c', 'class="c today')}
        <span class="tot mono">${totals[h.id][0]}</span><span class="tot mono">${ic("flame", 11, "fl")} ${totals[h.id][1]}</span>
      </div>`;
    }
  }
  return `<div class="lm-habits">
    <div class="a hr head" style="--i:0"><span class="hn mut">${tr("ПРИВЫЧКА", "HABIT")}</span>${head}<span class="dh dark"><b>${tr("Всего", "Total")}</b></span><span class="dh dark"><b>${tr("Рекорд", "Best")}</b></span></div>
    ${rows}
    <div ${ac(n++, "hr foot")}><span class="hn mut">${tr("Закрыто за день", "Done per day")}</span>${"3/5 1/5 2/5 2/5 4/5 1/5 3/5 2/5 1/5 4/5 1/5 3/5 2/5"
      .split(" ")
      .map((x) => `<span class="mono">${x}</span>`)
      .join("")}<span class="mono" data-day-total>2/5</span></div>
    <div ${ac(n++, "hr foot")}><span class="hn mut">${tr("Время за день", "Time per day")}</span>${"2,42 · 1,48 2 2,52 0,68 3 2 1,48 3,45 1 2,33 2,45 1,67"
      .split(" ")
      .map((x) => `<span class="mono">${lang === "en" ? x.replace(",", ".") : x}</span>`)
      .join("")}</div>
  </div>`;
}

// ---------- Projects

function projectsBody() {
  const p = [
    [
      tr("Рабочие", "Work"),
      "var(--c-blue)",
      tr("Сайт Luma", "Luma website"),
      50,
      tr("3 из 6 задач", "3 of 6 tasks"),
      tr("3 открыто", "3 open"),
      tr("78 ч 24 м", "78 h 24 m"),
    ],
    [
      tr("Рабочие", "Work"),
      "var(--c-blue)",
      tr("Поиск работы", "Job search"),
      33,
      tr("1 из 3 задач", "1 of 3 tasks"),
      tr("2 открыто", "2 open"),
      tr("31 ч 51 м", "31 h 51 m"),
    ],
    [
      tr("Рабочие", "Work"),
      "var(--c-blue)",
      tr("Фриланс: лендинг для кафе", "Freelance: café landing"),
      0,
      tr("0 из 2 задач", "0 of 2 tasks"),
      tr("2 открыто", "2 open"),
      tr("22 ч 36 м", "22 h 36 m"),
    ],
    [
      tr("Для себя", "Personal"),
      "var(--c-green)",
      tr("Курс английского", "English course"),
      33,
      tr("1 из 3 задач", "1 of 3 tasks"),
      tr("2 открыто", "2 open"),
      tr("15 ч 10 м", "15 h 10 m"),
    ],
    [
      tr("Для себя", "Personal"),
      "var(--c-green)",
      tr("Программа тренировок", "Training program"),
      50,
      tr("1 из 2 задач", "1 of 2 tasks"),
      tr("1 открыто", "1 open"),
      tr("17 ч 9 м", "17 h 9 m"),
    ],
    [
      tr("Для себя", "Personal"),
      "var(--c-green)",
      tr("Переезд", "Moving house"),
      75,
      tr("3 из 4 задач", "3 of 4 tasks"),
      tr("1 открыто", "1 open"),
      tr("9 ч 40 м", "9 h 40 m"),
    ],
  ];
  return `<div class="lm-projects">
    ${p
      .map(
        ([g, c, name, v, of, open, time], i) => `<div ${ac(i, "lm-card line pc")}>
      <span class="grp"><i style="background:${c}"></i>${g}</span><b>${name}</b>
      <div class="pct"><span class="mono big" data-count="${v}" data-suf="%">${v}%</span><span class="mut">${of}</span></div>
      <span class="lm-bar thick"><i style="--v:${v / 100};background:${c}"></i></span>
      <div class="meta mut">${ic("list-todo", 13)}${open}${ic("clock", 13)}${time}<span class="sp"></span>···</div>
    </div>`,
      )
      .join("")}
  </div>`;
}

// ---------- Tasks

function tasksBody() {
  const today = [
    [tr("отклики по работе", "job applications"), false],
    [tr("английский", "English"), false],
    [tr("чтение 3ч", "reading 3h"), false],
    [tr("трекер — свой проект", "tracker — my own project"), true],
    [tr("купить зубную пасту", "buy toothpaste"), false],
    [tr("Спросить Диму про рекомендацию в Авито", "Ask Dima for a referral at Avito"), false],
  ];
  const side = (cls, title, date, count, n, items) => `<div class="dk ${cls}">
      <div class="dkh"><b>${title}</b><span class="mono mut">${count}</span><span class="lm-num">${n}</span></div><span class="mono mut sm">${date}</span>
      ${items.map(([x, on]) => `<div class="td${on ? " done" : ""}">${check(on)}<span>${x}</span></div>`).join("")}
    </div>`;
  return `<div class="lm-tasks">
    ${side("l3", tr("Чт", "Th"), tr("29 окт.", "29 Oct"), "", "29", [
      ["", true],
      ["", true],
      ["", false],
      ["", true],
    ])}
    ${side("l2", tr("Пятница", "Friday"), tr("30 октября", "30 October"), "", "30", [
      ["", true],
      ["", true],
      ["", true],
      ["", false],
    ])}
    ${side("l1", tr("Вчера", "Yesterday"), tr("31 октября", "31 October"), "2 / 4", "31", [
      [tr("отчёт папе", "report for dad"), true],
      [tr("английский 1ч", "English 1h"), false],
      [tr("закончить парсер фото", "finish the photo parser"), false],
      [tr("приготовить еду", "cook"), true],
    ])}
    <div class="dk now">
      <div class="dkh"><b>${tr("Сегодня", "Today")}</b><span class="mono mut" data-todo-count>1 / 6</span><span class="lm-num hl">1</span></div><span class="mono mut sm">${tr("1 ноября", "1 November")}</span>
      ${today.map(([x, on], i) => `<div ${ac(i + 1, "td" + (on ? " done" : ""))}>${check(on)}<span>${x}</span></div>`).join("")}
      <div class="td add">${ic("plus", 16)}<span>${tr("Новое дело", "New task")}</span></div>
      <span class="lm-pill grey sm">${ic("arrow-down-to-line", 14)}${tr("Перенести сюда незакрытые · 5", "Move unfinished here · 5")}</span>
    </div>
    ${side("r1", tr("Завтра", "Tomorrow"), tr("2 ноября", "2 November"), "0 / 3", "2", [
      [tr("купить продукты", "buy groceries"), false],
      [tr("растяжка", "stretching"), false],
      [tr("ИИ — свой проект", "AI — my own project"), false],
    ])}
    ${side("r2", "", "", "", "3", [])}
    ${side("r3", "", "", "", "4", [])}
  </div>`;
}

// ---------- Finance

function financeBody() {
  const cats = [
    [tr("Продукты", "Groceries"), "var(--c-blue)"],
    [tr("Кафе и рестораны", "Dining out"), "var(--c-orange)"],
    [tr("Транспорт", "Transport"), "var(--c-teal)"],
    [tr("Дом", "Home"), "var(--c-yellow)"],
    [tr("Здоровье", "Health"), "var(--c-pink)"],
    [tr("Одежда", "Clothes"), "var(--c-green)"],
    [tr("Развлечения", "Fun"), "var(--c-violet)"],
  ];
  const ops = [
    [tr("Музыка", "Music"), tr("Подписки · 599 ₽", "Subscriptions · 599 ₽"), -6.66, "var(--c-red)"],
    [tr("Облако", "Cloud"), tr("Подписки · 990 ₽", "Subscriptions · 990 ₽"), -11, "var(--c-red)"],
    [tr("Коммунальные услуги", "Utilities"), tr("Дом · 6 820 ₽", "Home · 6,820 ₽"), -75.78, "var(--c-yellow)"],
    [tr("Прогулка", "A walk out"), tr("Развлечения · 2 086 ₽", "Fun · 2,086 ₽"), -23.18, "var(--c-violet)"],
  ];
  const by = [
    [tr("Дом", "Home"), "var(--c-yellow)", 75.78, 0.65, "65% · 1"],
    [tr("Развлечения", "Fun"), "var(--c-violet)", 23.18, 0.2, "20% · 1"],
    [tr("Подписки", "Subscriptions"), "var(--c-red)", 17.66, 0.15, "15% · 2"],
  ];
  return `<div class="lm-fin">
    <div ${ac(0, "lm-card hl stat")}><span>${tr("Баланс", "Balance")}</span><b class="mono-ish" data-fin-balance>−${money(116.62)}</b><small>${tr("прошлый период: −98,48 $", "last period: −$98.48")}</small></div>
    <div ${ac(1, "lm-card dark stat")}><span>${tr("Доходы", "Income")}</span><b>${money(0).replace(",00", "").replace(".00", "")}</b><small>${tr("пока нет", "none yet")}</small></div>
    <div ${ac(2, "lm-card dark stat")}><span>${tr("Траты", "Expenses")}</span><b data-fin-spent>${money(116.62)}</b><small>${tr("+18% к прошлому", "+18% vs last")}</small></div>
    <div ${ac(3, "lm-card dark entry")}>
      <div class="row">${pill("minus", tr("Расход", "Expense"), "hl")}${pill("plus", tr("Доход", "Income"), "out-w")}<span class="sp"></span>${pill("", tr("1 нояб. 2026", "1 Nov 2026"), "out-w")}</div>
      <div class="row"><div class="lm-field" data-fin-input><span class="ph">${tr("Что и сколько: кофе 250", "What and how much: coffee 250")}</span><span class="typed"></span></div><span class="lm-field cur">USD ${ic("chevron-down", 14)}</span>${pill("plus", tr("Записать", "Save"), "olive")}</div>
      <span class="mono hint">${tr("Впишите, что и сколько: «кофе 250», «такси 12 usd», «ужин 450000 vnd»", "Type what and how much: “coffee 250”, “taxi 12 usd”, “dinner 450000 vnd”")}</span>
      <div class="lm-chips">${cats.map(([n, c]) => `<span class="lm-tag"><i style="background:${c}"></i>${n}</span>`).join("")}</div>
      <div class="lm-often"><span class="mut">${tr("Часто", "Often")}</span>${[
        [tr("Обед", "Lunch"), "319 ₽", "var(--c-orange)"],
        [tr("Метро", "Metro"), "79 ₽", "var(--c-teal)"],
        [tr("Кофе", "Coffee"), "203 ₽", "var(--c-orange)"],
        [tr("Продукты", "Groceries"), "369 ₽", "var(--c-blue)"],
        [tr("Продукты на неделю", "Weekly groceries"), "3 275 ₽", "var(--c-blue)"],
      ]
        .map(
          ([n, v, c]) => `<span class="lm-tag"><i style="background:${c}"></i>${n} <em class="mono">${v}</em></span>`,
        )
        .join("")}</div>
    </div>
    <div ${ac(4, "lm-card line cats")}><b>${tr("По категориям", "By category")}</b><small class="mut">${tr("нажмите на строку — в списке останутся её траты", "click a row to keep only its expenses")}</small>
      ${by.map(([n, c, v, k, p]) => `<div class="ct"><span><i style="background:${c}"></i>${n}</span><b class="mono">${money(v)}</b></div><div class="ct2"><span class="lm-bar out"><i style="--v:${k};background:${c}"></i></span><span class="mono mut">${p}</span></div>`).join("")}
    </div>
    <div ${ac(5, "lm-card line fops")}>
      <div class="lm-ch"><b>${tr("Операции", "Transactions")}</b><span class="sp"></span><span class="lm-seg sm"><b>${tr("По дням", "By day")}</b><span>${tr("По сумме", "By amount")}</span></span><span class="lm-chip hl mono" data-fin-day>−${money(116.62)}</span></div>
      <small class="mut">${tr("по дням, сначала новые", "by day, newest first")}</small>
      <div class="dayrow"><b>${tr("Вс, 1 ноября", "Sun, 1 November")}</b><b class="mono" data-fin-day2>−${money(116.62)}</b></div>
      <div data-fin-ops>${ops.map(([n, s, v, c]) => `<div class="op"><i style="background:${c}"></i><span><b>${n}</b><small class="mut">${s}</small></span><span class="mono">−${money(-v)}</span></div>`).join("")}</div>
    </div>
  </div>`;
}

// ---------- Nutrition

function nutritionBody() {
  const macros = [
    [tr("Белки", "Protein"), "var(--c-blue)", 116, 100],
    [tr("Жиры", "Fat"), "var(--c-orange)", 42.2, 65],
    [tr("Углеводы", "Carbs"), "var(--c-teal)", 125.8, 250],
  ];
  const meals = [
    [
      tr("Сырники", "Cottage cheese pancakes"),
      tr("219 г · Б 28,5 · Ж 23 · У 43,8", "219 g · P 28.5 · F 23 · C 43.8"),
      482,
    ],
    [
      tr("Йогурт натуральный", "Plain yogurt"),
      tr("141 г · Б 4,9 · Ж 4,7 · У 6,6", "141 g · P 4.9 · F 4.7 · C 6.6"),
      86,
    ],
    [
      tr("Кофе с молоком (без сахара)", "Coffee with milk (no sugar)"),
      tr("295 г · Б 3,5 · Ж 3,5 · У 5,9", "295 g · P 3.5 · F 3.5 · C 5.9"),
      71,
    ],
  ];
  const week = [0.95, 0.68, 0.84, 0.82, 0.78, 0.77, 0.66];
  const ring = 2 * Math.PI * 58;
  return `<div class="lm-nut">
    <div ${ac(0, "lm-card hl kcal")}>
      <svg class="rg" viewBox="0 0 140 140"><circle cx="70" cy="70" r="58" class="tr"/><circle cx="70" cy="70" r="58" class="arc" style="--len:${ring};--v:0.67"/></svg>
      <div class="rin"><b class="mono-ish" data-count="1331" data-sep="1">1 331</b><small>${tr("ккал", "kcal")}</small></div>
      <div class="rt"><small>${tr("Осталось", "Left")}</small><b>669 ${tr("ккал", "kcal")}</b><small>${tr("из 2 000 · съедено 67%", "of 2,000 · 67% eaten")}</small>${pill("pencil", tr("Норма", "Target"), "out sm")}</div>
    </div>
    <div ${ac(1, "lm-card line nmac")}><b>${tr("Белки, жиры, углеводы", "Protein, fat, carbs")}</b>
      ${macros.map(([n, c, v, g]) => `<div class="mr"><span><i style="background:${c}"></i>${n}</span><span class="mono">${num(v, v % 1 ? 1 : 0)} / ${g} ${tr("г", "g")}</span></div><span class="lm-bar out"><i style="--v:${Math.min(1, v / g)};background:${c}"></i></span>`).join("")}
      <span class="mono mut sm">${tr("Клетчатка 10,1 г · Сахар 34,5 г", "Fibre 10.1 g · Sugar 34.5 g")}</span>
    </div>
    <div ${ac(2, "lm-card line water")}><div class="lm-ch"><b>${ic("droplet", 15)} ${tr("Вода", "Water")}</b><span class="sp"></span><span class="mono">2 250 / 2 000 ${tr("мл", "ml")}</span></div>
      <div class="glasses">${Array.from({ length: 9 }, (_, i) => `<svg style="--g:${i}" viewBox="0 0 30 50"><path d="M3 3 H27 L24 46 Q24 48 22 48 H8 Q6 48 6 46 Z"/></svg>`).join("")}</div>
      <div class="row"><span class="lm-round grey">${ic("minus", 14)}</span>${pill("plus", tr("250 мл", "250 ml"), "dark")}${pill("", "+500", "grey")}</div>
    </div>
    <div ${ac(3, "lm-card dark entry")}>
      <div class="row">${[tr("Завтрак", "Breakfast"), tr("Обед", "Lunch"), tr("Ужин", "Dinner"), tr("Перекус", "Snack")].map((x, i) => pill("", x, i === 1 ? "hl" : "out-w")).join("")}</div>
      <div class="row"><div class="lm-field"><span class="ph">${tr("Что съели: гречка 150, курица 120", "What you ate: rice 150, chicken 120")}</span></div>${pill("plus", tr("Записать", "Save"), "olive")}</div>
      <span class="mono hint">${tr("Впишите, что съели: «гречка 150, курица 120», «2 яйца», «кофе 200 мл»", "Type what you ate: “rice 150, chicken 120”, “2 eggs”, “coffee 200 ml”")}</span>
      <div class="lm-often line"><span class="mut">${tr("Часто", "Often")}</span>${[
        [tr("Гречка варёная", "Boiled buckwheat"), "334"],
        [tr("Яйцо куриное", "Egg"), "72"],
        [tr("Помидор", "Tomato"), "28"],
        [tr("Кофе с молоком (без сахара)", "Coffee with milk (no sugar)"), "71"],
        [tr("Яблоко", "Apple"), "90"],
      ]
        .map(([n, v]) => `<span class="lm-tag">${n} <em class="mono">${v}</em></span>`)
        .join("")}</div>
    </div>
    <div ${ac(4, "lm-card line week")}><b>${tr("За неделю", "This week")}</b><small class="mut">${tr("в среднем 1 643 ккал в день · записано 7 из 7", "1,643 kcal a day on average · 7 of 7 logged")}</small>
      <div class="lm-cols labelled"><em class="mono">${tr("норма 2 000 ккал", "target 2,000 kcal")}</em>${week.map((v, i) => `<span style="--v:${v};--k:${i}"${i === 6 ? ' class="now"' : ""}><small class="mono">${["пн", "", "ср", "", "пт", "", "вс"][i] && tr(["пн", "", "ср", "", "пт", "", "вс"][i], ["mo", "", "we", "", "fr", "", "su"][i])}</small></span>`).join("")}</div>
    </div>
    <div ${ac(6, "lm-card line src")}><b>${tr("Откуда калории", "Where calories come from")}</b><small class="mut">${tr("доля белков, жиров и углеводов за день", "share of protein, fat and carbs today")}</small>
      <div class="split"><i style="flex:34;background:var(--c-blue)"></i><i style="flex:28;background:var(--c-orange)"></i><i style="flex:37;background:var(--c-teal)"></i></div>
      ${macros.map(([n, c, v], i) => `<div class="mr"><span><i style="background:${c}"></i>${n}</span><span class="mono">${num(v, v % 1 ? 1 : 0)} ${tr("г", "g")} · <b>${[34, 28, 37][i]}%</b></span></div>`).join("")}
    </div>
    <div ${ac(5, "lm-card line meals")}><b>${tr("Приёмы пищи", "Meals")}</b><small class="mut">${tr("что съедено за день, по порядку", "what was eaten today, in order")}</small>
      <div class="dayrow"><b>${tr("Завтрак", "Breakfast")}</b><b class="mono">639 ${tr("ккал", "kcal")}</b></div>
      ${meals.map(([n, s, k]) => `<div class="op"><span><b>${n}</b><small class="mut">${s}</small></span><span class="mono">${k} ${tr("ккал", "kcal")}</span></div>`).join("")}
    </div>
  </div>`;
}

// ---------- Health

function healthBody() {
  const days = tr("П В С Ч П С В", "M T W T F S S").split(" ");
  const done = [1, 1, 0, 1, 1, 0, 0];
  const muscles = [
    [tr("Спина", "Back"), "var(--c-blue)", 17],
    [tr("Квадрицепсы", "Quads"), "var(--c-teal)", 13],
    [tr("Плечи", "Shoulders"), "var(--c-orange)", 10],
    [tr("Бицепс бедра", "Hamstrings"), "var(--c-teal)", 9.5],
    [tr("Бицепс", "Biceps"), "var(--c-blue)", 9],
    [tr("Трицепс", "Triceps"), "var(--c-orange)", 8.5],
  ];
  const sets = [
    ["80 × 8", "@8"],
    ["80 × 8", "@8"],
    ["75 × 10", "@9"],
  ];
  return `<div class="lm-health">
    <div ${ac(0, "lm-card hl rest")}><small>${ic("dumbbell", 13)} ${tr("воскресенье", "Sunday")}</small><b>${tr("Свободный день", "Rest day")}</b><small>${tr("по программе сегодня отдых", "the program has rest today")}</small>${pill("play", tr("Начать тренировку", "Start workout"), "dark")}</div>
    <div ${ac(1, "lm-card line wk")}><div class="lm-ch"><b>${tr("Неделя", "Week")}</b><span class="sp"></span><span class="mono">4 ${tr("из", "of")} 3</span></div>
      <div class="dots">${days.map((d, i) => `<span class="${i === 6 ? "now" : ""}"><small>${d}</small><i class="${done[i] ? "on" : ""}"></i><small class="mono">${i < 6 ? 26 + i : 1}</small></span>`).join("")}</div>
    </div>
    <div ${ac(2, "lm-card line bw")}><div class="lm-ch"><b>${tr("Вес тела", "Body weight")}</b><span class="sp"></span><small>${ic("ruler", 13)} ${tr("Замеры", "Measures")}</small></div>
      <b class="mono big">81,4 ${tr("кг", "kg")}</b><small class="mut">${tr("−1,1 кг за месяц", "−1.1 kg this month")}</small>
      <div class="row"><span class="lm-field grey mono">81,4</span>${pill("", tr("Записать", "Save"), "grey dim")}</div>
    </div>
    <div ${ac(3, "lm-card dark entry")}>
      <div class="row"><div class="lm-field" data-gym-input><span class="ph">${tr("Что делали: жим лёжа 80x8, 80x8, 75x10", "What you did: bench 80x8, 80x8, 75x10")}</span><span class="typed"></span></div>${pill("plus", tr("Записать", "Save"), "olive")}</div>
      <span class="mono hint">${tr("Впишите, что делали: «жим лёжа 80x8, 80x8, 75x10; подтягивания 12 10 8»", "Type what you did: “bench 80x8, 80x8, 75x10; pull-ups 12 10 8”")}</span>
      <div class="lm-often line"><span class="mut">${tr("Часто", "Often")}</span>${[
        tr("Жим гантелей на наклонной скамье", "Incline dumbbell press"),
        tr("Подтягивания", "Pull-ups"),
        tr("Тяга горизонтального блока", "Seated cable row"),
        tr("Махи гантелями в стороны", "Lateral raises"),
      ]
        .map((n) => `<span class="lm-tag">${n}</span>`)
        .join("")}</div>
    </div>
    <div ${ac(4, "lm-card line ex")}><div class="lm-ch"><b>${tr("Жим лёжа", "Bench press")}</b><span class="mono mut">${tr("грудь · трицепс", "chest · triceps")}</span><span class="sp"></span><span class="lm-chip hl mono">1ПМ ≈ 101 ${tr("кг", "kg")}</span></div>
      ${sets.map(([w, r], i) => `<div class="set" style="--k:${i}"><span class="mono mut">${i + 1}</span><b class="mono">${w}</b><span class="mono mut">${r}</span>${check(true)}</div>`).join("")}
      <small class="mut">${tr("Рекорд: +2,5 кг к прошлой неделе", "Record: +2.5 kg on last week")}</small>
    </div>
    <div ${ac(5, "lm-card line prog")}><div class="lm-ch"><b>${tr("По программе", "By program")}</b><span class="sp"></span><small>${tr("Программы", "Programs")}</small></div><small class="mut">${tr("Верх/низ, 4 дня", "Upper/lower, 4 days")}</small><small>${tr("На этот день ничего не запланировано.", "Nothing planned for this day.")}</small></div>
    <div ${ac(6, "lm-card line mus")}><b>${tr("Подходов за неделю", "Sets this week")}</b><small class="mut">${tr("по группам мышц; норма 10–20", "per muscle group; target 10–20")}</small>
      ${muscles.map(([n, c, v]) => `<div class="mr"><span><i style="background:${c}"></i>${n}</span><span class="mono">${num(v, v % 1 ? 1 : 0)}</span></div><span class="lm-bar out mark"><i style="--v:${v / 20};background:${c}"></i></span>`).join("")}
    </div>
  </div>`;
}

// ---------- Analytics (dark, like the README picture)

function analyticsBody() {
  const days = 20;
  const seed = [7, 5, 8, 7.5, 9, 0.6, 6.5, 8.6, 7, 6, 1.2, 1.1, 7.6, 6.4, 7, 6.8, 8.6, 0.4, 2.2, 9.5];
  const groups = [
    [tr("Работа", "Work"), "var(--c-blue)", 0.8, "115:55 80%"],
    [tr("Здоровье", "Health"), "var(--c-green)", 0.09, "13:16 9%"],
    [tr("Учёба", "Study"), "var(--c-violet)", 0.09, "12:32 9%"],
    [tr("Личное", "Personal"), "var(--c-yellow)", 0.02, "2:25 2%"],
  ];
  const projects = [
    [tr("Сайт Luma", "Luma website"), "var(--c-blue)", 1, "62:11 43%"],
    [tr("Поиск работы", "Job search"), "var(--c-blue)", 0.4, "24:59 17%"],
    [tr("Фриланс: лендинг", "Freelance: landing"), "var(--c-blue)", 0.29, "17:59 12%"],
    [tr("Программа тренировок", "Training program"), "var(--c-green)", 0.21, "13:16 9%"],
  ];
  const wd = [0.95, 0.7, 0.95, 0.85, 0.9, 0.05, 0.15];
  const hours = [0, 0, 0, 0, 0, 0, 0, 0, 0.1, 0.4, 0.75, 1, 0.95, 0.8, 0.6, 0.6, 0.35, 0.3, 0.4, 0.35, 0.1, 0, 0, 0];
  const stats = [
    [tr("Отслежено", "Tracked"), tr("144 ч 8 м", "144 h 8 m"), tr("+266% к прошлому", "+266% vs last")],
    [
      tr("Дней с записями", "Days with entries"),
      tr("26 из 28", "26 of 28"),
      tr("в среднем 5 ч 33 м за день", "5 h 33 m a day on average"),
    ],
    [tr("Дел выполнено", "Tasks done"), "15", tr("план выполнен на 52%", "52% of the plan")],
    [tr("Привычки", "Habits"), "48%", tr("было 75%", "was 75%")],
  ];
  return `<div class="lm-an">
    ${stats.map(([t, v, s], i) => `<div ${ac(i, `lm-card stat ${i ? "dark" : "hl"}`)}><span>${t}</span><b>${v}</b><small>${s}</small></div>`).join("")}
    <div ${ac(4, "lm-card line time")}><div class="lm-ch"><b>${tr("Куда ушло время", "Where the time went")}</b><span class="sp"></span><small>${ic("layout-grid", 13)} ${tr("Таблица", "Table")}</small></div><small class="mut">${tr("по дням, по группам", "by day, by group")}</small>
      <div class="lm-stack">${seed
        .map((v, i) => {
          const w = v * 0.8;
          const g = i % 3 === 0 ? 0.9 : 0;
          const s = i % 2 ? 0.6 : 0;
          return `<span style="--k:${i}"><i style="height:${w * 9}%;background:var(--c-blue)"></i>${g ? `<i style="height:${g * 9}%;background:var(--c-green)"></i>` : ""}${s ? `<i style="height:${s * 9}%;background:var(--c-violet)"></i>` : ""}</span>`;
        })
        .join("")}<em class="mono">${tr("норма 6:00", "target 6:00")}</em></div>
      <div class="legend">${groups.map(([n, c]) => `<span><i style="background:${c}"></i>${n}</span>`).join("")}</div>
    </div>
    <div ${ac(5, "lm-card line bal")}><b>${tr("Баланс групп", "Group balance")}</b><small class="mut">${tr("доля времени и норма за период", "share of time and target")}</small>
      ${groups.map(([n, c, v, s]) => `<div class="br"><span><i style="background:${c}"></i>${n}</span><span class="lm-bar out"><i style="--v:${v};background:${c}"></i></span><span class="mono mut">${s}</span></div>`).join("")}
    </div>
    <div ${ac(6, "lm-card line pt")}><b>${tr("Проекты по времени", "Projects by time")}</b><small class="mut">${tr("топ за период", "top of the period")}</small>
      ${projects.map(([n, c, v, s]) => `<div class="br"><span><i style="background:${c}"></i>${n}</span><span class="lm-bar out"><i style="--v:${v};background:${c}"></i></span><span class="mono mut">${s}</span></div>`).join("")}
    </div>
    <div ${ac(7, "lm-card line when")}><b>${tr("Когда вы работаете", "When you work")}</b><small class="mut">${tr("лучшие часы: 10:00, 11:00, 12:00", "best hours: 10:00, 11:00, 12:00")}</small>
      <div class="two"><small class="cap mono">${tr("СРЕДНЕЕ ПО ДНЯМ НЕДЕЛИ", "AVERAGE BY WEEKDAY")}</small><small class="cap mono">${tr("ПО ЧАСАМ СУТОК", "BY HOUR OF DAY")}</small><div class="lm-cols pills">${wd.map((v, i) => `<span style="--v:${v};--k:${i}"${i === 0 ? ' class="now"' : i % 2 ? ' class="dim"' : ""}></span>`).join("")}</div>
      <div class="lm-cols thin">${hours.map((v, i) => `<span style="--v:${Math.max(v, 0.02)};--k:${i}"${i === 11 ? ' class="now"' : ""}></span>`).join("")}</div></div>
    </div>
  </div>`;
}

const BODIES = {
  home: homeBody,
  habits: habitsBody,
  projects: projectsBody,
  tasks: tasksBody,
  finance: financeBody,
  nutrition: nutritionBody,
  health: healthBody,
  analytics: analyticsBody,
};

/** Shows a section in a Mac window made by `macShell`: the rail light slides to it, the page builds up block by block. */
function macShow(root, id) {
  const lm = root.querySelector(".lm");
  const item = lm.querySelector(`.lm-ri[data-id="${id}"]`);
  lm.querySelectorAll(".lm-ri").forEach((r) => r.classList.toggle("on", r === item));
  const hl = lm.querySelector(".lm-rail-hl");
  hl.style.transform = `translateY(${item.offsetTop}px)`;
  const head = lm.querySelector(".lm-head");
  const body = lm.querySelector(".lm-body");
  head.innerHTML = macHead(id);
  body.className = `lm-body s-${id}`;
  body.innerHTML = BODIES[id]();
  head.classList.remove("enter");
  body.classList.remove("enter");
  void body.offsetWidth;
  head.classList.add("enter");
  body.classList.add("enter");
  stagger(head);
  stagger(body);
  countUp(body);
}

/** Switches a Mac window to another section: the old page steps back first, then the new one builds up. */
function macSwitch(root, id) {
  const body = root.querySelector(".lm-body");
  clearTimeout(root.swapTimer);
  if (!body.children.length || reduced) return macShow(root, id);
  body.classList.add("leave");
  root.swapTimer = setTimeout(() => {
    body.classList.remove("leave");
    macShow(root, id);
  }, 240);
}

/** Numbers every piece inside a block, so a block's insides arrive just after the block itself. */
function stagger(scope) {
  scope.querySelectorAll(".a, .lm-hrow, .lm-hrow2").forEach((el) => {
    [...el.children].forEach((c, j) => c.style.setProperty("--j", String(j)));
  });
}

/** The first look at a window: it rises, then is put together piece by piece (rail, header, cards, their insides). */
function build(box) {
  const shell = box.querySelector(".lm, .lp");
  const pieces = shell.querySelectorAll(".lm-head, .lm-body, .lp-screen:not(.out)");
  shell.classList.remove("build");
  pieces.forEach((e) => e.classList.remove("enter", "slide"));
  void shell.offsetWidth;
  shell.classList.add("build");
  pieces.forEach((e) => e.classList.add("enter"));
  countUp(shell);
  box.closest(".app-frame, .phone-frame")?.classList.add("risen");
  // the long wait before the first build is for the first show only; switching sections starts at once
  clearTimeout(box.buildTimer);
  box.buildTimer = setTimeout(() => shell.classList.remove("build"), 3600);
}

/** Numbers marked with data-count run up to their value. */
function countUp(scope) {
  scope.querySelectorAll("[data-count]").forEach((el) => {
    const end = Number(el.dataset.count);
    const suf = el.dataset.suf || "";
    const t0 = performance.now();
    const dur = reduced ? 1 : 1100;
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      const v = Math.round(end * (1 - Math.pow(1 - k, 3)));
      el.textContent = (el.dataset.sep ? v.toLocaleString("ru-RU") : String(v)) + suf;
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

// ------------------------------------------------------------------ the phone app

const TABS = [
  ["home", "layout-grid", "Главная", "Home"],
  ["tasks", "list-checks", "Задачи", "Tasks"],
  ["inbox", "inbox", "Входящие", "Inbox"],
  ["plus", "plus", "", ""],
  ["habits", "repeat", "Привычки", "Habits"],
  ["chat", "sparkles", "Агент", "Agent"],
  ["more", "menu", "Ещё", "More"],
];

function phoneShell() {
  return `<div class="lp">
    <div class="lp-status"><span class="mono">9:41</span><span class="lp-island"></span><span class="lp-sig"><i></i><i></i><i></i></span></div>
    <div class="lp-screens"></div>
    <nav class="lp-tabs">${TABS.map(([id, icon, ru, en]) =>
      id === "plus"
        ? `<span class="lp-plus">${ic("plus", 26)}</span>`
        : `<span class="lp-tab" data-id="${id}" style="--t:${TABS.findIndex((x) => x[0] === id)}">${ic(icon, 22)}<b>${tr(ru, en)}</b></span>`,
    ).join("")}</nav>
  </div>`;
}

const week = (dots) =>
  `<div class="lp-week">${tr("пн вт ср чт пт сб вс", "mo tu we th fr sa su")
    .split(" ")
    .map(
      (d, i) =>
        `<span${i === 6 ? ' class="now"' : ""}><small>${d}</small><b>${i < 6 ? 26 + i : 1}</b>${dots && i < 4 ? "<i></i>" : ""}</span>`,
    )
    .join("")}</div>`;
const phHead = (title, icon, back) =>
  `<div class="lp-head">${back ? `<span class="lp-btn">${ic("chevron-left", 20)}</span>` : ""}<b>${title}</b><span class="sp"></span><span class="lp-btn">${ic(icon, 20)}</span></div>`;

function phoneHome() {
  const habits = HABITS();
  const done = [true, false, true, false, false];
  const events = [
    ["var(--c-teal)", tr("Поездка в Казань", "Trip to Kazan"), tr("Сегодня", "Today")],
    ["var(--c-blue)", tr("Сдать лендинг", "Hand in the landing page"), tr("пн, 2 нояб.", "Mon, 2 Nov")],
    ["var(--c-yellow)", tr("День рождения Димы", "Dima's birthday"), tr("чт, 5 нояб.", "Thu, 5 Nov")],
  ];
  const ring = 2 * Math.PI * 40;
  return `${phHead(tr("Добрый день", "Good afternoon"), "sparkles")}
    <div class="lp-pad">
      <div ${ac(0, "lp-sum")}><svg class="rg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" class="tr"/><circle cx="50" cy="50" r="40" class="arc" style="--len:${ring};--v:0.45"/></svg>
        <div class="rin"><b>5</b><small>${tr("из 11", "of 11")}</small></div>
        <div class="sumrows"><span>${tr("Дела", "Tasks")}<b>1 <i>/ 5</i></b></span><span>${tr("Привычки", "Habits")}<b>2 <i>/ 5</i></b></span></div>
        <div class="tm"><span>${tr("Время за день", "Time today")}</span><b>${tr("3 ч 20 м", "3 h 20 m")} <i>/ ${tr("8 ч", "8 h")}</i></b></div><span class="lp-bar"><i style="--v:0.42"></i></span>
      </div>
      <div ${ac(1, "lp-cap")}>${tr("ДЕЛА НА СЕГОДНЯ", "TODAY")}</div>
      <div ${ac(2, "lp-list")}>${[
        [tr("отклики по работе", "job applications"), false],
        [tr("трекер — свой проект", "tracker — my own project"), true],
        [tr("купить зубную пасту", "buy toothpaste"), false],
      ]
        .map(([x, on]) => `<div class="li${on ? " done" : ""}">${check(on)}<span>${x}</span></div>`)
        .join("")}</div>
      <div ${ac(3, "lp-cap")}>${tr("ПРИВЫЧКИ", "HABITS")}<span>${tr("Все", "All")}</span></div>
      <div ${ac(4, "lp-rings")}>${habits.map((h, i) => `<span${done[i] ? ' class="on"' : ""} style="--c:${h.c}"><i>${ic(h.icon, 22)}</i><small>${h.name}</small></span>`).join("")}</div>
      <div ${ac(5, "lp-cap")}>${tr("БЛИЖАЙШЕЕ", "COMING UP")}<span>${tr("Календарь", "Calendar")}</span></div>
      <div ${ac(6, "lp-list")}>${events.map(([c, n, d]) => `<div class="li ev"><i style="background:${c}"></i><span><b>${n}</b><small>${d}</small></span></div>`).join("")}</div>
    </div>`;
}

function phoneTasks() {
  const items = [
    [tr("отклики по работе", "job applications"), false, ""],
    [tr("английский", "English"), false, "!1"],
    [tr("чтение 3ч", "reading 3h"), false, ""],
    [tr("трекер — свой проект", "tracker — my own project"), true, ""],
    [tr("купить зубную пасту", "buy toothpaste"), false, ""],
  ];
  return `${phHead(tr("Задачи", "Tasks"), "plus")}
    <div class="lp-pad">${week(true)}
      <div ${ac(0, "lp-new")}>${ic("plus", 20)}<span data-ph-new>${tr("Новое дело", "New task")}</span></div>
      <div ${ac(1, "lp-list")} data-ph-tasks>${items.map(([x, on, p]) => `<div class="li${on ? " done" : ""}">${check(on)}<span>${x}</span>${p ? `<em class="mono">${p}</em>` : ""}</div>`).join("")}</div>
      <div ${ac(2, "lp-carry")}>${ic("arrow-down-to-line", 18)}${tr("Перенести сюда незакрытые · 5", "Move unfinished here · 5")}</div>
    </div>`;
}

function phoneHabits() {
  const habits = HABITS();
  const groups = [
    [tr("ЗДОРОВЬЕ", "HEALTH"), "var(--c-green)", [0, 3]],
    [tr("УЧЁБА", "STUDY"), "var(--c-violet)", [1]],
    [tr("ЛИЧНОЕ", "PERSONAL"), "var(--c-yellow)", [2, 4]],
  ];
  const ring = 2 * Math.PI * 22;
  let n = 1;
  return `${phHead(tr("Привычки", "Habits"), "plus")}
    <div class="lp-pad">${week(false)}
      <div ${ac(0, "lp-today")}><b data-ph-done>0</b><span>${tr("из 5 сегодня", "of 5 today")}</span></div>
      <span class="lp-bar light"><i data-ph-bar style="--v:0"></i></span>
      ${groups
        .map(
          ([
            g,
            c,
            ids,
          ]) => `<div ${ac(n++, "lp-cap")}><span class="gdot" style="background:${c}"></span>${g}<span class="cnt">0/${ids.length}</span></div>
        <div ${ac(n++, "lp-list hab")}>${ids
          .map((k) => {
            const h = habits[k];
            const count = !h.unit;
            return `<div class="li" data-ph-h="${k}"><span class="hring" style="--c:${h.c}"><svg class="rg" viewBox="0 0 52 52"><circle cx="26" cy="26" r="22" class="tr"/><circle cx="26" cy="26" r="22" class="arc" style="--len:${ring}"/></svg>${ic(h.icon, 20)}</span>
              <span class="hn"><b>${h.name}</b><small data-ph-v>0 ${tr("из", "of")} ${count ? h.goal : `${String(h.goal).replace(".", tr(",", "."))} ${h.unit}`}</small></span>
              ${count ? `<span class="lp-cnt"><span class="o">${ic("minus", 16)}</span><b>0</b><span class="d">${ic("plus", 16)}</span></span>` : `<span class="lp-time">0 ${h.unit}</span><span class="lp-go">${ic("play", 16)}</span>`}</div>`;
          })
          .join("")}</div>`,
        )
        .join("")}
    </div>`;
}

function phoneChat() {
  return `${phHead(tr("Агент Luma", "Luma agent"), "trash", true)}
    <div class="lp-chat" data-ph-chat>
      <div class="hello"><span class="av">${ic("sparkles", 28)}</span><b>${tr("Привет! Я ag_luma", "Hi! I'm ag_luma")}</b><small>${tr("Спросите о времени, делах и привычках. Могу и записать: дело, трату, событие.", "Ask about your time, tasks and habits. I can log things too: a task, an expense, an event.")}</small></div>
    </div>
    <div class="lp-composer">${ic("paperclip", 20)}<span>${tr("Написать ag_luma", "Message ag_luma")}</span><span class="mic">${ic("mic", 20)}</span></div>`;
}

const PHONE = { home: phoneHome, tasks: phoneTasks, habits: phoneHabits, chat: phoneChat };

/** Opens a phone screen: it slides in from the side, the tab pill moves to it. */
function phoneShow(root, id, dir = 1) {
  const lp = root.querySelector(".lp");
  const host = lp.querySelector(".lp-screens");
  const old = host.querySelector(".lp-screen:not(.out)");
  const scr = document.createElement("div");
  scr.className = `lp-screen p-${id} enter${old ? " slide" : ""}`;
  scr.style.setProperty("--dir", dir);
  scr.innerHTML = PHONE[id]();
  stagger(scr);
  host.appendChild(scr);
  if (old) {
    old.classList.add("out");
    old.style.setProperty("--dir", dir);
    setTimeout(() => old.remove(), 600);
  }
  lp.querySelectorAll(".lp-tab").forEach((t) => t.classList.toggle("on", t.dataset.id === id));
  lp.classList.toggle("chat", id === "chat");
  return scr;
}

/** Fits drawn-at-real-size screens into their boxes. */
const fitter = new ResizeObserver((entries) => {
  for (const e of entries) {
    const box = e.target;
    const w = Number(box.dataset.w);
    box.style.setProperty("--s", String(box.clientWidth / w));
  }
});
function mount(box, kind) {
  box.dataset.w = kind === "mac" ? "1280" : "390";
  box.classList.add("fit", `fit-${kind}`);
  box.innerHTML = kind === "mac" ? macShell() : phoneShell();
  fitter.observe(box);
  box.style.setProperty("--s", String(box.clientWidth / Number(box.dataset.w)));
}

/** After a language switch: the rail and tab-bar names of every drawn window follow it. */
function relabelShells() {
  const names = Object.fromEntries(RAIL.concat(RAIL_BOTTOM, TABS).map(([id, , ru, en]) => [id, tr(ru, en)]));
  document.querySelectorAll(".lm-ri").forEach((el) => (el.querySelector("i").textContent = names[el.dataset.id]));
  document.querySelectorAll(".lp-tab").forEach((el) => (el.querySelector("b").textContent = names[el.dataset.id]));
}

// Luma presentation page: texts in two languages, and the small live demos (hero, playground, agent, sync, counters).

/** The author: the name shown on the page and the portfolio site the top-bar button leads to. */
const AUTHOR = {
  name: { ru: "Артемий Сторожевских", en: "Artemii Storozhevskikh" },
  site: "https://asto-portfolio.ru",
  /** The public repository. Empty until it is published: the "Code on GitHub" button stays hidden. */
  github: "",
};

/** The installers, served next to the page from the hosting (put the built files into site/downloads/). */
const DOWNLOADS = {
  mac: { href: "downloads/Luma-0.1.0-arm64.dmg", size: { ru: "152 МБ", en: "152 MB" } },
  android: { href: "downloads/Luma-0.1.0.apk", size: { ru: "9 МБ", en: "9 MB" } },
};

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ------------------------------------------------------------------ texts

const T = {
  ru: {
    "nav.how": "Как работает",
    "hero.download": "Скачать",
    "nav.download": "Скачать",
    "e.github": "Код на GitHub",
    "d.kicker": "Скачать",
    "d.title": "Поставь Luma себе",
    "d.lead": "Бесплатно. База хранится на твоём Mac. В облако ничего не уходит, пока сам не включишь чат с Claude или зеркало в Google Таблицах. ИИ работает на твоём собственном ключе Claude.",
    "d.macReq": "Apple Silicon (M1 и новее), macOS 13+",
    "d.macBtn": "Скачать для Mac",
    "d.androidReq": "Android 7 и новее, работает вместе с Mac",
    "d.androidBtn": "Скачать для Android",
    "d.version": "версия {v} · {size}",
    "d.s1t": "Установи на Mac",
    "d.s1": "Открой .dmg и перетащи Luma в «Программы». Если Mac не даёт открыть: Системные настройки → Конфиденциальность и безопасность → «Всё равно открыть». Для голоса нужен whisper-cpp (brew install whisper-cpp).",
    "d.s2t": "Подключи свой ИИ",
    "d.s2":
      "В «Настройках» впиши свой ключ Claude в карточке ag_luma. Без ключа всё работает, а чат отвечает по правилам.",
    "d.s3t": "Добавь телефон",
    "d.s3": "Поставь приложение на Android, на Mac открой «Настройки → Телефон» и отсканируй код.",
    "d.note": "Приложение пока не подписано у Apple и Google, поэтому система один раз спросит разрешение на запуск.",
    "a.site": "Перейти на личный сайт автора",
    "w.try": "Нажми на пример — или впиши своё справа:",
    "a.about":
      "Строю автоматизацию бизнес-процессов на ИИ-агентах — на работе и в своих проектах. Каждая задача у меня начинается с бизнес-проблемы, а не с тикета: параллельно учусь на продакт-менеджера. Сейчас перехожу от встраивания готовых моделей к собственным агентным системам.",
    "a.kicker": "Автор",
    "f.say": "Скажи ИИ:",
    "nav.features": "Возможности",
    "nav.agent": "ИИ-агент",
    "nav.phone": "Везде",
    "nav.site": "Сайт автора",
    "nav.back": "Вернуться",
    "p.kicker": "Везде с тобой",
    "p.title": "Та же Luma в кармане",
    "p.lead":
      "Android-приложение — второе окно в те же данные, а не отдельная копия. Всё, что отметил в дороге, уже на Mac.",
    "p.s1t": "Главная",
    "p.s1": "Дела, привычки и время дня одним взглядом.",
    "p.s2t": "Задачи",
    "p.s2": "Вписал дело одной строкой — оно уже в списке.",
    "p.s3t": "Привычки",
    "p.s3": "Тап по кольцу — привычка отмечена, серия растёт.",
    "p.s4t": "Агент голосом",
    "p.s4": "Сказал «отметь йогу и запиши ужин» — агент сделал.",
    "nav.eng": "Как сделано",
    "nav.author": "Автор",
    "hero.eyebrow": "Luma · приложение для Mac и Android",
    "hero.title": 'Вся жизнь в одном приложении. И <span class="glow-word">ИИ</span>, который ведёт её за тебя.',
    "hero.lead":
      "Привычки, задачи, проекты, деньги, еда и тренировки — в одном месте. Пишешь или говоришь как человеку, а Luma сама записывает, считает и показывает, куда уходят твои время и деньги.",
    "hero.more": "Как это сделано",
    "hero.b1": "Mac",
    "hero.b2": "Android",
    "hero.b3": "ИИ-агент",
    "hero.b4": "Данные хранятся на твоём Mac",
    "how.s1t": "Пишешь как человеку",
    "how.s1": "Одной фразой или голосом. Никаких форм, полей и выпадающих списков.",
    "how.s2t": "Luma разбирает фразу",
    "how.s2": "Понимает, что это трата, привычка или задача; переводит валюту, считает калории и время.",
    "how.s3t": "Запись в нужном разделе",
    "how.s3":
      "Куда ушли неделя и деньги, какие привычки держатся, что съедено и сколько натренировано — на одном экране.",
    "f.kicker": "Возможности",
    "f.title": "Восемь областей жизни — одна система",
    "f.lead": "Восемь разделов, которые знают друг о друге. Под каждым — что он умеет и какую фразу понимает ИИ.",
    "w.kicker": "Как это работает",
    "w.title": "Не заполняй формы. Просто напиши.",
    "w.lead":
      "Одна строка вместо формы: Luma сама понимает, что это — дело, трата, еда или тренировка, и раскладывает по полям. Так же работает чат с агентом и голос.",
    "ag.kicker": "Главное",
    "ag.title": "ИИ-агент, которому можно доверить свои данные",
    "ag.lead":
      "Пишешь или говоришь — агент сам находит нужное и делает. Всё, что он сделал, видно в журнале, а удалённое неделю можно вернуть из корзины.",
    "ag.logNote": "удалённое 7 дней в корзине",
    "ag.result": "Что изменилось в Luma",
    "ag.status": "на связи · 131 инструмент",
    "ag.log": "Действия ИИ",
    "ag.p1t": "Понимает",
    "ag.p1": "Обычная речь и голос, имена вместо кодов, «в пятницу» и «+80к».",
    "ag.p2t": "Не навредит",
    "ag.p2": "Удаляет только после подтверждения, удалённое неделю лежит в корзине, каждое действие в журнале.",
    "ag.p3t": "Подключается к любому ИИ",
    "ag.p3": "Встроенный чат, Claude, Cursor или свой скрипт управляют Luma через один и тот же набор действий.",
    "s.kicker": "Одни данные на всех устройствах",
    "s.title": "Отметил на телефоне, и окно Mac видит запись через 0,1 с",
    "s.lead":
      "Mac, виджеты на рабочем столе, телефон и ИИ меняют одни и те же данные одновременно, и в проверках данные сходились. База хранится на твоём Mac, а в облако ничего не уходит, пока сам не включишь чат с Claude или зеркало в Google Таблицах.",
    "s.widget": "Виджет на рабочем столе",
    "e.kicker": "Для инженеров",
    "e.title": "Как это сделано: архитектура, решения и проверки",
    "e.lead":
      "Как устроена система, почему именно так и чем это подтверждено. Цифры из замеров, скрипты лежат в репозитории.",
  },
  en: {
    "nav.how": "How it works",
    "hero.download": "Download",
    "nav.download": "Download",
    "e.github": "Code on GitHub",
    "d.kicker": "Download",
    "d.title": "Get Luma for yourself",
    "d.lead": "Free. The database lives on your Mac. Nothing goes to the cloud until you turn on the Claude chat or the Google Sheets mirror yourself. The AI runs on your own Claude key.",
    "d.macReq": "Apple Silicon (M1 or newer), macOS 13+",
    "d.macBtn": "Download for Mac",
    "d.androidReq": "Android 7 or newer, works together with the Mac",
    "d.androidBtn": "Download for Android",
    "d.version": "version {v} · {size}",
    "d.s1t": "Install it on the Mac",
    "d.s1": "Open the .dmg and drag Luma to Applications. If the Mac won't open it: System Settings → Privacy & Security → Open Anyway. Voice needs whisper-cpp (brew install whisper-cpp).",
    "d.s2t": "Connect your AI",
    "d.s2":
      "In Settings, type your own Claude key on the ag_luma card. Without a key everything works and the chat answers by rules.",
    "d.s3t": "Add your phone",
    "d.s3": "Install the Android app, open Settings → Phone on the Mac and scan the code.",
    "d.note": "The app is not yet signed with Apple and Google, so the system asks once for permission to run it.",
    "a.site": "Go to the author's personal site",
    "w.try": "Tap an example — or type your own on the right:",
    "a.about":
      "I build business-process automation on AI agents — at work and in my own projects. Every task starts for me as a business problem, not a ticket: I also study product management. Right now I'm moving from plugging in off-the-shelf models to designing my own agentic systems.",
    "a.kicker": "The author",
    "f.say": "Tell the AI:",
    "nav.features": "Features",
    "nav.agent": "AI agent",
    "nav.phone": "Everywhere",
    "nav.site": "Author's site",
    "nav.back": "Back",
    "p.kicker": "Everywhere with you",
    "p.title": "The same Luma in your pocket",
    "p.lead":
      "The Android app is a second window into the same data, not a separate copy. Whatever you mark on the go is already on the Mac.",
    "p.s1t": "Home",
    "p.s1": "Tasks, habits and the day's time at a glance.",
    "p.s2t": "Tasks",
    "p.s2": "Type a task in one line and it's on the list.",
    "p.s3t": "Habits",
    "p.s3": "Tap a ring: the habit is marked, the streak grows.",
    "p.s4t": "Agent by voice",
    "p.s4": "Say “mark yoga and log dinner” and the agent does it.",
    "nav.eng": "Engineering",
    "nav.author": "Author",
    "hero.eyebrow": "Luma · an app for Mac and Android",
    "hero.title": 'Your whole life in one app. And an <span class="glow-word">AI</span> that runs it for you.',
    "hero.lead":
      "Habits, tasks, projects, money, food and workouts in one place. Write or speak as you would to a person: Luma records it, does the math and shows where your time and money go.",
    "hero.more": "How it is built",
    "hero.b1": "Mac",
    "hero.b2": "Android",
    "hero.b3": "AI agent",
    "hero.b4": "Data stays on your Mac",
    "how.s1t": "Write like you'd say it",
    "how.s1": "One sentence or a voice note. No forms, fields or drop-downs.",
    "how.s2t": "Luma parses the phrase",
    "how.s2": "It knows an expense from a habit or a task, converts currency, counts calories and time.",
    "how.s3t": "It lands in the right place",
    "how.s3":
      "Where the week and the money went, which habits hold, what you ate and how much you trained — on one screen.",
    "f.kicker": "Features",
    "f.title": "Eight areas of life — one system",
    "f.lead": "Eight areas that know about each other. Under each: what it does and a phrase the AI understands.",
    "w.kicker": "How it works",
    "w.title": "Don't fill in forms. Just write.",
    "w.lead":
      "One line instead of a form: Luma works out whether it is a task, an expense, a meal or a workout and fills in the fields. The agent's chat and voice work the same way.",
    "ag.kicker": "The core",
    "ag.title": "An AI agent you can trust with your data",
    "ag.lead":
      "Type or speak — the agent finds what is needed and does it. Everything it did is in the log, and anything deleted can be restored from the trash for a week.",
    "ag.logNote": "deleted items stay in the trash for 7 days",
    "ag.result": "What changed in Luma",
    "ag.status": "online · 131 tools",
    "ag.log": "AI actions",
    "ag.p1t": "Understands",
    "ag.p1": "Plain speech and voice, names instead of ids, “on Friday” and “+80k”.",
    "ag.p2t": "Does no harm",
    "ag.p2": "Deletes only after confirmation, deleted things stay in the trash for a week, every action is logged.",
    "ag.p3t": "Works with any AI",
    "ag.p3": "The built-in chat, Claude, Cursor or your own script drive Luma through the same set of actions.",
    "s.kicker": "One set of data on every device",
    "s.title": "Tick it on the phone, and the Mac window sees the write in 0.1 s",
    "s.lead":
      "The Mac, desktop widgets, the phone and the AI change the same data at the same time, and in the checks the data stayed in sync. The database lives on your Mac, and nothing goes to the cloud until you turn on the Claude chat or the Google Sheets mirror yourself.",
    "s.widget": "Desktop widget",
    "e.kicker": "For engineers",
    "e.title": "How it's built: architecture, decisions and checks",
    "e.lead":
      "How the system is built, why it is built that way, and what proves it. The numbers come from measurements; the scripts are in the repository.",
  },
};

// The language from the main site (cookie lang: ru/en/de) takes precedence: from the Russian version of the portfolio the presentation
// opens in Russian, from the English or German one, in English.
const siteLang = (document.cookie.match(/(?:^|;\s*)lang=(ru|en|de)\b/) || [])[1];
let lang = (() => {
  if (siteLang) return siteLang === "ru" ? "ru" : "en";
  try {
    return localStorage.getItem("luma-site-lang") || (navigator.language.startsWith("ru") ? "ru" : "en");
  } catch {
    return "ru";
  }
})();
const t = (key) => T[lang][key] ?? key;

// The tab title and the description for search engines are also in the selected language.
const PAGE_META = {
  ru: [
    "Luma: вся жизнь в одном приложении, и ИИ, который ведёт её за тебя",
    "Luma: привычки, задачи, проекты, деньги, еда и тренировки в одном приложении для Mac и Android. ИИ-агент записывает и считает всё по обычным словам.",
  ],
  en: [
    "Luma: your whole life in one app, and an AI that runs it for you",
    "Luma: habits, tasks, projects, money, food and workouts in one app for Mac and Android. An AI agent logs and tracks everything from plain words.",
  ],
};

function applyLang() {
  document.documentElement.lang = lang;
  document.title = PAGE_META[lang][0];
  document.querySelector('meta[name="description"]')?.setAttribute("content", PAGE_META[lang][1]);
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.innerHTML = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-name]").forEach((el) => (el.textContent = AUTHOR.name[lang]));
  document.getElementById("lang").textContent = lang === "ru" ? "EN" : "RU";
  splitHeadline();
  if (typeof titleNav === "function") titleNav();
  relabelShells();
  document.querySelectorAll("[data-meta]").forEach((el) => {
    el.textContent = t("d.version").replace("{v}", "0.1.0").replace("{size}", DOWNLOADS[el.dataset.meta].size[lang]);
  });
  if (typeof pg !== "undefined") render(parse(pg.value));
  buildFeatures();
  buildEng();
  buildExamples();
  restartDemos();
}
document.getElementById("lang").addEventListener("click", () => {
  lang = lang === "ru" ? "en" : "ru";
  try {
    localStorage.setItem("luma-site-lang", lang);
  } catch {
    /* a private window: the choice lasts until reload */
  }
  // The switcher changes the language on the main site too, so the choice doesn't conflict with the cookie.
  document.cookie = `lang=${lang}; path=/; max-age=31536000; samesite=lax`;
  applyLang();
});

// ------------------------------------------------------------------ helpers

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const $ = (id) => document.getElementById(id);
/** Runs `run` while `el` is on screen; a newer run (language switch) cancels the older one. */
const runs = new Map();
function whileVisible(el, run) {
  let token = 0;
  const start = () => {
    token++;
    const mine = token;
    run(() => mine !== token || !el.dataset.visible);
  };
  runs.set(el, start);
  new IntersectionObserver(
    ([e]) => {
      if (e.isIntersecting && !el.dataset.visible) {
        el.dataset.visible = "1";
        start();
      } else if (!e.isIntersecting) {
        delete el.dataset.visible;
        token++;
      }
    },
    { threshold: 0.25 },
  ).observe(el);
}
function restartDemos() {
  for (const [el, start] of runs) if (el.dataset.visible) start();
}
async function typeInto(el, text, cancelled, speed = 38) {
  el.textContent = "";
  for (const ch of text) {
    if (cancelled()) return false;
    el.textContent += ch;
    await sleep(reduced ? 0 : speed + Math.random() * 30);
  }
  return true;
}

// ------------------------------------------------------------------ reveal + floating button

const revealer = new IntersectionObserver(
  (entries) =>
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        revealer.unobserve(e.target);
      }
    }),
  { threshold: 0.15 },
);
document.querySelectorAll(".reveal").forEach((el, i) => {
  el.style.transitionDelay = `${(i % 3) * 90}ms`;
  revealer.observe(el);
});
document.querySelectorAll("[data-author-site]").forEach((a) => (a.href = AUTHOR.site));
document.querySelectorAll('[data-link="github"]').forEach((a) => (AUTHOR.github ? (a.href = AUTHOR.github) : a.remove()));
document.querySelectorAll("[data-download]").forEach((a) => (a.href = DOWNLOADS[a.dataset.download].href));
document
  .querySelectorAll("#download [data-ic]")
  .forEach((el) => (el.innerHTML = ic(el.dataset.ic, el.classList.contains("dl-ic") ? 30 : 18)));

// ------------------------------------------------------------------ the top bar: a dock like the phone's tab bar

const topbar = document.querySelector(".topbar");
const navLinks = [...document.querySelectorAll(".topnav a[data-sec]")];
navLinks.forEach((l) => (l.querySelector(".nav-ic").innerHTML = ic(l.dataset.icon, 17)));
// folded into icons, a link still says its name on hover
const titleNav = () => navLinks.forEach((l) => (l.title = l.querySelector(".nav-t").textContent));
/** At the very top the dock shows every name; further down only the section you are in keeps its name, in yellow. */
function markTop() {
  topbar.classList.toggle("top", scrollY < 80);
  markSection();
}
const spied = new Map();
/**
 * The section in the middle band of the screen is the current one. The last section is too short to ever reach the
 * middle, so at the very bottom of the page it is the current one.
 */
function markSection() {
  const order = ["download", "how", "features", "phone", "agent", "engineering", "author"];
  const atBottom = innerHeight + scrollY >= document.documentElement.scrollHeight - 8;
  const on = atBottom ? order[order.length - 1] : order.find((k) => spied.get(k)) || null;
  navLinks.forEach((l) => l.classList.toggle("on", l.dataset.sec === on));
  // on a phone the dock scrolls sideways: keep the current section's icon in view
  if (on !== lastOn) {
    lastOn = on;
    const a = navLinks.find((l) => l.dataset.sec === on);
    const nav = topbar.querySelector(".topnav");
    if (nav.scrollWidth > nav.clientWidth + 1) {
      const smooth = !matchMedia("(prefers-reduced-motion: reduce)").matches;
      const left = a ? a.offsetLeft - (nav.clientWidth - a.offsetWidth) / 2 : 0;
      nav.scrollTo({ left, behavior: smooth ? "smooth" : "auto" });
    }
  }
}
let lastOn = null;
markTop();
addEventListener("scroll", markTop, { passive: true });
const spy = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => spied.set(e.target.id, e.isIntersecting));
    markSection();
  },
  { rootMargin: "-45% 0px -50% 0px" },
);
["download", "how", "features", "phone", "agent", "engineering", "author"].forEach((id) => spy.observe($(id)));

// ------------------------------------------------------------------ hero: commands typed, results pop on the real screen

/** The sections on the orbit around the input line: [id, icon, colour]. */
const ORBIT = [
  ["habits", "repeat", "#1baf7a"],
  ["tasks", "list-todo", "#2a78d6"],
  ["calendar", "calendar-days", "#4a3aa7"],
  ["finance", "wallet", "#eda100"],
  ["nutrition", "apple", "#eb6834"],
  ["health", "dumbbell", "#008300"],
  ["projects", "folder-kanban", "#e87ba4"],
  ["analytics", "chart-column", "#6b7280"],
];
const ORBIT_NAMES = {
  ru: {
    habits: "Привычки",
    tasks: "Задачи",
    calendar: "Календарь",
    finance: "Финансы",
    nutrition: "Питание",
    health: "Здоровье",
    projects: "Проекты",
    analytics: "Аналитика",
  },
  en: {
    habits: "Habits",
    tasks: "Tasks",
    calendar: "Calendar",
    finance: "Finance",
    nutrition: "Nutrition",
    health: "Health",
    projects: "Projects",
    analytics: "Analytics",
  },
};
/** Each phrase: what is typed, which sections it reaches, and the cards that come out: [section, title, value]. */
const HERO_SCRIPT = {
  ru: [
    [
      "Запиши 350 000 донгов на ужин и час йоги",
      [
        ["finance", "Ужин · Кафе", "−14,30 $"],
        ["habits", "Йога", "1 ч ✓"],
      ],
    ],
    ["Завтра в 11:00 встреча с дизайнером", [["calendar", "Встреча с дизайнером", "завтра, 11:00"]]],
    ["гречка 150, курица 120 г", [["nutrition", "Обед", "363 ккал · Б 44 г"]]],
    ["жим лёжа 80x8, 80x8, 75x10", [["health", "Жим лёжа · 3 подхода", "1ПМ ≈ 101 кг"]]],
    [
      "Купить молоко и доделать лендинг",
      [
        ["tasks", "Купить молоко", "сегодня"],
        ["projects", "Доделать лендинг", "Сайт Luma"],
      ],
    ],
    ["Куда уходит моё время?", [["analytics", "Больше всего — «Работа»", "80% времени за месяц"]]],
  ],
  en: [
    [
      "Log 350,000 dong for dinner and an hour of yoga",
      [
        ["finance", "Dinner · Dining out", "−$14.30"],
        ["habits", "Yoga", "1 h ✓"],
      ],
    ],
    ["Tomorrow 11:00 meeting with the designer", [["calendar", "Meeting with the designer", "tomorrow, 11:00"]]],
    ["rice 150, chicken 120 g", [["nutrition", "Lunch", "393 kcal · P 41 g"]]],
    ["bench press 80x8, 80x8, 75x10", [["health", "Bench press · 3 sets", "1RM ≈ 101 kg"]]],
    [
      "Buy milk and finish the landing page",
      [
        ["tasks", "Buy milk", "today"],
        ["projects", "Finish the landing page", "Luma website"],
      ],
    ],
    ["Where does my time go?", [["analytics", "Mostly “Work”", "80% of the month's time"]]],
  ],
};
function buildOrbit() {
  const step = 360 / ORBIT.length;
  $("orbitSpin").innerHTML = ORBIT.map(
    ([id, icon, c], i) => `<div class="orb" data-id="${id}" style="--a:${i * step + step / 2}deg;--c:${c};--n:${i}">
      <span class="orb-beam"></span>
      <span class="orb-at"><span class="orb-up"><span class="orb-ic">${ic(icon, 22)}</span><span class="orb-name">${ORBIT_NAMES[lang][id]}</span></span></span>
    </div>`,
  ).join("");
}
buildOrbit();
whileVisible(document.querySelector(".hero"), async (cancelled) => {
  buildOrbit();
  $("heroTyped").textContent = "";
  const cards = $("orbitCards");
  cards.innerHTML = "";
  const orbs = () => [...document.querySelectorAll("#orbitSpin .orb")];
  for (let round = 0; !cancelled(); round++) {
    const [command, results] = HERO_SCRIPT[lang][round % HERO_SCRIPT[lang].length];
    // the last answer steps aside, the sections go dark
    cards.querySelectorAll(".oc").forEach((c) => c.classList.add("gone"));
    orbs().forEach((o) => o.classList.remove("lit"));
    await sleep(round === 0 ? 2600 : 500);
    cards.innerHTML = "";
    if (!(await typeInto($("heroTyped"), command, cancelled))) return;
    await sleep(300);
    if (cancelled()) return;
    document.querySelector(".orbit-input").classList.add("sent");
    setTimeout(() => document.querySelector(".orbit-input").classList.remove("sent"), 500);
    // the beam reaches each section the phrase is about, then its card comes out of the line
    for (const [k, [id, title, value]] of results.entries()) {
      const orb = document.querySelector(`#orbitSpin .orb[data-id="${id}"]`);
      orb.classList.add("lit");
      await sleep(380);
      if (cancelled()) return;
      const [, icon, c] = ORBIT.find((o) => o[0] === id);
      cards.insertAdjacentHTML(
        "beforeend",
        `<div class="oc" style="--c:${c};--k:${k}"><span class="oc-ic">${ic(icon, 18)}</span><span class="oc-t"><small>${ORBIT_NAMES[lang][id]}</small><b>${title}</b></span><span class="oc-v">${value}</span></div>`,
      );
      await sleep(260);
    }
    await sleep(3000);
  }
});

// ------------------------------------------------------------------ features: a tab per area

const FEATURES = {
  ru: [
    [
      "home",
      "Главная",
      "Весь день на одном экране: что сделать, что висит со вчера и сколько ушло времени и денег.",
      "что у меня сегодня?",
      [
        "Дела на сегодня и хвосты прошлых дней, перенос одной кнопкой",
        "Календарь месяца и ближайшие события",
        "Секундомер, деньги, привычки и проекты карточками",
        "Каждая карточка ведёт в свой раздел",
      ],
    ],
    [
      "habits",
      "Привычки",
      "Сетка «привычка × день»: вписываешь прямо в клетку, серии и рекорды считаются сами.",
      "отметь зарядку и час чтения",
      [
        "Три вида: да/нет, количество или время",
        "Норма на день, серия и рекорд у каждой",
        "Несколько секундомеров сразу, с паузой",
        "Группы привычек и аналитика по ним",
      ],
    ],
    [
      "projects",
      "Проекты",
      "У каждого проекта своя канбан-доска, а время по нему считается само.",
      "добавь в «Сайт Luma» задачу про скриншоты",
      [
        "Этапы-колонки, карточки перетаскиваются",
        "Номера, метки с фильтром, скриншоты на карточках",
        "Журнал карточки и документы проекта",
        "Прогресс и потраченные часы на обложке",
      ],
    ],
    [
      "tasks",
      "Задачи",
      "Колода дней: одна карточка — один день, незакрытое переезжает одной кнопкой.",
      "созвон с Димой завтра 15:00 !1",
      [
        "Дата, время, важность и длительность из одной строки",
        "Вчера, сегодня и завтра — рядом, листаются",
        "Хвосты прошлых дней переносятся разом",
        "Задачу можно привязать к проекту",
      ],
    ],
    [
      "finance",
      "Финансы",
      "Траты и доходы одной строкой в любой валюте; всё сводится к одной и сравнивается с прошлым периодом.",
      "такси 12 usd, кофе 250",
      [
        "Курс дня подставляется сам",
        "Баланс, категории и доли за период",
        "Частые траты — в одно нажатие",
        "Выгрузка в CSV; по желанию зеркало в Google Таблицах",
      ],
    ],
    [
      "nutrition",
      "Питание",
      "Калории и БЖУ без подсчётов вручную: пишешь, что съел, — Luma находит продукты и считает.",
      "гречка 150, курица 120 г, 2 яйца",
      [
        "≈7 700 продуктов в базе и свои продукты",
        "Белки, жиры, углеводы и откуда калории",
        "Вода стаканами, норма по росту и весу",
        "Неделя: средние калории и пропуски",
      ],
    ],
    [
      "health",
      "Здоровье",
      "Тренировки и рост силы: подходы из одной строки, программы сами повышают вес.",
      "жим лёжа 80x8, 80x8, 75x10",
      [
        "≈860 упражнений, свои упражнения",
        "Программы с автоматической прогрессией",
        "Расчётный максимум (1ПМ) и рекорды",
        "Подходы на группу мышц за неделю",
      ],
    ],
    [
      "analytics",
      "Аналитика",
      "Куда на самом деле уходит время: по дням, группам и проектам, с выводами словами.",
      "куда уходит моё время?",
      [
        "Отслежено, дни с записями, план против факта",
        "Баланс групп и топ проектов",
        "Лучшие часы и дни недели",
        "Итоги недели и месяца, советник на ИИ",
      ],
    ],
  ],
  en: [
    [
      "home",
      "Home",
      "The whole day on one screen: what to do, what's left from yesterday, where the time and money went.",
      "what's on today?",
      [
        "Today's tasks and leftovers, moved over in one tap",
        "The month's calendar and upcoming events",
        "Stopwatch, money, habits and projects as cards",
        "Every card leads to its section",
      ],
    ],
    [
      "habits",
      "Habits",
      "A habit × day grid: type straight into a cell, streaks and records count themselves.",
      "mark the workout and an hour of reading",
      [
        "Three kinds: yes/no, count or time",
        "A daily target, streak and record for each",
        "Several stopwatches at once, with pause",
        "Habit groups with their own analytics",
      ],
    ],
    [
      "projects",
      "Projects",
      "Every project has its own kanban board, and its time is counted on its own.",
      "add a screenshots task to “Luma website”",
      [
        "Stages as columns, drag the cards",
        "Numbers, labels with a filter, screenshots on cards",
        "Card history and project documents",
        "Progress and hours spent on the cover",
      ],
    ],
    [
      "tasks",
      "Tasks",
      "A deck of days: one card is one day, unfinished items move over in one tap.",
      "call Dima tomorrow 15:00 !1",
      [
        "Date, time, priority and length from one line",
        "Yesterday, today and tomorrow side by side",
        "Leftovers from past days moved at once",
        "A task can belong to a project",
      ],
    ],
    [
      "finance",
      "Finance",
      "Expenses and income in one line in any currency, brought to one and compared with the last period.",
      "taxi 12 usd, coffee 250",
      [
        "The day's exchange rate filled in",
        "Balance, categories and shares for the period",
        "Frequent expenses in one tap",
        "CSV export; an optional mirror in Google Sheets",
      ],
    ],
    [
      "nutrition",
      "Nutrition",
      "Calories and macros without manual math: write what you ate, Luma finds the foods and counts.",
      "rice 150, chicken 120 g, 2 eggs",
      [
        "≈7,700 foods plus your own",
        "Protein, fat, carbs and where calories come from",
        "Water by the glass, a target from height and weight",
        "The week: average calories and gaps",
      ],
    ],
    [
      "health",
      "Health",
      "Workouts and strength: sets from one line, programs raise the weight on their own.",
      "bench press 80x8, 80x8, 75x10",
      [
        "≈860 exercises plus your own",
        "Programs with automatic progression",
        "Estimated one-rep max and records",
        "Sets per muscle group this week",
      ],
    ],
    [
      "analytics",
      "Analytics",
      "Where your time really goes: by day, group and project, with insights in words.",
      "where does my time go?",
      [
        "Tracked time, days logged, plan versus actual",
        "Group balance and top projects",
        "Best hours and weekdays",
        "Weekly and monthly reviews, an AI advisor",
      ],
    ],
  ],
};
let featIndex = 0;
let featTouched = false;
function showFeature(i) {
  featIndex = i;
  const [img, title, lead, say, list] = FEATURES[lang][i];
  macSwitch(featMac, img);
  const text = document.querySelector(".feat-text");
  text.classList.remove("swap");
  void text.offsetWidth;
  text.classList.add("swap");
  $("featTitle").textContent = title;
  $("featLead").textContent = lead;
  $("featSay").textContent = lang === "en" ? `“${say}”` : `«${say}»`;
  $("featList").innerHTML = list.map((x) => `<li>${x}</li>`).join("");
  $("featTabs")
    .querySelectorAll("button")
    .forEach((b, k) => b.classList.toggle("on", k === i));
}
function buildFeatures() {
  const icons = {
    home: "layout-grid",
    habits: "repeat",
    projects: "folder-kanban",
    tasks: "list-todo",
    finance: "wallet",
    nutrition: "apple",
    health: "heart-pulse",
    analytics: "chart-column",
  };
  $("featTabs").innerHTML =
    `<p class="feat-hint">${ic("arrow-down-to-line", 14)}${lang === "ru" ? "Нажми на раздел — интерфейс переключится" : "Tap an area — the interface switches"}</p>` +
    FEATURES[lang]
      .map((f) => `<button type="button" role="tab">${ic(icons[f[0]], 18)}<span>${f[1]}</span></button>`)
      .join("");
  $("featTabs")
    .querySelectorAll("button")
    .forEach((b, k) =>
      b.addEventListener("click", () => {
        featTouched = true;
        document.querySelector(".feat").classList.add("touched");
        showFeature(k);
      }),
    );
  showFeature(featIndex);
}
const featMac = $("featMac");
mount(featMac, "mac");
// until a visitor picks one, the areas go round by themselves
whileVisible($("features"), async (cancelled) => {
  while (!cancelled() && !featTouched) {
    await sleep(5000);
    if (cancelled() || featTouched) return;
    showFeature((featIndex + 1) % FEATURES[lang].length);
  }
});

// ------------------------------------------------------------------ engineering: a one-page technical document

/** The project's passport: [number, label]. */
const SPEC = {
  ru: [
    ["~3 нед.", "от первого коммита, один инженер"],
    ["104k", "строк TypeScript в приложении, ещё 24k — Android"],
    ["3 202", "unit-теста · 118 оболочки Mac · 313 e2e"],
    ["44", "таблицы Postgres · 26 миграций"],
    ["133", "маршрута API · OpenAPI 3.1"],
    ["131", "инструмент для ИИ · MCP, REST, чат"],
    ["3", "клиента: Mac, Android, ИИ-агенты"],
    ["2", "языка интерфейса и разбора фраз"],
  ],
  en: [
    ["~3 wks", "from the first commit, one engineer"],
    ["104k", "lines of TypeScript in the app, 24k more on Android"],
    ["3,202", "unit tests · 118 Mac shell · 313 e2e"],
    ["44", "Postgres tables · 26 migrations"],
    ["133", "API routes · OpenAPI 3.1"],
    ["131", "AI tools · MCP, REST, chat"],
    ["3", "clients: Mac, Android, AI agents"],
    ["2", "languages of UI and phrase parsing"],
  ],
};
/**
 * Chapters: { id, t (title), s (one-line summary), kind, data }.
 * Kinds: arch (layers), adr (decision table), metrics (big numbers with how), rows (check → result), list (title, text), stack, limits.
 */
const DOC = {
  ru: [
    {
      id: "arch",
      t: "Архитектура",
      s: "Одна база на Mac, один реестр действий, один поток изменений для всех клиентов.",
      kind: "arch",
      data: {
        layers: [
          [
            "Клиенты",
            ["Окно Mac (Electron)", "Виджеты и трей", "Android через шлюз :3111", "ИИ-агенты: Claude, Cursor, скрипты"],
          ],
          ["Транспорт", ["REST /api/v1 · OpenAPI 3.1", "MCP /api/mcp (без состояния)", "Встроенный чат (Claude API)"]],
          [
            "Реестр 131 инструмента",
            ["Схема Zod на действие", "Права ключа: чтение / запись", "Имена вместо id, журнал аудита"],
          ],
          [
            "Сервисы",
            ["Правила предметной области", "Транзакции, очереди (мьютексы) в памяти процесса", "Удаление → корзина на 7 дней"],
          ],
          ["PGlite — Postgres в WASM", ["44 таблицы, 26 миграций", "Триггер на каждую запись → pg_notify"]],
        ],
        back: "SSE /api/v1/changes → каждый клиент обновляет ровно затронутые данные · ~100 мс",
      },
    },
    {
      id: "adr",
      t: "Ключевые решения",
      s: "Что выбрано, что отвергнуто и чем за это заплачено.",
      kind: "adr",
      data: [
        [
          "База на Mac",
          "Облако и аккаунты",
          "База хранится на Mac, в облако ничего не уходит, пока сам не включишь чат с Claude или зеркало в Google Таблицах; сервер слушает 127.0.0.1, проверяет Host и Origin",
          "Не для открытого интернета — записано в ограничениях",
        ],
        [
          "PGlite",
          "SQLite",
          "Триггеры, LISTEN/NOTIFY, jsonb — без установки СУБД",
          "Одно соединение, запросы по очереди; ~0,5 ГБ памяти",
        ],
        [
          "Поток изменений из базы",
          "Опрос; события из кода",
          "Триггер ловит любую запись — даже восстановление копии и синхронизацию с таблицей",
          "Тест сверяет карту «таблица → данные», новую таблицу не забыть",
        ],
        [
          "Идемпотентные записи",
          "Повтор «на удачу»",
          "Idempotency-Key на каждой записи, 409 на устаревшую правку, трёхстороннее слияние текста",
          "Сложнее клиент и API",
        ],
        [
          "Телефон — клиент",
          "Копия базы на телефоне",
          "Нет конфликтов синхронизации: база одна",
          "Без Mac правки копятся на телефоне и уходят, когда он снова доступен",
        ],
        [
          "Один реестр для всех ИИ",
          "Отдельный код под MCP, REST и чат",
          "Проверки, права, ошибки и журнал одни — поведение не расходится",
          "Схемы пришлось ужимать для моделей",
        ],
        [
          "Запрещено по умолчанию",
          "Список запретов",
          "Маршрут без классификации доступа валит тест",
          "Каждый новый маршрут — осознанное решение",
        ],
      ],
    },
    {
      id: "data",
      t: "Надёжность данных",
      s: "Запись, на которую ответили «готово», не терялась ни в одном проверенном сценарии.",
      kind: "rows",
      data: [
        ["kill -9 сервера и всей программы", "Ни одна подтверждённая запись не потеряна"],
        [
          "Экспорт → восстановление → экспорт",
          "Совпадение во всех таблицах; тест падает, если новая таблица не покрыта",
        ],
        [
          "16 испорченных и враждебных файлов копии",
          "Все отклонены, данные не тронуты — восстановление «всё или ничего»",
        ],
        ["Перед восстановлением", "Автоматическая копия текущих данных"],
        ["Ежедневная копия", "Файл с правами 600, хранится 14 штук"],
        ["Двойной старт / стоп секундомера", "Идёт по очереди (мьютекс в памяти процесса), время не задваивается"],
        ["Корзина", "22 вида объектов восстанавливаются неделю, в том числе агентом"],
      ],
    },
    {
      id: "perf",
      t: "Нагрузка и скорость",
      s: "Замерено на production-сборке; скрипты замеров лежат в репозитории.",
      kind: "metrics",
      data: [
        [
          "43 440",
          "операций за 5 минут, 8 потоков",
          "0 ошибок · p50 3 мс · p95 11–14 мс · память ровная",
          "scripts/perf/soak.mjs",
        ],
        [
          "5 130",
          "атакующих запросов ко всем инструментам и маршрутам",
          "0 ответов 5xx · 0 обрывов",
          "scripts/perf/api-fuzz.mjs",
        ],
        [
          "~40 мс",
          "задержка потока изменений, 4 писателя одновременно",
          "все проверки · окно Mac видит запись через 104 мс",
          "scripts/dev/sync-check.mjs",
        ],
        ["0,64 с", "медиана открытия страницы при 100× данных", "243 000 строк, импорт 78 МБ за 9 с", "seed ×100"],
        [
          "0 × 5xx",
          "244 смешанных запроса разом, удаление 60 проектов во время записи",
          "~1 900 задач, 60 параллельных вызовов MCP",
          "ручной стресс",
        ],
        [
          "до 434 → до 110 мс",
          "подвисание при смене вкладки на реальном Android",
          "экраны мемоизированы, анимации на компоновщике",
          "scripts/perf/phone-perf.mjs",
        ],
      ],
    },
    {
      id: "ai",
      t: "ИИ-слой",
      s: "Агенту можно дать доступ к данным — и он ничего не сломает.",
      kind: "list",
      data: [
        [
          "Один реестр — четыре входа",
          "MCP, REST, OpenAPI и встроенный чат используют одни инструменты <code>&lt;noun&gt;_&lt;verb&gt;</code>, одни проверки и один журнал.",
        ],
        [
          "Удобно модели",
          "Имена вместо id; на двусмысленное имя — список кандидатов; строгие схемы ловят опечатки; на неизвестный инструмент — подсказка с похожими.",
        ],
        [
          "Безопасно для человека",
          "Разрушающие действия только с <code>confirm: true</code>; удалённое — в корзину; очистить корзину может только человек.",
        ],
        [
          "Дёшево",
          "Каталог ~45 000 токенов сужается группами в 5 раз; чат получает группу, только когда о ней речь. 7 запросов на Haiku ≈ 0,7 цента.",
        ],
        [
          "Проверяется оценкой",
          "<code>ai-eval</code> гоняет фразы несколько раз и считает процент успеха: выбор инструмента, даты, деньги, «не выдумывать», «не слушаться команд из заметки».",
        ],
        [
          "Найден и исправлен баг",
          "Чат пересылал модели только текст прошлых ответов — модель «признавалась», что не вызывала инструменты. Теперь к ответам прикладывается журнал вызовов.",
        ],
      ],
    },
    {
      id: "sec",
      t: "Безопасность",
      s: "Ключ агента не может расширить свои права или выгрузить всё разом.",
      kind: "list",
      data: [
        ["Только локально", "Сервер на 127.0.0.1, проверка Host и Origin — от соседних вкладок и DNS-rebinding."],
        [
          "Запрещено по умолчанию",
          "Каждая папка API обязана быть классифицирована в таблице доступа; тест обходит папки и падает на неучтённой.",
        ],
        [
          "Только из интерфейса",
          "Ключи, доступ к API, резервные копии, список телефонов и чат недоступны по ключу агента.",
        ],
        [
          "Телефон",
          "6-значный код сопряжения на 5 минут, токен устройства хранится хешем, список запрещённых маршрутов на шлюзе.",
        ],
        [
          "Журнал",
          "Каждая запись агента — с ключом, кратким вводом и понятным человеку названием, видна в панели разработчика.",
        ],
      ],
    },
    {
      id: "test",
      t: "Тестирование и процесс",
      s: "Правила проекта проверяются тестами, а не код-ревью.",
      kind: "rows",
      data: [
        ["Unit и интеграция (Vitest)", "3 202 теста в 318 файлах — на настоящем Postgres в памяти, не на моках"],
        ["End-to-end (Playwright)", "275 сценариев на русском + 38 на английском, на production-сборке"],
        ["Оболочка Mac (node --test)", "118 тестов"],
        ["Защитные тесты", "Текст без перевода, маршрут без доступа, схема ≠ миграции, таблица вне резервной копии"],
        ["Часовые пояса", "Весь набор в 8 зонах — от UTC−11 до UTC+14"],
        [
          "Статика",
          "TypeScript strict, ESLint с правилами продукта, 0 предупреждений, knip — 0 мёртвого кода, Prettier",
        ],
        ["CI", "GitHub Actions на каждый push"],
      ],
    },
    {
      id: "stack",
      t: "Стек",
      s: "Каждый выбор — под конкретную задачу.",
      kind: "stack",
      data: [
        ["Приложение", ["TypeScript strict", "React 19", "Next.js 16", "Tailwind 4", "Radix UI", "TanStack Query"]],
        ["Данные", ["PGlite (Postgres в WASM)", "Drizzle ORM", "Zod", "SSE"]],
        ["Платформы", ["Electron", "Capacitor", "Vite", "Android"]],
        ["ИИ", ["Claude API", "MCP", "OpenAPI 3.1", "whisper (голос локально)"]],
        ["Качество", ["Vitest", "Playwright", "ESLint", "knip", "GitHub Actions"]],
      ],
    },
    {
      id: "limits",
      t: "Сознательно не сделано",
      s: "Записано, чтобы отсутствие не путали с недосмотром.",
      kind: "limits",
      data: [
        "Правка, сделанная на телефоне без Mac, видна на его экранах только после отправки на Mac",
        "Нет многопользовательского режима и облачной синхронизации, кроме необязательного зеркала в Google Таблицах: это данные одного человека",
        "Не рассчитан на открытый интернет: нет входа по паролю, порт нельзя открывать наружу",
        "PGlite — одно соединение: запросы принимаются параллельно, но выполняются по очереди",
        "Картинки не отдаются агентам — только количество и метаданные",
      ],
    },
  ],
  en: [
    {
      id: "arch",
      t: "Architecture",
      s: "One database on the Mac, one registry of actions, one change feed for every client.",
      kind: "arch",
      data: {
        layers: [
          [
            "Clients",
            [
              "Mac window (Electron)",
              "Widgets and tray",
              "Android via gateway :3111",
              "AI agents: Claude, Cursor, scripts",
            ],
          ],
          ["Transport", ["REST /api/v1 · OpenAPI 3.1", "MCP /api/mcp (stateless)", "Built-in chat (Claude API)"]],
          [
            "Registry of 131 tools",
            ["A Zod schema per action", "Key scope: read / write", "Names instead of ids, audit log"],
          ],
          ["Services", ["Domain rules", "Transactions, in-process queues (mutexes)", "Delete → trash for 7 days"]],
          ["PGlite — Postgres in WASM", ["44 tables, 26 migrations", "A trigger on every write → pg_notify"]],
        ],
        back: "SSE /api/v1/changes → each client refreshes exactly the affected data · ~100 ms",
      },
    },
    {
      id: "adr",
      t: "Key decisions",
      s: "What was chosen, what was rejected, and what it costs.",
      kind: "adr",
      data: [
        [
          "Database on the Mac",
          "Cloud and accounts",
          "The database lives on the Mac, and nothing goes to the cloud until you turn on the Claude chat or the Google Sheets mirror; the server listens on 127.0.0.1 and checks Host and Origin",
          "Not for the open internet — stated in the limits",
        ],
        [
          "PGlite",
          "SQLite",
          "Triggers, LISTEN/NOTIFY, jsonb — with no database to install",
          "One connection, requests run in turn; ~0.5 GB of memory",
        ],
        [
          "A change feed from the database",
          "Polling; events from code",
          "A trigger catches any write — even a backup restore or a sheet sync",
          "A test checks the table → data map, so no table is forgotten",
        ],
        [
          "Idempotent writes",
          "Retry and hope",
          "An Idempotency-Key on every write, 409 on a stale edit, a three-way text merge",
          "A more complex client and API",
        ],
        [
          "The phone is a client",
          "A database copy on the phone",
          "No sync conflicts: there is one database",
          "Without the Mac, edits wait on the phone and go once it is back",
        ],
        [
          "One registry for every AI",
          "Separate code for MCP, REST and chat",
          "Checks, permissions, errors and the log are shared — behaviour can't drift",
          "Schemas had to be slimmed for models",
        ],
        [
          "Deny by default",
          "A block list",
          "A route without an access class fails a test",
          "Every new route is a conscious decision",
        ],
      ],
    },
    {
      id: "data",
      t: "Data safety",
      s: "A write that was answered “done” was not lost in any tested scenario.",
      kind: "rows",
      data: [
        ["kill -9 of the server and the whole program", "No acknowledged write lost"],
        ["Export → restore → export", "Identical in every table; a test fails if a new table isn't covered"],
        ["16 damaged and hostile backup files", "All refused, data untouched — restore is all-or-nothing"],
        ["Before a restore", "An automatic backup of the current data"],
        ["Daily backup", "File mode 600, 14 kept"],
        ["Double timer start / stop", "Runs through an in-process queue (mutex), so time isn't doubled"],
        ["Trash", "22 kinds of things recoverable for a week, also by the agent"],
      ],
    },
    {
      id: "perf",
      t: "Load and speed",
      s: "Measured on a production build; the measurement scripts are in the repository.",
      kind: "metrics",
      data: [
        [
          "43,440",
          "operations in 5 minutes, 8 workers",
          "0 errors · p50 3 ms · p95 11–14 ms · flat memory",
          "scripts/perf/soak.mjs",
        ],
        [
          "5,130",
          "hostile requests to every tool and route",
          "0 5xx · 0 dropped connections",
          "scripts/perf/api-fuzz.mjs",
        ],
        [
          "~40 ms",
          "change-feed latency, 4 writers at once",
          "all checks · the Mac window sees a write in 104 ms",
          "scripts/dev/sync-check.mjs",
        ],
        ["0.64 s", "median page open at 100× the data", "243,000 rows, a 78 MB import in 9 s", "seed ×100"],
        [
          "0 × 5xx",
          "244 mixed requests at once, deleting 60 projects while writing",
          "~1,900 tasks, 60 parallel MCP calls",
          "manual stress",
        ],
        [
          "up to 434 → up to 110 ms",
          "tab-switch stall on a real Android phone",
          "memoised screens, compositor-driven animations",
          "scripts/perf/phone-perf.mjs",
        ],
      ],
    },
    {
      id: "ai",
      t: "AI layer",
      s: "You can give an agent your data — and it won't break anything.",
      kind: "list",
      data: [
        [
          "One registry, four doors",
          "MCP, REST, OpenAPI and the built-in chat share the same <code>&lt;noun&gt;_&lt;verb&gt;</code> tools, checks and log.",
        ],
        [
          "Easy for a model",
          "Names instead of ids; candidates for an ambiguous name; strict schemas catch typos; an unknown tool gets similar suggestions.",
        ],
        [
          "Safe for a person",
          "Destructive actions need <code>confirm: true</code>; deletions go to the trash; only a person can empty it.",
        ],
        [
          "Cheap",
          "The ~45,000-token catalogue narrows 5× by groups; the chat gets a group only when it comes up. 7 requests on Haiku ≈ 0.7 cents.",
        ],
        [
          "Checked by evaluation",
          "<code>ai-eval</code> runs phrases several times and reports a pass rate: tool choice, dates, money, “don't invent”, “don't obey orders hidden in a note”.",
        ],
        [
          "A bug found and fixed",
          "The chat resent only the text of earlier answers, so the model “admitted” it never called tools. Answers now carry the call log.",
        ],
      ],
    },
    {
      id: "sec",
      t: "Security",
      s: "An agent's key can't widen its own power or dump everything.",
      kind: "list",
      data: [
        ["Local only", "Server on 127.0.0.1, Host and Origin checked — against other tabs and DNS rebinding."],
        [
          "Deny by default",
          "Every API folder must be classified in the access table; a test walks the folders and fails on an unclassified one.",
        ],
        ["Interface-only", "Keys, API access, backups, the phone list and the chat are out of reach of an agent key."],
        ["Phone", "A 6-digit pairing code for 5 minutes, a device token stored as a hash, a deny list on the gateway."],
        [
          "Audit",
          "Every agent write is logged with its key, an input summary and a human-readable title, shown in the developer panel.",
        ],
      ],
    },
    {
      id: "test",
      t: "Testing and process",
      s: "Project rules are enforced by tests, not by review.",
      kind: "rows",
      data: [
        ["Unit and integration (Vitest)", "3,202 tests in 318 files — on real in-memory Postgres, not mocks"],
        ["End-to-end (Playwright)", "275 scenarios in Russian + 38 in English, on a production build"],
        ["Mac shell (node --test)", "118 tests"],
        ["Guard tests", "Untranslated text, a route without access, schema ≠ migrations, a table outside the backup"],
        ["Time zones", "The whole suite in 8 zones, from UTC−11 to UTC+14"],
        ["Static checks", "TypeScript strict, ESLint with product rules, 0 warnings, knip — 0 dead code, Prettier"],
        ["CI", "GitHub Actions on every push"],
      ],
    },
    {
      id: "stack",
      t: "Stack",
      s: "Every choice serves a specific job.",
      kind: "stack",
      data: [
        ["App", ["TypeScript strict", "React 19", "Next.js 16", "Tailwind 4", "Radix UI", "TanStack Query"]],
        ["Data", ["PGlite (Postgres in WASM)", "Drizzle ORM", "Zod", "SSE"]],
        ["Platforms", ["Electron", "Capacitor", "Vite", "Android"]],
        ["AI", ["Claude API", "MCP", "OpenAPI 3.1", "whisper (local voice)"]],
        ["Quality", ["Vitest", "Playwright", "ESLint", "knip", "GitHub Actions"]],
      ],
    },
    {
      id: "limits",
      t: "Deliberately not done",
      s: "Written down so a missing piece isn't mistaken for an oversight.",
      kind: "limits",
      data: [
        "An edit made on the phone without the Mac shows on its screens only once it reached the Mac",
        "No multi-user mode or cloud sync, except the optional Google Sheets mirror: this is one person's data",
        "Not for the open internet: no password login, the port must not be exposed",
        "PGlite has one connection: requests are accepted in parallel but run in turn",
        "Pictures are never returned to agents — only their count and metadata",
      ],
    },
  ],
};
const DOC_LABELS = {
  ru: { chosen: "Решение", rejected: "Вместо", why: "Почему", cost: "Цена", how: "Как замерено", toc: "Содержание" },
  en: { chosen: "Decision", rejected: "Instead of", why: "Why", cost: "Cost", how: "Measured by", toc: "Contents" },
};
/** What a closed chapter shows on its right: the one number worth knowing. */
const DOC_KEYS = {
  ru: {
    arch: "5 слоёв",
    adr: "7 решений",
    data: "0 потерь",
    perf: "p95 14 мс",
    ai: "131 инструмент",
    sec: "deny-by-default",
    test: "3 202 теста",
    stack: "5 групп",
    limits: "5 пунктов",
  },
  en: {
    arch: "5 layers",
    adr: "7 decisions",
    data: "0 lost",
    perf: "p95 14 ms",
    ai: "131 tools",
    sec: "deny-by-default",
    test: "3,202 tests",
    stack: "5 groups",
    limits: "5 items",
  },
};
/** A picture at the top of some chapters, drawn when the chapter opens. */
const DOC_VIS = {
  perf: () => {
    const L =
      lang === "en" ? ["p50", "p95", "worst", "limit of the check"] : ["p50", "p95", "худший", "порог проверки"];
    const bars = [
      [L[0], 3],
      [L[1], 14],
      [L[2], 51],
    ];
    return `<div class="v-lat"><div class="v-lat-h">${lang === "en" ? "Request latency under load, ms" : "Задержка запроса под нагрузкой, мс"}</div>${bars
      .map(
        ([n, v], k) =>
          `<div class="v-row" style="--k:${k}"><span>${n}</span><i style="--w:${(v / 60) * 100}%"></i><b data-to="${v}">0</b></div>`,
      )
      .join(
        "",
      )}<div class="v-row"><span>${lang === "en" ? "sync feed" : "поток изменений"}</span><i class="y" style="--w:${(40 / 60) * 100}%"></i><b data-to="40">0</b></div></div>`;
  },
  ai: () => {
    const t =
      lang === "en"
        ? ["Full tool catalogue", "With tool groups", "tokens per conversation"]
        : ["Весь каталог инструментов", "С группами инструментов", "токенов на разговор"];
    return `<div class="v-tok"><div class="v-tok-r"><span>${t[0]}</span><i class="full"></i><b>45 000</b></div><div class="v-tok-r"><span>${t[1]}</span><i class="cut"></i><b>~9 000</b></div><small>${t[2]} · ×5</small></div>`;
  },
  test: () => {
    const t =
      lang === "en"
        ? ["e2e · Playwright", "Mac shell · node --test", "unit + integration · Vitest, real Postgres"]
        : ["e2e · Playwright", "оболочка Mac · node --test", "unit и интеграция · Vitest, настоящий Postgres"];
    return `<div class="v-pyr"><div style="--w:34%;--k:2"><b data-to="313">0</b><span>${t[0]}</span></div><div style="--w:56%;--k:1"><b data-to="118">0</b><span>${t[1]}</span></div><div style="--w:100%;--k:0"><b data-to="3202">0</b><span>${t[2]}</span></div></div>`;
  },
};
function docChapter(ch, i) {
  const L = DOC_LABELS[lang];
  let body = "";
  if (ch.kind === "arch") {
    body = `<div class="d-arch">${ch.data.layers
      .map(
        ([name, items], k) =>
          `<div class="d-layer${k === 2 || k === 4 ? " hl" : ""}" style="--k:${k}"><b>${name}</b><div>${items.map((x) => `<span>${x}</span>`).join("")}</div></div>`,
      )
      .join('<i class="d-down"></i>')}<div class="d-back"><span>↺</span>${ch.data.back}</div></div>`;
  } else if (ch.kind === "adr") {
    body = `<div class="d-adr"><div class="d-adr-h"><span>${L.chosen}</span><span>${L.rejected}</span><span>${L.why}</span><span>${L.cost}</span></div>${ch.data
      .map(
        ([d, r, w, c], k) =>
          `<div class="d-adr-r" style="--k:${k}"><b>${d}</b><s>${r}</s><p>${w}</p><p class="cost">${c}</p></div>`,
      )
      .join("")}</div>`;
  } else if (ch.kind === "metrics") {
    body = `<div class="d-metrics">${ch.data
      .map(
        ([n, what, detail, how], k) =>
          `<div class="d-metric" style="--k:${k}"><b>${n}</b><span>${what}</span><p>${detail}</p><code>${how}</code></div>`,
      )
      .join("")}</div>`;
  } else if (ch.kind === "rows") {
    body = `<div class="d-rows">${ch.data.map(([a, b], k) => `<div style="--k:${k}"><span>${a}</span><b><i class="ok">${ic("check", 12)}</i>${b}</b></div>`).join("")}</div>`;
  } else if (ch.kind === "list") {
    body = `<div class="d-list">${ch.data.map(([a, b], k) => `<div style="--k:${k}"><b>${a}</b><p>${b}</p></div>`).join("")}</div>`;
  } else if (ch.kind === "stack") {
    body = `<div class="d-stack">${ch.data.map(([g, xs], k) => `<div style="--k:${k}"><b>${g}</b><div>${xs.map((x) => `<span>${x}</span>`).join("")}</div></div>`).join("")}</div>`;
  } else {
    body = `<ul class="d-limits">${ch.data.map((x, k) => `<li style="--k:${k}">${x}</li>`).join("")}</ul>`;
  }
  const vis = DOC_VIS[ch.id] ? DOC_VIS[ch.id]() : "";
  return `<article class="d-ch" id="doc-${ch.id}" data-doc="${ch.id}">
    <button class="d-head" type="button" aria-expanded="false"><span class="d-n">${String(i + 1).padStart(2, "0")}</span><span class="d-tt"><h3>${ch.t}</h3><p>${ch.s}</p></span><span class="d-key">${DOC_KEYS[lang][ch.id]}</span><span class="d-chev">${ic("chevron-down", 20)}</span></button>
    <div class="d-fold"><div class="d-inner">${vis}${body}</div></div>
  </article>`;
}
/** Replays the pictures of a chapter that has just opened. */
function playDoc(ch) {
  ch.classList.remove("play");
  void ch.offsetWidth;
  ch.classList.add("play");
  ch.querySelectorAll("[data-to]").forEach((el) => {
    const end = Number(el.dataset.to);
    const t0 = performance.now();
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / (reduced ? 1 : 1200));
      el.textContent = Math.round(end * (1 - Math.pow(1 - k, 3))).toLocaleString(lang === "en" ? "en-US" : "ru-RU");
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
/**
 * Opens one chapter. Only a click opens or closes a chapter, and the others stay as they are, so nothing above the
 * header moves and the page never jumps. If the opened chapter runs below the screen, the page glides down a little
 * once it has unfolded.
 */
function openDoc(id, { reveal = true } = {}) {
  const target = $(`doc-${id}`);
  if (!target || target.classList.contains("open")) return;
  target.classList.add("open");
  target.querySelector(".d-head").setAttribute("aria-expanded", "true");
  playDoc(target);
  if (!reveal) return;
  const fold = target.querySelector(".d-fold");
  const settle = (e) => {
    if (e && e.target !== fold) return;
    fold.removeEventListener("transitionend", settle);
    if (!target.classList.contains("open")) return;
    const r = target.getBoundingClientRect();
    const top = document.querySelector(".topbar")?.getBoundingClientRect().bottom ?? 0;
    // the whole chapter fits: show it all; it is taller than the screen: bring its header up under the top bar
    const shift = r.height <= innerHeight - top - 24 ? Math.max(0, r.bottom - innerHeight + 24) : r.top - top - 16;
    if (shift > 4) scrollBy({ top: shift, behavior: reduced ? "instant" : "smooth" });
  };
  fold.addEventListener("transitionend", settle);
}
function closeDoc(ch) {
  ch.classList.remove("open", "play");
  ch.querySelector(".d-head").setAttribute("aria-expanded", "false");
}
function buildEng() {
  $("engSpec").innerHTML = SPEC[lang].map(([n, t]) => `<div><b>${n}</b><span>${t}</span></div>`).join("");
  $("engDoc").innerHTML = DOC[lang].map(docChapter).join("");
  document.querySelectorAll(".d-ch .d-head").forEach((h) => {
    h.addEventListener("click", () => {
      const ch = h.parentElement;
      if (ch.classList.contains("open")) closeDoc(ch);
      else openDoc(ch.dataset.doc);
    });
  });
  openDoc(DOC[lang][0].id, { reveal: false });
}

// ------------------------------------------------------------------ the author

// the handwritten "asto" draws itself each time the section comes into view
new IntersectionObserver(
  ([e]) => {
    if (!e.isIntersecting) return;
    const img = $("astoLogo");
    img.src = `assets/asto-logo.svg?t=${Date.now()}`;
  },
  { threshold: 0.4 },
).observe($("astoLogo"));

// ------------------------------------------------------------------ write: the playground

const EXAMPLES = {
  ru: [
    "Созвон с Димой завтра 15:00 #Фриланс !1 ~45м",
    "кофе 250",
    "такси 12 usd",
    "гречка 150, курица 120 г, 2 яйца",
    "жим лёжа 80x8, 80x8, 75x10 @8",
  ],
  en: [
    "Call Dima tomorrow 15:00 #freelance !1 ~45m",
    "coffee 250",
    "taxi 12 usd",
    "rice 150, chicken 120 g, 2 eggs",
    "bench press 80x8, 80x8, 75x10 @8",
  ],
};
/** Per 100 g (or per piece for eggs, bananas): kcal, protein, fat, carbs. */
const FOODS = [
  [/греч|buckwheat/, "гречка", "buckwheat", 110, 4.2, 1.1, 21.3],
  [/рис|rice/, "рис", "rice", 130, 2.7, 0.3, 28],
  [/кур|chicken/, "курица", "chicken", 165, 31, 3.6, 0],
  [/яйц|яйко|egg/, "яйцо", "egg", 78, 6.3, 5.3, 0.6, true],
  [/банан|banana/, "банан", "banana", 105, 1.3, 0.4, 27, true],
  [/творог|cottage/, "творог", "cottage cheese", 121, 17, 5, 3],
  [/овсян|oat/, "овсянка", "oatmeal", 88, 3, 1.7, 15],
  [/яблок|apple/, "яблоко", "apple", 80, 0.4, 0.3, 19, true],
];
const SPEND = [
  [/коф|coffee|латте|latte/, "Кафе", "Dining out"],
  [/такси|taxi|uber|метро|metro/, "Транспорт", "Transport"],
  [/обед|ужин|завтрак|lunch|dinner|breakfast|кафе|ресторан/, "Кафе", "Dining out"],
  [/продукт|grocer|магазин|супермаркет/, "Продукты", "Groceries"],
  [/кино|movie|cinema|игр/, "Развлечения", "Entertainment"],
];
const RATES = {
  usd: 1,
  $: 1,
  rub: 0.0118,
  "₽": 0.0118,
  руб: 0.0118,
  eur: 1.08,
  "€": 1.08,
  vnd: 0.0000408,
  донг: 0.0000408,
};

function parse(text) {
  const s = text.trim();
  const low = s.toLowerCase();
  if (!s) return null;
  // a workout: "name 80x8, 80x8"
  const sets = [...low.matchAll(/(\d+(?:[.,]\d+)?)\s*[xх×]\s*(\d+)/g)];
  if (sets.length) {
    const name = s.slice(0, s.search(/\d/)).trim() || (lang === "ru" ? "Упражнение" : "Exercise");
    const rpe = low.match(/@\s*(\d+(?:[.,]\d)?)/);
    const vol = sets.reduce((a, m) => a + parseFloat(m[1].replace(",", ".")) * Number(m[2]), 0);
    return { kind: "workout", name, sets: sets.map((m) => [m[1], m[2]]), rpe: rpe?.[1], volume: vol };
  }
  // food: comma separated, at least one known food
  const parts = low
    .split(/,|;| и | and /)
    .map((x) => x.trim())
    .filter(Boolean);
  const items = parts
    .map((p) => {
      const f = FOODS.find((f) => f[0].test(p));
      if (!f) return null;
      const n = parseFloat((p.match(/\d+(?:[.,]\d+)?/) || ["0"])[0].replace(",", "."));
      const piece = f[7];
      const factor = piece ? n || 1 : (n || 100) / 100;
      return {
        name: lang === "ru" ? f[1] : f[2],
        qty: piece ? `${n || 1} ${lang === "ru" ? "шт" : "pcs"}` : `${n || 100} ${lang === "ru" ? "г" : "g"}`,
        k: f[3] * factor,
        p: f[4] * factor,
        f: f[5] * factor,
        c: f[6] * factor,
      };
    })
    .filter(Boolean);
  if (items.length && !/\d{1,2}:\d{2}/.test(low)) return { kind: "food", items };
  // money: "name amount [currency]" with no date words
  const money = low.match(
    /^(.*?)[\s]*([+-]?\d[\d\s]*(?:[.,]\d+)?)\s*(к|k|тыс)?\s*(usd|\$|rub|руб|₽|eur|€|vnd|донг\w*)?\s*(.*)$/,
  );
  const isTask = /завтра|сегодня|tomorrow|today|\d{1,2}:\d{2}|#|!\d|~\d/.test(low);
  if (money && !isTask && (money[1] || money[5])) {
    let amount = parseFloat(money[2].replace(/\s/g, "").replace(",", "."));
    if (money[3]) amount *= 1000;
    const cur = (money[4] || (lang === "ru" ? "₽" : "usd")).replace(/донг\w*/, "vnd");
    const rate = RATES[cur] ?? 1;
    const what = (money[1] || money[5]).trim();
    const cat = SPEND.find((c) => c[0].test(what));
    const income = money[2].startsWith("+");
    return {
      kind: "money",
      what,
      amount,
      cur,
      usd: amount * rate,
      category: cat ? (lang === "ru" ? cat[1] : cat[2]) : lang === "ru" ? "Другое" : "Other",
      income,
    };
  }
  // a task
  const time = low.match(/(\d{1,2}):(\d{2})/);
  const day = /завтра|tomorrow/.test(low)
    ? lang === "ru"
      ? "завтра"
      : "tomorrow"
    : /сегодня|today/.test(low) || time
      ? lang === "ru"
        ? "сегодня"
        : "today"
      : null;
  const project = s.match(/#([\p{L}\d_-]+)/u)?.[1];
  const prio = low.match(/!(\d)/)?.[1];
  const est = low.match(/~\s*(\d+)\s*(м|m|ч|h)?/);
  const title = s
    .replace(/#[\p{L}\d_-]+/gu, "")
    .replace(/!\d/g, "")
    .replace(/~\s*\d+\s*(м|m|ч|h)?/gi, "")
    .replace(/\d{1,2}:\d{2}/, "")
    .replace(/\b(завтра|сегодня|tomorrow|today)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return {
    kind: "task",
    title: title || s,
    day,
    time: time?.[0],
    project,
    prio,
    est: est
      ? `${est[1]} ${/ч|h/.test(est[2] || "") ? (lang === "ru" ? "ч" : "h") : lang === "ru" ? "мин" : "min"}`
      : null,
  };
}

const L = {
  ru: {
    task: "Задача",
    money: "Трата",
    income: "Доход",
    food: "Еда",
    workout: "Тренировка",
    day: "день",
    time: "время",
    project: "проект",
    prio: "важность",
    est: "оценка",
    category: "категория",
    total: "Итого",
    volume: "объём",
    sets: "подходы",
    empty: "Напиши что-нибудь — например, «чай 150» или «Встреча в пятницу 10:00»",
  },
  en: {
    task: "Task",
    money: "Expense",
    income: "Income",
    food: "Meal",
    workout: "Workout",
    day: "day",
    time: "time",
    project: "project",
    prio: "priority",
    est: "estimate",
    category: "category",
    total: "Total",
    volume: "volume",
    sets: "sets",
    empty: 'Type anything — for example "tea 3 usd" or "Meeting Friday 10:00"',
  },
};
const fmt = (n, d = 0) =>
  n.toLocaleString(lang === "ru" ? "ru-RU" : "en-US", { maximumFractionDigits: d, minimumFractionDigits: d });

/** Which section each kind of entry lands in: [icon, colour, ru, en]. */
const KIND_AT = {
  task: ["list-todo", "#2a78d6", "Задачи", "Tasks"],
  money: ["wallet", "#eda100", "Финансы", "Finance"],
  food: ["apple", "#eb6834", "Питание", "Nutrition"],
  workout: ["dumbbell", "#008300", "Здоровье", "Health"],
};
/** The pieces of the phrase Luma recognised, marked in place: [pattern, label ru, label en]. */
const TOKENS = [
  [/\d+(?:[.,]\d+)?\s*[xх×]\s*\d+/g, "подход", "set"],
  [/@\s*\d+(?:[.,]\d)?/g, "RPE", "RPE"],
  [/\b\d{1,2}:\d{2}\b/g, "время", "time"],
  [/(?:завтра|сегодня|tomorrow|today)/gi, "день", "day"],
  [/#[\p{L}\d_-]+/gu, "проект", "project"],
  [/![0-9]/g, "важность", "priority"],
  [/~\s*\d+\s*(?:м|m|ч|h)?/g, "оценка", "estimate"],
  [
    /(?:гречк|куриц|рис|яйц|яйк|egg|rice|chicken|buckwheat|банан|творог|овсянк|яблок|banana|apple|oat)\p{L}*(?:\s*\d+(?:[.,]\d+)?(?:\s*(?:г|g)(?!\p{L}))?)?/giu,
    "продукт",
    "food",
  ],
  [/\d+(?:[.,]\d+)?\s*(?:г|g)(?!\p{L})/gu, "вес", "weight"],
  [/\b\d+\s*(?:usd|\$|rub|руб|₽|eur|€|vnd)/gi, "сумма", "amount"],
];
function highlight(text, r) {
  if (!r) return "";
  const marks = [];
  for (const [re, ru, en] of TOKENS) {
    for (const m of text.matchAll(re)) {
      if (marks.some((x) => m.index < x.end && m.index + m[0].length > x.start)) continue;
      marks.push({ start: m.index, end: m.index + m[0].length, label: lang === "ru" ? ru : en });
    }
  }
  // a bare amount ("кофе 250") is money too
  if (r.kind === "money" && !marks.some((m) => m.label === "сумма" || m.label === "amount")) {
    const m = text.match(/\d[\d\s]*(?:[.,]\d+)?/);
    if (m) marks.push({ start: m.index, end: m.index + m[0].trim().length, label: lang === "ru" ? "сумма" : "amount" });
  }
  marks.sort((a, b) => a.start - b.start);
  let out = "";
  let at = 0;
  marks.forEach((m, k) => {
    out +=
      escapeHtml(text.slice(at, m.start)) +
      `<mark style="--k:${k}" data-l="${m.label}">${escapeHtml(text.slice(m.start, m.end))}</mark>`;
    at = m.end;
  });
  return out + escapeHtml(text.slice(at));
}
function escapeHtml(x) {
  return x.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}
function render(r) {
  const l = L[lang];
  const box = $("pgResult");
  $("pgParse").innerHTML = r
    ? highlight(pg.value, r)
    : `<span class="tw-wait">${lang === "ru" ? "ждёт фразу…" : "waiting for a phrase…"}</span>`;
  if (!r) {
    box.innerHTML = `<div class="tw-card empty">${l.empty}</div>`;
    return;
  }
  const [icon, color, ru, en] = KIND_AT[r.kind];
  const field = (k, v, i) => (v ? `<div class="tw-f" style="--k:${i}"><span>${k}</span><b>${v}</b></div>` : "");
  let body = "";
  if (r.kind === "task") {
    body = `<div class="tw-title">${escapeHtml(r.title)}</div><div class="tw-fields">${[
      field(l.day, r.day, 0),
      field(l.time, r.time, 1),
      field(l.project, r.project, 2),
      field(l.prio, r.prio && `!${r.prio}`, 3),
      field(l.est, r.est, 4),
    ].join("")}</div>`;
  } else if (r.kind === "money") {
    body = `<div class="tw-title">${escapeHtml(r.what)}<em class="tw-sum">−${fmt(r.usd, 2)} $</em></div><div class="tw-fields">${[
      field(lang === "ru" ? "сумма" : "amount", `${fmt(r.amount, r.amount % 1 ? 2 : 0)} ${r.cur.toUpperCase()}`, 0),
      field(lang === "ru" ? "по курсу" : "converted", `${fmt(r.usd, 2)} $`, 1),
      field(l.category, r.category, 2),
    ].join("")}</div>`;
  } else if (r.kind === "food") {
    const sum = r.items.reduce((a, i) => ({ k: a.k + i.k, p: a.p + i.p, f: a.f + i.f, c: a.c + i.c }), {
      k: 0,
      p: 0,
      f: 0,
      c: 0,
    });
    const kc = lang === "ru" ? "ккал" : "kcal";
    body = `<div class="tw-title">${lang === "ru" ? "Приём пищи" : "A meal"}<em class="tw-sum">${fmt(sum.k)} ${kc}</em></div><div class="tw-food">${r.items
      .map((i, n) => `<div style="--k:${n}"><span>${i.name} · ${i.qty}</span><b>${fmt(i.k)} ${kc}</b></div>`)
      .join(
        "",
      )}</div><div class="tw-macro"><i style="flex:${sum.p * 4};background:#2a78d6"></i><i style="flex:${sum.f * 9};background:#eb6834"></i><i style="flex:${sum.c * 4};background:#1baf7a"></i></div><div class="tw-ml"><span>${lang === "ru" ? "Б" : "P"} ${fmt(sum.p)} ${lang === "ru" ? "г" : "g"}</span><span>${lang === "ru" ? "Ж" : "F"} ${fmt(sum.f)} ${lang === "ru" ? "г" : "g"}</span><span>${lang === "ru" ? "У" : "C"} ${fmt(sum.c)} ${lang === "ru" ? "г" : "g"}</span></div>`;
  } else {
    body = `<div class="tw-title">${escapeHtml(r.name)}<em class="tw-sum">${fmt(r.volume)} ${lang === "ru" ? "кг" : "kg"}</em></div><div class="tw-sets">${r.sets
      .map(
        (x, i) =>
          `<div style="--k:${i}"><span>${i + 1}</span><b>${x[0]} ${lang === "ru" ? "кг" : "kg"} × ${x[1]}</b>${r.rpe ? `<em>@${r.rpe}</em>` : ""}</div>`,
      )
      .join("")}</div>`;
  }
  box.innerHTML = `<div class="tw-card"><div class="tw-ch"><span class="tw-tile" style="background:${color}">${ic(icon, 16)}</span><b>${lang === "ru" ? ru : en}</b><span class="tw-ok">${ic("check", 12)}${lang === "ru" ? "записано" : "saved"}</span></div>${body}</div>`;
}
const pg = $("pgInput");
let userTyped = false;
pg.addEventListener("input", () => {
  userTyped = true;
  markExample(-1);
  render(parse(pg.value));
});
function markExample(i) {
  $("pgExamples")
    .querySelectorAll("button")
    .forEach((b, k) => b.classList.toggle("on", k === i));
}
function buildExamples() {
  const kinds = ["task", "money", "money", "food", "workout"];
  $("pgExamples").innerHTML = EXAMPLES[lang]
    .map((e, i) => {
      const [icon, color, ru, en] = KIND_AT[kinds[i]];
      return `<button type="button"><span class="tw-tile" style="background:${color}">${ic(icon, 15)}</span><span class="tw-et"><small>${lang === "ru" ? ru : en}</small>${e}</span></button>`;
    })
    .join("");
  $("pgExamples")
    .querySelectorAll("button")
    .forEach((b, i) =>
      b.addEventListener("click", () => {
        userTyped = true;
        pg.value = EXAMPLES[lang][i];
        markExample(i);
        render(parse(pg.value));
      }),
    );
  pg.placeholder = EXAMPLES[lang][0];
}
// until the visitor touches it, the playground types its own examples
whileVisible($("how"), async (cancelled) => {
  for (let i = 0; !cancelled() && !userTyped; i++) {
    const ex = EXAMPLES[lang][i % EXAMPLES[lang].length];
    markExample(i % EXAMPLES[lang].length);
    pg.value = "";
    for (const ch of ex) {
      if (cancelled() || userTyped) return;
      pg.value += ch;
      await sleep(reduced ? 0 : 35);
    }
    render(parse(pg.value));
    await sleep(2600);
  }
});

// ------------------------------------------------------------------ agent: a conversation, the tools it calls, and what changed

const AGENT = {
  ru: [
    {
      me: "Отметь йогу и запиши ужин 350 тысяч донгов",
      voice: true,
      tools: [
        ["habit_log", "Йога · 1 ч"],
        ["expense_add", "350 000 ₫ → 14,30 $"],
      ],
      ai: "Готово: йога на сегодня отмечена, ужин записан в «Кафе».",
      show: "cards",
      log: [
        ["Йога · 1 ч", "habit_log"],
        ["Ужин −14,30 $", "expense_add"],
      ],
    },
    {
      me: "Нарисуй на доске, как устроено моё утро",
      tools: [
        ["board_create", "«Утро»"],
        ["board_draw", "5 блоков · 4 стрелки"],
      ],
      ai: "Нарисовал схему утра на доске «Утро».",
      show: "board",
      board: ["Подъём", "Вода", "Зарядка", "Завтрак", "Работа"],
      log: [["Доска «Утро»", "board_draw"]],
    },
    {
      me: "Удали все задачи",
      tools: [["task_delete", "нужно подтверждение"]],
      warn: true,
      ai: "Это удалит 14 задач. Без твоего «да» я ничего не удаляю, а удалённое неделю лежит в корзине.",
      show: "confirm",
      log: [["Удаление ждёт подтверждения", "task_delete"]],
    },
  ],
  en: [
    {
      me: "Mark yoga and log dinner, 350 thousand dong",
      voice: true,
      tools: [
        ["habit_log", "Yoga · 1 h"],
        ["expense_add", "350,000 ₫ → $14.30"],
      ],
      ai: "Done: yoga is marked for today, dinner logged in Dining out.",
      show: "cards",
      log: [
        ["Yoga · 1 h", "habit_log"],
        ["Dinner −$14.30", "expense_add"],
      ],
    },
    {
      me: "Draw how my morning works on a board",
      tools: [
        ["board_create", "“Morning”"],
        ["board_draw", "5 blocks · 4 arrows"],
      ],
      ai: "Drew your morning on the board “Morning”.",
      show: "board",
      board: ["Wake up", "Water", "Workout", "Breakfast", "Work"],
      log: [["Board “Morning”", "board_draw"]],
    },
    {
      me: "Delete all tasks",
      tools: [["task_delete", "needs confirmation"]],
      warn: true,
      ai: "That deletes 14 tasks. Without your “yes” I delete nothing, and deleted items stay in the trash for a week.",
      show: "confirm",
      log: [["Deletion awaits confirmation", "task_delete"]],
    },
  ],
};
const AG_TEXT = {
  ru: {
    habit: "Привычки",
    yoga: "Йога",
    today: "сегодня · 1 из 1 ч",
    fin: "Финансы",
    dinner: "Ужин · Кафе",
    rate: "350 000 ₫ по курсу дня",
    board: "Доска «Утро»",
    del: "Удалить 14 задач?",
    delNote: "Агент спросил и ждёт. Удалённое можно вернуть из корзины 7 дней.",
    yes: "Да, удали",
    no: "Отмена",
    now: "сейчас",
  },
  en: {
    habit: "Habits",
    yoga: "Yoga",
    today: "today · 1 of 1 h",
    fin: "Finance",
    dinner: "Dinner · Dining out",
    rate: "350,000 ₫ at the day's rate",
    board: "Board “Morning”",
    del: "Delete 14 tasks?",
    delNote: "The agent asked and is waiting. Deleted items can be restored from the trash for 7 days.",
    yes: "Yes, delete",
    no: "Cancel",
    now: "now",
  },
};
document.querySelectorAll(".pr-ic").forEach((el) => (el.innerHTML = ic(el.dataset.ic, 20)));
function agBoard(labels) {
  const w = 92;
  const gap = (560 - labels.length * w) / (labels.length - 1);
  let html = `<svg viewBox="0 -6 560 150" class="ag-board"><defs><marker id="agArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#141416"/></marker></defs>`;
  labels.forEach((label, i) => {
    const x = i * (w + gap);
    const y = i % 2 ? 92 : 14;
    const hl = i === 0 || i === labels.length - 1;
    html += `<g class="bn" style="--k:${i}"><rect x="${x}" y="${y}" width="${w}" height="38" rx="12" class="${hl ? "hl" : ""}"/><text x="${x + w / 2}" y="${y + 20}">${label}</text></g>`;
    if (i < labels.length - 1) {
      const ny = (i + 1) % 2 ? 92 : 14;
      html += `<path class="be" style="--k:${i}" d="M${x + w / 2} ${y + (i % 2 ? 0 : 38)} C ${x + w / 2} ${(y + ny) / 2 + 19}, ${x + w + gap + w / 2} ${(y + ny) / 2 + 19}, ${x + w + gap + w / 2} ${ny + ((i + 1) % 2 ? 2 : 36)}"/>`;
    }
  });
  return html + "</svg>";
}
function agShow(step) {
  const T = AG_TEXT[lang];
  const stage = $("agStage");
  let html = "";
  if (step.show === "cards") {
    html = `<div class="ag-cards">
      <div class="ag-card" style="--k:0"><span class="ag-ring"><svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="18" class="t"/><circle cx="22" cy="22" r="18" class="a"/></svg>${ic("heart-pulse", 18)}</span><span><small>${T.habit}</small><b>${T.yoga}</b><em>${T.today}</em></span><span class="ag-check">${ic("check", 16)}</span></div>
      <div class="ag-card" style="--k:1"><span class="ag-tile">${ic("wallet", 18)}</span><span><small>${T.fin}</small><b>${T.dinner}</b><em>${T.rate}</em></span><span class="ag-sum">${lang === "en" ? "−$14.30" : "−14,30 $"}</span></div>
    </div>`;
  } else if (step.show === "board") {
    html = `<div class="ag-boardwrap"><div class="ag-bh">${ic("layout-dashboard", 15)} ${T.board}</div>${agBoard(step.board)}</div>`;
  } else {
    html = `<div class="ag-confirm"><span class="ag-warn">${ic("trash", 22)}</span><b>${T.del}</b><p>${T.delNote}</p><div class="ag-btns"><span class="no">${T.no}</span><span class="yes">${T.yes}</span></div></div>`;
  }
  stage.innerHTML = html;
}
/** The bits of one exchange, drawn at once (the first view) or step by step (the loop). */
function agMsgMe(step) {
  return `<div class="ag-msg me">${step.voice ? ic("mic", 14) + " " : ""}${step.me}</div>`;
}
function agCall(step, tool, arg, done) {
  const mark = step.warn ? "!" : ic("check", 12);
  return `<div class="ag-call${step.warn ? " warn" : ""}${done ? " done" : ""}"><span class="spin">${done ? mark : ""}</span><code>${tool}</code><span class="arg">${arg}</span></div>`;
}
function agLogItems(step) {
  const T = AG_TEXT[lang];
  return step.log
    .map(
      ([what, tool]) =>
        `<li class="${step.warn ? "warn" : ""}"><span class="t mono">${T.now}</span><span class="w"><b>${what}</b><code>${tool}</code></span>${step.warn ? `<span class="wait">…</span>` : ""}</li>`,
    )
    .reverse()
    .join("");
}
function agTrim() {
  const body = $("chatBody");
  const log = $("agentLog");
  while (log.children.length > 4) log.lastElementChild.remove();
  while (body.children.length > 6) body.firstElementChild.remove();
}
whileVisible($("agent"), async (cancelled) => {
  const body = $("chatBody");
  const log = $("agentLog");
  const typed = $("agTyped");
  const composer = $("agComposer");
  const steps = AGENT[lang];
  // the first exchange is already there when the section comes into view
  const first = steps[0];
  body.innerHTML = `${agMsgMe(first)}<div class="ag-calls">${first.tools.map(([t, x]) => agCall(first, t, x, true)).join("")}</div><div class="ag-msg ai">${first.ai}</div>`;
  log.innerHTML = agLogItems(first);
  agShow(first);
  for (let n = 1; ; n++) {
    const step = steps[n % steps.length];
    if (cancelled()) return;
    await sleep(1600);
    if (cancelled()) return;
    // the request: typed, or spoken with a live waveform
    if (step.voice) {
      composer.classList.add("rec");
      typed.innerHTML = `<span class="ag-wave">${Array.from({ length: 24 }, (_, i) => `<i style="--d:${(i * 53) % 400}ms"></i>`).join("")}</span>`;
      await sleep(1100);
      composer.classList.remove("rec");
      typed.textContent = step.me;
    } else if (!(await typeInto(typed, step.me, cancelled, 16))) return;
    await sleep(200);
    if (cancelled()) return;
    composer.classList.add("sent");
    setTimeout(() => composer.classList.remove("sent"), 400);
    typed.textContent = "";
    body.insertAdjacentHTML("beforeend", agMsgMe(step));
    // the tools it calls, one after another
    const calls = document.createElement("div");
    calls.className = "ag-calls";
    body.appendChild(calls);
    agTrim();
    for (const [tool, arg] of step.tools) {
      await sleep(200);
      if (cancelled()) return;
      calls.insertAdjacentHTML("beforeend", agCall(step, tool, arg, false));
      const c = calls.lastElementChild;
      await sleep(420);
      c.classList.add("done");
      c.querySelector(".spin").innerHTML = step.warn ? "!" : ic("check", 12);
    }
    await sleep(180);
    if (cancelled()) return;
    body.insertAdjacentHTML("beforeend", `<div class="ag-msg ai${step.warn ? " warn" : ""}">${step.ai}</div>`);
    agShow(step);
    log.insertAdjacentHTML("afterbegin", agLogItems(step));
    agTrim();
    await sleep(1600);
  }
});

// ------------------------------------------------------------------ phone helpers

/** Marks a habit done on a phone habits screen: the row flashes, the ring closes, the day's count grows. */
function phoneHabitDone(scr, k) {
  const row = scr.querySelector(`[data-ph-h="${k}"]`);
  if (!row) return;
  const h = HABITS()[k];
  row.classList.add("tap", "on");
  row.querySelector(".arc").style.setProperty("--v", "1");
  row.querySelector("[data-ph-v]").textContent = h.unit
    ? `${String(h.goal).replace(".", tr(",", "."))} ${tr("из", "of")} ${String(h.goal).replace(".", tr(",", "."))} ${h.unit}`
    : `${h.goal} ${tr("из", "of")} ${h.goal}`;
  const count = row.querySelector(".lp-cnt b");
  if (count) count.textContent = String(h.goal);
  const time = row.querySelector(".lp-time");
  if (time) time.textContent = `${String(h.goal).replace(".", tr(",", "."))} ${h.unit}`;
  const done = scr.querySelectorAll(".li.on").length;
  scr.querySelector("[data-ph-done]").textContent = String(done);
  scr.querySelector("[data-ph-bar]").style.setProperty("--v", String(done / 5));
  // the group counter in its caption
  const list = row.closest(".lp-list");
  const cap = list.previousElementSibling.querySelector(".cnt");
  cap.textContent = `${list.querySelectorAll(".li.on").length}/${list.querySelectorAll(".li").length}`;
}
/** The order the phone lists the habits in (by group). */
const PHONE_ORDER = [0, 3, 1, 2, 4];

// ------------------------------------------------------------------ phone tour

const phoneTour = $("phoneTour");
mount(phoneTour, "phone");
const steps = [...document.querySelectorAll("#phoneSteps li")];
const markStep = (i) => steps.forEach((li, k) => li.classList.toggle("on", k === i));
steps.forEach((li, k) => li.addEventListener("click", () => (tourJump = k)));
let tourJump = -1;
whileVisible($("phone"), async (cancelled) => {
  let step = tourJump >= 0 ? tourJump : 0;
  let last = -1;
  const wait = async (ms) => {
    const end = performance.now() + ms;
    while (performance.now() < end) {
      if (cancelled() || tourJump >= 0) return false;
      await sleep(100);
    }
    return true;
  };
  while (!cancelled()) {
    tourJump = -1;
    markStep(step);
    const id = ["home", "tasks", "habits", "chat"][step];
    const scr = phoneShow(phoneTour, id, step > last || last === -1 ? 1 : -1);
    last = step;
    let ok = await wait(1200);
    if (ok && id === "tasks") {
      const field = scr.querySelector("[data-ph-new]");
      field.classList.add("typ");
      ok = await typeInto(field, tr("Позвонить в банк !1", "Call the bank !1"), () => cancelled() || tourJump >= 0, 55);
      if (ok) {
        await sleep(400);
        const row = document.createElement("div");
        row.className = "li new";
        row.innerHTML = `${check(false)}<span>${tr("Позвонить в банк", "Call the bank")}</span><em class="mono">!1</em>`;
        scr.querySelector("[data-ph-tasks]").prepend(row);
        field.classList.remove("typ");
        field.textContent = tr("Новое дело", "New task");
        ok = await wait(900);
        if (ok) {
          const first = scr.querySelectorAll("[data-ph-tasks] .li")[1];
          first.classList.add("done");
          first.querySelector(".lm-cb").classList.add("on");
        }
      }
      if (ok) ok = await wait(1800);
    } else if (ok && id === "habits") {
      for (const k of PHONE_ORDER.slice(0, 3)) {
        phoneHabitDone(scr, k);
        if (!(ok = await wait(900))) break;
      }
      if (ok) ok = await wait(1200);
    } else if (ok && id === "chat") {
      const chat = scr.querySelector("[data-ph-chat]");
      const composer = scr.querySelector(".lp-composer");
      composer.classList.add("rec");
      ok = await wait(1300);
      composer.classList.remove("rec");
      if (ok) {
        const bars = Array.from(
          { length: 22 },
          (_, i) => `<i style="height:${6 + Math.round(Math.abs(Math.sin(i * 1.7)) * 16)}px"></i>`,
        ).join("");
        chat.insertAdjacentHTML(
          "beforeend",
          `<div class="lp-msg me voice">${ic("mic", 16)}${bars}<span>0:04</span></div>`,
        );
        chat.insertAdjacentHTML(
          "beforeend",
          `<div class="lp-msg me">${tr("Отметь йогу и запиши ужин 350 тысяч донгов", "Mark yoga and log dinner, 350 thousand dong")}</div>`,
        );
        ok = await wait(800);
      }
      if (ok) {
        chat.insertAdjacentHTML("beforeend", `<div class="lp-msg ai dots"><i></i><i></i><i></i></div>`);
        ok = await wait(1300);
      }
      if (ok) {
        chat.lastElementChild.remove();
        chat.insertAdjacentHTML(
          "beforeend",
          `<div class="lp-msg ai">${tr("Готово: «Йога» — 1 ч за сегодня, ужин — 14,30 $ в «Кафе».", "Done: Yoga, 1 h today; dinner, $14.30 in Dining out.")}</div>`,
        );
        ok = await wait(500);
      }
      if (ok) {
        chat.insertAdjacentHTML(
          "beforeend",
          `<div class="lp-done"><span>${ic("check", 13)}${tr("Йога · 1 ч", "Yoga · 1 h")}</span><span>${ic("check", 13)}${tr("Кафе · −14,30 $", "Dining out · −$14.30")}</span></div>`,
        );
        ok = await wait(2600);
      }
    } else if (ok) {
      ok = await wait(2200);
    }
    if (cancelled()) return;
    step = tourJump >= 0 ? tourJump : (step + 1) % 4;
  }
});

// ------------------------------------------------------------------ sync

const DAYS = { ru: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"], en: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] };
const PAST = [
  [1, 1, 0, 1, 1, 1],
  [1, 0, 1, 1, 0, 1],
  [0, 1, 1, 0, 1, 0],
  [1, 1, 1, 1, 0, 1],
  [0, 1, 0, 1, 1, 1],
];
/** What a marked day holds, as in the app: hours for timed habits, a count for counted ones. */
const CELL_VALUES = [
  ["1", "1", "0,8", "1", "1,2", "1", "1"],
  ["24", "21", "27", "20", "17", "29", "20"],
  ["0,4", "0,5", "0,7", "0,5", "0,5", "0,6", "0,5"],
  ["1", "1,5", "1", "1", "1", "1", "1"],
  ["1", "1", "1", "1", "1", "1", "1"],
];
const cellValue = (i, d) => (lang === "en" ? CELL_VALUES[i][d].replace(",", ".") : CELL_VALUES[i][d]);
const syncPhone = $("syncPhone");
mount(syncPhone, "phone");
let syncScreen = null;
function buildSync() {
  const habits = HABITS();
  syncScreen = phoneShow(syncPhone, "habits");
  $("widgetHabits").innerHTML = habits
    .map((h, i) => `<li data-i="${i}"><span class="box"></span><span>${h.name}</span></li>`)
    .join("");
  let grid = `<span></span>${DAYS[lang].map((d, i) => `<span class="gh${i === 6 ? " now" : ""}">${d}</span>`).join("")}`;
  habits.forEach((h, i) => {
    grid += `<span class="gname">${h.name}</span>${PAST[i].map((on, d) => `<span class="cell${on ? " on" : ""}">${on ? cellValue(i, d) : ""}</span>`).join("")}<span class="cell today" data-i="${i}"></span>`;
  });
  $("macGrid").innerHTML = grid;
}
const wire = $("wire");
const pulse = $("pulse");
async function flyPulse(cancelled) {
  const len = wire.getTotalLength();
  pulse.style.opacity = "1";
  const t0 = performance.now();
  const dur = reduced ? 1 : 700;
  await new Promise((done) => {
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      const pt = wire.getPointAtLength(len * e);
      pulse.setAttribute("cx", pt.x);
      pulse.setAttribute("cy", pt.y);
      if (k < 1 && !cancelled()) requestAnimationFrame(step);
      else done();
    };
    requestAnimationFrame(step);
  });
  pulse.style.opacity = "0";
}
whileVisible($("sync"), async (cancelled) => {
  buildSync();
  for (let n = 0; !cancelled(); n = (n + 1) % PHONE_ORDER.length) {
    if (n === 0) buildSync();
    const i = PHONE_ORDER[n];
    await sleep(n === 0 ? 1400 : 900);
    if (cancelled()) return;
    phoneHabitDone(syncScreen, i);
    await sleep(250);
    await flyPulse(cancelled);
    if (cancelled()) return;
    $("widgetHabits").children[i].classList.add("done", "flash");
    const cell = $("macGrid").querySelector(`.cell.today[data-i="${i}"]`);
    cell.classList.add("on", "pop");
    cell.textContent = cellValue(i, 6);
    setTimeout(() => cell.classList.remove("pop"), 400);
    await sleep(1300);
  }
});

// ------------------------------------------------------------------ first sight: the windows rise and are assembled

const builder = new IntersectionObserver(
  (entries) =>
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      builder.unobserve(e.target);
      const intro = $("intro");
      // under the opening screen the hero would build unseen: wait until the light is on
      setTimeout(() => build(e.target), intro.classList.contains("gone") ? 0 : 1900);
    }),
  { threshold: 0.3 },
);
for (const box of [featMac, phoneTour, syncPhone]) {
  if (!reduced) box.closest(".app-frame, .phone-frame").classList.add("pre");
  builder.observe(box);
}

// the stopwatch on the home screen runs, as it would in the app
const startedAt = performance.now();
setInterval(() => {
  const sec = Math.floor((performance.now() - startedAt) / 1000) + 1 * 3600 + 38 * 60;
  const text = `${Math.floor(sec / 3600)}:${String(Math.floor(sec / 60) % 60).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
  document.querySelectorAll(".lm-watch .in b").forEach((el) => (el.textContent = text));
}, 1000);

// ------------------------------------------------------------------ counters

const counted = new IntersectionObserver(
  (entries) =>
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      counted.unobserve(e.target);
      const end = Number(e.target.dataset.count);
      const suffix = e.target.dataset.suffix || "";
      const t0 = performance.now();
      const dur = reduced ? 1 : 1800;
      const tick = (now) => {
        const k = Math.min(1, (now - t0) / dur);
        const v = Math.round(end * (1 - Math.pow(1 - k, 4)));
        e.target.textContent = v.toLocaleString("ru-RU").replace(/,/g, " ") + suffix;
        if (k < 1) requestAnimationFrame(tick);
        else e.target.classList.add("done");
      };
      requestAnimationFrame(tick);
    }),
  { threshold: 0.5 },
);
document.querySelectorAll("[data-count]").forEach((el) => counted.observe(el));

// ------------------------------------------------------------------ go

/** Came here from the portfolio (the same site, another page): a white "back" button in the top right corner leads
 * there instead of the author's-site button. The page it came from is kept for the tab, so a reload keeps the button. */
(function backButton() {
  let back = null;
  try {
    const from = document.referrer && new URL(document.referrer);
    const home = location.pathname.replace(/[^/]*$/, "");
    if (from && from.origin === location.origin && !from.pathname.startsWith(home))
      sessionStorage.setItem("luma-back", from.href);
    back = sessionStorage.getItem("luma-back");
  } catch {
    /* no storage: no button */
  }
  if (!back) return;
  const a = document.createElement("a");
  a.className = "back-btn";
  a.href = back;
  a.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg><span data-i18n="nav.back"></span>';
  document.body.appendChild(a);
  document.documentElement.classList.add("has-back");
  // The button matches the menu: the same height and the same vertical position at every width (the menu changes size
  // with the screen and, in places, while scrolling). On a phone the button is a circle, so its width follows too
  const syncTo = (bar) => {
    if (!bar) return;
    const fit = () => {
      const r = bar.getBoundingClientRect();
      if (!r.height) return;
      a.style.top = `${Math.round(r.top)}px`;
      a.style.height = `${Math.round(r.height)}px`;
      a.style.width = getComputedStyle(a.querySelector("span")).display === "none" ? `${Math.round(r.height)}px` : "";
    };
    fit();
    [600, 2000, 5000].forEach((ms) => setTimeout(fit, ms));   // after the page has built itself and the fonts arrived
    if (window.ResizeObserver) new ResizeObserver(fit).observe(bar);
    addEventListener("resize", fit);
    addEventListener("scroll", fit, { passive: true });
    bar.addEventListener("transitionend", fit);
  };
  syncTo(document.querySelector(".topbar"));
})();

applyLang();
render(null);

// ------------------------------------------------------------------ intro and headlines

const intro = $("intro");
setTimeout(() => intro.classList.add("gone"), reduced ? 0 : 2100);
intro.addEventListener("click", () => intro.classList.add("gone"));

// section headlines light up from left to right as they come into view
document.querySelectorAll("section:not(.hero):not(.author) h2").forEach((h) => {
  h.classList.add("lit");
  revealer.observe(h);
});

// ------------------------------------------------------------------ motion layer

/** Wraps every word of the hero headline so they can arrive one after another. */
function splitHeadline() {
  const h1 = document.querySelector(".hero h1");
  let n = 0;
  const walk = (node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === 3) {
        const frag = document.createDocumentFragment();
        for (const part of child.textContent.split(/(\s+)/)) {
          if (!part) continue;
          if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(part));
          else {
            const w = document.createElement("span");
            w.className = "word";
            w.style.setProperty(
              "--d",
              `${0.15 + n++ * 0.07 + (document.getElementById("intro").classList.contains("gone") ? 0 : 1.6)}s`,
            );
            w.textContent = part;
            frag.appendChild(w);
          }
        }
        child.replaceWith(frag);
      } else if (child.nodeType === 1) {
        if (child.classList.contains("glow-word")) {
          child.classList.add("word");
          child.style.setProperty(
            "--d",
            `${0.15 + n++ * 0.07 + (document.getElementById("intro").classList.contains("gone") ? 0 : 1.6)}s`,
          );
        } else walk(child);
      }
    }
  };
  walk(h1);
}

// groups come in one card after another
document.querySelectorAll(".steps, .eng-cards, .counters, .services, .promises, .badges").forEach((group) => {
  [...group.children].forEach((el, i) => (el.style.transitionDelay = `${i * 110}ms`));
});
document.querySelectorAll(".arch-node").forEach((el, i) => el.style.setProperty("--n", String(i)));

// cards light up under the cursor
document.querySelectorAll(".step, .eng-card, .service, .promise, .counter, .arch").forEach((card) => {
  card.classList.add("spot");
  card.addEventListener("pointermove", (e) => {
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${e.clientX - r.left}px`);
    card.style.setProperty("--my", `${e.clientY - r.top}px`);
  });
});

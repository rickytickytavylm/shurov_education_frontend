const LS = {
  user: "se_user",
  apply: "se_apply",
  paid: "se_paid",
  progress: "se_progress",
  hw: "se_hw",
  kira: "se_kira",
  tools: "se_tools",
  quiz: "se_quiz",
  survey: "se_survey",
  cert: "se_cert",
  guide: "se_guide",
};

const api = "";
const course = window.COURSE;
const $app = document.getElementById("app");
const asset = window.asset || ((p) => String(p || "").replace(/^\//, ""));

const APPLY_STEPS = [
  {
    id: "name",
    kind: "text",
    title: "Как к вам обращаться",
    hint: "Достаточно имени. Кабинет откроется сразу, все модули доступны.",
    placeholder: "Имя",
  },
];

const load = (k, fallback) => {
  try {
    const raw = localStorage.getItem(k);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

const DOCK_ICONS = {
  home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 10.8 12 4.4l7.5 6.4V20a.8.8 0 0 1-.8.8h-4.7v-6.2H10v6.2H5.3a.8.8 0 0 1-.8-.8z"/></svg>',
  book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.4 5.2h6.2A2.4 2.4 0 0 1 14 7.6v11.6H7.8A2.4 2.4 0 0 1 5.4 16.8V5.2z"/><path d="M14 7.6h4.6v11.6H14"/><path d="M5.4 16.8h8.6"/></svg>',
  kira: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.4l1.15 4.55L17.7 9.1l-4.55 1.15L12 14.8l-1.15-4.55L6.3 9.1l4.55-1.15z"/><path d="M18.2 14.4l.7 2.55 2.55.7-2.55.7-.7 2.55-.7-2.55-2.55-.7 2.55-.7z"/></svg>',
  grid: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.4" y="4.4" width="6.4" height="6.4" rx="1.3"/><rect x="13.2" y="4.4" width="6.4" height="6.4" rx="1.3"/><rect x="4.4" y="13.2" width="6.4" height="6.4" rx="1.3"/><rect x="13.2" y="13.2" width="6.4" height="6.4" rx="1.3"/></svg>',
};

function dockItem(href, on, icon, label) {
  return `<a href="${href}" class="${on ? "on" : ""}">${DOCK_ICONS[icon]}<span>${label}</span></a>`;
}

let user = load(LS.user, null);
let apply = load(LS.apply, {});
let paid = Boolean(load(LS.paid, false) || user);
let progress = load(LS.progress, {});
let homework = load(LS.hw, {});
let quizState = load(LS.quiz, {});
let surveyState = load(LS.survey, {});
let cert = load(LS.cert, {});
let guideSeen = Boolean(load(LS.guide, false));
let kira = (load(LS.kira, [
  {
    id: "k0",
    name: "Кира AI",
    me: false,
    text: "Здравствуйте. Я Кира AI — помощник курса. Опираюсь на лекции доктора Шурова, 14 схем и рабочие листы. Помогу разобрать задание, личный эпизод и сформулировать границу без самообвинения. В острых кризисных ситуациях: 112 и очная медицинская помощь.",
  },
]) || []).filter((m) => m && m.id !== "think" && m.text !== "Формирую ответ...");
let toolState = load(LS.tools, {
  whose: {},
  script: {},
  dual: { left: "", right: "" },
  split: { left: "", right: "" },
  halt: {},
  pause: [],
  fields: {},
  safety: [],
});
toolState.fields ||= {};
toolState.safety ||= [];
toolState.whose ||= {};
toolState.script ||= {};
toolState.halt ||= {};
toolState.pause ||= [];
let view = "start";
let currentId = course && course.modules && course.modules[0] ? firstLessonId() : "m0-l1";
let applyDraft = { ...apply };
let applyStep = firstApplyStep();

function firstLessonId() {
  return lessonsOf(course.modules[0])[0].id;
}

function firstApplyStep() {
  if (user?.name && applyDraft.name == null) applyDraft.name = user.name;
  if (user?.email && applyDraft.email == null) applyDraft.email = user.email;
  const idx = APPLY_STEPS.findIndex((s) => !applyDraft[s.id]);
  return idx < 0 ? 0 : idx;
}

function findLesson(id) {
  for (const m of course.modules) {
    const lesson = lessonsOf(m).find((l) => l.id === id);
    if (lesson) return { module: m, lesson };
  }
  const first = course.modules[0];
  return { module: first, lesson: lessonsOf(first)[0] };
}

function lessonsOf(mod) {
  return (mod.lessons || []).filter((l) => l && l.id);
}

function allLessons() {
  return course.modules.flatMap((m) => lessonsOf(m).map((l) => ({ ...l, moduleId: m.id })));
}

function progressPct() {
  const all = allLessons();
  const done = all.filter((l) => progress[l.id]).length;
  return { done, total: all.length, pct: all.length ? Math.round((done / all.length) * 100) : 0 };
}

function applyDone() {
  return APPLY_STEPS.every((s) => Boolean(apply[s.id]));
}

function moduleComplete(mod) {
  const list = lessonsOf(mod);
  return list.length > 0 && list.every((l) => Boolean(progress[l.id]));
}

function onboardingDone() {
  const picked = cert.consent === "yes" || cert.consent === "no";
  if (!picked || !cert.saved) return false;
  return ["fio", "passport", "issued", "code", "address"].every((k) => String(cert[k] || "").trim());
}

function canOpenModule(mod) {
  return Boolean(user && mod && onboardingDone());
}

function canOpenLesson(id) {
  return Boolean(user && id && onboardingDone());
}

function lockReason(id) {
  if (!user) return "need-auth";
  if (!onboardingDone()) return "need-guide";
  return "";
}

function continueLessonId() {
  for (const m of course.modules) {
    if (!canOpenModule(m)) continue;
    for (const l of lessonsOf(m)) {
      if (!progress[l.id]) return l.id;
    }
  }
  return firstLessonId();
}

function stepLabel(module, lesson) {
  const list = lessonsOf(module);
  const n = list.findIndex((l) => l.id === lesson.id) + 1;
  const total = list.length;
  if (module.final) return "Итоговый тест";
  if (module.free) return `Вводный практикум · шаг ${n} из ${total}`;
  return `Модуль ${module.n} · шаг ${n} из ${total}`;
}

function nextStepId(module, lesson) {
  const list = lessonsOf(module);
  const i = list.findIndex((l) => l.id === lesson.id);
  if (i >= 0 && i < list.length - 1) return list[i + 1].id;
  const mi = course.modules.findIndex((m) => m.id === module.id);
  const next = course.modules[mi + 1];
  if (!next) return "";
  return lessonsOf(next)[0]?.id || "";
}

function firstIncompleteIn(mod) {
  return lessonsOf(mod).find((l) => !progress[l.id])?.id || lessonsOf(mod)[0]?.id || firstLessonId();
}

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function brandHtml() {
  return `<span class="wordmark">школа доктора шурова</span>`;
}

function legalFooterHtml() {
  return `
      <footer class="legal-foot">
        <div class="legal-foot-inner">
          <div class="legal-brand">
            <p class="wordmark">школа доктора шурова</p>
            <p class="legal-tag">Образовательная платформа курса «Любить, не теряя себя»</p>
          </div>
          <div class="legal-grid">
            <section>
              <h3>Реквизиты</h3>
              <p class="legal-owner">ИП Щербакова Нина Николаевна</p>
              <p>ИНН 463238620213</p>
              <p>ОГРН 324508100264433</p>
              <p>142720, Московская обл., г. Видное, РП Дрожжино, ш. Новое, д. 11, кв. 141</p>
            </section>
            <section>
              <h3>Документы</h3>
              <nav class="legal-links">
                <a href="https://tvoi-shag.online/docs/oferta" target="_blank" rel="noopener">Публичная оферта</a>
                <a href="https://tvoi-shag.online/docs/policy" target="_blank" rel="noopener">Политика конфиденциальности</a>
                <a href="https://tvoi-shag.online/docs/policy" target="_blank" rel="noopener">Согласие на обработку данных</a>
                <a href="https://tvoi-shag.online/docs/policy" target="_blank" rel="noopener">Согласие на информационную рассылку</a>
                <a href="https://tvoi-shag.online/official_info" target="_blank" rel="noopener">Сведения об образовательной организации</a>
              </nav>
            </section>
            <section>
              <h3>Контакты</h3>
              <p><a href="mailto:info@perviyshag1.getcourse.ru">info@perviyshag1.getcourse.ru</a></p>
              <p><a href="tel:+78005059751">+7 (800) 505-97-51</a></p>
              <p><a href="tel:+78005059749">+7 (800) 505-97-49</a></p>
              <p><a href="https://t.me/Shurovhelp911" target="_blank" rel="noopener">Telegram @Shurovhelp911</a></p>
              <p>Документы: <a href="tel:+79257572815">8-925-757-28-15</a></p>
            </section>
          </div>
          <div class="legal-bottom">
            <p>© 2026 Школа доктора Шурова</p>
            <p>Сайт принадлежит индивидуальному предпринимателю Щербаковой Нине Николаевне</p>
          </div>
        </div>
      </footer>`;
}

function parseHash() {
  const raw = (location.hash || "#/").replace(/^#/, "") || "/";
  const parts = raw.split("/").filter(Boolean);
  return { path: parts[0] || "", id: parts[1] || "" };
}

function go(path) {
  if (location.hash !== "#" + path) location.hash = path;
  else route();
}

const HOME_SECTIONS = new Set(["top", "how", "app-install", "free", "program", "doctor"]);

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function deviceKind() {
  const ua = navigator.userAgent || "";
  const ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(ua);
  return { ios, android, standalone: isStandalone() };
}

function pwaOpenBtn(label, cls) {
  if (isStandalone()) return `<span class="pwa-badge">открыто как приложение</span>`;
  return `<button class="${cls || "btn"}" type="button" data-pwa-open>${label}</button>`;
}

function route() {
  document.body.classList.remove("rail-slim");
  railY = 0;
  const { path, id } = parseHash();
  if (HOME_SECTIONS.has(path) && !id) {
    const needRender = view !== "start" || !$app.querySelector(".site");
    view = "start";
    if (needRender) render();
    requestAnimationFrame(() => {
      const el = document.getElementById(path);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      else window.scrollTo({ top: 0, behavior: "smooth" });
    });
    return;
  }
  if (path === "lesson" && id) {
    if (user && !onboardingDone()) {
      if (view !== "guide") {
        view = "guide";
        render();
      }
      requestAnimationFrame(() => revealReply("certBox"));
      return;
    }
    currentId = id;
    view = user ? "lesson" : nextPublic();
  } else if (path === "tools") {
    view = user ? (onboardingDone() ? "lesson" : "guide") : nextPublic();
  } else if (path === "kira" || path === "atlas" || path === "guide" || path === "library") {
    view = user ? path : nextPublic();
  } else if (path === "login") {
    if (user) {
      view = onboardingDone() ? "lesson" : "guide";
      currentId = continueLessonId();
    } else view = "login";
  } else if (path === "apply") {
    if (user) {
      view = onboardingDone() ? "lesson" : "guide";
      currentId = continueLessonId();
    } else {
      view = "apply";
      applyStep = firstApplyStep();
    }
  } else if (path === "pay") {
    if (paid && user) {
      view = onboardingDone() ? "lesson" : "guide";
      currentId = continueLessonId();
    } else view = applyDone() || user ? "pay" : "apply";
  } else {
    view = "start";
  }
  render();
  if (view === "start" && path && document.getElementById(path)) {
    document.getElementById(path).scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function nextPublic() {
  if (apply.name || apply.email) return "apply";
  return "start";
}

function pendingHtml(text) {
  return `<div class="reply-pending" id="replyPending" aria-live="polite">
    <span class="reply-dots" aria-hidden="true"><i></i><i></i><i></i></span>
    <span>${esc(text)}</span>
  </div>`;
}

function revealReply(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const head = document.querySelector(".app-head");
  const dock = document.querySelector(".app-dock");
  const mobile = window.matchMedia("(max-width: 720px)").matches;
  const headH = head ? head.getBoundingClientRect().height : 0;
  const dockH = mobile && dock && getComputedStyle(dock).display !== "none" ? dock.getBoundingClientRect().height : 0;
  const viewH = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  const rect = el.getBoundingClientRect();
  const topLimit = headH + 12;
  const botLimit = viewH - dockH - 12;
  if (rect.top >= topLimit && rect.bottom <= botLimit) return;
  window.scrollTo({ top: Math.max(0, window.scrollY + rect.top - topLimit), behavior: "smooth" });
}

function showPendingIn(slotId, text) {
  const slot = document.getElementById(slotId);
  if (!slot) return;
  slot.innerHTML = pendingHtml(text);
  revealReply("replyPending");
}

function kiraMsgHtml(m) {
  const think = Boolean(m.think) || m.id === "think";
  return `<div class="msg${m.me ? " me" : ""}${think ? " is-think" : ""}" data-id="${esc(m.id)}">
    <div class="who">${esc(m.name)}</div>
    <div class="bubble">${think ? '<span class="reply-dots" aria-hidden="true"><i></i><i></i><i></i></span>' : esc(m.text)}</div>
  </div>`;
}

function scrollKiraLatest() {
  const log = document.getElementById("kiraLog");
  if (!log) return;
  const last = log.lastElementChild;
  if (last) last.scrollIntoView({ block: "nearest", inline: "nearest" });
  log.scrollTo({ top: log.scrollHeight, behavior: "smooth" });
}

function render(opts) {
  opts = opts || {};
  const keepScroll = Boolean(opts.keepScroll);
  const focus = opts.focus || "";
  const y = keepScroll ? window.scrollY : 0;
  document.body.classList.toggle("is-kira", view === "kira");
  if (!keepScroll && view !== "start") window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  if (view === "start") {
    $app.innerHTML = startHtml();
    bindStart();
  } else if (view === "login") {
    $app.innerHTML = loginHtml();
    bindLogin();
  } else if (view === "apply") {
    $app.innerHTML = applyHtml();
    bindApply();
  } else if (view === "pay") {
    $app.innerHTML = payHtml();
    bindPay();
  } else if (view === "guide") {
    $app.innerHTML = shellHtml(guideHtml());
    bindShell();
    bindGuide();
  } else if (view === "library") {
    $app.innerHTML = shellHtml(libraryHtml());
    bindShell();
  } else if (view === "kira") {
    $app.innerHTML = shellHtml(kiraHtml());
    bindShell();
    bindKira();
  } else if (view === "atlas") {
    $app.innerHTML = shellHtml(atlasHtml());
    bindShell();
    bindAtlas();
  } else {
    $app.innerHTML = shellHtml(lessonHtml());
    bindShell();
    bindLesson();
  }
  if (keepScroll) window.scrollTo({ top: y, left: 0, behavior: "instant" });
  if (view === "lesson") pinActiveRails();
  if (focus) requestAnimationFrame(() => revealReply(focus));
}

function startHtml() {
  const mods = course.modules
    .map(
      (m) => `<li class="module-card${m.free ? " is-free" : ""}">
        <span class="module-index">${String(m.n).padStart(2, "0")}</span>
        <div>
          <h3>${esc(m.title)}</h3>
          <p>${esc(m.blurb)}</p>
        </div>
        <span class="module-time">${m.free ? "бесплатно" : m.final ? "тест" : "вебинар " + m.n}</span>
      </li>`
    )
    .join("");
  const heroCta = `<button class="btn light" type="button" id="${user ? "toCourse" : "toFree"}">Войти в кабинет</button>`;
  const navCta = user
    ? `<button class="btn ghost" type="button" id="toCourseNav">в кабинет</button>`
    : `<button class="btn ghost" type="button" id="toLogin">войти</button>`;
  return `
    <div class="site">
      <section class="hero" id="top">
        <picture class="hero-pic">
          <source media="(max-width: 720px)" srcset="${asset("assets/hero-mobile.webp")}" type="image/webp" />
          <img class="hero-bg" src="${asset("assets/hero-4k.webp")}" alt="Школа доктора Шурова" fetchpriority="high" />
        </picture>
        <div class="hero-shade"></div>
        <header class="nav">
          <a class="brand" href="#/">школа доктора шурова</a>
          <nav>
            <a href="#free">модуль</a>
            <a href="#app-install">приложение</a>
            <a href="#program">программа</a>
            <a href="#doctor">автор</a>
          </nav>
          ${navCta}
        </header>
        <div class="hero-copy">
          <div class="hero-east">
            <h1>Любить, не теряя себя</h1>
            ${heroCta}
          </div>
          <div class="hero-west">
            <p>Программа по созависимости: бесплатный практикум, четыре модуля и Кира AI.</p>
            <div class="chips">
              <a href="#free">Бесплатный практикум</a>
              <a href="#app-install">Веб-приложение</a>
              <a href="#program">Учебный план</a>
              <span>Кира AI</span>
              <span>4 модуля</span>
            </div>
          </div>
        </div>
      </section>

      <section class="strip" id="how">
        <div class="inner">
          <p><b>Кира AI</b><span>Персональный AI-помощник и разбор заданий</span></p>
          <p><b>Вводный практикум</b><span>Понятие созависимости, разбор одного дня и анкета</span></p>
          <p><b>4 модуля программы</b><span>Лекции, практика и проверки</span></p>
        </div>
      </section>

      <section class="free-mod" id="free">
        <picture>
          <source media="(max-width: 720px)" srcset="${asset("assets/free-module-mobile.webp")}?v=1" type="image/webp" />
          <img class="free-mod-bg" src="${asset("assets/free-module.webp")}?v=2" alt="" />
        </picture>
        <div class="free-mod-shade"></div>
        <div class="free-mod-copy">
          <p class="kicker">Вводный практикум · около 40 минут</p>
          <h2>Понятие созависимости</h2>
          <p class="free-mod-lead">Бесплатный вводный блок до основной программы: что мы называем созависимостью, как это выглядит в обычный вечер, анкета запроса и короткая проверка с разбором от Киры AI.</p>
          <ul class="free-mod-list">
            <li>Что такое созависимость простыми словами: привычка, а не дефект характера</li>
            <li>Как увидеть сценарий отношений в одном конкретном вечере, без самообвинения</li>
            <li>Короткая проверка и анкета запроса перед четырьмя модулями курса</li>
          </ul>
          <button class="btn light" type="button" id="${user ? "toCourse" : "toFree"}">Войти в кабинет</button>
        </div>
      </section>

      <section class="block violet" id="program">
        <div class="inner">
          <div class="program-head">
            <div><p class="kicker">Учебный план</p><h2>Вводный модуль и четыре ступени курса</h2></div>
            <p>После входа по личному ключу открываются все материалы: вводный практикум, четыре модуля, итоговый тест, анкеты и Кира AI.</p>
          </div>
          <ol class="mods">${mods}</ol>
        </div>
      </section>

      <section class="author" id="doctor">
        <div class="author-stage">
          <figure class="author-shot">
            <img src="${esc(course.doctor.photo)}" alt="${esc(course.doctor.name)}" loading="lazy" />
          </figure>
          <div class="author-meta">
            <p class="kicker">Автор курса</p>
            <h2>Василий<br />Шуров</h2>
            <ul class="author-facts">
              <li><b>Психиатр</b><span>Врач, психотерапевт</span></li>
              <li><b>20 лет</b><span>Зависимости, кризисы, отношения</span></li>
              <li><b>Практика</b><span>Не теория. Живые случаи</span></li>
            </ul>
          </div>
        </div>
        <blockquote class="author-quote">
          <p>«Задача курса не в том, чтобы научить вас любить меньше. Задача в том, чтобы вернуть в эти отношения вас».</p>
        </blockquote>
      </section>

      <section class="pwa-band" id="app-install">
        <div class="inner">
          <div>
            <p class="kicker">Веб-приложение PWA</p>
            <h2>Установите платформу на смартфон</h2>
            <p>Кабинет работает как автономное приложение: запуск с домашнего экрана, сохранение личного прогресса, автономный доступ к конспектам и непрерывный диалог с Кирой AI. На iPhone установка выполняется строго через Safari, на Android: строго через Google Chrome.</p>
          </div>
          <div class="pwa-band-action">
            ${pwaOpenBtn("Скачать на телефон", "btn")}
            <p>Инструкция откроется с учетом вашей операционной системы.</p>
          </div>
        </div>
      </section>

      ${legalFooterHtml()}
    </div>`;
}

function loginHtml() {
  return `
    <div class="flow">
      <header class="nav thin">
        <a class="brand" href="#/">${brandHtml()}</a>
        <a class="text-link" href="#/">на стартовую</a>
      </header>
      <div class="flow-main">
        <p class="eye">Личный кабинет</p>
        <h1>Продолжить обучение</h1>
        <p class="lead">Введите имя, с которым заходили на этом устройстве.</p>
        <form class="stack-form" id="loginForm">
          <label>имя<input name="name" type="text" required autocomplete="name" placeholder="Как к вам обращаться" value="${esc(user?.name || "")}" /></label>
          <button class="btn" type="submit">войти</button>
        </form>
        <p class="fine">Нет входа: <a href="#/apply">начните с анкеты</a>. Боевой аккаунт подключим отдельно.</p>
      </div>
    </div>`;
}

function applyHtml() {
  const step = APPLY_STEPS[applyStep];
  const n = applyStep + 1;
  const total = APPLY_STEPS.length;
  const val = applyDraft[step.id] || "";
  let field = "";
  if (step.kind === "choice") {
    field = `<div class="choices">
      ${step.options
        .map(
          (o) => `<button type="button" class="choice${val === o.id ? " on" : ""}" data-val="${esc(o.id)}">
            <strong>${esc(o.label)}</strong>
            <span>${esc(o.note)}</span>
          </button>`
        )
        .join("")}
    </div>`;
  } else {
    field = `<input id="applyInput" type="${step.kind === "email" ? "email" : "text"}" value="${esc(val)}" placeholder="${esc(step.placeholder || "")}" autocomplete="${step.kind === "email" ? "email" : "name"}" />`;
  }
  return `
    <div class="flow">
      <header class="nav thin">
        <a class="brand" href="#/">${brandHtml()}</a>
        <span class="step-count">${n} / ${total}</span>
      </header>
      <div class="flow-bar" aria-hidden="true"><i style="width:${(n / total) * 100}%"></i></div>
      <div class="flow-main">
        <p class="eye">Настройка маршрута · вопрос ${n}</p>
        <h1>${esc(step.title)}</h1>
        <p class="lead">${esc(step.hint || "")}</p>
        <form id="applyForm" class="stack-form">
          ${field}
          <div class="actions">
            <button class="btn" type="submit" id="applyNext">${n === total ? "войти в кабинет" : "дальше"}</button>
            ${applyStep > 0 ? `<button class="text-link" type="button" id="applyBack">назад</button>` : `<a class="text-link" href="#/">на стартовую</a>`}
          </div>
        </form>
      </div>
    </div>`;
}

function payHtml() {
  const name = apply.name || user?.name || "";
  const email = apply.email || user?.email || "";
  return `
    <div class="flow">
      <header class="nav thin">
        <a class="brand" href="#/">${brandHtml()}</a>
        <a class="text-link" href="#/apply">к анкете</a>
      </header>
      <div class="flow-main">
        <p class="eye">Полный доступ к программе</p>
        <h1>Активация четырех модулей</h1>
        <p class="lead">Вводный практикум открыт бесплатно. Активация открывает четыре модуля программы, практические инструменты и 14 схем отношений. Модули проходятся по порядку, шаг за шагом.</p>
        <ul class="pay-points">
          <li>${esc(name)}</li>
          <li>${esc(email)}</li>
        </ul>
        <button class="btn" type="button" id="payStub">активировать доступ</button>
        ${user ? `<p class="fine"><a href="#/lesson/${esc(continueLessonId())}">вернуться в кабинет</a></p>` : ""}
        <p class="fine">Демо-режим: доступ активируется мгновенно без списания средств.</p>
      </div>
    </div>`;
}

function shellHtml(inner) {
  const p = progressPct();
  const mods = course.modules
    .map((m) => {
      const openMod = canOpenModule(m);
      const items = lessonsOf(m)
        .map((l) => {
          const on = view === "lesson" && currentId === l.id ? " on" : "";
          const done = progress[l.id] ? " done" : "";
          const lock = canOpenLesson(l.id) ? "" : " is-lock";
          return `<a class="${on}${lock}" href="#/lesson/${l.id}" data-id="${l.id}"><span class="dot${done}"></span><span>${esc(l.title)}</span></a>`;
        })
        .join("");
      return `<div class="nav-mod${openMod ? "" : " is-lock"}${moduleComplete(m) ? " is-done" : ""}${m.free ? " is-free" : ""}">
        <div class="n">${m.free ? "вводный практикум · бесплатно" : m.final ? "финал · сертификат" : "модуль " + m.n}</div>
        <div class="t">${esc(m.title)}</div>
        <div class="lessons">${items}</div>
      </div>`;
    })
    .join("");
  const doc = course.doctor || {};
  const here = findLesson(currentId);
  const rail = course.modules
    .map((m) => {
      const lesson = lessonsOf(m)[0];
      const on = view === "lesson" && here.module.id === m.id ? " on" : "";
      const done = moduleComplete(m) ? " is-done" : "";
      const lock = canOpenModule(m) ? "" : " is-lock";
      return `<a class="${on}${done}${lock}" href="#/lesson/${lesson.id}" data-id="${lesson.id}" aria-label="${m.free ? "Вводный практикум" : m.final ? "Итоговый тест" : "Модуль " + m.n}. ${esc(m.title)}"><em>${String(m.n).padStart(2, "0")}</em></a>`;
    })
    .join("");
  const steps = lessonsOf(here.module)
    .map((l, i) => {
      const on = view === "lesson" && currentId === l.id ? " on" : "";
      const done = progress[l.id] ? " is-done" : "";
      const lock = canOpenLesson(l.id) ? "" : " is-lock";
      return `<a class="${on}${done}${lock}" href="#/lesson/${l.id}" data-id="${l.id}"><em>${i + 1}</em><span>${esc(l.title)}</span></a>`;
    })
    .join("");
  return `
    <div class="app">
      <div class="app-head">
      <header class="top">
        <a class="brand light" href="#/lesson/${esc(currentId)}">${brandHtml()}</a>
        <div class="top-titles"><span>Курс</span>${esc(course.title)}</div>
        <nav class="top-studio">
          <a href="#/guide" class="${view === "guide" ? "on" : ""}">Как всё устроено</a>
          <a href="#/kira" class="${view === "kira" ? "on" : ""}">Кира AI</a>
          <a href="#/atlas" class="${view === "atlas" ? "on" : ""}">14 схем</a>
          <a href="#/library" class="${view === "library" ? "on" : ""}">Литература</a>
        </nav>
        ${isStandalone() ? `<span class="pwa-badge light">приложение</span>` : `<button class="text-link light" type="button" data-pwa-open>на телефон</button>`}
        <button class="text-link light" type="button" id="logout">выйти</button>
      </header>
      ${view === "lesson" ? `<nav class="lesson-rail" aria-label="Модули">${rail}</nav><nav class="step-rail" aria-label="Шаги модуля">${steps}</nav>` : ""}
      </div>
      <div class="body">
        <aside class="side">
          <div class="userbar"><span>${esc(user.name).slice(0, 1)}</span><div><b>${esc(user.name)}</b><small>${esc(user.email || "")}</small></div></div>
          <div class="progress">
            <div class="meta"><span>прогресс</span><span>${p.done} / ${p.total}</span></div>
            <div class="bar"><i style="width:${p.pct}%"></i></div>
          </div>
          ${mods}
          <div class="pwa-side">
            <b>Веб-приложение</b>
            <span>${isStandalone() ? "Кабинет запущен как приложение." : "Установите образовательную платформу на домашний экран. iPhone: Safari. Android: Chrome."}</span>
            ${pwaOpenBtn("Установить", "btn")}
          </div>
          <div class="studio">
            <a href="#/guide" class="${view === "guide" ? "on" : ""}">Как всё устроено</a>
            <a href="#/kira" class="${view === "kira" ? "on" : ""}">Кира AI</a>
            <a href="#/atlas" class="${view === "atlas" ? "on" : ""}">14 схем</a>
            <a href="#/library" class="${view === "library" ? "on" : ""}">Литература</a>
          </div>
          <div class="portrait">
            <img src="${esc(asset(doc.photo || "assets/shurov.webp"))}" alt="${esc(doc.name || "")}" />
            <div class="cap"><b>${esc(doc.name || "")}</b>${esc(doc.role || "")}</div>
          </div>
        </aside>
        <main class="main">${inner}</main>
      </div>
      <nav class="app-dock" aria-label="Разделы кабинета">
        ${dockItem("#/guide", view === "guide", "home", "Старт")}
        ${dockItem(onboardingDone() ? "#/lesson/" + esc(currentId) : "#/guide", view === "lesson", "book", "Уроки")}
        ${dockItem("#/kira", view === "kira", "kira", "Кира")}
        ${dockItem("#/atlas", view === "atlas", "grid", "Схемы")}
      </nav>
    </div>`;
}

function lessonHead(module, lesson, extra = "") {
  return `
    <div class="lesson-head">
      <div>
        <p class="crumb">${esc(stepLabel(module, lesson))}</p>
        <h2>${esc(lesson.title)}</h2>
        <p class="lede">${esc(module.blurb)}</p>
        ${extra}
      </div>
      <span class="lesson-number">${String(module.n).padStart(2, "0")}</span>
    </div>`;
}

function goalsHtml(goals) {
  if (!goals || !goals.length) return "";
  return `<ul class="goals">${goals.map((g) => `<li>${esc(g)}</li>`).join("")}</ul>`;
}

function reviewCard(review, tag, id) {
  if (!review) return "";
  return `<div class="review reply-ai"${id ? ` id="${esc(id)}"` : ""}>
    <div class="tag">${esc(tag || "Клинический разбор Киры AI")}</div>
    <p>${esc(review.summary)}</p>
    <ul>${(review.points || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
  </div>`;
}

function nextCta(module, lesson) {
  if (!progress[lesson.id]) return "";
  const next = nextStepId(module, lesson);
  if (next) return `<a class="btn" href="#/lesson/${esc(next)}" id="goNext">следующий шаг</a>`;
  const mi = course.modules.findIndex((m) => m.id === module.id);
  const after = course.modules[mi + 1];
  if (after && !after.free && !paid) {
    return `<a class="btn" href="#/pay">активировать полную программу</a>`;
  }
  if (after && !canOpenModule(after)) {
    return `<p class="hint">Следующий модуль программы откроется после завершения всех этапов текущего.</p>`;
  }
  return `<p class="hint">Материалы программы освоены до текущего шага. Вы всегда можете вернуться к пройденным темам.</p>`;
}

function lockedHtml(reason, module, lesson) {
  const prev = course.modules[course.modules.findIndex((m) => m.id === module.id) - 1];
  let title = "Материал заблокирован";
  let text = "Материалы открываются по порядку: конспект, практическое задание, проверка.";
  let action = "";
  if (reason === "need-pay") {
    title = "Доступ к основному блоку программы";
    text = "Вводный практикум открыт бесплатно. Четыре модуля курса открываются после активации доступа и завершения вводного блока.";
    action = `<a class="btn" href="#/pay">активировать доступ</a>
      <a class="btn ghost" href="#/lesson/${esc(continueLessonId())}">вернуться к текущему шагу</a>`;
  } else if (reason === "need-prev-module") {
    title = "Модуль пока недоступен";
    text = prev
      ? `Для перехода к этой теме завершите все шаги предыдущего модуля «${prev.title}»: конспект, практическое задание и проверку.`
      : "Сначала завершите предыдущий модуль программы.";
    const jump = prev ? firstIncompleteIn(prev) : continueLessonId();
    action = `<a class="btn" href="#/lesson/${esc(jump)}">перейти к незавершенному шагу</a>`;
  } else if (reason === "need-guide") {
    title = "Сначала оформите старт";
    text = "Выберите согласие или отказ на сертификат и сохраните данные на экране «Как всё устроено». Без этого уроки закрыты.";
    action = `<a class="btn" href="#/guide">открыть «Как всё устроено»</a>`;
  } else if (reason === "need-prev-lesson") {
    title = "Соблюдайте последовательность";
    const list = lessonsOf(module);
    const prevLesson = [...list].reverse().find((l) => {
      const idx = list.findIndex((x) => x.id === lesson.id);
      return list.indexOf(l) < idx && !progress[l.id];
    }) || list.find((l) => !progress[l.id]);
    text = prevLesson ? `Перед изучением этой темы необходимо завершить шаг «${prevLesson.title}».` : text;
    action = `<a class="btn" href="#/lesson/${esc(prevLesson?.id || continueLessonId())}">открыть предыдущий шаг</a>`;
  }
  return `
    ${lessonHead(module, lesson)}
    <section class="section lock-card">
      <div class="section-label">Последовательный доступ</div>
      <h3>${esc(title)}</h3>
      <p class="lede">${esc(text)}</p>
      <div class="row">${action}</div>
    </section>`;
}

function lessonHtml() {
  const { module, lesson } = findLesson(currentId);
  const lock = lockReason(currentId);
  if (lock) return lockedHtml(lock, module, lesson);
  if (lesson.type === "quiz") return quizHtml(module, lesson);
  if (lesson.type === "survey") return surveyHtml(module, lesson);
  return lectureHtml(module, lesson);
}

function lectureHtml(module, lesson) {
  const hw = homework[lesson.id] || { text: "", review: null };
  const task = lesson.homework || { prompt: "Опишите одним абзацем, что для вас сейчас самое важное в этой теме.", hint: "Любая формулировка подойдёт: в демо разбор придёт сразу." };
  const goals = goalsHtml(lesson.goals || module.goals || []);
  return `
    ${lessonHead(module, lesson, goals)}
    ${module.free ? "" : `<div class="video" role="img" aria-label="Видеоматериал лекции">
      <div class="play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 6.8v10.4L18 12 9 6.8z"/></svg></div>
      <div class="video-meta"><p>${esc(lesson.title)}</p><span>${esc(lesson.duration)}</span></div>
    </div>`}
    <section class="section">
      <div class="section-label">${module.free ? "Вводный практикум" : "Конспект"}</div>
      <h3>О чём этот урок</h3>
      <div class="lecture">${lectureBlocks(lesson.lecture)}</div>
    </section>
    <section class="section">
      <div class="section-label">Практический блок</div>
      <h3>Практическое задание</h3>
      <div class="hw">
        <p class="ask">${esc(task.prompt)}</p>
        <p class="hint">${esc(task.hint)}</p>
        <textarea id="hwText" placeholder="Напишите любой ответ — разбор появится сразу">${esc(hw.text)}</textarea>
        <p class="form-err" id="hwErr" hidden>Напишите хотя бы фразу, и сразу появится демо-разбор.</p>
        <div class="reply-slot" id="hwThread">${reviewCard(hw.review, "Разбор Киры AI", "hwReply")}</div>
        <div class="row">
          <button class="btn" type="button" id="hwSend">${hw.review ? "отправить повторно" : "отправить на разбор"}</button>
          ${nextCta(module, lesson)}
        </div>
      </div>
    </section>`;
}

function quizHtml(module, lesson) {
  const items = lesson.quiz || [];
  const state = quizState[lesson.id] || { picks: {} };
  const done = state.score != null || Boolean(state.review);
  const isFinal = Boolean(lesson.final);
  const body = items
    .map((q, i) => {
      const pick = state.picks[q.id];
      const opts = q.options
        .map((opt, oi) => {
          const on = pick === oi ? " on" : "";
          const mark = done ? (oi === q.answer ? " is-right" : pick === oi ? " is-wrong" : "") : "";
          return `<button type="button" class="choice${on}${mark}" data-q="${esc(q.id)}" data-i="${oi}" ${done ? "disabled" : ""}>${esc(opt)}</button>`;
        })
        .join("");
      return `<article class="quiz-q">
        <p class="quiz-n">Вопрос ${i + 1} из ${items.length}</p>
        <h4>${esc(q.q)}</h4>
        <div class="choices">${opts}</div>
        ${done && q.why ? `<p class="quiz-why">${esc(q.why)}</p>` : ""}
      </article>`;
    })
    .join("");
  const score = done ? `<p class="quiz-score" id="quizScore">Результат: ${state.score} из ${state.total} правильных ответов</p>` : "";
  const verdict = done && isFinal ? finalVerdictHtml(state.score, lesson.passAt || 15) : "";
  return `
    ${lessonHead(module, lesson)}
    <section class="section">
      <div class="section-label">${isFinal ? "Итоговое тестирование" : "Проверка"}</div>
      <h3>${isFinal ? "Итоговый тест" : "Проверка по теме"}</h3>
      <p class="lede">${isFinal
        ? "Вы дошли до финала. Курс «Любить, не теряя себя» завершён. Остался последний шаг — итоговый тест. В тесте 20 вопросов, к каждому — три варианта ответа. Нужно выбрать один верный. Для успешного прохождения нужно набрать 75% (15 из 20). Это не проверка ради оценки, а возможность ещё раз пройти по ключевым темам: слияние, спасательство, границы, возвращение опоры на себя. Результат появится сразу после завершения."
        : "Выберите один ответ в каждом вопросе. После отправки Кира AI разберёт ваши ответы. Это не экзамен, а способ проверить, как усвоен материал."}</p>
      <form id="quizForm" class="quiz-form">${body}
        <p class="form-err" id="quizErr" hidden>Пожалуйста, ответьте на каждый вопрос.</p>
        <div class="row">
          ${done ? `<button class="btn ghost" type="button" id="quizRetry">пройти ещё раз</button>` : `<button class="btn" type="submit" id="quizSend">${isFinal ? "завершить тест" : "отправить на проверку"}</button>`}
          ${nextCta(module, lesson)}
        </div>
        <div class="reply-slot" id="quizThread">
          ${score}
          ${verdict}
          ${isFinal ? "" : reviewCard(state.review, "Разбор ответов Киры AI", "quizReply")}
        </div>
      </form>
    </section>`;
}

function finalVerdictHtml(score, passAt) {
  if (score >= passAt) {
    return `<div class="final-verdict is-pass" id="finalVerdict">
      <h4>Вы успешно прошли тест</h4>
      <p>Ваши ответы показывают, что вы хорошо ориентируетесь в механизмах слияния, спасательства и выстраивания границ. Это значит, что материал курса не просто был прослушан, а переработан и соотнесён с собственным опытом.</p>
      <p>Вы видите разницу между созависимостью и любовью, понимаете, как возвращать ответственность взрослому близкому, и знаете, почему забота о себе — это не эгоизм, а основа устойчивости.</p>
      <p>Эти знания — ваша опора. К ним можно возвращаться в трудные моменты, когда привычные сценарии снова начинают управлять поведением. Благодарим за участие в курсе.</p>
    </div>`;
  }
  return `<div class="final-verdict" id="finalVerdict">
    <h4>Вы завершили тест</h4>
    <p>Для успешного прохождения курса нужно набрать не менее ${passAt} правильных ответов. Ваш результат чуть ниже. Это не повод для разочарования, а возможность ещё раз вернуться к темам, которые вызвали затруднения. Обратите внимание на модули, где были допущены ошибки.</p>
    <p>Изменения происходят постепенно. Возврат к материалу — это не шаг назад, а укрепление понимания. Попробуйте пройти тест ещё раз после повторения.</p>
  </div>`;
}

function surveyFieldHtml(field, draft) {
  const answers = draft.answers || {};
  const others = draft.others || {};
  const val = answers[field.id];
  const otherBox =
    field.other || (field.options || []).includes("Другое")
      ? `<input class="survey-other" data-other="${esc(field.id)}" placeholder="Если другое, напишите здесь" value="${esc(others[field.id] || "")}" />`
      : "";
  if (field.kind === "text") {
    return `<label class="survey-q"><span>${esc(field.q)}</span>
      <textarea data-text="${esc(field.id)}" placeholder="Ответ своими словами">${esc(val || "")}</textarea>
    </label>`;
  }
  if (field.kind === "scale") {
    const min = field.min ?? 0;
    const max = field.max ?? 10;
    const nums = Array.from({ length: max - min + 1 }, (_, i) => min + i)
      .map((n) => `<button type="button" class="scale-n${val === n ? " on" : ""}" data-scale="${esc(field.id)}" data-n="${n}">${n}</button>`)
      .join("");
    return `<div class="survey-q"><span>${esc(field.q)}</span><div class="scale-row">${nums}</div></div>`;
  }
  if (field.kind === "scale-group") {
    const rows = (field.items || [])
      .map((item, i) => {
        const cur = (val && val[i]) ?? "";
        const nums = Array.from({ length: 11 }, (_, n) => `<button type="button" class="scale-n${cur === n ? " on" : ""}" data-sg="${esc(field.id)}" data-sg-i="${i}" data-n="${n}">${n}</button>`).join("");
        return `<div class="scale-item"><p>${esc(item)}</p><div class="scale-row">${nums}</div></div>`;
      })
      .join("");
    return `<div class="survey-q"><span>${esc(field.q)}</span>${rows}</div>`;
  }
  const multi = field.kind === "multi";
  const selected = multi ? new Set(val || []) : new Set(val != null && val !== "" ? [val] : []);
  const opts = (field.options || [])
    .map((opt) => `<button type="button" class="choice${selected.has(opt) ? " on" : ""}" data-field="${esc(field.id)}" data-kind="${multi ? "multi" : "single"}" data-val="${esc(opt)}">${esc(opt)}</button>`)
    .join("");
  return `<div class="survey-q"><span>${esc(field.q)}${multi && field.max ? " До " + field.max + "." : ""}</span>
    <div class="choices">${opts}</div>${otherBox}</div>`;
}

function surveyHtml(module, lesson) {
  const spec = course.surveys[lesson.surveyId];
  const draft = surveyState[lesson.id] || { answers: {}, others: {} };
  const done = Boolean(draft.review);
  const blocks = (spec.blocks || [])
    .map((block) => `<fieldset class="survey-block" ${done ? "disabled" : ""}>
      <legend>${esc(block.title)}</legend>
      ${block.fields.map((f) => surveyFieldHtml(f, draft)).join("")}
    </fieldset>`)
    .join("");
  return `
    ${lessonHead(module, lesson)}
    <section class="section">
      <div class="section-label">Анкета</div>
      <h3>${esc(spec.title)}</h3>
      <p class="lede">${esc(spec.lead)}</p>
      <form id="surveyForm" class="survey-form">${blocks}
        <p class="form-err" id="surveyErr" hidden>Пожалуйста, заполните все пункты анкеты перед отправкой.</p>
        <div class="row">
          ${done ? `<button class="btn ghost" type="button" id="surveyRetry">редактировать ответы</button>` : `<button class="btn" type="submit" id="surveySend">отправить</button>`}
          ${nextCta(module, lesson)}
        </div>
        <div class="reply-slot" id="surveyThread">${reviewCard(draft.review, "Разбор Киры AI", "surveyReply")}</div>
      </form>
    </section>`;
}

function lectureBlocks(lecture) {
  return (lecture || [])
    .map((b, i) => {
      if (typeof b === "string") return `<p class="${i === 0 ? "lec-drop" : ""}">${esc(b)}</p>`;
      return `<article class="lec-block">
        <h4>${esc(b.h)}</h4>
        <p class="${i === 0 ? "lec-drop" : ""}">${esc(b.p)}</p>
      </article>`;
    })
    .join("");
}

function guideHtml() {
  const consent = cert.consent || "";
  return `
    <p class="crumb">Начало · перед первым уроком</p>
    <h2>Как всё устроено</h2>
    <p class="lede">Мы рады видеть вас на курсе! Несколько важных моментов перед началом.</p>

    <section class="section">
      <div class="section-label">Приветствие эксперта</div>
      <h3>Короткое видео от Василия Шурова</h3>
      <div class="video" role="img" aria-label="Видео-приветствие эксперта">
        <div class="play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 6.8v10.4L18 12 9 6.8z"/></svg></div>
        <div class="video-meta"><p>Приветствие эксперта</p><span>запись скоро появится</span></div>
      </div>
    </section>

    <section class="section">
      <div class="section-label">Ваши данные и конфиденциальность</div>
      <h3>Несколько важных моментов</h3>
      <div class="guide-facts">
        <div><b>О школе</b><p>Онлайн-школа работает на основании действующей лицензии №1035-01255-50/01675078 от 27.12.2024, выданной Министерством образования Московской области. Это значит, что обучение официальное, а материалы соответствуют стандартам.</p></div>
        <div><b>О ваших данных</b><p>Мы бережно относимся к вашей информации и соблюдаем конфиденциальность. Данные используются только для организации обучения.</p></div>
        <div><b>О налоговом вычете</b><p>В конце года вы сможете воспользоваться правом на налоговый вычет за пройденное обучение — в соответствии с Налоговым кодексом РФ.</p></div>
      </div>
      <div class="tool-box cert-box" id="certBox">
        <h4>Что нужно сделать сейчас</h4>
        <p class="cert-lead">Поставьте галочку: согласие или отказ. Потом сохраните данные. Это обязательно для всех — без этого уроки закрыты.</p>
        <div class="cert-checks">
          <label class="cert-check">
            <input type="checkbox" data-cert="yes" ${consent === "yes" ? "checked" : ""} />
            <span><strong>Согласие</strong> Хочу получить сертификат</span>
          </label>
          <label class="cert-check">
            <input type="checkbox" data-cert="no" ${consent === "no" ? "checked" : ""} />
            <span><strong>Отказ</strong> Сертификат не требуется</span>
          </label>
        </div>
        <form id="certForm" class="cert-form">
          <label>ФИО*<input name="fio" type="text" autocomplete="name" value="${esc(cert.fio || "")}" placeholder="Фамилия, имя, отчество" /></label>
          <label>Серия и номер паспорта*<input name="passport" type="text" inputmode="numeric" value="${esc(cert.passport || "")}" placeholder="0000 000000" /></label>
          <label>Кем и когда выдан паспорт*<input name="issued" type="text" value="${esc(cert.issued || "")}" placeholder="Орган выдачи и дата" /></label>
          <label>Код подразделения*<input name="code" type="text" inputmode="numeric" value="${esc(cert.code || "")}" placeholder="000-000" /></label>
          <label>Адрес регистрации*<input name="address" type="text" value="${esc(cert.address || "")}" placeholder="Город, улица, дом, квартира" /></label>
          <p class="fine">Если сертификат не нужен, в полях можно поставить прочерк. Сохранить форму всё равно нужно.</p>
          <p class="form-err" id="certErr" hidden>Выберите согласие или отказ и заполните все поля.</p>
          <div class="row">
            <button class="btn" type="submit">сохранить</button>
            ${cert.saved ? `<span class="cert-saved" id="certSaved">данные сохранены</span>` : `<span class="cert-saved" id="certSaved" hidden>данные сохранены</span>`}
          </div>
        </form>
      </div>
    </section>

    <section class="section">
      <div class="section-label">Как устроен курс</div>
      <h3>Курс построен как путь</h3>
      <p class="lede">От понимания, как устроено слияние, — к возвращению опоры на себя. Доступ к материалам курса — 3 месяца.</p>
      <ul class="guide-list">
        <li>4 видеолекции с Василием Александровичем Шуровым</li>
        <li>Бонус от команды курса — вводный практикум</li>
        <li>4 фокус-группы с психологами</li>
        <li>2 индивидуальные консультации с психологом</li>
        <li>Практические задания после каждой темы</li>
        <li>Итоговый тест после всех тем. Сертификат при результате 75% и выше</li>
      </ul>
    </section>

    <section class="section">
      <div class="section-label">Команда поддержки</div>
      <h3>На протяжении курса рядом будут психологи, куратор и ИИ-ассистент</h3>
      <div class="guide-team">
        <div><b>Пикулева Екатерина Всеволодовна</b><span>психолог · +7 916 704-49-85 · @KateZhar</span></div>
        <div><b>Родин Алексей Эрикович</b><span>психолог · +7 916 191-32-44 · @Rodin_Alexey</span></div>
        <div><b>Голованова Екатерина Сергеевна</b><span>психолог · +7 968 040-50-05 · @katenka86</span></div>
        <div><b>Дегтярева Ирина Васильевна</b><span>куратор · @Irina_Err</span></div>
        <div><b>Кира AI</b><span>ИИ-ассистент, который всегда рядом. Поможет разобраться в теме, разобрать личный эпизод и найти опору. Работает на основе программы доктора Шурова.</span></div>
      </div>
      <p class="lede">Практические фокус-группы проходят в Zoom. Ссылка придёт в чат потока. Проходят без записи.</p>
    </section>

    <section class="section">
      <div class="section-label">Общение</div>
      <h3>Чат потока и каналы связи</h3>
      <ul class="guide-list">
        <li>Чат потока — для вопросов куратору.</li>
        <li>Telegram-канал: <a href="https://t.me/shurovsos" target="_blank" rel="noopener">t.me/shurovsos</a></li>
        <li>Бот в Telegram для напоминаний и поддержки: <a href="https://tvoi-shag.online/tlgrm?bot=getcourse_shurov_bot" target="_blank" rel="noopener">открыть</a></li>
        <li>Бот в MAX: <a href="https://tvoi-shag.online/pl/maxstart?botId=794" target="_blank" rel="noopener">открыть</a></li>
      </ul>
    </section>

    <section class="section">
      <div class="section-label">Навигация по платформе</div>
      <h3>Как пользоваться кабинетом</h3>
      <div class="guide-facts">
        <div><b>Как войти</b><p>Вход по личному ключу, который вы получили от команды курса. Если ключ не подходит — напишите куратору в чат потока.</p></div>
        <div><b>Модули</b><p>Материалы разбиты на модули. В каждом: видеолекция, конспект, практическое задание и проверка из четырёх вопросов — её разбирает Кира AI. Это не экзамен, а возможность проверить, как усвоен материал.</p></div>
        <div><b>Анкеты</b><p>Анкеты обратной связи помогают нам становиться лучше для вас.</p></div>
        <div><b>Итоговый тест</b><p>После всех тем — итоговый тест. Возможность закрепить пройденное и получить сертификат при результате 75% и выше.</p></div>
        <div><b>Литература</b><p>Материалы по теме созависимости: научная основа программы и то, что можно почитать дополнительно.</p></div>
        <div><b>14 схем</b><p>Раздел, в котором собраны 14 схем, по которым живут созависимые отношения. Каждая схема разобрана одинаково: что это простыми словами, как выглядит в жизни, почему держится и что с этим делает курс. Это учебный материал, не диагностика.</p></div>
        <div><b>Веб-приложение</b><p>Позволяет пользоваться платформой как обычным приложением на телефоне: быстро открывать уроки, задания и схемы.</p></div>
      </div>
      <p class="hint" id="guideGateNote" ${onboardingDone() ? "hidden" : ""}>Сначала отметьте согласие или отказ и сохраните данные выше — без этого уроки закрыты.</p>
      <div class="row"><a class="btn" id="toLessons" href="#/lesson/${esc(continueLessonId())}">перейти к урокам</a></div>
    </section>`;
}

function paintGuideGate() {
  const note = document.getElementById("guideGateNote");
  if (note) note.hidden = onboardingDone();
}

function bindGuide() {
  guideSeen = true;
  save(LS.guide, true);
  document.querySelectorAll("[data-cert]").forEach((box) => {
    box.addEventListener("change", () => {
      if (box.checked) {
        cert.consent = box.dataset.cert;
        document.querySelectorAll("[data-cert]").forEach((other) => {
          if (other !== box) other.checked = false;
        });
      } else if (cert.consent === box.dataset.cert) {
        cert.consent = "";
      }
      save(LS.cert, cert);
      paintGuideGate();
    });
  });
  const form = document.getElementById("certForm");
  if (form) {
    form.querySelectorAll("input[name]").forEach((input) => {
      input.addEventListener("input", () => {
        cert[input.name] = input.value;
        save(LS.cert, cert);
        paintGuideGate();
      });
    });
    form.onsubmit = (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      cert.fio = String(fd.get("fio") || "").trim();
      cert.passport = String(fd.get("passport") || "").trim();
      cert.issued = String(fd.get("issued") || "").trim();
      cert.code = String(fd.get("code") || "").trim();
      cert.address = String(fd.get("address") || "").trim();
      const err = document.getElementById("certErr");
      if (!cert.consent || !["fio", "passport", "issued", "code", "address"].every((k) => cert[k])) {
        if (err) err.hidden = false;
        revealReply("certBox");
        return;
      }
      if (err) err.hidden = true;
      cert.saved = true;
      save(LS.cert, cert);
      const mark = document.getElementById("certSaved");
      if (mark) mark.hidden = false;
      paintGuideGate();
    };
  }
  const to = document.getElementById("toLessons");
  if (to) {
    to.onclick = (e) => {
      if (onboardingDone()) return;
      e.preventDefault();
      const err = document.getElementById("certErr");
      if (err) err.hidden = false;
      revealReply("certBox");
    };
  }
}

function libraryHtml() {
  const blocks = (course.library || [])
    .map(
      (sec) => `<section class="section">
        <div class="section-label">Литература</div>
        <h3>${esc(sec.title)}</h3>
        <p class="lede">${esc(sec.note)}</p>
        <div class="lib-list">
          ${sec.items
            .map(
              (it) => `<div class="lib-item">
                <p>${esc(it.text)}</p>
                ${it.url ? `<a class="text-link" href="${esc(it.url)}" target="_blank" rel="noopener">открыть источник</a>` : ""}
              </div>`
            )
            .join("")}
        </div>
      </section>`
    )
    .join("");
  return `
    <p class="crumb">Материалы · чтение</p>
    <h2>Литература</h2>
    <p class="lede">Материалы по теме созависимости: научная основа программы и то, что можно почитать дополнительно.</p>
    ${blocks}`;
}

function kiraHtml() {
  const msgs = kira.map((m) => kiraMsgHtml(m)).join("");
  return `
    <div class="kira-page">
    <p class="crumb">Интеллектуальный ассистент · Кира AI</p>
    <h2>Кира AI</h2>
    <p class="lede">AI-помощник курса. Опирается на программу доктора Шурова, 14 схем и рабочие листы. Поможет разобраться в теме, разобрать личный эпизод и найти опору — без самообвинения.</p>
    <div class="kira-pills">
      <button type="button" data-q="Что в клинической рамке курса называется созависимостью?">Определение созависимости</button>
      <button type="button" data-q="Где точная граница между заботой и спасательством?">Забота vs спасательство</button>
      <button type="button" data-q="Как выдержать право разочаровать, если сразу накрывает вина?">Границы и вина</button>
      <button type="button" data-q="Разбери динамику треугольника Карпмана в семейном сценарии.">Треугольник Карпмана</button>
    </div>
    <div class="chat-wrap kira-wrap">
      <div class="chat-log" id="kiraLog">${msgs}</div>
      <form class="chat-in gpt-in" id="kiraForm">
        <div class="gpt-box">
          <textarea name="text" rows="1" autocomplete="off" placeholder="Спросите что угодно"></textarea>
          <button class="gpt-send" type="submit" aria-label="Отправить">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v12m0-12 5 5m-5-5-5 5M6 20h12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
      </form>
    </div>
    </div>`;
}

function atlasHtml() {
  const items = course.atlas || [];
  const toc = items
    .map((item, i) => `<a href="#map-${esc(item.id)}" data-map="${esc(item.id)}"><em>${String(i + 1).padStart(2, "0")}</em><span>${esc(item.title)}</span></a>`)
    .join("");
  const cards = items
    .map(
      (item, i) => `<article class="atlas-card" id="map-${esc(item.id)}">
        <p class="section-label">Схема ${String(i + 1).padStart(2, "0")} из ${items.length}</p>
        <h3>${esc(item.title)}</h3>
        <p class="lede">${esc(item.lead)}</p>
        <figure class="studio-visual">
          <img src="${esc(asset(item.image))}" alt="${esc(item.title)}" loading="lazy" width="1024" height="576" />
        </figure>
        <div class="atlas-body">
          <section class="atlas-block">
            <h4>Простыми словами</h4>
            <p>${esc(item.plain)}</p>
          </section>
          <section class="atlas-block">
            <h4>Как это выглядит в жизни</h4>
            <ul class="atlas-signs">${(item.signs || []).map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
          </section>
          <section class="atlas-block">
            <h4>Почему это держится</h4>
            <p>${esc(item.why)}</p>
          </section>
          <section class="atlas-block atlas-shift">
            <h4>Что меняет курс</h4>
            <p>${esc(item.shift)}</p>
          </section>
          <p class="atlas-link"><span>Где в курсе</span>${esc(item.link)}</p>
        </div>
      </article>`
    )
    .join("");
  return `
    <p class="crumb">Разбор · как устроены отношения</p>
    <h2>Как это устроено</h2>
    <p class="lede">Четырнадцать схем, по которым живут созависимые отношения. Каждая разобрана одинаково: что это простыми словами, как выглядит в жизни, почему держится и что с этим делает курс. Это учебный материал, не диагностика.</p>
    <nav class="atlas-toc" aria-label="Список схем">${toc}</nav>
    ${cards}`;
}

function toolsHtml() {
  const body = (course.tools || []).map(toolCard).join("");
  const gloss = (course.glossary || [])
    .map((g) => `<div class="gloss"><b>${esc(g.t)}</b><span>${esc(g.d)}</span></div>`)
    .join("");
  return `
    <p class="crumb">Студия · практика</p>
    <h2>Инструменты</h2>
    <p class="lede">Рабочие листы рядом с лекциями. Можно заполнять здесь, без отдельной тетради.</p>
    ${body}
    <section class="section gloss-sec">
      <div class="section-label">Словарь курса</div>
      <h3>Глоссарий</h3>
      <div class="gloss-list">${gloss}</div>
    </section>`;
}

function toolCard(tool) {
  const visual = tool.image
    ? `<figure class="studio-visual tool-visual"><img src="${esc(asset(tool.image))}" alt="${esc(tool.title)}" loading="lazy" width="1024" height="576" /></figure>`
    : "";
  if (tool.kind === "check") {
    const on = new Set(toolState.pause || []);
    const steps = (tool.steps || [])
      .map((s, i) => {
        const id = "p" + i;
        return `<label class="check-row"><input type="checkbox" data-pause="${id}" ${on.has(id) ? "checked" : ""} /><span>${esc(s)}</span></label>`;
      })
      .join("");
    return `<section class="tool" id="tool-${tool.id}">
      <div class="section-label">Инструмент</div>
      <h3>${esc(tool.title)}</h3>
      <p class="lede">${esc(tool.lead)}</p>
      ${visual}
      <div class="tool-box">${steps}</div>
    </section>`;
  }
  if (tool.kind === "sort") {
    const items = (tool.items || [])
      .map((it) => {
        const bucket = toolState.whose[it.id] || "open";
        return `<button type="button" class="sort-card is-${bucket}" data-sort="${esc(it.id)}">
          <small>${bucketLabel(bucket)}</small>
          <span>${esc(it.text)}</span>
        </button>`;
      })
      .join("");
    return `<section class="tool" id="tool-${tool.id}">
      <div class="section-label">Инструмент</div>
      <h3>${esc(tool.title)}</h3>
      <p class="lede">${esc(tool.lead)}</p>
      ${visual}
      <div class="sort-grid">${items}</div>
    </section>`;
  }
  if (tool.kind === "script") {
    const picks = toolState.script || {};
    const slots = (tool.slots || [])
      .map((slot) => {
        const opts = slot.options
          .map((o) => `<button type="button" class="chip-opt${picks[slot.id] === o ? " on" : ""}" data-slot="${esc(slot.id)}" data-val="${esc(o)}">${esc(o)}</button>`)
          .join("");
        return `<div class="script-slot"><b>${esc(slot.label)}</b><div class="chip-row">${opts}</div></div>`;
      })
      .join("");
    const phrase = [picks.fact, picks.need, picks.limit].filter(Boolean).join(", ") + (picks.fact ? "." : "");
    return `<section class="tool" id="tool-${tool.id}">
      <div class="section-label">Инструмент</div>
      <h3>${esc(tool.title)}</h3>
      <p class="lede">${esc(tool.lead)}</p>
      ${visual}
      <div class="tool-box">${slots}
        <div class="script-out">${phrase ? esc(phrase) : "Соберите три части. Фраза появится здесь."}</div>
      </div>
    </section>`;
  }
  if (tool.kind === "dual" || tool.kind === "split") {
    const key = tool.kind === "dual" ? "dual" : "split";
    const val = toolState[key] || { left: "", right: "" };
    return `<section class="tool" id="tool-${tool.id}">
      <div class="section-label">Инструмент</div>
      <h3>${esc(tool.title)}</h3>
      <p class="lede">${esc(tool.lead)}</p>
      ${visual}
      <div class="dual">
        <label>${esc(tool.left)}<textarea data-dual="${key}" data-side="left">${esc(val.left)}</textarea></label>
        <label>${esc(tool.right)}<textarea data-dual="${key}" data-side="right">${esc(val.right)}</textarea></label>
      </div>
    </section>`;
  }
  if (tool.kind === "halt") {
    const items = (tool.items || [])
      .map((it) => {
        const on = Boolean(toolState.halt[it.id]);
        return `<button type="button" class="halt-card${on ? " on" : ""}" data-halt="${esc(it.id)}">
          <b>${esc(it.title)}</b><span>${esc(it.text)}</span>
        </button>`;
      })
      .join("");
    return `<section class="tool" id="tool-${tool.id}">
      <div class="section-label">Инструмент</div>
      <h3>${esc(tool.title)}</h3>
      <p class="lede">${esc(tool.lead)}</p>
      ${visual}
      <div class="halt-grid">${items}</div>
    </section>`;
  }
  if (tool.kind === "fields") {
    const value = toolState.fields[tool.id] || {};
    const fields = (tool.fields || [])
      .map(
        (field) => `<label class="field-card">
          <b>${esc(field.label)}</b>
          <span>${esc(field.hint)}</span>
          <textarea data-field-tool="${esc(tool.id)}" data-field-id="${esc(field.id)}" placeholder="Напишите конкретно">${esc(value[field.id] || "")}</textarea>
        </label>`
      )
      .join("");
    return `<section class="tool" id="tool-${tool.id}">
      <div class="section-label">Инструмент</div>
      <h3>${esc(tool.title)}</h3>
      <p class="lede">${esc(tool.lead)}</p>
      ${visual}
      <div class="field-grid">${fields}</div>
    </section>`;
  }
  if (tool.kind === "safety") {
    const on = new Set(toolState.safety || []);
    const steps = (tool.steps || [])
      .map((step, i) => {
        const id = "safe-" + i;
        return `<label class="check-row safety-row"><input type="checkbox" data-safety="${id}" ${on.has(id) ? "checked" : ""} /><span>${esc(step)}</span></label>`;
      })
      .join("");
    return `<section class="tool safety-tool" id="tool-${tool.id}">
      <div class="section-label">Инструмент безопасности</div>
      <h3>${esc(tool.title)}</h3>
      <p class="lede">${esc(tool.lead)}</p>
      ${visual}
      <div class="tool-box">${steps}</div>
    </section>`;
  }
  return "";
}

function bucketLabel(bucket) {
  if (bucket === "mine") return "моё";
  if (bucket === "his") return "его";
  if (bucket === "shared") return "общее";
  return "не разобрано";
}

function bindStart() {
  const goApply = (email) => {
    if (email) applyDraft.email = email;
    go("/apply");
  };
  const goLogin = () => go("/login");
  const goCourse = () => go(onboardingDone() ? "/lesson/" + continueLessonId() : "/guide");
  const goFree = () => {
    if (user) go("/lesson/" + continueLessonId());
    else goApply("");
  };
  const login = document.getElementById("toLogin");
  const applyBtn = document.getElementById("toApply");
  const courseNav = document.getElementById("toCourseNav");
  if (login) login.onclick = goLogin;
  if (applyBtn) applyBtn.onclick = () => goApply("");
  document.querySelectorAll("#toCourse").forEach((el) => { el.onclick = goCourse; });
  document.querySelectorAll("#toFree").forEach((el) => { el.onclick = goFree; });
  if (courseNav) courseNav.onclick = goCourse;
}

function bindLogin() {
  document.getElementById("loginForm").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const name = String(fd.get("name") || "").trim();
    if (!name) return;
    const key = name.toLowerCase();
    user = { id: "u-" + key, name, email: "" };
    save(LS.user, user);
    paid = true;
    save(LS.paid, true);
    await post("/auth/login", user);
    go("/guide");
  };
}

function bindApply() {
  const step = APPLY_STEPS[applyStep];
  document.querySelectorAll(".choice").forEach((btn) => {
    btn.onclick = () => {
      applyDraft[step.id] = btn.dataset.val;
      document.querySelectorAll(".choice").forEach((b) => b.classList.toggle("on", b === btn));
    };
  });
  const back = document.getElementById("applyBack");
  if (back) {
    back.onclick = () => {
      applyStep = Math.max(0, applyStep - 1);
      render();
    };
  }
  document.getElementById("applyForm").onsubmit = async (e) => {
    e.preventDefault();
    if (step.kind !== "choice") {
      const input = document.getElementById("applyInput");
      const val = (input.value || "").trim();
      if (!val) {
        input.focus();
        return;
      }
      applyDraft[step.id] = val;
    }
    if (!applyDraft[step.id]) return;
    if (applyStep < APPLY_STEPS.length - 1) {
      applyStep += 1;
      render();
      return;
    }
    apply = { ...applyDraft };
    save(LS.apply, apply);
    user = {
      id: "u-" + String(apply.name || "guest").toLowerCase(),
      name: apply.name || "Слушатель",
      email: "",
    };
    save(LS.user, user);
    paid = true;
    save(LS.paid, true);
    await post("/apply", { user, apply });
    go("/guide");
  };
}

function bindPay() {
  document.getElementById("payStub").onclick = async () => {
    if (!user) {
      go("/apply");
      return;
    }
    paid = true;
    save(LS.paid, true);
    await post("/pay/stub", { userId: user.id });
    go("/lesson/" + continueLessonId());
  };
}

function pinActiveRails() {
  document.querySelectorAll(".lesson-rail, .step-rail").forEach((rail) => {
    const on = rail.querySelector("a.on");
    if (!on) return;
    const pad = 14;
    const extra = Math.max(8, rail.clientWidth - on.offsetWidth - pad);
    rail.style.paddingRight = extra + "px";
    const left = on.getBoundingClientRect().left - rail.getBoundingClientRect().left + rail.scrollLeft;
    rail.scrollLeft = Math.max(0, left - pad);
  });
}

let railY = 0;
function bindRailHide() {
  if (window.SE_RAIL_BOUND) return;
  window.SE_RAIL_BOUND = true;
  const tick = () => {
    const rail = document.querySelector(".step-rail");
    if (!rail || window.matchMedia("(min-width: 721px)").matches) {
      document.body.classList.remove("rail-slim");
      railY = window.scrollY || 0;
      return;
    }
    const y = window.scrollY || document.documentElement.scrollTop || 0;
    if (y < 16) document.body.classList.remove("rail-slim");
    else if (y > railY + 8) document.body.classList.add("rail-slim");
    else if (y < railY - 8) document.body.classList.remove("rail-slim");
    railY = y;
  };
  window.addEventListener("scroll", tick, { passive: true });
}

function bindShell() {
  $app.querySelectorAll(".lessons a, .lesson-rail a, .step-rail a").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      if (!onboardingDone()) {
        if (view !== "guide") go("/guide");
        else revealReply("certBox");
        return;
      }
      go("/lesson/" + a.dataset.id);
    });
  });
  const out = document.getElementById("logout");
  if (out) {
    out.onclick = () => {
      try {
        localStorage.clear();
      } catch (_) {}
      location.hash = "/";
      location.reload();
    };
  }
}

function bindLesson() {
  const { lesson } = findLesson(currentId);
  if (lockReason(currentId)) return;
  if (lesson.type === "quiz") {
    bindQuiz(lesson);
    return;
  }
  if (lesson.type === "survey") {
    bindSurvey(lesson);
    return;
  }
  const send = document.getElementById("hwSend");
  const area = document.getElementById("hwText");
  if (!send || !area) return;
  send.onclick = async () => {
    const text = area.value.trim() || "Демо-ответ для проверки разбора.";
    const err = document.getElementById("hwErr");
    if (err) err.hidden = true;
    send.disabled = true;
    area.disabled = true;
    showPendingIn("hwThread", "Кира читает ваш ответ…");
    try {
      const review = await reviewHomework(currentId, text);
      homework[currentId] = { text: area.value.trim() || text, review };
      save(LS.hw, homework);
      progress[currentId] = true;
      save(LS.progress, progress);
    } catch (e) {
      homework[currentId] = {
        text,
        review: {
          summary: "Демо-разбор Киры AI по этому заданию.",
          points: [
            "Это учебный ответ: в демо любой текст получает разбор сразу, без сервера.",
            "В живом запуске здесь будет персональный комментарий по вашему эпизоду.",
            "Шаг уже можно считать пройденным и идти дальше.",
          ],
        },
      };
      save(LS.hw, homework);
      progress[currentId] = true;
      save(LS.progress, progress);
    }
    render({ keepScroll: true, focus: "hwReply" });
  };
}

function bindQuiz(lesson) {
  const form = document.getElementById("quizForm");
  if (!form) return;
  quizState[lesson.id] = quizState[lesson.id] || { picks: {} };
  form.querySelectorAll("button[data-q]").forEach((btn) => {
    btn.onclick = () => {
      if (quizState[lesson.id].review || quizState[lesson.id].score != null) return;
      quizState[lesson.id].picks[btn.dataset.q] = Number(btn.dataset.i);
      save(LS.quiz, quizState);
      const group = btn.closest(".choices") || btn.parentElement;
      group.querySelectorAll("button[data-q]").forEach((b) => b.classList.toggle("on", b === btn));
    };
  });
  const retry = document.getElementById("quizRetry");
  if (retry) {
    retry.onclick = () => {
      quizState[lesson.id] = { picks: {} };
      save(LS.quiz, quizState);
      render();
    };
  }
  form.onsubmit = async (e) => {
    e.preventDefault();
    const items = lesson.quiz || [];
    const picks = quizState[lesson.id].picks || {};
    if (items.some((q) => picks[q.id] == null)) {
      const err = document.getElementById("quizErr");
      if (err) err.hidden = false;
      return;
    }
    const send = document.getElementById("quizSend");
    if (send) send.disabled = true;
    showPendingIn("quizThread", lesson.final ? "Считаем результат…" : "Кира проверяет ответы…");
    const review = lesson.final ? null : await reviewQuiz(lesson, picks);
    let score = 0;
    items.forEach((q) => {
      if (picks[q.id] === q.answer) score += 1;
    });
    quizState[lesson.id] = { picks, review, score, total: items.length };
    save(LS.quiz, quizState);
    progress[lesson.id] = true;
    save(LS.progress, progress);
    render({ keepScroll: true, focus: lesson.final ? "finalVerdict" : "quizReply" });
  };
}

function bindSurvey(lesson) {
  const form = document.getElementById("surveyForm");
  if (!form) return;
  const spec = course.surveys[lesson.surveyId];
  surveyState[lesson.id] = surveyState[lesson.id] || { answers: {}, others: {} };
  const draft = surveyState[lesson.id];
  const persist = () => save(LS.survey, surveyState);

  form.querySelectorAll("button[data-field]").forEach((btn) => {
    btn.onclick = () => {
      if (draft.review) return;
      const id = btn.dataset.field;
      const kind = btn.dataset.kind;
      const val = btn.dataset.val;
      const field = spec.blocks.flatMap((b) => b.fields).find((f) => f.id === id);
      if (kind === "multi") {
        const cur = new Set(draft.answers[id] || []);
        if (cur.has(val)) cur.delete(val);
        else {
          if (field && field.max && cur.size >= field.max) return;
          cur.add(val);
        }
        draft.answers[id] = [...cur];
      } else {
        draft.answers[id] = val;
      }
      persist();
      if (kind === "multi") {
        btn.classList.toggle("on", (draft.answers[id] || []).includes(val));
      } else {
        const group = btn.closest(".choices") || btn.parentElement;
        group.querySelectorAll("button[data-field]").forEach((b) => {
          if (b.dataset.field === id) b.classList.toggle("on", b === btn);
        });
      }
    };
  });
  form.querySelectorAll("button[data-scale]").forEach((btn) => {
    btn.onclick = () => {
      if (draft.review) return;
      draft.answers[btn.dataset.scale] = Number(btn.dataset.n);
      persist();
      const row = btn.closest(".scale-row") || btn.parentElement;
      row.querySelectorAll("button[data-scale]").forEach((b) => b.classList.toggle("on", b === btn));
    };
  });
  form.querySelectorAll("button[data-sg]").forEach((btn) => {
    btn.onclick = () => {
      if (draft.review) return;
      const id = btn.dataset.sg;
      const i = Number(btn.dataset.sgI);
      const arr = Array.isArray(draft.answers[id]) ? draft.answers[id].slice() : [];
      arr[i] = Number(btn.dataset.n);
      draft.answers[id] = arr;
      persist();
      const row = btn.closest(".scale-row") || btn.parentElement;
      row.querySelectorAll("button[data-sg]").forEach((b) => b.classList.toggle("on", b === btn));
    };
  });
  form.querySelectorAll("[data-text]").forEach((el) => {
    el.oninput = () => {
      draft.answers[el.dataset.text] = el.value;
      persist();
    };
  });
  form.querySelectorAll("[data-other]").forEach((el) => {
    el.oninput = () => {
      draft.others[el.dataset.other] = el.value;
      persist();
    };
  });
  const retry = document.getElementById("surveyRetry");
  if (retry) {
    retry.onclick = () => {
      draft.review = null;
      persist();
      render();
    };
  }
  form.onsubmit = async (e) => {
    e.preventDefault();
    const fields = spec.blocks.flatMap((b) => b.fields);
    for (const field of fields) {
      const val = draft.answers[field.id];
      if (field.kind === "text") {
        if (!String(val || "").trim()) {
          const err = document.getElementById("surveyErr");
          if (err) err.hidden = false;
          return;
        }
      } else if (field.kind === "multi") {
        if (!val || !val.length) {
          const err = document.getElementById("surveyErr");
          if (err) err.hidden = false;
          return;
        }
      } else if (field.kind === "scale") {
        if (val == null || val === "") {
          const err = document.getElementById("surveyErr");
          if (err) err.hidden = false;
          return;
        }
      } else if (field.kind === "scale-group") {
        if (!Array.isArray(val) || field.items.some((_, i) => val[i] == null)) {
          const err = document.getElementById("surveyErr");
          if (err) err.hidden = false;
          return;
        }
      } else if (val == null || val === "") {
        const err = document.getElementById("surveyErr");
        if (err) err.hidden = false;
        return;
      }
    }
    const send = document.getElementById("surveySend");
    if (send) send.disabled = true;
    showPendingIn("surveyThread", "Кира читает анкету…");
    const review = await reviewSurvey(lesson, spec, draft);
    draft.review = review;
    persist();
    progress[lesson.id] = true;
    save(LS.progress, progress);
    render({ keepScroll: true, focus: "surveyReply" });
  };
}

function bindAtlas() {
  document.querySelectorAll(".atlas-toc a").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const el = document.getElementById("map-" + a.dataset.map);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function bindKira() {
  const form = document.getElementById("kiraForm");
  const log = document.getElementById("kiraLog");
  const box = form && form.querySelector("textarea");
  if (log) scrollKiraLatest();
  document.querySelectorAll(".kira-pills button").forEach((btn) => {
    btn.onclick = () => askKira(btn.dataset.q);
  });
  if (!form) return;
  const grow = () => {
    if (!box) return;
    box.style.height = "24px";
    box.style.height = Math.min(box.scrollHeight, 140) + "px";
  };
  if (box) {
    box.addEventListener("input", grow);
    box.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        form.requestSubmit();
      }
    });
    grow();
  }
  form.onsubmit = (e) => {
    e.preventDefault();
    const text = (box ? box.value : form.text.value).trim();
    if (!text) return;
    if (box) box.value = "";
    else form.text.value = "";
    grow();
    askKira(text);
  };
}

let kiraBusy = false;

async function askKira(text) {
  if (kiraBusy) return;
  kiraBusy = true;
  try {
    const q = String(text || "").trim() || "Демо-вопрос";
    const mine = { id: "k" + Date.now(), name: (user && user.name) || "Вы", me: true, text: q };
    const think = { id: "think", name: "Кира AI", me: false, think: true, text: "" };
    kira.push(mine);
    save(LS.kira, kira.filter((m) => m.id !== "think"));
    const log = document.getElementById("kiraLog");
    if (log) {
      log.insertAdjacentHTML("beforeend", kiraMsgHtml(mine));
      log.insertAdjacentHTML("beforeend", kiraMsgHtml(think));
      scrollKiraLatest();
    } else {
      kira.push(think);
      render();
    }
    await new Promise((r) => setTimeout(r, 420));
    const reply = { id: "k" + Date.now() + "a", name: "Кира AI", me: false, text: localKiraReply(q) };
    kira = kira.filter((m) => m.id !== "think");
    kira.push(reply);
    save(LS.kira, kira);
    const live = document.getElementById("kiraLog");
    const thinkEl = live && live.querySelector('[data-id="think"]');
    if (thinkEl) thinkEl.outerHTML = kiraMsgHtml(reply);
    else if (live) live.insertAdjacentHTML("beforeend", kiraMsgHtml(reply));
    else render();
    scrollKiraLatest();
  } finally {
    kiraBusy = false;
  }
}

function localKiraReply(text) {
  const q = String(text || "");
  const { module, lesson } = findLesson(currentId);
  const here = "Текущий контекст: шаг «" + lesson.title + "» модуля «" + module.title + "».";
  if (/суицид|убить себя|не хочу жить|насили|избивает/i.test(q)) {
    return "Приоритет: физическая безопасность. Если есть прямая угроза жизни, здоровью или насилие: незамедлительно обращайтесь в экстренные службы 112 и за очной медицинской помощью. Образовательный процесс возобновляется только после обеспечения безопасной среды.";
  }
  if (/созавис|слиян|раствор/i.test(q)) {
    return here + " Созависимость в этом курсе — не «слишком сильная любовь», а устойчивая привычка, при которой ваше состояние регулирует другой человек: его интонация, трезвость или молчание определяют ваш день. Задача курса — вернуть опору на себя. Это тема вводного практикума и модуля 1. Рекомендую посмотреть схему «Слияние, контакт, обрыв» в разделе «14 схем».";
  }
  if (/карпман|треугольник/i.test(q)) {
    return here + " Треугольник Карпмана — это три роли, по которым люди ходят вместо разговора: спасатель, жертва, преследователь. Каждая роль на минуту снимает тревогу, но закрепляет неравенство. Выход — во взрослом контакте: прямой разговор, уязвимость без беспомощности и забота по обоюдному согласию. Подробный разбор — в разделе «14 схем» (схема 01).";
  }
  if (/спасательств|enable|выпил|алкогол/i.test(q)) {
    return here + " Спасательство забирает у взрослого человека встречу с последствиями его выборов. Забота оставляет за другим его взрослость и ответственность. Курс не ставит целью переделать зависимого через ваше поведение. Три вопроса перед любой помощью: он просил? Он может сам? Что останется ему после моей помощи? Подробнее — в модуле 2 и инструменте «Чья это работа».";
  }
  if (/винова|разочаров|сказать нет|границ/i.test(q)) {
    return here + " Право разочаровать — это способность сохранить свою позицию, пока другой злится, обижается или молчит. Границы ломает не чужое давление, а вина, которая поднимается раньше слов. Первичный навык: выдержать паузу после правды и не бросаться сразу чинить чувство другого. Это фокус модуля 3.";
  }
  if (/домашк|задани|практик|провери|разбор/i.test(q)) {
    return here + " Для разбора практического задания сформулируйте конкретный факт: дата и время, контекст, сказанные слова или действие. Нажмите «отправить на разбор» в блоке урока: я разберу структуру ответа и помогу отделить факты от самообвинения.";
  }
  return (
    here +
    " Демо-ответ Киры AI на ваш запрос. В живом запуске здесь будет персональный разбор. По рамке курса: созависимость — это не «слишком сильная любовь», а привычка жить состоянием другого. Смотрите на факт (что было сказано и сделано), отделяйте свою ответственность от чужой и не чините состояние другого взрослого сразу. Можете прислать ещё один вопрос или конкретную сцену — учебный разбор придёт на любой запрос."
  );
}

function bindTools() {
  document.querySelectorAll("[data-pause]").forEach((el) => {
    el.onchange = () => {
      const id = el.dataset.pause;
      const set = new Set(toolState.pause || []);
      if (el.checked) set.add(id);
      else set.delete(id);
      toolState.pause = [...set];
      save(LS.tools, toolState);
    };
  });
  document.querySelectorAll("[data-sort]").forEach((el) => {
    el.onclick = () => {
      const id = el.dataset.sort;
      const order = ["open", "mine", "his", "shared"];
      const now = toolState.whose[id] || "open";
      toolState.whose[id] = order[(order.indexOf(now) + 1) % order.length];
      save(LS.tools, toolState);
      render();
    };
  });
  document.querySelectorAll("[data-slot]").forEach((el) => {
    el.onclick = () => {
      toolState.script[el.dataset.slot] = el.dataset.val;
      save(LS.tools, toolState);
      render();
    };
  });
  document.querySelectorAll("[data-dual]").forEach((el) => {
    el.oninput = () => {
      const key = el.dataset.dual;
      toolState[key] = toolState[key] || { left: "", right: "" };
      toolState[key][el.dataset.side] = el.value;
      save(LS.tools, toolState);
    };
  });
  document.querySelectorAll("[data-halt]").forEach((el) => {
    el.onclick = () => {
      const id = el.dataset.halt;
      toolState.halt[id] = !toolState.halt[id];
      save(LS.tools, toolState);
      render();
    };
  });
  document.querySelectorAll("[data-field-tool]").forEach((el) => {
    el.oninput = () => {
      const toolId = el.dataset.fieldTool;
      toolState.fields[toolId] = toolState.fields[toolId] || {};
      toolState.fields[toolId][el.dataset.fieldId] = el.value;
      save(LS.tools, toolState);
    };
  });
  document.querySelectorAll("[data-safety]").forEach((el) => {
    el.onchange = () => {
      const set = new Set(toolState.safety || []);
      if (el.checked) set.add(el.dataset.safety);
      else set.delete(el.dataset.safety);
      toolState.safety = [...set];
      save(LS.tools, toolState);
    };
  });
}

async function post(path, body) {
  if (!api) return;
  try {
    await fetch(api + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    /* офлайн ок */
  }
}

async function reviewHomework(lessonId, text) {
  await new Promise((r) => setTimeout(r, 360));
  const { lesson } = findLesson(lessonId);
  const blame = /я плох|я эгоист|я виноват|я слабая/i.test(text);
  const concrete = /утром|вечером|вчера|сегодня|сказал|сделал|не сказал|позвонил|написал/i.test(text);
  return {
    summary: "Клинический разбор практического задания по теме «" + lesson.title + "» от Киры AI.",
    points: [
      concrete
        ? "В ответе зафиксирован конкретный факт взаимодействия (время, место, действие). Это необходимая основа для анализа созависимого сценария без соскальзывания в самокритику."
        : "Рекомендуется усилить опору на факты: опишите конкретную сцену последних дней (время, реплики, поступок), исключив общие характеристики своего характера.",
      blame
        ? "Зафиксирована тенденция к самообвинению («я плохая/виноватая»). Психотерапевтическая задача курса: отделить объективное поведение от деструктивной вины, удерживающей сценарий."
        : "Вы удерживаете исследовательскую позицию: безоценочная фиксация фактов позволяет точно увидеть скрытый механизм взаимодействия.",
      "Для персонального разбора этой ситуации напишите Кире AI в чат: ассистент поможет сформулировать альтернативную реакцию.",
    ],
  };
}

async function reviewQuiz(lesson, picks) {
  await new Promise((r) => setTimeout(r, 320));
  const items = lesson.quiz || [];
  let score = 0;
  const misses = [];
  items.forEach((q) => {
    if (picks[q.id] === q.answer) score += 1;
    else misses.push(q.why);
  });
  return {
    summary:
      score === items.length
        ? "Контрольное тестирование пройдено успешно (" + score + " из " + items.length + "). Ключевые клинические дифференциации модуля усвоены в полном объеме."
        : "Тестирование завершено: " + score + " из " + items.length + " верных ответов. Разбор ключевых положений программы от Киры AI:",
    points:
      misses.length
        ? misses.slice(0, 4)
        : [
            "Рабочее понятие курса четко отделено от бытовых стереотипов о «чрезмерной любви».",
            "Усвоен ключевой принцип: автономия и здоровые границы не противоречат эмоциональной близости.",
            "В следующем практическом блоке эти положения будут перенесены на реальные паттерны общения.",
          ],
  };
}

async function reviewSurvey(lesson, spec, draft) {
  await new Promise((r) => setTimeout(r, 320));
  const answers = draft.answers || {};
  const texts = spec.blocks
    .flatMap((b) => b.fields)
    .filter((f) => f.kind === "text")
    .map((f) => String(answers[f.id] || ""));
  const long = texts.some((t) => t.length > 40);
  const blame = /я плох|я виноват|я эгоист|я слабая/i.test(texts.join(" "));
  if (spec.id === "intro") {
    return {
      summary: "Входная диагностическая анкета принята. Кира AI зафиксировала контекст ситуации и ваш запрос.",
      points: [
        long
          ? "Ситуация описана содержательно и предметно: это дает точную эмпирическую основу для индивидуальной работы в модулях программы."
          : "Рекомендуется дополнить описание одним конкретным эпизодом последней недели: кто участвовал, в чем состояла трудность, что было отложено.",
        blame
          ? "В формулировках заметна склонность брать единоличную ответственность за динамику контакта. Этот феномен детально разбирается во 2 и 3 модулях."
          : "Запрос сфокусирован на возвращении личной устойчивости и границ, что обеспечивает максимальную эффективность обучения.",
        "Материалы анкеты остаются в вашем личном кабинете и служат ориентиром при выполнении практических заданий.",
      ],
    };
  }
  if (spec.id === "mid") {
    return {
      summary: "Промежуточная анкета динамики обработана Кирой AI. Зафиксированы первые терапевтические сдвиги.",
      points: [
        long
          ? "Отмечены конкретные попытки применения инструментов программы в реальных бытовых ситуациях."
          : "Рекомендуется обращать внимание даже на микросдвиги: пауза перед автоматической реакцией, снижение уровня соматической тревоги.",
        "Трудности, сохраняющиеся после модуля 2, закономерно связаны со страхом отвержения и виной при выходе из роли спасателя. Это центральная тема модуля 3.",
        "Запрос на углубление практики учтен: используйте интерактивные карточки атласа и листы саморегуляции.",
      ],
    };
  }
  return {
    summary: "Итоговая квалификационная анкета курса проанализирована Кирой AI. Сформирован отчет о динамике за период программы.",
    points: [
      long
        ? "Ваша история пути наглядно демонстрирует переход от слияния и истощения к осознанной автономии и суверенным границам."
        : "Полезно сопоставить текущие ответы с вводной анкетой: качественные изменения в реакциях становятся очевидны при сравнении двух точек.",
      "Выбранные приоритеты на ближайшие дни позволяют закрепить результат без риска компенсаторного срыва в прежние паттерны.",
      "Все материалы, конспекты лекций, атлас из 14 схем и диалог с Кирой AI остаются в вашем постоянном доступе в кабинете.",
    ],
  };
}

function syncCookieClass() {
  const bar = document.getElementById("cookieBar");
  document.body.classList.toggle("has-cookie", Boolean(bar && !bar.hidden));
}

function openPwaSheet() {
  const layer = document.getElementById("pwaLayer");
  if (!layer) return;
  const kind = deviceKind();
  layer.hidden = false;
  document.body.classList.add("pwa-open");
  layer.querySelectorAll(".pwa-card").forEach((card) => {
    const os = card.getAttribute("data-os");
    card.classList.toggle("is-now", (os === "ios" && kind.ios) || (os === "android" && kind.android));
  });
  const stand = document.getElementById("pwaStandalone");
  if (stand) stand.hidden = !kind.standalone;
  const native = document.getElementById("pwaNative");
  if (native) native.hidden = !window.SE_DEFERRED_INSTALL;
}

function closePwaSheet() {
  const layer = document.getElementById("pwaLayer");
  if (layer) layer.hidden = true;
  document.body.classList.remove("pwa-open");
}

function bindPwa() {
  const kind = deviceKind();
  document.body.classList.toggle("is-standalone", kind.standalone);
  document.body.classList.toggle("is-ios", kind.ios);
  document.body.classList.toggle("is-android", kind.android);

  document.addEventListener("click", (e) => {
    const open = e.target.closest("[data-pwa-open]");
    if (open) {
      e.preventDefault();
      openPwaSheet();
    }
    if (e.target.id === "pwaClose" || e.target.id === "pwaLayer") closePwaSheet();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePwaSheet();
  });

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    window.SE_DEFERRED_INSTALL = e;
    const native = document.getElementById("pwaNative");
    if (native) native.hidden = false;
  });
  const native = document.getElementById("pwaNative");
  if (native) {
    native.onclick = async () => {
      const ev = window.SE_DEFERRED_INSTALL;
      if (!ev) return;
      ev.prompt();
      await ev.userChoice;
      window.SE_DEFERRED_INSTALL = null;
      native.hidden = true;
    };
  }

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    const swUrl = new URL("sw.js", window.EDU_BASE || location.href);
    navigator.serviceWorker.register(swUrl.href).catch(() => {});
  }
}

function bindCookie() {
  const bar = document.getElementById("cookieBar");
  const ok = document.getElementById("cookieOk");
  if (!bar || !ok) return;
  if (localStorage.getItem("se_cookie_ok")) {
    bar.hidden = true;
    syncCookieClass();
    return;
  }
  bar.hidden = false;
  syncCookieClass();
  ok.onclick = () => {
    localStorage.setItem("se_cookie_ok", "1");
    bar.hidden = true;
    syncCookieClass();
  };
}

if (course && $app) {
  window.addEventListener("hashchange", route);
  route();
  bindCookie();
  bindPwa();
  bindRailHide();
} else if ($app) {
  $app.innerHTML = `<div class="flow"><div class="flow-main"><p class="eye">Кабинет</p><h1>Файлы курса не загрузились</h1><p class="lead">Обновите страницу с главной ссылки сайта. Демо работает без сервера, в браузере.</p></div></div>`;
  bindCookie();
  bindPwa();
}

const LS = {
  user: "se_user",
  apply: "se_apply",
  paid: "se_paid",
  progress: "se_progress",
  hw: "se_hw",
  kira: "se_kira",
  tools: "se_tools",
};

const api = (window.EDU_CONFIG && window.EDU_CONFIG.BACKEND_URL) || "";
const course = window.COURSE;
const $app = document.getElementById("app");

const APPLY_STEPS = [
  {
    id: "name",
    kind: "text",
    title: "Как к вам обращаться",
    hint: "Имя или то, как к вам обращаться в кабинете.",
    placeholder: "Имя",
  },
  {
    id: "email",
    kind: "email",
    title: "Почта для входа",
    hint: "На неё потом придёт доступ. Сейчас это только заглушка.",
    placeholder: "you@email.ru",
  },
  {
    id: "role",
    kind: "choice",
    title: "Ради кого вы здесь",
    options: [
      { id: "self", label: "Ради себя", note: "Усталость в отношениях, где вы растворяетесь." },
      { id: "partner", label: "Рядом с партнёром", note: "Его состояние держит ваш день." },
      { id: "family", label: "Рядом с родным", note: "Родитель, взрослый ребёнок, кто-то из семьи." },
    ],
  },
  {
    id: "pain",
    kind: "choice",
    title: "Что сейчас больнее всего",
    options: [
      { id: "dissolve", label: "Растворение", note: "Своей жизни почти не осталось." },
      { id: "guilt", label: "Вина", note: "Любое «нет» потом невозможно выдержать." },
      { id: "rescue", label: "Спасательство", note: "Если не я, развалится." },
      { id: "repeat", label: "Повтор сценария", note: "С новым человеком всё сначала." },
    ],
  },
  {
    id: "goal",
    kind: "choice",
    title: "Что хотите унести с курса",
    options: [
      { id: "see", label: "Увидеть сценарий", note: "Назвать, что происходит, своими словами." },
      { id: "stop", label: "Научиться останавливаться", note: "Не чинить чужое состояние сразу." },
      { id: "next", label: "Понять следующий шаг", note: "Куда в школе идти после этих четырёх встреч." },
    ],
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

let user = load(LS.user, null);
let apply = load(LS.apply, {});
let paid = Boolean(load(LS.paid, false));
let progress = load(LS.progress, {});
let homework = load(LS.hw, {});
let kira = load(LS.kira, [
  {
    id: "k0",
    name: "Кира",
    me: false,
    text: "Я Кира внутри кабинета. Тьютор по всему курсу и по созависимости, не продавец. Можно спросить про лекцию, схему из раздела «Как это устроено», инструмент или про ваш конкретный эпизод. Диагноз не ставлю. В остром кризе сначала 112 и очная помощь.",
  },
]);
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
let currentId = firstLessonId();
let applyDraft = { ...apply };
let applyStep = firstApplyStep();

function firstLessonId() {
  return course.modules[0].lessons[0].id;
}

function firstApplyStep() {
  if (user?.name && applyDraft.name == null) applyDraft.name = user.name;
  if (user?.email && applyDraft.email == null) applyDraft.email = user.email;
  const idx = APPLY_STEPS.findIndex((s) => !applyDraft[s.id]);
  return idx < 0 ? 0 : idx;
}

function findLesson(id) {
  for (const m of course.modules) {
    const lesson = m.lessons.find((l) => l.id === id);
    if (lesson) return { module: m, lesson };
  }
  return { module: course.modules[0], lesson: course.modules[0].lessons[0] };
}

function allLessons() {
  return course.modules.flatMap((m) => m.lessons.map((l) => ({ ...l, moduleId: m.id })));
}

function progressPct() {
  const all = allLessons();
  const done = all.filter((l) => progress[l.id]).length;
  return { done, total: all.length, pct: all.length ? Math.round((done / all.length) * 100) : 0 };
}

function applyDone() {
  return APPLY_STEPS.every((s) => Boolean(apply[s.id]));
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
          <p class="legal-kicker">Сайт принадлежит</p>
          <p class="legal-owner">Индивидуальному предпринимателю Щербаковой Нине Николаевне</p>
          <p>Юридический адрес организации: 142720, Московская обл., г. Видное, РП Дрожжино, ш. Новое, д. 11, кв. 141</p>
          <p>ИНН 463238620213 · ОГРН 324508100264433</p>
          <nav class="legal-links">
            <a href="https://tvoi-shag.online/docs/oferta" target="_blank" rel="noopener">Публичная оферта</a>
            <a href="https://tvoi-shag.online/docs/policy" target="_blank" rel="noopener">Политика обработки персональных данных</a>
            <a href="https://tvoi-shag.online/docs/policy" target="_blank" rel="noopener">Согласие на обработку персональных данных</a>
            <a href="https://tvoi-shag.online/docs/policy" target="_blank" rel="noopener">Согласие на получение рассылки рекламно-информационных материалов</a>
          </nav>
          <p class="legal-edu"><a href="https://tvoi-shag.online/official_info" target="_blank" rel="noopener">Сведения об образовательной организации</a></p>
          <p>Электронный адрес: <a href="mailto:info@perviyshag1.getcourse.ru">info@perviyshag1.getcourse.ru</a></p>
          <p>Телефон: <a href="tel:+78005059751">+7 (800) 505-97-51</a><br /><a href="tel:+78005059749">+7 (800) 505-97-49</a></p>
          <p>Telegram: <a href="https://t.me/Shurovhelp911" target="_blank" rel="noopener">@Shurovhelp911</a></p>
          <p>По вопросам документации: <a href="tel:+79257572815">8-925-757-28-15</a></p>
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

const HOME_SECTIONS = new Set(["top", "how", "program", "doctor"]);

function route() {
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
    currentId = id;
    view = paid && user ? "lesson" : nextPublic();
  } else if (path === "kira" || path === "atlas" || path === "tools") {
    view = paid && user ? path : nextPublic();
  } else if (path === "login") {
    view = paid && user ? "lesson" : "login";
  } else if (path === "apply") {
    view = paid && user ? "lesson" : "apply";
    applyStep = firstApplyStep();
  } else if (path === "pay") {
    if (paid && user) view = "lesson";
    else view = applyDone() || user ? "pay" : "apply";
  } else {
    view = "start";
  }
  render();
  if (view === "start" && path && document.getElementById(path)) {
    document.getElementById(path).scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function nextPublic() {
  if (applyDone()) return "pay";
  if (user) return "apply";
  return "start";
}

function render() {
  if (view !== "start") window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  if (view === "start") {
    $app.innerHTML = startHtml();
    bindStart();
    return;
  }
  if (view === "login") {
    $app.innerHTML = loginHtml();
    bindLogin();
    return;
  }
  if (view === "apply") {
    $app.innerHTML = applyHtml();
    bindApply();
    return;
  }
  if (view === "pay") {
    $app.innerHTML = payHtml();
    bindPay();
    return;
  }
  if (view === "kira") {
    $app.innerHTML = shellHtml(kiraHtml());
    bindShell();
    bindKira();
    return;
  }
  if (view === "atlas") {
    $app.innerHTML = shellHtml(atlasHtml());
    bindShell();
    bindAtlas();
    return;
  }
  if (view === "tools") {
    $app.innerHTML = shellHtml(toolsHtml());
    bindShell();
    bindTools();
    return;
  }
  $app.innerHTML = shellHtml(lessonHtml());
  bindShell();
  bindLesson();
}

function startHtml() {
  const mods = course.modules
    .map(
      (m) => `<li class="module-card">
        <span class="module-index">0${m.n}</span>
        <div>
          <h3>${esc(m.title)}</h3>
          <p>${esc(m.blurb)}</p>
        </div>
        <span class="module-time">вебинар ${m.n}</span>
      </li>`
    )
    .join("");
  const heroCta = paid && user
    ? `<button class="btn light" type="button" id="toCourse">Войти в кабинет</button>`
    : `<button class="btn light" type="button" id="toApply">Пройти анкету</button>`;
  const navCta = paid && user
    ? `<button class="btn ghost" type="button" id="toCourseNav">в кабинет</button>`
    : `<button class="btn ghost" type="button" id="toLogin">войти</button>`;
  return `
    <div class="site">
      <section class="hero" id="top">
        <picture class="hero-pic">
          <source media="(max-width: 720px)" srcset="/assets/hero-mobile.webp" type="image/webp" />
          <img class="hero-bg" src="/assets/hero-4k.webp" alt="Школа доктора Шурова" fetchpriority="high" />
        </picture>
        <div class="hero-shade"></div>
        <header class="nav">
          <a class="brand" href="#/">школа доктора шурова</a>
          <nav>
            <a href="#how">как устроено</a>
            <a href="#program">программа</a>
            <a href="#doctor">автор</a>
          </nav>
          ${navCta}
        </header>
        <div class="hero-east">
          <h1>Любить, не теряя себя</h1>
          ${heroCta}
        </div>
        <div class="hero-west">
          <p>Кабинет курса: четыре вебинара, конспект, разбор схем отношений, рабочие листы и Кира.</p>
          <div class="chips">
            <a href="#how">Как устроено</a>
            <a href="#program">Программа</a>
            <a href="#doctor">Автор</a>
            <span>4 вебинара</span>
            <span>Кира</span>
          </div>
        </div>
      </section>

      <section class="strip" id="how">
        <div class="inner">
          <p><b>4 вебинара</b><span>Академический конспект и практика</span></p>
          <p><b>Разбор и инструменты</b><span>Как устроены отношения, рабочие листы, словарь</span></p>
          <p><b>Кира</b><span>Тьютор по курсу и созависимости</span></p>
        </div>
      </section>

      <section class="block violet" id="program">
        <div class="inner">
          <div class="program-head">
            <div><p class="kicker">Программа</p><h2>Четыре встречи курса</h2></div>
            <p>У каждой встречи одно поле: видео, академический конспект и практика. Рядом разбор схем, инструменты и Кира.</p>
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

      <section class="closing">
        <div class="closing-board">
          <p class="kicker">Вход</p>
          <h2>Сначала анкета,<br />потом кабинет</h2>
          <div class="closing-action">
            <p>Пять коротких вопросов настроят маршрут внутри курса. Если вы уже внутри, войдите по почте.</p>
            <button class="btn light" type="button" id="closingStart">Пройти анкету <i>→</i></button>
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
        <p class="lead">Если вы уже проходили анкету или оплату на этом устройстве, почта откроет то же место.</p>
        <form class="stack-form" id="loginForm">
          <label>почта<input name="email" type="email" required autocomplete="email" placeholder="you@email.ru" value="${esc(user?.email || "")}" /></label>
          <label>имя<input name="name" type="text" autocomplete="name" placeholder="Как к вам обращаться" value="${esc(user?.name || "")}" /></label>
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
            ${applyStep > 0 ? `<button class="btn ghost" type="button" id="applyBack">назад</button>` : `<a class="btn ghost" href="#/">на стартовую</a>`}
            <button class="btn" type="submit" id="applyNext">${n === total ? "к оплате" : "дальше"}</button>
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
        <p class="eye">Последний шаг</p>
        <h1>Открыть полный доступ</h1>
        <p class="lead">Четыре вебинара, лекции и практика. Касса ещё не подключена. Кнопка открывает кабинет, как после успешной оплаты.</p>
        <ul class="pay-points">
          <li>${esc(name)}</li>
          <li>${esc(email)}</li>
        </ul>
        <button class="btn" type="button" id="payStub">оплатить</button>
        <p class="fine">Заглушка. Боевой платёж встанет сюда отдельно.</p>
      </div>
    </div>`;
}

function shellHtml(inner) {
  const p = progressPct();
  const mods = course.modules
    .map((m) => {
      const items = m.lessons
        .map((l) => {
          const on = view === "lesson" && currentId === l.id ? " on" : "";
          const done = progress[l.id] ? " done" : "";
          return `<a class="${on}" href="#/lesson/${l.id}" data-id="${l.id}"><span class="dot${done}"></span><span>${esc(l.title)}</span></a>`;
        })
        .join("");
      return `<div class="nav-mod">
        <div class="n">вебинар ${m.n}</div>
        <div class="t">${esc(m.title)}</div>
        <div class="lessons">${items}</div>
      </div>`;
    })
    .join("");
  const doc = course.doctor || {};
  const rail = course.modules
    .map((m) => {
      const lesson = m.lessons[0];
      const on = view === "lesson" && currentId === lesson.id ? " on" : "";
      const done = progress[lesson.id] ? " is-done" : "";
      return `<a class="${on}${done}" href="#/lesson/${lesson.id}" data-id="${lesson.id}" aria-label="Вебинар ${m.n}. ${esc(m.title)}"><em>0${m.n}</em></a>`;
    })
    .join("");
  return `
    <div class="app">
      <div class="app-head">
      <header class="top">
        <a class="brand light" href="#/lesson/${esc(currentId)}">${brandHtml()}</a>
        <div class="top-titles"><span>Курс</span>${esc(course.title)}</div>
        <nav class="top-studio">
          <a href="#/kira" class="${view === "kira" ? "on" : ""}">Кира</a>
          <a href="#/atlas" class="${view === "atlas" ? "on" : ""}">Как это устроено</a>
          <a href="#/tools" class="${view === "tools" ? "on" : ""}">Инструменты</a>
        </nav>
        <button class="text-link light" type="button" id="logout">выйти</button>
      </header>
      ${view === "lesson" ? `<nav class="lesson-rail" aria-label="Вебинары">${rail}</nav>` : ""}
      </div>
      <div class="body">
        <aside class="side">
          <div class="userbar"><span>${esc(user.name).slice(0, 1)}</span><div><b>${esc(user.name)}</b><small>${esc(user.email || "")}</small></div></div>
          <div class="progress">
            <div class="meta"><span>прогресс</span><span>${p.done} / ${p.total}</span></div>
            <div class="bar"><i style="width:${p.pct}%"></i></div>
          </div>
          ${mods}
          <div class="studio">
            <a href="#/kira" class="${view === "kira" ? "on" : ""}">Кира</a>
            <a href="#/atlas" class="${view === "atlas" ? "on" : ""}">Как это устроено</a>
            <a href="#/tools" class="${view === "tools" ? "on" : ""}">Инструменты</a>
          </div>
          <div class="portrait">
            <img src="${esc(doc.photo || "/assets/shurov.webp")}" alt="${esc(doc.name || "")}" />
            <div class="cap"><b>${esc(doc.name || "")}</b>${esc(doc.role || "")}</div>
          </div>
        </aside>
        <main class="main">${inner}</main>
      </div>
      <nav class="app-dock" aria-label="Разделы кабинета">
        <a href="#/lesson/${esc(currentId)}" class="${view === "lesson" ? "on" : ""}">уроки</a>
        <a href="#/kira" class="${view === "kira" ? "on" : ""}">кира</a>
        <a href="#/atlas" class="${view === "atlas" ? "on" : ""}">разбор</a>
        <a href="#/tools" class="${view === "tools" ? "on" : ""}">листы</a>
      </nav>
    </div>`;
}

function lessonHtml() {
  const { module, lesson } = findLesson(currentId);
  const hw = homework[lesson.id] || { text: "", review: null };
  const lecture = lectureBlocks(lesson.lecture);
  const review = hw.review
    ? `<div class="review">
        <div class="tag">разбор</div>
        <p>${esc(hw.review.summary)}</p>
        <ul>${(hw.review.points || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
      </div>`
    : "";
  return `
    <div class="lesson-head">
      <div>
        <p class="crumb">Программа · вебинар ${module.n} из 4</p>
        <h2>${esc(lesson.title)}</h2>
        <p class="lede">${esc(module.blurb)}</p>
      </div>
      <span class="lesson-number">0${module.n}</span>
    </div>
    <div class="video" role="img" aria-label="Поле под видео">
      <div class="play" aria-hidden="true"></div>
      <div class="video-meta"><p>${esc(lesson.title)}</p><span>${esc(lesson.duration)} · 42 мин</span></div>
    </div>
    <section class="section">
      <div class="section-label">Академический конспект</div>
      <h3>Рамка встречи</h3>
      <div class="lecture">${lecture}</div>
    </section>
    <section class="section">
      <div class="section-label">Практика</div>
      <h3>Домашнее задание</h3>
      <div class="hw">
        <p class="ask">${esc(lesson.homework.prompt)}</p>
        <p class="hint">${esc(lesson.homework.hint)}</p>
        <textarea id="hwText" placeholder="Напишите ответ сюда">${esc(hw.text)}</textarea>
        <div class="row">
          <button class="btn" type="button" id="hwSend">отправить на проверку</button>
          <button class="btn ghost" type="button" id="markDone">${progress[lesson.id] ? "пройдено" : "отметить пройденным"}</button>
          <a class="btn ghost" href="#/kira">спросить Киру</a>
        </div>
        ${review}
      </div>
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

function kiraHtml() {
  const msgs = kira
    .map(
      (m) => `<div class="msg${m.me ? " me" : ""}">
        <div class="who">${esc(m.name)}</div>
        <div class="bubble">${esc(m.text)}</div>
      </div>`
    )
    .join("");
  return `
    <p class="crumb">Студия · тьютор курса</p>
    <h2>Кира</h2>
    <p class="lede">Помощник по всему кабинету и по созависимости. Не продажа. Можно опереться на вебинар, схему из раздела «Как это устроено» или ваш эпизод.</p>
    <div class="kira-pills">
      <button type="button" data-q="Что в курсе называется созависимостью?">Созависимость</button>
      <button type="button" data-q="Где граница между заботой и спасательством?">Забота и спасение</button>
      <button type="button" data-q="Как выдержать право разочаровать, если сразу накрывает вина?">Право разочаровать</button>
      <button type="button" data-q="Разбери треугольник Карпмана на бытовом примере.">Карпман</button>
    </div>
    <div class="chat-wrap kira-wrap">
      <div class="chat-log" id="kiraLog">${msgs}</div>
      <form class="chat-in" id="kiraForm">
        <input name="text" autocomplete="off" placeholder="Вопрос по курсу или по ситуации" />
        <button class="btn" type="submit">спросить</button>
      </form>
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
          <img src="${esc(item.image)}" alt="${esc(item.title)}" loading="lazy" width="1024" height="576" />
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
    ? `<figure class="studio-visual tool-visual"><img src="${esc(tool.image)}" alt="${esc(tool.title)}" loading="lazy" width="1024" height="576" /></figure>`
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
  const goCourse = () => go("/lesson/" + firstLessonId());
  const login = document.getElementById("toLogin");
  const applyBtn = document.getElementById("toApply");
  const courseNav = document.getElementById("toCourseNav");
  const closingStart = document.getElementById("closingStart");
  if (login) login.onclick = goLogin;
  if (applyBtn) applyBtn.onclick = () => goApply("");
  document.querySelectorAll("#toCourse").forEach((el) => { el.onclick = goCourse; });
  if (courseNav) courseNav.onclick = goCourse;
  if (closingStart) closingStart.onclick = () => goApply("");
}

function bindLogin() {
  document.getElementById("loginForm").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const email = String(fd.get("email") || "")
      .trim()
      .toLowerCase();
    const name = String(fd.get("name") || "").trim() || "Слушатель";
    if (!email) return;
    user = { id: "u-" + email, name, email };
    save(LS.user, user);
    await post("/auth/login", user);
    if (paid) go("/lesson/" + firstLessonId());
    else if (applyDone()) go("/pay");
    else go("/apply");
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
      id: "u-" + String(apply.email || "guest").toLowerCase(),
      name: apply.name || "Слушатель",
      email: String(apply.email || "").toLowerCase(),
    };
    save(LS.user, user);
    await post("/apply", { user, apply });
    go("/pay");
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
    go("/lesson/" + firstLessonId());
  };
}

function bindShell() {
  $app.querySelectorAll(".lessons a, .lesson-rail a").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      go("/lesson/" + a.dataset.id);
    });
  });
  const out = document.getElementById("logout");
  if (out) {
    out.onclick = () => {
      view = "start";
      go("/");
    };
  }
}

function bindLesson() {
  const send = document.getElementById("hwSend");
  const mark = document.getElementById("markDone");
  const area = document.getElementById("hwText");
  send.onclick = async () => {
    const text = area.value.trim();
    if (text.length < 12) {
      area.focus();
      return;
    }
    send.disabled = true;
    send.textContent = "проверяет…";
    const review = await reviewHomework(currentId, text);
    homework[currentId] = { text, review };
    save(LS.hw, homework);
    progress[currentId] = true;
    save(LS.progress, progress);
    send.disabled = false;
    render();
  };
  mark.onclick = () => {
    progress[currentId] = !progress[currentId];
    save(LS.progress, progress);
    render();
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
  if (log) log.scrollTop = log.scrollHeight;
  document.querySelectorAll(".kira-pills button").forEach((btn) => {
    btn.onclick = () => askKira(btn.dataset.q);
  });
  form.onsubmit = (e) => {
    e.preventDefault();
    const text = form.text.value.trim();
    if (!text) return;
    form.text.value = "";
    askKira(text);
  };
}

async function askKira(text) {
  kira.push({ id: "k" + Date.now(), name: user.name, me: true, text });
  kira.push({ id: "think", name: "Кира", me: false, text: "Собираю рамку ответа." });
  save(LS.kira, kira);
  render();
  const history = kira.slice(-10).map((m) => ({ role: m.me ? "user" : "assistant", text: m.text }));
  let reply = "";
  if (api) {
    try {
      const r = await fetch(`${api}/api/kira`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, userId: user.id, lessonId: currentId, history }),
      });
      if (r.ok) {
        const data = await r.json();
        reply = data.text || "";
      }
    } catch {
      /* local */
    }
  }
  if (!reply) reply = localKiraReply(text);
  kira = kira.filter((m) => m.id !== "think");
  kira.push({ id: "k" + Date.now() + "a", name: "Кира", me: false, text: reply });
  save(LS.kira, kira);
  render();
}

function localKiraReply(text) {
  const q = String(text || "");
  if (/суицид|убить себя|не хочу жить|насили|избивает/i.test(q)) {
    return "Сначала безопасность. Если есть угроза жизни или насилие: 112 в России и очная помощь. К курсу вернёмся, когда вы в безопасном месте.";
  }
  if (/созавис|слиян|раствор/i.test(q)) return "В курсе созависимость: регуляция себя отдана другому. Это не «слишком сильная любовь». Вебинар 1 и схема «Слияние, контакт, обрыв» в разделе «Как это устроено».";
  if (/карпман|треугольник/i.test(q)) return "Треугольник Карпмана: жертва, преследователь, спасатель. Роли крутятся. Курс ведёт в контакт: ясность, уязвимость, забота без захвата. Схема в разделе «Как это устроено».";
  if (/спасательств|enable|выпил|алкогол/i.test(q)) return "Спасательство снимает у другого последствие. Забота оставляет ему выбор. Курс не лечит зависимого через вас. Пауза 24 часа, если нет угрозы жизни. Это вебинар 2.";
  if (/винова|разочаров|сказать нет/i.test(q)) return "Право разочаровать: остаться при своём, когда другой вздыхает или злится. Вина ломает границу быстрее крика. Конструктор фразы в инструментах.";
  return "Опишите один факт: что произошло и что вы сделали или не сказали. Либо спросите термин, либо номер вебинара. Если сервер кабинета доступен, разбор будет глубже.";
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
  if (api) {
    try {
      const r = await fetch(`${api}/api/homework`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, text, userId: user.id }),
      });
      if (r.ok) return await r.json();
    } catch {
      /* stub */
    }
  }
  const { lesson } = findLesson(lessonId);
  const blame = /я плох|я эгоист|я виноват/i.test(text);
  const concrete = /утром|вечером|вчера|сегодня|сказал|сделал|не сказал/i.test(text);
  return {
    summary: "Учебный разбор по теме «" + lesson.title + "». Не клиническое заключение.",
    points: [
      concrete ? "Есть опора на факт. Это правильный регистр курса." : "Добавьте время, место, действие. Иначе останется оценка характера.",
      blame ? "Отделите факт от самообвинения. «Я плохая» закрывает исследование." : "Пока текст не сваливается в ярлык характера. Удержите это.",
      "Если Кира на сервере доступна, следующий разбор пойдёт через неё глубже.",
    ],
  };
}

function syncCookieClass() {
  const bar = document.getElementById("cookieBar");
  document.body.classList.toggle("has-cookie", Boolean(bar && !bar.hidden));
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

window.addEventListener("hashchange", route);
route();
bindCookie();

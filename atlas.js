/* тема: светлая / тёмная; по умолчанию — как в системе, выбор запоминается */
const darkSys = () => window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches;
const themeNow = () => document.documentElement.dataset.theme || (darkSys() ? "dark" : "light");
function setTheme(t, save) {
  document.documentElement.dataset.theme = t;
  const b = document.getElementById("theme");
  if (b) { b.textContent = t === "dark" ? "☀" : "☾"; b.title = t === "dark" ? "Светлая тема" : "Тёмная тема"; b.setAttribute("aria-label", b.title); }
  if (save) try { localStorage.setItem("atlas-theme", t); } catch (e) {}
}
try { const t = localStorage.getItem("atlas-theme"); if (t === "dark" || t === "light") document.documentElement.dataset.theme = t; } catch (e) {}
let ABOUT = "", V, SRC, ITEMS = [], NOTES = [], REVIEWED = {}, byId = new Map(), cur = null, mode = "ex";
const PUBLIC = !!window.ATLAS_DATA;   // публичная веб-версия: только чтение, без ссылок на оригинал
const isMobile = () => window.matchMedia && matchMedia("(max-width: 700px)").matches;
/* Вид: что показывать. Три режима и тонкая настройка; выбор запоминается в браузере посетителя.
   Локальный просмотрщик разбора — всегда «Полностью». */
const VIEW_OPTS = [
  ["Карточка", [
    ["ladder", "Лестница", "ступени: что тренирует, что должно уже работать"],
    ["legend", "Легенда лестницы", "подписи «фокус / попутно / ✓» под лестницей"],
    ["meta", "Служебная строка", "тип, структура, уверенность разметки, период источника"],
    ["bolt", "Молния электрофиксации", "судили ли в эпоху источника с аппаратом"]]],
  ["Номера", [
    ["goal", "Цель номера", "помогает, нейтрален, противодействует, противник"],
    ["errorVis", "Ошибка видна", "показывает ли упражнение ошибку само"],
    ["errCrit", "Критерий ошибки", "по чему судить: форма, момент, выбор…"],
    ["scoring", "Зачёт", "что считается успехом"],
    ["analytics", "Поля разбора", "воздействие на противника, сознательная нагрузка, регламентация, требования боя, риск подмены"]]],
  ["Регуляторы", [
    ["regs", "Регуляторы", null, [["all", "все"], ["applicable", "только применимые"], ["none", "не показывать"]]],
    ["regNotes", "Пояснения к регуляторам", "почему стоит такое значение"]]],
  ["Остальное", [
    ["forms", "Формы", null, [["all", "все семь"], ["fit", "только подходящие"], ["line", "одной строкой"]]],
    ["footwork", "Работа ног", null],
    ["prereq", "Что должно уже работать", null],
    ["conditions", "Условия", "особые условия: с закрытыми глазами, смена партнёров…"],
    ["comment", "Комментарий", "обоснование разметки"],
    ["discussion", "Обсуждение", "вопросы и замечания посетителей под карточкой"]]],
  ["Список и фильтры", [
    ["listLadder", "Мини-лестница в списке", null],
    ["listSource", "Источник и оружие в списке", null],
    ["fYear", "Фильтр по году источника", null],
    ["fMore", "Фильтры «Ещё»", "тип, наглядность ошибки, условия"]]],
];
const VIEW_PRESETS = {
  short: { label: "Коротко", hint: "суть упражнения",
    v: { ladder: false, legend: false, meta: false, bolt: false, goal: false, errorVis: false, errCrit: false, scoring: false, analytics: false,
         regs: "none", regNotes: false, forms: "line", footwork: true, prereq: false, conditions: false, comment: false, discussion: true,
         listLadder: false, listSource: true, fYear: false, fMore: false } },
  coach: { label: "Тренеру", hint: "суть и как дозировать",
    v: { ladder: true, legend: false, meta: false, bolt: true, goal: true, errorVis: true, errCrit: false, scoring: true, analytics: false,
         regs: "applicable", regNotes: false, forms: "fit", footwork: true, prereq: true, conditions: true, comment: false, discussion: true,
         listLadder: true, listSource: true, fYear: true, fMore: true } },
  full: { label: "Полностью", hint: "вся разметка",
    v: { ladder: true, legend: true, meta: true, bolt: true, goal: true, errorVis: true, errCrit: true, scoring: true, analytics: true,
         regs: "all", regNotes: true, forms: "all", footwork: true, prereq: true, conditions: true, comment: true, discussion: true,
         listLadder: true, listSource: true, fYear: true, fMore: true } },
};
const VKEY = "atlas-view-v1";
let SHOW = Object.assign({}, VIEW_PRESETS.coach.v);
function loadView() {
  if (!PUBLIC) { SHOW = Object.assign({}, VIEW_PRESETS.full.v); return; }
  try { const s = JSON.parse(localStorage.getItem(VKEY) || "null"); if (s) SHOW = Object.assign({}, VIEW_PRESETS.coach.v, s); } catch (e) {}
}
function saveView() { try { localStorage.setItem(VKEY, JSON.stringify(SHOW)); } catch (e) {} }
const presetNow = () => Object.keys(VIEW_PRESETS).find(p => Object.entries(VIEW_PRESETS[p].v).every(([k, v]) => SHOW[k] === v)) || "";
function setView(fn) { fn(SHOW); saveView(); renderViewPanel(); renderCard(); renderList(); }
function renderViewPanel() {
  const box = $("vp"); box.innerHTML = "";
  const pn = presetNow();
  box.append(h("div", { class: "vp-head" }, h("b", null, "Что показывать"), h("button", { type: "button", class: "link", onclick: closeView }, "закрыть")),
    h("div", { class: "vp-presets" }, Object.entries(VIEW_PRESETS).map(([k, p]) =>
      h("button", { type: "button", "aria-pressed": String(pn === k), onclick: () => setView(S => Object.assign(S, p.v)) }, h("b", null, p.label), h("small", null, p.hint)))),
    h("div", { class: "vp-custom", hidden: pn ? true : null }, "Свой набор — настроено ниже"));
  for (const [title, opts] of VIEW_OPTS) {
    const g = h("div", { class: "vp-grp" }, h("h4", null, title));
    for (const [k, label, hint, choices] of opts) {
      if (choices) g.append(h("div", { class: "sel" }, h("span", null, label),
        (() => { const sel = h("select", { "aria-label": label, onchange: e => setView(S => { S[k] = e.target.value; }) },
          choices.map(([v, l]) => h("option", { value: v }, l))); sel.value = SHOW[k]; return sel; })()));
      else g.append(h("label", null, h("input", { type: "checkbox", checked: !!SHOW[k], onchange: e => setView(S => { S[k] = e.target.checked; }) }),
        h("span", null, label, hint ? h("small", null, hint) : null)));
    }
    box.append(g);
  }
}
function openView() { renderViewPanel(); $("viewpanel").hidden = false; const b = $("vp").querySelector("button[aria-pressed='true']") || $("vp").querySelector("button"); if (b) b.focus(); }
function closeView() { $("viewpanel").hidden = true; (isMobile() ? $("tab-view") : $("view-btn")).focus(); }
/* Адрес карточки. Локальный просмотрщик — «#id»; публичная версия — своя страница на каждое упражнение («…/id/»),
   корень сайта — document.baseURI (на страницах упражнений стоит <base href="../">). */
const ROOT = new URL(".", document.baseURI).pathname;
const cardURL = id => PUBLIC ? ROOT + encodeURIComponent(id) + "/" : "#" + id;
const listURL = () => PUBLIC ? ROOT : location.pathname + location.search;
function urlId() {
  const h = decodeURIComponent(location.hash.slice(1));
  if (!PUBLIC || h) return h;   // старые ссылки с решёткой тоже открываются
  const p = location.pathname;
  return p.startsWith(ROOT) ? decodeURIComponent(p.slice(ROOT.length).replace(/\/(index\.html)?$/, "")) : "";
}
const atCard = () => !!urlId();
const $ = id => document.getElementById(id);
function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") e.className = v; else if (k.startsWith("on")) e[k] = v; else e.setAttribute(k, v === true ? "" : v);
  }
  for (const k of kids.flat(Infinity)) if (k != null && k !== false) e.append(k.nodeType ? k : document.createTextNode(String(k)));
  return e;
}
async function api(path, body) {
  const r = await fetch(path, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {});
  const j = await r.json(); if (!r.ok) throw new Error(j.error || r.status); return j;
}

/* ---------- словари и форматирование ---------- */
const charName = a => { const ch = a.split(".")[0]; const c = V.characters[ch] || {}; return c.atlas || c.label || ch; };
const aspLabel = a => (V.aspects[a] || {}).label || a;
const aspTip = (a, what) => what + " · " + aspLabel(a);
const STRUCT = { single: "тренируется один (соло или с тренером)", symmetric: "симметричное: оба номера с одной задачей", asymmetric: "асимметричное: А и Б с разными задачами" };
const CONF = { high: "высокая", medium: "средняя", low: "низкая" };
const lvl = (v, map) => !v ? "" : Array.isArray(v) ? (v[0] === v[v.length - 1] ? map(v[0]) : `${map(v[0])} → ${map(v[v.length - 1])}`) : map(v);
function regVal(v) {
  if (v == null) return "не указано";
  if (v === "open") return "откр."; if (v === "n/a") return "неприменим"; if (v === "varies") return "плавает";
  const f = x => x === "open" ? "откр." : x === "n/a" ? "—" : x;
  return v[0] === v[1] ? String(f(v[0])) : `${f(v[0])} → ${f(v[1])}`;
}
/* Диапазон регулятора кружками 1–3, как радиокнопки (автор 2026-10-29); 0 (или «на первых ступенях не требуется») —
   перечёркнутый кружок перед ними, только когда входит в диапазон */
function regDots(k, v) {
  if (!Array.isArray(v) || k === "options" || v.some(x => x === "open")) return regVal(v);
  const an = (V.regulators[k] || {}).anchors || {};
  const na = v[0] === "n/a", lo = na ? 0 : +v[0], hi = +v[1];
  const tip = i => an[i] != null ? `${i} — ${an[i]}` : String(i);
  return h("span", { class: "dots" },
    h("i", { class: "z" + (lo === 0 ? " on" : ""), title: lo === 0 && na ? "на первых ступенях не требуется" : tip(0) }),   // ноль — всегда, перечёркнутый: активный или нет
    [1, 2, 3].map(i => h("i", { class: i >= lo && i <= hi ? "on" : "", title: tip(i) })));
}
function regTip(k, v) {
  const an = (V.regulators[k] || {}).anchors || {};
  if (!Array.isArray(v)) return "";
  const out = []; for (let i = v[0] === "n/a" ? 0 : +v[0]; i <= +v[1]; i++) if (an[i] != null) out.push(`${i} — ${an[i]}`);
  return out.join("\n");
}
/* Оружие источника и судейство его эпохи: электрофиксация с electric_since (шпага 1936, рапира 1956, сабля 1988). */
/* Оружие — по каждому источнику (той его части, откуда взято упражнение); судейство — по оружию и году источника. */
/* Молния — в эпоху источника на этом спортивном оружии уже была электрофиксация; перечёркнутая — ещё не было.
   У оружия, где аппарата не бывает (длинный меч, эспадрон, штык…), значка нет. */
function bolt(on, tip) {
  const sp = h("span", { class: "bolt " + (on ? "on" : "off"), title: tip, role: "img", "aria-label": tip });
  sp.innerHTML = '<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path d="M9.5 1 3 9.2h4.2L6.3 15 13 6.6H8.7z" fill="currentColor"/>'
    + (on ? "" : '<path d="M2 14.5 14.5 2" stroke="var(--surface)" stroke-width="3.2"/><path d="M2 14.5 14.5 2" stroke="currentColor" stroke-width="1.5"/>') + "</svg>";
  return sp;
}
function sourceContext(s) {
  const W = V.weapons || {}, S = SRC[s.source] || {};
  const start = { P1: 1800, P2: 1940, P3: 1978, P4: 1997, P5: 1900 };
  const year = S.year || start[S.period] || 0;
  const ws = s.weapon || [];
  if (!ws.length) return ["оружие не указано"];
  const real = ws.filter(w => w !== "any");
  if (!real.length) return [(W.any || {}).label || "без оружия"];
  const out = [];
  real.forEach((w, i) => {
    const lab = (W[w] || {}).label || w, since = (W[w] || {}).electric_since;
    if (i) out.push(", ");
    out.push(lab);
    if (since && SHOW.bolt) {
      const on = year >= since, y = S.year ? `источник ${S.year} г.` : "источник без точного года";
      out.push(bolt(on, on ? `электрофиксация: на этом оружии с ${since} г.; ${y}`
                           : `без электрофиксации: на этом оружии она появилась в ${since} г.; ${y} — судили без аппарата`));
    }
  });
  return out;
}
/* Лестница «от детали к бою»: ступень = часть системы; закрашено — фокус, светлее — попутно, ✓ — должно уже работать.
   Строится из уже размеченных аспектов. Дистанция и эмоции — метками сбоку, не ступенями. */
function ladderView(it) {
  const L = V.ladder || {}, keys = Object.keys(L); if (!keys.length) return null;
  const stepOf = a => keys.find(k => L[k].aspects.includes(a));
  const pre = new Set((it.prerequisites || []).map(stepOf));
  const asym = it.structure === "asymmetric";
  const parts = asym ? [["А", it.roles.first], ["Б", it.roles.second]] : [["", it]];
  if (!parts.some(([, r]) => (r.focus || []).length || (r.also || []).length) && !pre.size) return null;
  const cols = (asym ? "22px " : "") + "repeat(" + keys.length + ", minmax(0,1fr))";
  const grid = h("div", { class: "ladder", style: "grid-template-columns:" + cols });
  const put = (...xs) => xs.forEach(x => grid.append(x));
  if (asym) put(h("span"));
  keys.forEach(k => put(h("span", { class: "lh", title: L[k].def }, h("span", { class: "full" }, L[k].label), h("span", { class: "short" }, LAD_SHORT[k] || L[k].label))));
  const marks = [];
  for (const [lab, r] of parts) {
    const F = new Set((r.focus || []).map(stepOf)), A = new Set((r.also || []).map(stepOf));
    const all = [...(r.focus || []), ...(r.also || [])], mc = L.launch.mid_chain || [];
    const mid = mc.some(a => all.includes(a)), start = all.some(a => L.launch.aspects.includes(a) && !mc.includes(a));
    if (asym) put(h("span", { class: "lab" }, lab));
    // лестница накопительная: всё ниже верхней тренируемой ступени должно быть уже поставлено (кроме того, что само в фокусе)
    const top = Math.max(-1, ...[...F].map(k => keys.indexOf(k)));
    // ✓ на ступени фокуса — если она в prerequisites: прорабатывается, но должна уже работать (бой, автор 2026-10-29)
    const cum = it.technique !== "none";   // техники фехтования не требует — ступени ниже фокуса не считаются поставленными
    const need = k => pre.has(k) || (cum && !F.has(k) && keys.indexOf(k) < top);
    keys.forEach((k, i) => {
      const asp = all.filter(a => stepOf(a) === k).map(a => ((r.focus || []).includes(a) ? "● " : "◐ ") + aspLabel(a));
      const txt = need(k) ? "✓" : (k === "launch" && mid ? (start ? "в начале и по ходу" : "по ходу цепочки") : "");
      put(h("span", { class: "lc" + (F.has(k) ? " f" : A.has(k) ? " a" : "") + (i === 0 ? " l0" : "") + (i === keys.length - 1 ? " l9" : ""),
        title: [L[k].label, ...asp, need(k) ? "✓ должно быть уже поставлено" + (F.has(k) ? " — и прорабатывается" : pre.has(k) ? "" : " (ниже тренируемой ступени)") : ""].filter(Boolean).join("\n") }, txt));
    });
    const m = Object.entries(V.ladder_marks || {}).filter(([, x]) => x.aspects.some(a => all.includes(a)))
      .map(([, x]) => h("span", { class: "lmark" + (x.aspects.some(a => (r.focus || []).includes(a)) ? " f" : ""), title: x.def }, x.label));
    if (m.length) marks.push(h("span", { class: "lmarks" }, lab ? h("b", { class: "rl" }, lab) : null, ...m));
  }
  return h("div", { class: "ladwrap" }, grid,
    h("div", { class: "lfoot" }, h("span", null, "Лестница", helpBtn("ladder")), it.technique === "none" ? h("span", { class: "lmark f", title: "Упражнение без фехтовальной техники: ступени ниже фокуса не требуются" }, "техники фехтования не требует") : null,
      marks.length ? [h("span", null, "Вне лестницы:"), ...marks] : null,
      !SHOW.legend ? null : h("span", { class: "llegend" },
        h("span", null, h("i", { class: "sw f" }), "тренирует (фокус)"),
        h("span", null, h("i", { class: "sw a" }), "работает попутно"),
        h("span", null, h("i", { class: "sw" }, "✓"), "должно быть уже поставлено"))));
}
/* «Работа ног: …» — только если источник её называет; у асимметричного — по номерам */
function footLine(it) {
  const lab = fw => (fw || []).map(x => ((V.footwork || {})[x] || {}).label || x).join(", ");
  if (it.structure === "asymmetric") {
    const p = [["А", (it.roles || {}).first], ["Б", (it.roles || {}).second]].filter(([, r]) => r && (r.footwork || []).length)
      .map(([l, r]) => `${l} — ${lab(r.footwork)}`);
    return p.length ? "Работа ног: " + p.join("; ") : "";
  }
  const pf = it.partner || {};
  if ((pf.footwork || []).length)   // урок с тренером / партнёр-стимул: шаги обоих
    return "Работа ног: " + [(it.footwork || []).length ? "ученик — " + lab(it.footwork) : null, pf.who + " — " + lab(pf.footwork)].filter(Boolean).join("; ");
  return (it.footwork || []).length ? "Работа ног: " + lab(it.footwork) : "";
}
function weaponLine(it) {
  const out = [], seen = new Set();
  for (const s of it.sources || []) {
    const key = s.source + "|" + (s.weapon || []).join(",");
    if (seen.has(key)) continue; seen.add(key);
    if (out.length) out.push(" · ");
    out.push(h("b", null, (SRC[s.source] || {}).short || s.source), ": ", ...sourceContext(s));
  }
  return out.length ? out : ["оружие не указано"];
}
/* Коды в тексте карточек — словами: id другого упражнения → «название» (щелчок открывает его),
   P5-13 → «первичный разбор: <период>, запись 13». В данных коды остаются: они не ломаются при переименованиях. */
let REF_RX = null;
function refText(text) {
  const s = String(text ?? "");
  if (!REF_RX) {
    const ids = [...byId.keys()].sort((a, b) => b.length - a.length).map(x => x.replace(/[-]/g, "\\-"));
    const asp = Object.keys(V.aspects).sort((a, b) => b.length - a.length).map(x => x.replace(/[.-]/g, "\\$&"));
    REF_RX = new RegExp("(?<![\\w./-])(" + ids.join("|") + ")(?![\\w-])|\\bP([1-5])-(\\d+)\\b|(?<![\\w./-])(" + asp.join("|") + ")(?![\\w-])", "g");
  }
  const out = []; let last = 0;
  for (const m of s.matchAll(REF_RX)) {
    out.push(s.slice(last, m.index));
    if (m[1]) {
      const id = m[1], nm = byId.get(id).name;
      out.push(h("a", { href: cardURL(id), class: "ref", "data-id": id, title: "открыть упражнение" }, "«" + nm + "»"));
    } else if (m[4]) {   // код аспекта (engineer.weight-tuning) → «Сознательный контроль: …» — персонажей лекции в тексте не показываем
      out.push(h("span", { title: aspLabel(m[4]) }, "«" + charName(m[4]) + ": " + aspLabel(m[4]).split(/:| — /)[0] + "»"));
    } else {
      out.push(`первичный разбор: ${V.periods["P" + m[2]] || "период " + m[2]}, запись ${m[3]}`);
    }
    last = m.index + m[0].length;
  }
  out.push(s.slice(last));
  return out.flatMap(x => typeof x === "string" ? distText(x) : [x]);
}
/* Описание: абзацы с отступом, ступени «1. …» — нумерованным списком, буквы номеров А/Б — жирным. */
function roleText(nodes) {
  return nodes.flatMap(x => {
    if (typeof x !== "string") return [x];
    const out = []; let last = 0;
    for (const m of x.matchAll(/(^|[\s(;:«])([АБ])(?=\s+(?:—|[а-яё]))/g)) {
      const at = m.index + m[1].length;
      out.push(x.slice(last, at), h("b", { class: "rl" }, m[2])); last = at + 1;
    }
    out.push(x.slice(last));
    return out;
  });
}
function richText(text) {
  const box = h("div", { class: "desc" });
  let ol = null;
  for (const raw of String(text).split(/\n+/)) {
    const line = raw.trim(); if (!line) continue;
    const m = line.match(/^(\d+)[.)]\s+(.*)$/);
    if (m) {
      if (!ol) { ol = h("ol", { start: m[1] }); box.append(ol); }
      ol.append(h("li", null, ...roleText(refText(m[2]))));
    } else {
      ol = null;
      const lead = line.match(/^([А-ЯЁA-Z][а-яёa-z]+(?:[ -][А-ЯЁA-Zа-яёa-z0-9()]+){0,3}):\s+(.*)$/);   // «Условия: …», «Усложнение: …» — заголовок абзаца
      box.append(lead ? h("p", null, h("b", { class: "lead" }, lead[1] + ": "), ...roleText(refText(lead[2])))
                      : h("p", null, ...roleText(refText(line))));
    }
  }
  return box;
}
/* Шкала дистанций: у «ближней / средней / дальней / сверхдальней дистанции» — подсказка с определением из словаря. */
const DIST_RX = /(сверхдальн|дальн|средн|ближн)[а-яё]*\s+дистанци[а-яё]*/gi;   // \w в JS не ловит кириллицу
function distText(s) {
  const D = V.distances || {}, by = { "ближн": D.close, "средн": D.middle, "дальн": D.long, "сверхдальн": D["extra-long"] };
  const out = []; let last = 0;
  for (const m of s.matchAll(DIST_RX)) {
    const d = by[m[1].toLowerCase()];
    if (!d) continue;
    out.push(s.slice(last, m.index), h("span", { class: "dist", title: `${d.label}: ${d.def}` }, m[0]));
    last = m.index + m[0].length;
  }
  out.push(s.slice(last));
  return out;
}
const listOrDash = (arr, f) => (arr && arr.length) ? arr.map(f).join(", ") : "—";

/* ---------- заметки: куда можно адресовать ---------- */
function targetsFor(it) {
  const t = [["whole", "Упражнение в целом"], ["name", "Название"], ["family", "Семейство"], ["description", "Описание"]];
  if (it.variants && it.variants.length) t.push(["variants", "Варианты"]);
  if (it.kind === "diagnostic") t.push(["diagnosis", "Что проверяет"]);
  else if (it.structure === "asymmetric") t.push(["roles.first", "Номер А"], ["roles.second", "Номер Б"]);
  else t.push(["training", "Кого тренируем, сложность, ошибка"]);
  if (it.partner) t.push(["partner", "Тренер / партнёр"]);
  if (it.probes && it.probes.length) t.push(["probes", "Проверки"]);
  t.push(["form", "Формы"], ["properties", "Регламентация, условия, риск"], ["comment", "Комментарий"], ["sources", "Источники и адреса"]);
  return t;
}
const targetName = (it, k) => (targetsFor(it).find(x => x[0] === k) || [k, k])[1];
const notesOf = id => NOTES.filter(n => n.id === id);

/* ---------- список ---------- */
/* ---------- фильтры (2026-10-30): уровень, что развиваем, формат, год, оружие, ещё ---------- */
const FORM_SHORT = { individual: "индив", group: "группа", "coach-line": "строй", solo: "соло", "solo-lights": "Reaction Lights", sparring: "вольный бой", "task-sparring": "бой с заданием" };
const TYPES = { training: "развивающие", diagnostic: "проверочные", psyche: "психологические", bout: "бои" };
const FKEY = "atlas-filters-v2";   // v2: край шкалы годов хранится как «без границы» (null), а не как год
const LAD_SHORT = { atomic: "атом.", coordinated: "согл.", launch: "запуск", recognition: "узнав.", control: "упр. боем", psyche: "психика" };
let K = [], STEP = {}, YR = [0, 0];
const F0 = () => ({ lvl: -1, steps: [], asps: [], also: false, noHelper: true, forms: [], possible: true,
  y0: null, y1: null, noYear: true, weap: [], anyW: true, types: [], obvious: false, conds: [], status: "", group: "family", topic: "", tcat: "" });
const STATUS = { "": "все", open: "с открытыми заметками", answered: "с разобранными заметками", none: "без заметок", unseen: "непросмотренные", seen: "просмотренные" };
let F = F0();
function loadF() { try { const s = JSON.parse(localStorage.getItem(FKEY) || "null"); if (s) F = Object.assign(F0(), s); } catch (e) {} }
function saveF() {   // край шкалы годов — «без границы»: новые источники попадают в диапазон сами
  try { const G = Object.assign({}, F, { y0: F.y0 <= YR[0] ? null : F.y0, y1: F.y1 >= YR[1] ? null : F.y1 }); localStorage.setItem(FKEY, JSON.stringify(G)); } catch (e) {}
}
function initFilters() {
  K = Object.keys(V.ladder); STEP = {};
  K.forEach((k, i) => (V.ladder[k].aspects || []).forEach(a => { STEP[a] = i; }));
  const ys = Object.values(SRC).map(s => s.year).filter(Number.isFinite);
  YR = [Math.min(...ys), Math.max(...ys)];
  loadF();
  if (F.y0 == null || F.y0 < YR[0]) F.y0 = YR[0];
  if (F.y1 == null || F.y1 > YR[1]) F.y1 = YR[1];
  try { localStorage.removeItem("atlas-filters-v1"); } catch (e) {}
}
const roleRows = it => it.structure === "asymmetric" ? [["А", (it.roles || {}).first || {}], ["Б", (it.roles || {}).second || {}]] : [["", it]];
const fstep = r => Math.max(-1, ...(r.focus || []).map(a => STEP[a] ?? -1));
const preMax = it => Math.max(-1, ...(it.prerequisites || []).map(a => STEP[a] ?? -1));
const isBout = it => { const d = (it.form || {}).described_in || []; return d.some(x => x === "sparring" || x === "task-sparring") && !d.some(x => x === "individual" || x === "solo"); };
const isPsyche = it => roleRows(it).some(([, r]) => fstep(r) === K.indexOf("psyche"));
function trainedRows(it) {   // номера, которые тренируются: партнёр-помощник не в счёт (если есть кто-то ещё)
  const rs = roleRows(it);
  if (!F.noHelper) return rs;
  const t = rs.filter(([, r]) => r.goal !== "helps");
  return t.length ? t : rs;
}
/* Уровень группы — ступени, которые уже стоят (автор 2026-11-01): упражнение по уровню, если его ✓ «должно быть уже
   поставлено» не выходят за отмеченное («5 галок у упражнения, 4 у ученика — не по уровню»); фокус — фильтр «Что развиваем». */
function ticksOf(it, r) {
  const fs = fstep(r), pre = new Set((it.prerequisites || []).map(a => STEP[a])), cum = it.technique !== "none";
  return new Set(K.map((k, i) => i).filter(i => pre.has(i) || (cum && i < fs)));
}
function lvlOk(it, r, lvl) {   // уровень отмечается лестницей (стоят ступени 0…lvl); упражнение по уровню, если всё, что оно требует (✓), уже стоит
  if (lvl < 0) return true;
  return [...ticksOf(it, r)].every(i => i <= lvl);
}
function devOk(r, steps, asps, also) {
  if (!steps.length && !asps.length) return true;
  const list = (r.focus || []).concat(also ? (r.also || []) : []);
  return asps.length ? list.some(a => asps.includes(a)) : list.some(a => steps.includes(STEP[a]));
}
function formRank(it, forms, possible) {   // 2 — хорошо, 1 — с оговорками, 0 — не подходит
  if (!forms.length) return 2;
  let best = 0;
  for (const f of forms) { const fit = ((it.form || {})[f] || {}).fit; if (fit === "good") best = 2; else if (fit === "possible" && possible) best = Math.max(best, 1); }
  return best;
}
function yearOk(it, y0, y1, noYear) {
  const ys = (it.sources || []).map(s => (SRC[s.source] || {}).year).filter(Number.isFinite);
  if (!ys.length) return noYear;
  return ys.some(y => y >= y0 && y <= y1);
}
function weapOk(it, weap, anyW) {
  if (!weap.length) return true;
  const w = it.weapon || [];
  return w.some(x => weap.includes(x)) || (anyW && w.includes("any"));
}
function typeOk(it, types) {
  if (!types.length) return true;
  const t = it.kind === "diagnostic" ? ["diagnostic"] : [isBout(it) ? "bout" : null, isPsyche(it) ? "psyche" : null].filter(Boolean);
  if (!t.length) t.push("training");
  return t.some(x => types.includes(x));
}
const obviousOk = it => roleRows(it).some(([, r]) => ((r.error_visibility || {}).level || []).includes("obvious"));
function baseOk(it) {   // поиск и статус разбора — как раньше
  const q = $("q").value.trim().toLowerCase();
  if (q) {
    const hay = [it.name, it.id, it.family, it.description, it.comment].join(" ").toLowerCase();
    if (!q.split(/\s+/).every(w => hay.includes(w))) return false;
  }
  const ns = notesOf(it.id), f = F.status;
  if (f === "open") return ns.some(n => n.status === "open");
  if (f === "answered") return ns.some(n => n.status !== "open");
  if (f === "none") return !ns.length;
  if (f === "unseen") return !REVIEWED[it.id];
  if (f === "seen") return !!REVIEWED[it.id];
  if (f.startsWith("batch:")) return it.batch === f.slice(6);   // партия новых карточек (поле batch)
  return true;
}
/* Совпадение по всем фильтрам; skip — фасет, который не учитывать (для счётчиков). Возвращает null или {rank, roles}. */
function match(it, G = F, skip = "") {
  if (!baseOk(it)) return null;
  const rows = trainedRows(it).filter(([, r]) => (skip === "lvl" || lvlOk(it, r, G.lvl)) && (skip === "dev" || devOk(r, G.steps, G.asps, G.also)));
  if (!rows.length) return null;
  const rank = skip === "form" ? 2 : formRank(it, G.forms, G.possible);
  if (!rank) return null;
  if (skip !== "year" && SHOW.fYear && !yearOk(it, G.y0, G.y1, G.noYear)) return null;
  if (skip !== "weap" && !weapOk(it, G.weap, G.anyW)) return null;
  if (skip !== "type" && SHOW.fMore && !typeOk(it, G.types)) return null;
  if (skip !== "obv" && SHOW.fMore && G.obvious && !obviousOk(it)) return null;
  if (skip !== "topic") { const ts = topicSet(G); if (ts.length && !(it.topics || []).some(t => ts.includes(t))) return null; }
  if (skip !== "cond" && SHOW.fMore && G.conds.length && !(it.conditions || []).some(c => G.conds.includes(c))) return null;
  return { rank, roles: rows.map(([l]) => l).filter(Boolean) };
}
function shownList() {
  const out = [];
  for (const it of ITEMS) { const m = match(it); if (m) out.push([it, m]); }
  if (F.forms.length) out.sort((a, b) => b[1].rank - a[1].rank);   // сначала «хорошо», потом «с оговорками»; внутри — прежний порядок
  return out;
}
/* тема: выбранные темы; если выбрана только категория — все её темы */
const topicsOf = g => Object.entries(V.topics || {}).filter(([, t]) => t.group === g).map(([k]) => k);
const topicSet = G => G.topicAny || (G.topic ? [G.topic] : []);   // одна выбранная тема; topicAny — только для счётчиков категорий
const activeCount = () => [F.lvl >= 0, F.steps.length || F.asps.length, F.forms.length, topicSet(F).length, SHOW.fYear && (F.y0 > YR[0] || F.y1 < YR[1] || !F.noYear),
  F.weap.length, SHOW.fMore && F.types.length, SHOW.fMore && F.obvious, SHOW.fMore && F.conds.length, F.status].filter(Boolean).length;
const countIf = (skip, G) => ITEMS.reduce((n, it) => n + (match(it, G, skip) ? 1 : 0), 0);
function upd(fn) { fn(F); saveF(); renderList(); }
const tog = (arr, x) => arr.includes(x) ? arr.filter(y => y !== x) : arr.concat([x]);
function chip(label, on, n, onclick, tip) {
  return h("button", { type: "button", class: "chip" + (on ? " on" : "") + (n === 0 && !on ? " zero" : ""), "aria-pressed": String(!!on), title: tip || null, onclick },
    label, n != null ? h("span", { class: "n" }, n) : null);
}
function ladPick(cls, onclick, title) {
  return h("div", { class: "pick" }, K.map((k, i) => h("button", { type: "button", class: "pc " + (cls(i) || ""), title: V.ladder[k].label, "aria-label": V.ladder[k].label, onclick: () => onclick(i) },
    h("span", null, LAD_SHORT[k] || V.ladder[k].label))));
}
function renderFilters() {
  const box = $("filters"); if (!box) return; box.innerHTML = "";
  const n = activeCount();
  $("fsum").textContent = n ? `· включено ${n}` : "";
  // уровень
  box.append(h("div", { class: "fh" }, "Уровень: уже уверенно стоит", helpBtn("f:level")),
    ladPick(i => i <= F.lvl ? "k" : "", i => upd(G => { G.lvl = G.lvl === i ? -1 : i; })),
    h("div", { class: "fopt meta" }, F.lvl >= 0 ? "Показаны упражнения, которым хватает того, что уже стоит" : "Кликните по ступени, до которой у группы всё уже стоит"));
  // что развиваем
  box.append(h("div", { class: "fh" }, "Что развиваем", helpBtn("f:dev")),
    ladPick(i => F.steps.includes(i) ? "t" : "", i => upd(G => { G.steps = tog(G.steps, i); G.asps = G.asps.filter(a => G.steps.includes(STEP[a])); })));
  if (F.steps.length) {
    const wrap = h("div", { class: "chips" });
    for (const i of F.steps.slice().sort()) for (const a of V.ladder[K[i]].aspects || []) {
      const c = ITEMS.reduce((m, it) => m + (match(it, Object.assign({}, F, { asps: [a] })) ? 1 : 0), 0);
      wrap.append(chip(aspLabel(a), F.asps.includes(a), c, () => upd(G => { G.asps = tog(G.asps, a); }), aspLabel(a)));
    }
    box.append(wrap);
  }
  box.append(h("div", { class: "fopt" },
    h("label", null, h("input", { type: "checkbox", checked: F.also, onchange: e => upd(G => { G.also = e.target.checked; }) }), " и попутно"),
    h("label", { title: "Фокус партнёра, который только помогает, не учитывать" }, h("input", { type: "checkbox", checked: F.noHelper, onchange: e => upd(G => { G.noHelper = e.target.checked; }) }), " без партнёра-помощника")));
  // формат
  const fw = h("div", { class: "chips" });
  for (const f of Object.keys(V.form)) fw.append(chip(FORM_SHORT[f] || f, F.forms.includes(f), ITEMS.reduce((m, it) => m + (match(it, Object.assign({}, F, { forms: [f] })) ? 1 : 0), 0),
    () => upd(G => { G.forms = tog(G.forms, f); }), V.form[f].label));
  box.append(h("div", { class: "fh" }, "Формат", helpBtn("f:form")), fw, h("div", { class: "fopt" },
    h("label", null, h("input", { type: "checkbox", checked: F.possible, onchange: e => upd(G => { G.possible = e.target.checked; }) }), " и «с оговорками» — ниже в списке")));
  // тема: дерево — категории строками, раскрываются в темы; выбирается одна тема (автор 2026-11-01)
  if (Object.keys(V.topics || {}).length) {
    const cnt = G => ITEMS.reduce((m, it) => m + (match(it, Object.assign({}, F, { topic: "", topicAny: null }, G)) ? 1 : 0), 0);
    const TG = V.topic_groups || {}, T = V.topics;
    const sel = F.topic && T[F.topic] ? F.topic : "";
    const head = h("div", { class: "tsel-head" }, h("span", { class: "meta" }, "Тема:"),
      sel ? [h("b", null, capital((TG[T[sel].group] || {}).label) + (topicsOf(T[sel].group).length > 1 ? " › " + T[sel].label : "")),
             h("button", { type: "button", class: "link", title: "Сбросить тему", "aria-label": "Сбросить тему", onclick: () => upd(G => { G.topic = ""; }) }, "✕")]
          : h("span", { class: "meta" }, "любая"));
    const tree = h("div", { class: "tsel", role: "tree" });
    for (const [g, d] of Object.entries(TG)) {
      const ks = topicsOf(g); if (!ks.length) continue;
      const single = ks.length === 1, open = !single && F.tcat === g, n = cnt({ topicAny: ks });
      const on = single && sel === ks[0], inside = !single && sel && T[sel].group === g;
      tree.append(h("button", { type: "button", class: "trow cat" + (on || inside ? " on" : "") + (n ? "" : " zero"), role: "treeitem",
        "aria-expanded": single ? null : String(open), title: single ? T[ks[0]].def : ks.map(k => T[k].label).join(", "),
        onclick: () => upd(G => { if (single) G.topic = G.topic === ks[0] ? "" : ks[0]; else G.tcat = G.tcat === g ? "" : g; }) },
        single ? h("span", { class: "tw" }, h("i", { class: "rd" + (on ? " on" : "") })) : h("span", { class: "tw" }, open ? "▾" : "▸"), h("span", { class: "tlab" }, capital(d.label)), h("span", { class: "tn" }, n)));
      if (open) for (const t of ks) {
        const m = cnt({ topic: t }), cur = sel === t;
        tree.append(h("button", { type: "button", class: "trow sub" + (cur ? " on" : "") + (m ? "" : " zero"), role: "treeitem", title: T[t].def,
          "aria-selected": String(cur), onclick: () => upd(G => { G.topic = G.topic === t ? "" : t; }) },
          h("span", { class: "tw" }, h("i", { class: "rd" + (cur ? " on" : "") })), h("span", { class: "tlab" }, T[t].label), h("span", { class: "tn" }, m)));
      }
    }
    box.append(h("div", { class: "fh" }, "Тема", helpBtn("f:topic")), head, tree);
  }
  if (SHOW.fYear) {   // год (раздел можно спрятать в настройках вида)
  const lab = h("span", { class: "meta" }, `${F.y0} — ${F.y1}`);
  // один ползунок с интервалом: две ручки на общей дорожке, выбранный отрезок закрашен
  const sel = h("span", { class: "sel" }), span = Math.max(1, YR[1] - YR[0]);
  const paint = () => { sel.style.left = (100 * (F.y0 - YR[0]) / span) + "%"; sel.style.width = (100 * (F.y1 - F.y0) / span) + "%"; };
  const rng = (key) => h("input", { type: "range", min: YR[0], max: YR[1], step: 1, value: F[key], "aria-label": key === "y0" ? "год источника от" : "год источника до",
    oninput: e => { let v = +e.target.value; if (key === "y0" && v > F.y1) v = F.y1; if (key === "y1" && v < F.y0) v = F.y0; F[key] = v; e.target.value = v;
      lo.style.zIndex = F.y0 > YR[1] - span * 0.1 ? 3 : 2; lab.textContent = `${F.y0} — ${F.y1}`; paint(); },
    onchange: () => upd(() => {}) });
  const lo = rng("y0"), hi = rng("y1"); lo.style.zIndex = F.y0 > YR[1] - span * 0.1 ? 3 : 2; hi.style.zIndex = 2; paint();
  box.append(h("div", { class: "fh" }, "Год источника ", lab), h("div", { class: "yrs" }, h("span", { class: "trk" }), sel, lo, hi), h("div", { class: "fopt" },
    h("label", null, h("input", { type: "checkbox", checked: F.noYear, onchange: e => upd(G => { G.noYear = e.target.checked; }) }), " и без даты"),
    (F.y0 > YR[0] || F.y1 < YR[1]) ? h("button", { type: "button", class: "link", onclick: () => upd(G => { G.y0 = YR[0]; G.y1 = YR[1]; }) }, "весь диапазон") : null));
  }
  // оружие
  const ww = h("div", { class: "chips" });
  for (const w of Object.keys(V.weapons).filter(x => x !== "any"))
    ww.append(chip(V.weapons[w].label.split(" (")[0], F.weap.includes(w), ITEMS.reduce((m, it) => m + (match(it, Object.assign({}, F, { weap: [w], anyW: false })) ? 1 : 0), 0), () => upd(G => { G.weap = tog(G.weap, w); })));
  box.append(h("div", { class: "fh" }, "Оружие"), ww, h("div", { class: "fopt" },
    h("label", null, h("input", { type: "checkbox", checked: F.anyW, onchange: e => upd(G => { G.anyW = e.target.checked; }) }), " включая универсальные (любое оружие)")));
  // ещё
  const more = h("details", { class: "more", open: (F.types.length || F.obvious || F.conds.length || F.status) ? true : null }, h("summary", null, PUBLIC ? "Ещё: тип, наглядность ошибки, условия" : "Ещё: тип, наглядность ошибки, условия, разбор"));
  const tw = h("div", { class: "chips" });
  for (const [t, l] of Object.entries(TYPES)) tw.append(chip(l, F.types.includes(t), ITEMS.reduce((m, it) => m + (match(it, Object.assign({}, F, { types: [t] })) ? 1 : 0), 0), () => upd(G => { G.types = tog(G.types, t); })));
  const cw = h("div", { class: "chips" });
  for (const [c, d] of Object.entries(V.conditions || {})) cw.append(chip(d.label, F.conds.includes(c), ITEMS.reduce((m, it) => m + (match(it, Object.assign({}, F, { conds: [c] })) ? 1 : 0), 0), () => upd(G => { G.conds = tog(G.conds, c); })));
  more.append(h("div", { class: "fh" }, "Тип"), tw,
    h("div", { class: "fopt" }, h("label", { title: V.error_visibility_levels.obvious }, h("input", { type: "checkbox", checked: F.obvious, onchange: e => upd(G => { G.obvious = e.target.checked; }) }), " ошибка видна сама (наглядная)")),
    h("div", { class: "fh" }, "Условия"), cw,
    PUBLIC ? "" : h("div", null, h("div", { class: "fh" }, "Разбор"), h("div", { class: "chips" }, Object.entries(STATUS).filter(([k]) => k).map(([k, l]) =>
      chip(l, F.status === k, null, () => upd(G => { G.status = G.status === k ? "" : k; }))),
      [...new Set(ITEMS.map(x => x.batch).filter(Boolean))].map(b => chip("новые: " + b, F.status === "batch:" + b, ITEMS.filter(x => x.batch === b).length,
        () => upd(G => { G.status = G.status === "batch:" + b ? "" : "batch:" + b; }), "Карточки, заведённые партией «" + b + "»")))));
  if (SHOW.fMore) box.append(more);
  if (n) box.append(h("div", { class: "fopt" }, h("button", { type: "button", class: "link", onclick: () => { const g = F.group; F = F0(); F.y0 = YR[0]; F.y1 = YR[1]; F.group = g; saveF(); renderList(); } }, "сбросить фильтры")));
}
function miniLadder(it, rows) {
  const r = rows[0] || {}, fs = fstep(r), pre = new Set((it.prerequisites || []).map(a => STEP[a]));
  const cum = it.technique !== "none";
  return h("span", { class: "mlad", "aria-hidden": "true" }, K.map((k, i) => h("i", { class: i === fs ? "f" : (pre.has(i) || (cum && i < fs)) ? "c" : "" })));
}
function hints() {   // что ослабить, если найдено мало
  const out = [];
  if (F.forms.length && !F.possible) out.push(["если добавить «с оговорками»", Object.assign({}, F, { possible: true }), G => { G.possible = true; }]);
  if ((F.steps.length || F.asps.length) && !F.also) out.push(["если учитывать и попутно", Object.assign({}, F, { also: true }), G => { G.also = true; }]);
  if (F.weap.length && !F.anyW) out.push(["если включить универсальные", Object.assign({}, F, { anyW: true }), G => { G.anyW = true; }]);
  return out.map(([t, G, fn]) => [t, ITEMS.reduce((m, it) => m + (match(it, G) ? 1 : 0), 0), fn]).filter(x => x[1]);
}

const exMatches = it => !!match(it);
function renderList() {
  const box = $("list"); box.innerHTML = "";
  renderFilters();
  const shown = shownList();
  const seen = ITEMS.filter(x => REVIEWED[x.id]).length;
  $("count").textContent = `${shown.length} из ${ITEMS.length} в списке` + (PUBLIC ? "" : ` · просмотрено ${seen} из ${ITEMS.length}`);
  $("progress").style.width = (100 * seen / ITEMS.length) + "%";
  $("fshow").textContent = shown.length ? `Показать ${shown.length} ${plural(shown.length, "упражнение", "упражнения", "упражнений")}` : "Ничего не нашлось";
  const fc = activeCount(); $("tab-fcnt").hidden = !fc; $("tab-fcnt").textContent = fc;
  let fam = null, poss = false, closed = false;
  if (cur && !shown.some(([x]) => x.id === cur.id))
    box.append(h("div", { class: "hidecur" }, "Открытая карточка скрыта фильтрами. ",
      h("button", { type: "button", class: "link", onclick: () => { const g = F.group; F = F0(); F.y0 = YR[0]; F.y1 = YR[1]; F.group = g; saveF(); renderList(); revealFamily(cur.family); } }, "сбросить фильтры")));
  const famCount = {}; for (const [it, m] of shown) { const k = (m.rank === 1 ? "~" : "") + it.family; famCount[k] = (famCount[k] || 0) + 1; }
  const famTotal = {}; for (const it of ITEMS) famTotal[it.family] = (famTotal[it.family] || 0) + 1;
  for (const [it, m] of shown) {
    if (F.forms.length && m.rank === 1 && !poss) { poss = true; fam = null; box.append(h("div", { class: "fam poss" }, "С оговорками по формату")); }
    if (it.family !== fam) {
      fam = it.family; const f0 = fam; closed = COLLAPSED.has(f0);
      box.append(h("button", { type: "button", class: "fam" + (cur && cur.family === f0 ? " curfam" : ""), "aria-expanded": String(!closed), "data-fam": f0,
        onclick: () => { if (COLLAPSED.has(f0)) COLLAPSED.delete(f0); else COLLAPSED.add(f0); saveCollapsed(); renderList(); } },
        h("span", { class: "car" }, closed ? "▸" : "▾"), h("span", { class: "fn" }, f0 || "без семейства"),
        h("span", { class: "fc" }, `${famCount[(m.rank === 1 ? "~" : "") + f0]} из ${famTotal[f0]}`)));
    }
    if (closed) continue;
    const ns = notesOf(it.id), o = ns.filter(n => n.status === "open").length, d = ns.length - o;
    const src = (it.sources || []).map(x => (SRC[x.source] || {}).short).filter(Boolean);
    const wpn = (it.weapon || []).map(w => (V.weapons[w] || {}).label || w).map(x => x.split(" (")[0]);
    const who = it.structure === "asymmetric" && m.roles.length === 1 ? "у " + m.roles[0] : "";
    box.append(h("button", { type: "button", class: "ex" + (REVIEWED[it.id] ? " seen" : ""), "aria-current": String(cur && cur.id === it.id), onclick: () => openFromList(it.id) },
      h("span", { class: "tick", title: REVIEWED[it.id] ? "просмотрено " + REVIEWED[it.id] : "" }, REVIEWED[it.id] ? "✓" : ""),
      h("span", { class: "info" }, h("span", { class: "nm" }, it.name),
        SHOW.listSource || who ? h("span", { class: "sm" }, [SHOW.listSource ? src[0] + (src.length > 1 ? ` +${src.length - 1}` : "") : "", SHOW.listSource ? wpn.join(", ") : "", who].filter(Boolean).join(" · ")) : null),
      SHOW.listLadder ? miniLadder(it, trainedRows(it).filter(([l]) => !who || l === m.roles[0]).map(([, r]) => r)) : null,
      SHOW.discussion && CCOUNT[it.id] ? h("span", { class: "cmt", title: "комментариев в обсуждении" }, "💬 " + CCOUNT[it.id]) : null,
      o ? h("span", { class: "badge open", title: "открытых заметок" }, o) : null,
      d ? h("span", { class: "badge done", title: "разобранных заметок" }, "✓" + d) : null));
  }
  if (shown.length < 5 && activeCount()) for (const [t, c, fn] of hints())
    box.append(h("button", { type: "button", class: "hint", onclick: () => upd(fn) }, `${t} — найдётся ${c}`));
  if (!shown.length) box.append(h("p", { class: "empty", style: "padding:0 12px" }, "Ничего не нашлось."));
}

/* ---------- карточка ---------- */
function blk(title, target, ...content) {
  const open = cur ? notesOf(cur.id).filter(n => n.target === target && n.status === "open").length : 0;
  return h("section", { class: "blk" },
    h("h3", null, title, open ? h("span", { class: "chipnote" }, `заметок: ${open}`) : null,
      target && !PUBLIC ? h("button", { type: "button", class: "link add", onclick: () => startNote(target) }, "＋ заметка") : null),
    ...content);
}
function aspects(focus, also) {
  return h("div", { class: "asp" },
    (focus || []).map(a => h("div", { class: "f", title: aspTip(a, "в фокусе") }, h("span", { class: "ch" }, charName(a) + ": "), aspLabel(a))),
    (also || []).map(a => h("div", { class: "a", title: aspTip(a, "попутно") }, h("span", { class: "ch" }, charName(a) + ": "), aspLabel(a))));
}
function training(r, it, fieldNotesPrefix) {
  const ev = r.error_visibility || {};
  const regs = r.regulators || {};
  const fn = it.field_notes || {};
  const regRows = Object.keys(V.regulators).filter(k => SHOW.regs !== "applicable" || (regs[k] != null && regs[k] !== "n/a")).map(k => {
    const note = fn[(fieldNotesPrefix ? fieldNotesPrefix + "." : "") + k];
    return h("tr", null, h("th", null, V.regulators[k].label, helpBtn("reg:" + k)), h("td", { class: "v", title: regTip(k, regs[k]) }, regDots(k, regs[k])),
      SHOW.regNotes ? h("td", { class: "meta" }, refText(note || "")) : null);
  });
  return [
    h("dl", { class: "kv" },
      h("dt", null, "Тренируем", helpBtn("train")), h("dd", null, aspects(r.focus, r.also)),
      r.goal && SHOW.goal ? [h("dt", null, "Цель номера", helpBtn("goal")), h("dd", null, V.partner_goals[r.goal] || r.goal)] : null,
      r.success_visibility && SHOW.errorVis ? [h("dt", null, "Успех виден", helpBtn("errvis")), h("dd", null,   // упражнения на баланс и снятие барьеров: важно увидеть успех, а не ошибку
        lvl((r.success_visibility || {}).level, x => (V.error_visibility_levels[x] || x).split(" — ")[0]) || "",
        h("div", { class: (r.success_visibility.level || []).length ? "meta" : "" }, refText(r.success_visibility.how)))] : null,
      r.error_visibility || !r.success_visibility ? [
        SHOW.errorVis ? [h("dt", null, "Ошибка видна", helpBtn("errvis")), h("dd", null, lvl(ev.level, x => (V.error_visibility_levels[x] || x).split(" — ")[0]) || "—", ev.how ? h("div", { class: "meta" }, refText(ev.how)) : null)] : null,
        SHOW.errCrit ? [h("dt", null, "Критерий ошибки", helpBtn("errcrit")), h("dd", null, listOrDash(r.error_criterion, c => (V.error_criteria[c] || c).split(":")[0]))] : null] : null,
      SHOW.scoring ? [h("dt", null, "Зачёт", helpBtn("scoring")), h("dd", null, refText(r.scoring || "—"))] : null,
      SHOW.analytics ? [h("dt", null, "Воздействие на противника", helpBtn("victim")), h("dd", null, listOrDash(r.opponent_victim, c => (V.characters[c] || {}).atlas || c)),
        h("dt", null, "Сознательная нагрузка", helpBtn("load")), h("dd", null, listOrDash(r.engineer_load, l => V.engineer_load[l] || l))] : null),
    SHOW.regs === "none" || !regRows.length ? null : h("div", { class: "wrapx" }, h("table", { class: "t", style: "margin-top:8px" },
      h("thead", null, h("tr", null, h("th", null, "Регулятор", helpBtn("regs")), h("th", null, "0–3"), SHOW.regNotes ? h("th", null, "Пояснение") : null)),
      h("tbody", null, regRows))),
  ];
}
function renderCard() {
  const it = cur, box = $("card"); box.innerHTML = "";
  const m = { append: (...xs) => box.append(...xs.flat().filter(x => x != null && x !== false)) };
  if (!it) { renderAbout(box); return; }
  const periods = [...new Set((it.sources || []).map(s => (SRC[s.source] || {}).period).filter(Boolean))];
  m.append(
    famNav(it),
    !PUBLIC && it.batch ? h("div", { class: "batchmark", title: "Новая карточка из партии «" + it.batch + "» — ещё не разобрана автором" }, "новая · " + it.batch) : null,
    h("h2", null, it.name),
    h("p", { class: "ctx" }, weaponLine(it)),
    SHOW.ladder ? ladderView(it) : null,
    !SHOW.meta ? null : h("div", { class: "sub" }, h("span", null, ((V.kinds || {})[it.kind || "training"] || {}).label || ""), h("span", null, STRUCT[it.structure] || it.structure),
      h("span", null, "уверенность: " + (CONF[it.confidence] || it.confidence || "—")),
      h("span", null, periods.map(p => V.periods[p] || p).join(", ")),
      null),
    h("hr", { class: "hdiv" }),   // шапка карточки отделена от содержания; кнопки «просмотрено» — только внизу
    blk("Описание", "description", richText(it.description || "—"),
      ITEMS.some(x => (x.then || []).includes(it.id)) ? h("p", { class: "meta" }, "Проверить: ", refText(ITEMS.filter(x => (x.then || []).includes(it.id)).map(x => x.id).join(", "))) : null),
    it.variants && it.variants.length ? blk("Варианты", "variants", h("ul", null, it.variants.map(v =>
      h("li", null, h("b", null, v.name), v.description ? [" — ", refText(v.description)] : "", v.focus ? h("span", { class: "meta" }, " · фокус: " + [].concat(v.focus).map(aspLabel).join(", ")) : null)))) : null,
  );
  if (it.kind === "diagnostic") {
    m.append(blk("Что проверяет", "diagnosis", h("dl", { class: "kv" },
      it.structure === "asymmetric" ? [h("dt", null, "Номера"), h("dd", null, "А — ", it.roles.first.label, "; Б — ", it.roles.second.label)] : null,
      h("dt", null, "Проверяет"), h("dd", null, refText(it.checks || "—")),
      h("dt", null, "Признак проблемы"), h("dd", null, refText(it.sign || "—")),
      h("dt", null, "Что значит"), h("dd", null, refText(it.means || "—")),
      h("dt", null, "Чем исправлять"), h("dd", null, (it.then || []).length ? refText(it.then.join(", ")) : "—"))));
  } else if (it.structure === "asymmetric") {
    const r1 = it.roles.first, r2 = it.roles.second;
    m.append(blk("Номера", null, h("div", { class: "roles" },
      h("div", { class: "role" }, h("h4", null, "А — ", r1.label, PUBLIC ? null : h("small", null, " · ", h("button", { type: "button", class: "link", onclick: () => startNote("roles.first") }, "＋ заметка"))), training(r1, it, "first")),
      h("div", { class: "role" }, h("h4", null, "Б — ", r2.label, PUBLIC ? null : h("small", null, " · ", h("button", { type: "button", class: "link", onclick: () => startNote("roles.second") }, "＋ заметка"))), training(r2, it, "second")))));
  } else {
    m.append(blk(it.structure === "symmetric" ? "Оба номера" : "Занимающийся", "training", h("div", { class: "role" }, training(it, it, ""))));
    const pt = it.partner;   // второй участник, который сам не тренируется: что делает и с какой целью
    if (pt && (pt.task || pt.goal)) m.append(blk(pt.who ? pt.who[0].toUpperCase() + pt.who.slice(1) : "Тренер / партнёр", "partner", h("dl", { class: "kv" },
      pt.goal ? [h("dt", null, "Цель"), h("dd", null, V.partner_goals[pt.goal] || pt.goal)] : null,
      pt.task ? [h("dt", null, "Что делает"), h("dd", null, richText(pt.task))] : null)));
  }
  if (it.probes && it.probes.length) {
    m.append(blk("Проверки", "probes", h("ul", { class: "probes" }, it.probes.map(pr => h("li", null,
      h("div", null, h("b", null, "Как: "), refText(pr.how)),
      h("div", null, h("b", null, "Признак: "), refText(pr.sign)),
      h("div", null, h("b", null, "Значит: "), refText(pr.means)),
      pr.source || (pr.then || []).length ? h("div", { class: "meta" },
        pr.source ? "Источник: " + ((SRC[pr.source] || {}).short || pr.source) : "",
        (pr.then || []).length ? [pr.source ? " · " : "", "Чем исправлять: ", refText(pr.then.join(", "))] : "") : null)))));
  }
  if (SHOW.footwork && footLine(it)) m.append(blk("Работа ног", null, h("div", { class: "desc" },   // по участнику в строке: «Ученик — …», «Тренер — …»
    footLine(it).replace(/^Работа ног: /, "").split("; ").map(s => h("p", { style: "margin:0 0 .3em" }, s[0].toUpperCase() + s.slice(1))))));
  const fm = it.form || {};
  const tlight = x => h("i", { class: "tl " + ({ good: "g", possible: "y", poor: "r" }[x.fit] || ""), title: V.form_fit[x.fit] || x.fit, "aria-label": V.form_fit[x.fit] || x.fit });
  const fitForms = Object.keys(V.form).filter(f => ["good", "possible"].includes((fm[f] || {}).fit)).sort((a, b) => (fm[a].fit === "good" ? 0 : 1) - (fm[b].fit === "good" ? 0 : 1));
  if (SHOW.forms === "line") m.append(blk(["Формы", helpBtn("forms")], "form", fitForms.length ? h("div", { class: "formline" }, fitForms.map(f =>
    h("span", { title: refText(fm[f].why || "").map(x => x.textContent ?? x).join("") }, tlight(fm[f]), FORM_SHORT[f] || V.form[f].label, f === "solo-lights" ? helpBtn("rtl") : null))) : h("p", { class: "meta" }, "—")));
  else m.append(blk(["Формы", helpBtn("forms")], "form",
    SHOW.forms === "all" ? h("div", { class: "meta", style: "margin-bottom:4px" }, "Описано в источнике: " + listOrDash(fm.described_in, f => (V.form[f] || {}).label || f)) : null,
    h("div", { class: "wrapx" }, h("table", { class: "t" }, h("tbody", null, (SHOW.forms === "fit" ? fitForms : Object.keys(V.form)).map(f => {
      const x = fm[f] || {};
      return h("tr", null, h("th", null, V.form[f].label, f === "solo-lights" ? helpBtn("rtl") : null), h("td", { class: "v", style: "text-align:center" }, x.fit ? h("i", { class: "tl " + ({ good: "g", possible: "y", poor: "r" }[x.fit] || ""), title: V.form_fit[x.fit] || x.fit, "aria-label": V.form_fit[x.fit] || x.fit }) : "—"), h("td", null, refText(x.why || "")));
    }))))));
  const fnr = (it.field_notes || {}).regulators;
  const props = [
    SHOW.analytics ? [h("dt", null, "Регламентация", helpBtn("regulation")), h("dd", null, lvl(it.regulation, x => (V.regulation_levels[x] || x).split(" — ")[0]))] : null,
    SHOW.conditions && (SHOW.analytics || (it.conditions || []).length) ? [h("dt", null, "Условия", helpBtn("conditions")), h("dd", null, listOrDash(it.conditions, c => (V.conditions[c] || {}).label || c))] : null,
    SHOW.prereq && (SHOW.analytics || (it.prerequisites || []).length) ? [h("dt", null, "Что должно уже работать", helpBtn("prereq")), h("dd", null, listOrDash(it.prerequisites, aspLabel))] : null,
    SHOW.analytics ? [h("dt", null, "Требования боя", helpBtn("ivreq")), h("dd", null, listOrDash(it.iv_requirements, x => x)),
      h("dt", null, "Риск подмены", helpBtn("subst")), h("dd", null, refText(it.substitution_risk || "—"))] : null,
    fnr && SHOW.regNotes ? [h("dt", null, "О регуляторах"), h("dd", null, refText(fnr))] : null].filter(Boolean);
  if (props.length) m.append(blk(SHOW.analytics ? "Регламентация, условия, риск" : "Подготовка и условия", "properties", h("dl", { class: "kv" }, props)));
  if (SHOW.comment) m.append(blk("Комментарий", "comment", h("p", { class: "text" }, refText(it.comment || "—")),
    it.notes ? h("p", { class: "text meta" }, "Служебное: ", refText(it.notes)) : null,
    it.derived_from ? h("p", { class: "meta" }, "Откуда в атласе: ", refText(it.derived_from.join(", "))) : null));
  const exBox = h("div");
  m.append(blk(PUBLIC ? "Источники" : "Источники и адреса", "sources",
    h("ul", { class: "src" }, (it.sources || []).map(s => {
      const S = SRC[s.source] || {};
      return h("li", null, h("b", null, S.short || s.source), S.title ? " — " + S.title : "", s.pages ? `, с. ${s.pages}` : "",
        h("span", { class: "ctxs" }, " · ", ...sourceContext(s)), s.note ? h("span", { class: "meta" }, " · ", refText(s.note)) : null);
    })),
    PUBLIC ? null : (it.excerpts || []).length ? h("button", { type: "button", onclick: e => loadExcerpts(it.id, exBox, e.currentTarget) }, "Показать полный текст источников") : h("p", { class: "meta" }, "Адресов фрагментов нет."),
    exBox));
  if (PUBLIC && SHOW.discussion) m.append(discussionBlock(it));
  m.append(revbar(it, true));   // те же кнопки внизу — чтобы не листать наверх
  box.scrollTop = 0;
}
/* ---------- обсуждение карточки (публичная версия): Cloudflare Worker + невидимый Turnstile ---------- */
const COMMENTS = { api: "https://fencing-atlas-comments.balenko.workers.dev", sitekey: "0x4AAAAAAFt65TCDXGX1G62e" };
let CCOUNT = {};
async function loadCounts() {
  try { CCOUNT = await fetch(COMMENTS.api + "/counts").then(r => r.json()); renderList(); } catch (e) {}
}
let TS = null;   // загрузка скрипта Turnstile — один раз, по требованию
function turnstileReady() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!TS) TS = new Promise((ok, no) => {
    const sc = document.createElement("script");
    sc.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"; sc.async = true;
    sc.onload = () => ok(window.turnstile); sc.onerror = () => { TS = null; no(new Error("нет связи с защитой от спама")); };
    document.head.append(sc);
  });
  return TS;
}
async function turnstileToken(holder) {   // невидимая проверка: токен на одну отправку
  const ts = await turnstileReady();
  return new Promise((ok, no) => {
    holder.innerHTML = "";
    const id = ts.render(holder, { sitekey: COMMENTS.sitekey, size: "invisible", callback: t => { ok(t); setTimeout(() => ts.remove(id), 0); },
      "error-callback": () => no(new Error("проверка «не робот» не удалась")), "timeout-callback": () => no(new Error("проверка «не робот» не успела")) });
  });
}
const fmtDate = s => { const d = new Date(String(s).replace(" ", "T") + "Z"); return isNaN(d) ? "" : d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }); };
function discussionBlock(it) {
  const list = h("div", { class: "clist" }, h("p", { class: "meta" }, "Загружаю…"));
  const msg = h("div", { class: "msg" }), holder = h("div");
  const ta = h("textarea", { placeholder: "Вопрос, замечание, опыт применения…", "aria-label": "Текст комментария", maxlength: "2000" });
  let saved = ""; try { saved = localStorage.getItem("atlas-cname") || ""; } catch (e) {}
  const nm = h("input", { type: "text", placeholder: "Имя (необязательно)", "aria-label": "Имя", maxlength: "60", value: saved });
  let parent = null;
  const replying = h("div", { class: "replying", hidden: true });
  const setParent = c => {
    parent = c ? c.id : null; replying.hidden = !c; replying.innerHTML = "";
    if (c) { replying.append("Ответ для: " + (c.name || "Гость") + " ", h("button", { type: "button", class: "link", onclick: () => setParent(null) }, "отменить")); ta.focus(); }
  };
  const draw = rows => {
    list.innerHTML = "";
    if (!rows.length) { list.append(h("p", { class: "meta" }, "Пока никто не писал. Вопрос, найденная неточность или опыт применения — пишите первым.")); return; }
    const kids = {}; rows.filter(c => c.parent).forEach(c => (kids[c.parent] = kids[c.parent] || []).push(c));
    const one = (c, reply) => h("div", { class: "cm" + (reply ? " reply" : "") },
      h("div", { class: "top" }, h("span", { class: "who" }, c.author ? "Автор атласа" : (c.name || "Гость")), c.author ? h("span", { class: "auth" }, "автор") : null,
        h("span", null, fmtDate(c.created)), reply ? null : h("button", { type: "button", class: "link rep", onclick: () => setParent(c) }, "ответить")),
      h("p", { class: "txt" }, c.body));
    rows.filter(c => !c.parent || !rows.some(p => p.id === c.parent)).forEach(c => { list.append(one(c, false)); (kids[c.id] || []).forEach(k => list.append(one(k, true))); });
  };
  const load = async () => {
    try { const rows = await fetch(COMMENTS.api + "/comments?card=" + encodeURIComponent(it.id)).then(r => r.json()); if (cur && cur.id === it.id) draw(rows); }
    catch (e) { list.innerHTML = ""; list.append(h("p", { class: "meta" }, navigator.onLine === false ? "Обсуждение видно, когда есть интернет." : "Обсуждение сейчас не загрузилось.")); }
  };
  const btn = h("button", { type: "submit", class: "primary" }, "Отправить");
  const form = h("form", { onsubmit: async e => {
    e.preventDefault();
    const body = ta.value.trim(); if (body.length < 2) { ta.focus(); return; }
    btn.disabled = true; msg.className = "msg"; msg.textContent = "Отправляю…";
    try {
      const token = await turnstileToken(holder);
      const r = await fetch(COMMENTS.api + "/comments", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card: it.id, name: nm.value.trim(), body, parent, token }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "не отправилось");
      try { localStorage.setItem("atlas-cname", nm.value.trim()); } catch (e2) {}
      ta.value = ""; setParent(null); msg.textContent = "Опубликовано.";
      CCOUNT[it.id] = (CCOUNT[it.id] || 0) + 1;
      await load();
    } catch (err) { msg.className = "msg err"; msg.textContent = "Не отправилось: " + err.message; }
    finally { btn.disabled = false; }
  } }, replying, ta, h("div", { class: "row" }, nm, btn), msg, holder,
    h("div", { class: "fine" }, "Комментарии видны всем посетителям. Защита от спама — Cloudflare Turnstile (",
      h("a", { href: "https://www.cloudflare.com/turnstile-privacy-policy/", target: "_blank", rel: "noopener" }, "политика конфиденциальности"), ")."));
  load();
  return h("section", { class: "blk disc", id: "discussion" }, h("h3", null, "Обсуждение"), list, form);
}
/* ---------- быстрая справка: «?» у параметра → короткое объяснение; шкалы и определения — из словаря ---------- */
const capital = t => t ? t[0].toUpperCase() + t.slice(1) : t;
const liKV = (k, v) => h("li", null, h("span", { class: "k" }, k), v);
const lvlList = obj => h("ul", null, Object.entries(obj).map(([k, v]) => { const [a, b] = String(v).split(/ — |: /); return h("li", null, h("b", null, a), b ? " — " + b : ""); }));
function helpContent(key) {
  const R = V.regulators || {};
  if (key.startsWith("reg:")) {
    const k = key.slice(4), r = R[k] || {};
    if (k === "options") return [capital(r.label), [h("p", null, "Не шкала, а количество: сколько разных ответов может потребоваться. 1 — ответ один; 2 и больше — нужно выбирать."),
      h("p", null, "«Действовать или ждать» — два варианта: не отвечать — тоже ответ. «Выбрать момент» — один: действие одно, ждать — не ответ.")]];
    const an = r.anchors || {};
    return [capital(r.label), [h("ul", null, [0, 1, 2, 3].filter(i => an[i] != null).map(i => liKV(i, an[i]))),
      h("p", { class: "meta" }, "Прочерк — к этому упражнению регулятор неприменим. Подробнее о кружках — «?» у заголовка «Регулятор».")]];
  }
  const T = {
    regs: ["Регуляторы", [h("p", null, "Ручки сложности упражнения по шкале 0–3: как дозировать упражнение — от простого варианта до сложного."),
      h("ul", null, h("li", null, "Закрашенные кружки — диапазон, в котором упражнение работает."), h("li", null, "Перечёркнутый кружок — ноль; закрашен — ноль входит в диапазон."),
        h("li", null, "Прочерк — регулятор к упражнению неприменим.")),
      h("p", null, "Обман, скрытие и проницательность описывают того, о ком строка: как он обманывает, как прячет свои признаки, как распознаёт намерения противника."),
      h("p", { class: "meta" }, "У каждого регулятора свой «?» — что значит каждое деление.")]],
    ladder: ["Лестница: от детали к бою", [h("p", null, "Ступени — части навыка фехтовальщика, от отдельного движения к бою:"),
      h("ol", null, Object.values(V.ladder || {}).map(l => h("li", null, h("b", null, l.label), " — ", l.def))),
      h("p", null, "Закрашенная клетка — фокус упражнения, светлее — работает попутно, ✓ — должно быть уже поставлено. Ступени накопительны: всё ниже фокуса должно уже работать."),
      h("p", null, "Вне лестницы — метки: ", Object.values(V.ladder_marks || {}).map(m => m.label + " (" + m.def + ")").join("; "), ".")]],
    train: ["Тренируем", [h("p", null, "Что упражнение развивает. ● — фокус: главное, ради чего упражнение; ◐ — работает попутно."),
      h("p", null, "Перед двоеточием — часть системы, к которой относится навык: ", Object.values(V.characters || {}).map(c => c.atlas).filter(Boolean).join(", ").toLowerCase(), ".")]],
    goal: ["Цель номера", [h("p", null, "Чего добивается этот номер по отношению к другому:"), lvlList(V.partner_goals || {})]],
    errvis: ["Ошибка видна", [h("p", null, "Показывает ли упражнение ошибку само, без тренера:"), lvlList(V.error_visibility_levels || {}),
      h("p", { class: "meta" }, "У упражнений на уверенность вместо этого — «Успех виден»: там важно, чтобы ученик увидел, что получилось.")]],
    errcrit: ["Критерий ошибки", [h("p", null, "По чему судить, что сделано неправильно:"), lvlList(V.error_criteria || {})]],
    scoring: ["Зачёт", [h("p", null, "Что засчитывается как успех: по чему ученик и тренер понимают, что получилось.")]],
    victim: ["Воздействие на противника", [h("p", null, "На какую часть системы противника направлено действие: что у соперника оно использует или ломает. Например, «выбор и запуск действий» — вызвать преждевременный старт или задержать ответ."),
      h("p", { class: "meta" }, "Прочерк — упражнение не про воздействие на противника.")]],
    load: ["Сознательная нагрузка", [h("p", null, "Чем занята голова ученика во время упражнения — какая сознательная работа от него нужна:"),
      h("ul", null, Object.values(V.engineer_load || {}).map(v => h("li", null, v)))]],
    regulation: ["Регламентация", [h("p", null, "Насколько заранее задано, что делают участники:"), lvlList(V.regulation_levels || {})]],
    conditions: ["Условия", [h("p", null, "Особые условия, в которых проходит упражнение:"), h("p", null, Object.values(V.conditions || {}).map(c => c.label).join(", ") + ".")]],
    prereq: ["Что должно уже работать", [h("p", null, "Без чего упражнение не получится: эти навыки у занимающихся уже должны быть. На лестнице они отмечены ✓.")]],
    ivreq: ["Требования боя", [h("p", null, "Каким требованиям боя упражнение помогает соответствовать: к исполнению, к физподготовке и другим частям системы.")]],
    subst: ["Риск подмены", [h("p", null, "Как упражнение может незаметно превратиться в другое и начать учить не тому. На что смотреть тренеру.")]],
    forms: ["Формы", [h("p", null, "В каком формате занятия упражнение работает:"), h("ul", null, Object.values(V.form || {}).map(f => h("li", null, f.label))),
      h("p", null, h("i", { class: "tl g" }), " хорошо  ", h("i", { class: "tl y" }), " с оговорками  ", h("i", { class: "tl r" }), " плохо"),
      h("p", null, "Соло с Reaction Training Lights — со световым тренажёром реакции, подробнее ", helpBtn("rtl")),
      h("p", { class: "meta" }, "«Описано в источнике» — в каком формате упражнение даёт автор.")]],
    "f:level": ["Уровень", [h("p", null, "Кликните по ступени, до которой у группы или ученика всё уже уверенно стоит (нижние отметятся сами). Останутся упражнения, которым хватает того, что уже стоит: всё, что упражнение требует (✓ на лестнице), у группы есть. Что именно развивать — следующий фильтр, «Что развиваем»."),
      h("p", { class: "meta" }, "Ступени: ", Object.values(V.ladder || {}).map(l => l.label.toLowerCase()).join(" → "), ".")]],
    "f:dev": ["Что развиваем", [h("p", null, "Что нужно развить: ступень лестницы, а внутри неё — конкретная задача. Число рядом — сколько упражнений найдётся."),
      h("p", null, "«И попутно» — учитывать не только фокус, но и то, что упражнение развивает попутно. «Без партнёра-помощника» — не учитывать задачи того, кто только помогает.")]],
    rtl: ["Reaction Training Lights", [
      h("p", null, "Световые тренажёры реакции: небольшие беспроводные «таблетки» с подсветкой (например, BlazePod, FitLight). Их ставят на мишень, стену или стойку, раскладывают на полу. Приложение зажигает их по программе — в случайный момент, разным цветом, в разной точке; касание или движение рядом гасит огонёк, тренажёр записывает время реакции."),
      h("p", null, "В атласе это отдельная форма — соло с тренажёром: он заменяет тренера там, где сигнал простой: поднять лапу, скомандовать, показать цель, уронить перчатку. На нём хорошо ставить:"),
      h("ul", null, h("li", null, "запуск действия по сигналу;"), h("li", null, "выбор между несколькими сигналами — цвет задаёт действие;"),
        h("li", null, "умение не начать раньше времени — «горит / не горит»;"), h("li", null, "подгонку к внезапно появившейся мишени;"), h("li", null, "реакцию ногами.")),
      h("p", null, "Чего не даёт: сигнал всегда простой — огонёк, а не тело и не клинок противника. Читать противника и узнавать ситуации боя на нём не научиться.")]],
    "f:topic": ["Тема", [h("p", null, "Подборка упражнений по предмету — приём, тактика, метод, назначение. Нажмите категорию — откроются её темы; выберите одну. Число у категории — сколько упражнений во всех её темах."),
      ...Object.entries(V.topic_groups || {}).map(([g, d]) => h("p", null, h("b", null, capital(d.label)), ": ", topicsOf(g).map(t => V.topics[t].label).join(", ") + "."))]],
    "f:form": ["Формат", [h("p", null, "Формат занятия: индивидуальное с тренером, групповое, строй, соло, бой. Сначала идут упражнения, которые в нём работают хорошо, ниже — подходящие с оговорками."),
      h("p", null, "«Reaction Lights» — соло со световым тренажёром реакции, подробнее ", helpBtn("rtl"))]],
  };
  return T[key] || [key, []];
}
let HELP_BTN = null;
function closeHelp() { $("helppop").hidden = true; if (HELP_BTN) HELP_BTN.setAttribute("aria-expanded", "false"); HELP_BTN = null; }
function openHelp(key, btn) {
  if (HELP_BTN === btn) return closeHelp();
  const r = btn.getBoundingClientRect();   // запомнить до перерисовки: «?» внутри подсказки исчезнет вместе с ней
  closeHelp();
  const [title, body] = helpContent(key), pop = $("helppop");
  pop.innerHTML = "";
  pop.append(h("div", { class: "hp-head" }, h("b", null, title), h("button", { type: "button", class: "link", onclick: closeHelp }, "закрыть")), ...[].concat(body));
  pop.hidden = false; HELP_BTN = btn; btn.setAttribute("aria-expanded", "true");
  if (!isMobile()) {   // рядом с «?», не вылезая за край окна
    const w = pop.offsetWidth, hgt = pop.offsetHeight;
    pop.style.left = Math.max(12, Math.min(r.left - 12, innerWidth - w - 12)) + "px";
    pop.style.top = (r.bottom + 6 + hgt > innerHeight - 8 ? Math.max(8, r.top - hgt - 6) : r.bottom + 6) + "px";
  }
}
const helpBtn = key => h("button", { type: "button", class: "hq", "aria-label": "Справка", title: "Что это?", "aria-expanded": "false",
  onclick: e => { e.stopPropagation(); openHelp(key, e.currentTarget); } }, "?");
document.addEventListener("click", e => { if (!$("helppop").hidden && !e.target.closest("#helppop, .hq")) closeHelp(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("helppop").hidden) closeHelp(); });
window.addEventListener("scroll", e => { if (!isMobile() && e.target !== $("helppop")) closeHelp(); }, true);   // прокрутка самой подсказки её не закрывает
function revbar(it, bottom) {
  return h("div", { class: "revbar" + (bottom ? " bottom" : "") },
    PUBLIC ? null : REVIEWED[it.id]
      ? [h("span", { class: "when" }, "✓ Просмотрено " + REVIEWED[it.id]), h("button", { type: "button", onclick: () => markReviewed(false) }, "Снять отметку")]
      : [h("button", { type: "button", class: "primary", onclick: () => markReviewed(true, true), title: "Alt+Enter" }, "Просмотрено → следующее"),
         h("button", { type: "button", onclick: () => markReviewed(true) }, "Просмотрено")],
    bottom ? [h("span", { class: "sp" }),
              h("button", { type: "button", onclick: () => step(-1), title: "Alt+↑" }, "← предыдущее"),
              h("button", { type: "button", onclick: () => step(1), title: "Alt+↓" }, "следующее →"),
              h("button", { type: "button", onclick: () => { $("card").scrollTop = 0; window.scrollTo(0, 0); } }, "↑ наверх")] : null);
}
function plural(n, one, few, many) { const a = n % 10, b = n % 100; return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many; }
/* ---------- телефон: экраны список / фильтры / карточка ---------- */
let LIST_Y = 0;
function showView(v) {
  const was = document.body.dataset.view;
  if (was === v) return;
  if (was === "list") LIST_Y = window.scrollY;
  document.body.dataset.view = v;
  document.querySelectorAll("#tabs button").forEach(b => b.setAttribute("aria-current", String(b.dataset.v === v)));
  if (isMobile() && v === "list" && atCard()) history.replaceState(null, "", listURL());   // в списке адрес без карточки: «назад» из карточки возвращает сюда
  if (PUBLIC && isMobile()) document.title = v === "card" && cur ? cur.name + " — Атлас упражнений" : "Атлас упражнений";
  window.scrollTo(0, v === "list" ? LIST_Y : 0);
}
function openFromList(id) {
  if (isMobile()) { history.pushState(null, "", cardURL(id)); openEx(id); showView("card"); }
  else openEx(id);
}
let it_cur = {};
async function loadExcerpts(id, box, btn) {
  it_cur = byId.get(id) || {};
  btn.disabled = true; btn.textContent = "Загружаю…";
  try {
    const list = await api("/api/excerpts/" + encodeURIComponent(id));
    box.innerHTML = "";
    for (const x of list) {
      const pre = h("div", { class: "body" });
      if (x.error) pre.append(h("span", { class: "warn" }, x.error));
      else {
        /* абзацы через пустую строку; маркер страницы — серой строкой; цитата-якорь подсвечена */
        let off = 0;
        for (const para of x.text.split("\n\n")) {
          const a = off, b = off + para.length; off = b + 2;
          const pm = para.match(/^=== стр\. (\d+) ===$/);
          if (pm) { pre.append(h("div", { class: "pg" }, "— стр. " + pm[1] + " —")); continue; }
          const p = h("p");
          const s = Math.max(a, x.anchor_at), e = Math.min(b, x.anchor_end);
          if (x.anchor_at >= 0 && s < e) p.append(para.slice(0, s - a), h("mark", null, para.slice(s - a, e - a)), para.slice(e - a));
          else p.append(para);
          pre.append(p);
        }
      }
      const d = h("details", { class: "excerpt", open: true },
        h("summary", null, h("b", null, (SRC[x.source] || {}).short || x.source),
          (() => { const s = (it_cur.sources || []).find(y => y.source === x.source); return s ? [h("span", { class: "ctxs" }, " · ", ...sourceContext(s)), s.note ? h("div", { class: "meta" }, refText(s.note)) : null] : ""; })(),
          ` · ${x.file}` + (x.from != null ? `, маркеры ${x.from}–${x.to ?? x.from}` : "")), pre);
      box.append(d);
      const mk = pre.querySelector("mark"); if (mk) setTimeout(() => { pre.scrollTop = Math.max(0, mk.offsetTop - pre.offsetTop - 60); }, 0);
    }
    btn.remove();
  } catch (e) { btn.disabled = false; btn.textContent = "Не вышло: " + e.message + ". Ещё раз"; }
}

/* ---------- заметки к открытому упражнению ---------- */
const ST = { open: "открыта", done: "внесено", rejected: "не вносим" };
function renderNotes() {
  const box = $("note-list"); box.innerHTML = "";
  if (!cur) { $("notes-meta").textContent = ""; return; }
  const ns = notesOf(cur.id);
  $("notes-meta").textContent = ns.length ? `${ns.filter(n => n.status === "open").length} открытых из ${ns.length}` : "к этому упражнению заметок нет";
  for (const n of ns) {
    const txt = h("div", { class: "txt" }, n.text);
    const acts = h("div", { class: "acts" });
    if (n.status === "open") {
      acts.append(h("button", { type: "button", class: "link", onclick: () => editNote(n, txt) }, "Изменить"),
        h("button", { type: "button", class: "link", onclick: () => delNote(n) }, "Удалить"));
    } else acts.append(h("button", { type: "button", class: "link", onclick: () => setStatus(n, "open") }, "Переоткрыть"));
    box.append(h("div", { class: "note " + n.status },
      h("div", { class: "top" }, h("span", { class: "st" }, ST[n.status] || n.status), h("span", null, targetName(cur, n.target)), h("span", null, n.created)),
      txt,
      n.answer ? h("div", { class: "ans" }, h("b", null, "Ответ: "), n.answer) : null,
      acts));
  }
  const sel = $("nt-target"), keep = sel.value; sel.innerHTML = "";
  for (const [k, t] of targetsFor(cur)) sel.add(new Option(t, k));
  if ([...sel.options].some(o => o.value === keep)) sel.value = keep;
}
function startNote(target) { $("notes").open = true; $("nt-target").value = target; $("nt-text").focus(); }
async function addNote(ev) {
  ev.preventDefault();
  const text = $("nt-text").value.trim(); if (!cur || !text) return;
  try {
    const n = await api("/api/notes", { id: cur.id, target: $("nt-target").value, text });
    NOTES.push(n); $("nt-text").value = ""; $("nt-msg").textContent = "Сохранено";
    setTimeout(() => $("nt-msg").textContent = "", 1500);
    renderNotes(); renderList(); renderCard();
  } catch (e) { $("nt-msg").textContent = "Не сохранилось: " + e.message; }
}
function editNote(n, txt) {
  const ta = h("textarea", { style: "width:100%; min-height:80px" }); ta.value = n.text;
  const save = h("button", { type: "button", class: "primary" }, "Сохранить");
  save.onclick = async () => { Object.assign(n, await api("/api/notes/" + n.uid, { text: ta.value })); renderNotes(); };
  txt.replaceWith(h("div", null, ta, h("div", { class: "row", style: "margin-top:4px" }, save, h("button", { type: "button", onclick: renderNotes }, "Отмена"))));
  ta.focus();
}
async function delNote(n) {
  const btns = [...document.querySelectorAll(".note .acts")];
  await api("/api/notes/" + n.uid, { delete: true }); NOTES = NOTES.filter(x => x !== n);
  renderNotes(); renderList(); renderCard(); void btns;
}
async function setStatus(n, status) { Object.assign(n, await api("/api/notes/" + n.uid, { status })); renderNotes(); renderList(); renderCard(); }

/* ---------- отметка «просмотрено» ---------- */
async function markReviewed(on, next) {
  if (!cur) return;
  const id = cur.id;
  try {
    const r = await api("/api/reviewed", { id, reviewed: on });
    if (r.reviewed) REVIEWED[id] = r.reviewed; else delete REVIEWED[id];
    if (next) {   // следующее непросмотренное по текущему списку
      const shown = shownList().map(x => x[0]), i = shown.findIndex(x => x.id === id);
      const nxt = shown.slice(i + 1).find(x => !REVIEWED[x.id]) || shown.find(x => !REVIEWED[x.id]);
      if (nxt) return openEx(nxt.id);
    }
    renderCard(); renderList();
  } catch (e) { alertBox("Не сохранилось: " + e.message); }
}
function alertBox(t) { const m = $("card"); m.prepend(h("p", { class: "warn" }, t)); }

/* ---------- навигация ---------- */
/* дерево: свёрнутые семейства запоминаются; семейство открытой карточки раскрывается само */
let COLLAPSED = new Set();
try { COLLAPSED = new Set(JSON.parse(localStorage.getItem("atlas-collapsed") || "[]")); } catch (e) {}
function saveCollapsed() { try { localStorage.setItem("atlas-collapsed", JSON.stringify([...COLLAPSED])); } catch (e) {} }
function revealFamily(fam) {   // раскрыть семейство и прокрутить дерево к открытой карточке (или к семейству), коротко подсветив
  COLLAPSED.delete(fam); saveCollapsed(); renderList();
  if (isMobile()) showView("list");
  const el = (cur && cur.family === fam && document.querySelector('.ex[aria-current="true"]'))
    || [...document.querySelectorAll(".fam")].find(x => x.dataset.fam === fam);
  if (!el) return;
  if (isMobile()) { el.scrollIntoView({ block: "center" }); el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash"); return; }
  const L = $("list"), r = el.getBoundingClientRect(), lr = L.getBoundingClientRect(), before = L.scrollTop;
  L.scrollTop += r.top - lr.top - (lr.height - r.height) / 2;   // прямо, без плавной прокрутки — она не везде срабатывает
  if (L.scrollTop === before && (r.top < lr.top || r.bottom > lr.bottom)) el.scrollIntoView({ block: "center" });   // запасной путь
  const sr = $("side").getBoundingClientRect();
  if (sr.top > innerHeight || sr.bottom < 0) $("side").scrollIntoView({ block: "start" });   // узкое окно: дерево под карточкой
  el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash");
}
function famNav(it) {
  const mem = ITEMS.filter(x => x.family === it.family).sort((a, b) => (a.family_order ?? 99) - (b.family_order ?? 99));
  const i = mem.findIndex(x => x.id === it.id), shownIds = new Set(shownList().map(x => x[0].id));
  return h("div", { class: "famnav" },
    h("button", { type: "button", class: "fl", title: "Показать семейство в списке справа", onclick: () => revealFamily(it.family) }, it.family || "без семейства"),
    h("button", { type: "button", class: "arr", disabled: i <= 0 ? true : null, title: i > 0 ? mem[i - 1].name : "", onclick: () => openEx(mem[i - 1].id) }, "‹"),
    h("span", { class: "pills" }, mem.map((x, k) => h("button", { type: "button", class: "pill" + (x.id === it.id ? " cur" : "") + (shownIds.has(x.id) ? "" : " off"),
      title: `${x.family_order ?? k + 1}. ${x.name}` + (shownIds.has(x.id) ? "" : " (не проходит фильтры)"), onclick: () => openEx(x.id) }, String(x.family_order ?? k + 1)))),
    h("button", { type: "button", class: "arr", disabled: i >= mem.length - 1 ? true : null, title: i < mem.length - 1 ? mem[i + 1].name : "", onclick: () => openEx(mem[i + 1].id) }, "›"));
}
function openEx(id) {
  cur = byId.get(id) || null;
  if (cur && COLLAPSED.has(cur.family)) { COLLAPSED.delete(cur.family); saveCollapsed(); }
  if (cur && (urlId() !== id || (PUBLIC && location.hash))) history.replaceState(null, "", cardURL(id));
  if (cur && PUBLIC) document.title = cur.name + " — Атлас упражнений";
  renderCard(); renderNotes(); renderList();
  const a = document.querySelector('.ex[aria-current="true"]');
  if (a) { const L = $("list"), r = a.getBoundingClientRect(), lr = L.getBoundingClientRect();   // открытая карточка — в поле зрения дерева
    if (r.top < lr.top || r.bottom > lr.bottom) L.scrollTop += r.top - lr.top - (lr.height - r.height) / 2; }
}
function step(d) {
  const shown = shownList().map(x => x[0]); if (!shown.length) return;
  const i = cur ? shown.findIndex(x => x.id === cur.id) : -1;
  openEx(shown[Math.min(shown.length - 1, Math.max(0, i + d))].id);
}
$("q").oninput = renderList;
$("tree-collapse").onclick = () => { COLLAPSED = new Set(ITEMS.map(x => x.family).filter(f => !cur || f !== cur.family)); saveCollapsed(); renderList(); };
$("tree-expand").onclick = () => { COLLAPSED = new Set(); saveCollapsed(); renderList(); };
setTheme(themeNow(), false);
$("theme").onclick = () => setTheme(themeNow() === "dark" ? "light" : "dark", true);
$("note-form").onsubmit = addNote;
$("nt-text").onkeydown = e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) addNote(e); };
/* Стартовая страница: на компьютере — в центре, пока не открыто упражнение; на телефоне — при первом заходе и по «?» */
function renderAbout(box) {
  const used = new Set(ITEMS.flatMap(x => (x.sources || []).map(s => s.source)));
  const ys = [...used].map(k => (SRC[k] || {}).year).filter(Number.isFinite);
  const sub = { items: ITEMS.length, sources: used.size, years: ys.length ? `${Math.min(...ys)}–${Math.max(...ys)}` : "" };
  const art = h("article", { class: "about" });
  art.innerHTML = (ABOUT || "<h1>Атлас упражнений</h1>").replace(/\{\{(\w+)\}\}/g, (m, k) => sub[k] ?? m);
  art.prepend(h("div", { class: "logo", role: "img", "aria-label": "Эмблема атласа: фехтовальщик над раскрытой книгой" }));
  art.append(h("div", { class: "go" }, h("button", { type: "button", class: "primary", onclick: () => showView("list") }, "К упражнениям")));
  box.append(art);
  box.scrollTop = 0;
  try { localStorage.setItem("atlas-about-seen", "1"); } catch (e) {}
}
let LAST = null;   // упражнение, открытое до главной: вкладка «Карточка» вернёт к нему
function showAbout(push) {
  if (push) history.pushState({ about: true }, "", listURL());
  if (cur) LAST = cur;
  cur = null; document.title = "Атлас упражнений";
  renderCard(); renderNotes(); renderList();
  if (isMobile()) showView("about");
}
function onRoute() {   // «назад» / «вперёд» и переходы по ссылкам
  const id = urlId();
  if (byId.has(id)) { if (!cur || cur.id !== id) openEx(id); if (isMobile()) showView("card"); }
  else if (!id && (history.state || {}).about) showAbout(false);
  else if (!id && isMobile()) showView("list");   // «назад» из карточки
  else if (!id) showAbout(false);
}
const goHome = e => { if (e) e.preventDefault(); if (cur || (isMobile() && document.body.dataset.view !== "about")) showAbout(true); };
$("about-btn").onclick = goHome;
$("view-btn").onclick = openView;
$("viewpanel").onclick = e => { if (e.target === $("viewpanel")) closeView(); };
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("viewpanel").hidden) closeView(); });
$("home-link").href = listURL();
$("home-link").onclick = goHome;
window.addEventListener("popstate", onRoute);
window.addEventListener("hashchange", onRoute);
document.addEventListener("click", e => {   // ссылки на другие упражнения в тексте — без перезагрузки страницы
  const a = e.target.closest("a.ref[data-id]");
  if (!a || !PUBLIC || e.ctrlKey || e.metaKey || e.shiftKey || e.button) return;
  e.preventDefault(); history.pushState(null, "", cardURL(a.dataset.id)); onRoute(); window.scrollTo(0, 0);
});
document.querySelectorAll("#tabs button").forEach(b => b.onclick = () => {
  if (b.dataset.v === "about") return goHome();
  if (b.dataset.v === "view") return openView();   // настройки вида — шторкой поверх текущего экрана
  if (b.dataset.v === "card" && !cur && LAST) { history.pushState(null, "", cardURL(LAST.id)); openEx(LAST.id); }
  else if (b.dataset.v === "card" && cur && isMobile() && !atCard()) history.pushState(null, "", cardURL(cur.id));
  showView(b.dataset.v);
});
$("fshow").onclick = () => showView("list");
/* карточка: свайп влево / вправо — соседнее упражнение семейства (не на таблицах, которые прокручиваются вбок) */
let TOUCH = null;
$("card").addEventListener("touchstart", e => { const t = e.touches[0]; TOUCH = e.touches.length === 1 && !e.target.closest(".wrapx, input") ? [t.clientX, t.clientY] : null; }, { passive: true });
$("card").addEventListener("touchend", e => {
  if (!TOUCH || !cur) return;
  const t = e.changedTouches[0], dx = t.clientX - TOUCH[0], dy = t.clientY - TOUCH[1]; TOUCH = null;
  if (Math.abs(dx) < 70 || Math.abs(dy) > Math.abs(dx) * 0.5) return;
  const mem = ITEMS.filter(x => x.family === cur.family).sort((a, b) => (a.family_order ?? 99) - (b.family_order ?? 99));
  const nx = mem[mem.findIndex(x => x.id === cur.id) + (dx < 0 ? 1 : -1)];
  if (nx) { history.replaceState(null, "", cardURL(nx.id)); openEx(nx.id); window.scrollTo(0, 0); }
}, { passive: true });
document.addEventListener("keydown", e => {
  if (e.altKey && (e.key === "ArrowDown" || e.key === "ArrowUp")) { e.preventDefault(); step(e.key === "ArrowDown" ? 1 : -1); }
  if (e.altKey && e.key === "Enter" && cur && !REVIEWED[cur.id]) { e.preventDefault(); markReviewed(true, true); }
});

(async () => {
  try {
    const b = PUBLIC ? window.ATLAS_DATA : await api("/api/bootstrap");
    if (PUBLIC) { $("notes").hidden = true; document.querySelector(".progress").hidden = true; $("side").setAttribute("aria-label", "Упражнения"); }
    V = b.voc; SRC = b.sources; NOTES = b.notes || []; REVIEWED = b.reviewed || {}; ABOUT = b.about || "";
    ITEMS = b.items.sort((x, y) => String(x.family).localeCompare(String(y.family), "ru") || (x.family_order ?? 99) - (y.family_order ?? 99) || x.name.localeCompare(y.name, "ru"));
    byId = new Map(ITEMS.map(x => [x.id, x]));
    loadView(); $("view-btn").hidden = $("tab-view").hidden = !PUBLIC; $("mod-link").hidden = PUBLIC;
    // публичная версия: фоновый скрипт сохраняет атлас в телефоне — дальше он открывается и без интернета (build_web.py → sw.js)
    if (PUBLIC) loadCounts();
    if (PUBLIC && "serviceWorker" in navigator) navigator.serviceWorker.register(ROOT + "sw.js").catch(() => {});
    initFilters();
    try { localStorage.removeItem("atlas-filters-open"); } catch (e) {}   // фильтры больше не сворачиваются
    const start = urlId();
    let seen = false; try { seen = localStorage.getItem("atlas-about-seen") === "1"; } catch (e) {}
    if (byId.has(start)) { openEx(start); showView(isMobile() ? "card" : "list"); }
    else if (isMobile() && seen) { cur = null; renderCard(); renderNotes(); renderList(); showView("list"); }
    else { showView("list"); showAbout(false); }   // стартовая страница: на телефоне — при первом заходе
  } catch (e) {
    $("card").innerHTML = ""; $("card").append(h("p", { class: "warn" }, "Не удалось загрузить данные: " + e.message + (PUBLIC ? "" : ". Запущен ли review_server.py?")));
  }
})();

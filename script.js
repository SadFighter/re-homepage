/* ============================================================
   Storage
   ============================================================ */
const STORE = "homepage.config.v1";

/* ============================================================
   Settings & User Config
   ============================================================ */
const DEFAULT_SETTINGS = {
  theme: "dark",
  alignment: "centered",
  layout: "horizontal",
};

let appliedCustomVars = [];
let currentUser = null;

function applySettings(settings = {}) {
  const s = Object.assign({}, DEFAULT_SETTINGS, settings);

  document.body.dataset.alignment = s.alignment;
  document.body.dataset.layout = s.layout;

  const pct = Number(s.linkScale);
  document.body.style.setProperty("--link-scale", (pct > 0 ? pct / 100 : 1));

  const w = Number(s.linkWidth);
  if (w > 0) {
    document.body.style.setProperty("--link-width", w + "px");
  } else {
    document.body.style.removeProperty("--link-width");
  }

  if (s.theme === "custom" && s.customTheme && typeof s.customTheme === "object") {
    document.body.dataset.theme = "custom";
    applyCustomTheme(s.customTheme);
  } else {
    document.body.dataset.theme = s.theme || "dark";
    clearCustomTheme();
  }

  applyBackground(s.background);
}

/* ============================================================
   User & Greeting Logic
   ============================================================ */
const GREETINGS = {
  morning: ["Good morning", "Rise and shine", "Morning", "Wakey wakey", "Top of the morning", "Hello early bird", "Fresh start", "Coffee time"],
  afternoon: ["Good afternoon", "Hey there", "Welcome back", "Good day", "Afternoon", "Hope you're having a good day"],
  evening: ["Good evening", "Evening", "Burning the midnight oil early?", "Winding down", "Good to see you", "Welcome home"],
  night: ["Good night", "Late night", "Still awake?", "Night owl", "The moon is out", "Sleep is for the weak"]
};

function setupUser(user) {
  currentUser = user;
  const pill = document.getElementById("userPill");
  const greetingEl = document.getElementById("greeting");
  
  if (!user || !user.name) {
    pill.hidden = true;
    greetingEl.hidden = true;
    return;
  }

  pill.hidden = false;
  greetingEl.hidden = false;

  // Set greeting text
  const now = new Date();
  const hour = now.getHours();
  let timeOfDay = "morning";
  if (hour >= 12 && hour < 18) timeOfDay = "afternoon";
  else if (hour >= 18 && hour < 22) timeOfDay = "evening";
  else if (hour >= 22 || hour < 5) timeOfDay = "night";

  const pool = GREETINGS[timeOfDay];
  let text = pool[Math.floor(Math.random() * pool.length)];
  
  // 50% chance to add name
  if (Math.random() > 0.5) {
    text += `, ${user.name}`;
  }
  greetingEl.textContent = text + ".";

  // Timezone Formatter
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: user.timezone || "UTC",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });

  function updateTime() {
    try {
      const timeStr = formatter.format(new Date());
      document.getElementById("userNameDisplay").textContent = user.name;
      document.getElementById("userTimeDisplay").textContent = timeStr;
      document.getElementById("userTzDisplay").textContent = user.timezone || "UTC";
    } catch(e) {
      document.getElementById("userNameDisplay").textContent = user.name;
      document.getElementById("userTimeDisplay").textContent = "--:--";
      document.getElementById("userTzDisplay").textContent = "Invalid TZ";
    }
  }
  updateTime();
  setInterval(updateTime, 1000);
}

/* ============================================================
   Background
   ============================================================ */
let currentBgVideo = null;

function normalizeBgImage(v) {
  if (!v) return "";
  const trimmed = String(v).trim();
  if (/^(url|linear-gradient|radial-gradient|conic-gradient|image-set)\(/i.test(trimmed)) {
    return trimmed;
  }
  return 'url("' + trimmed.replace(/"/g, '\\"') + '")';
}

function applyBackground(bg) {
  document.body.classList.remove("has-bg");
  ["--bg-image", "--bg-blur", "--bg-dim", "--bg-size", "--bg-position", "--bg-object-fit"]
    .forEach(function (v) { document.body.style.removeProperty(v); });

  if (currentBgVideo) {
    currentBgVideo.pause();
    currentBgVideo.removeAttribute("src");
    currentBgVideo.load();
    currentBgVideo.remove();
    currentBgVideo = null;
  }

  if (!bg || (!bg.image && !bg.video)) {
    syncMirrorLayer();
    return;
  }

  document.body.classList.add("has-bg");

  if (bg.image) {
    document.body.style.setProperty("--bg-image", normalizeBgImage(bg.image));
  }
  document.body.style.setProperty("--bg-blur",       (Number(bg.blur) || 0) + "px");
  document.body.style.setProperty("--bg-dim",        Number(bg.dim)  || 0);
  document.body.style.setProperty("--bg-size",       bg.size     || "cover");
  document.body.style.setProperty("--bg-position",   bg.position || "center");
  document.body.style.setProperty("--bg-object-fit", bg.size     || "cover");

  if (bg.video) injectBgVideo(bg.video);

  syncMirrorLayer();
}

function injectBgVideo(src) {
  const v = document.createElement("video");
  v.id = "bg-video";
  v.src = src;
  v.muted = true;
  v.loop = true;
  v.autoplay = true;
  v.playsInline = true;
  v.setAttribute("muted", "");
  v.setAttribute("playsinline", "");
  v.setAttribute("preload", "auto");
  document.body.appendChild(v);
  currentBgVideo = v;
  const p = v.play();
  if (p && p.catch) p.catch(function () {});
}

function applyCustomTheme(theme) {
  clearCustomTheme();
  Object.keys(theme).forEach(function (key) {
    const varName = key.indexOf("--") === 0 ? key : "--" + key;
    document.body.style.setProperty(varName, theme[key]);
    appliedCustomVars.push(varName);
  });
}

function clearCustomTheme() {
  appliedCustomVars.forEach(function (v) { document.body.style.removeProperty(v); });
  appliedCustomVars = [];
}

/* ============================================================
   re: fork features & Custom Fonts
   ============================================================ */
const RE_STORE_MIRROR  = "homepage.re.mirror.enabled";
const RE_STORE_MENU    = "homepage.re.menu.open";
const RE_STORE_FONTS   = "homepage.re.fonts";

const RE_DEFAULTS = {
  menu: true,
  mirror: { enabled: false, blur: 28, dim: 0.55, scale: 1.08 },
};

let reConfig   = JSON.parse(JSON.stringify(RE_DEFAULTS));
let mirrorOn   = false;
let mirrorStream = null;

const FONT_SLOTS = [
  { id: "bookmarkTitle", label: "Bookmark Titles", css: ".bookmark .name" },
  { id: "bookmarkDesc", label: "Tooltip / Desc", css: ".bookmark .desc" },
  { id: "groupTitle", label: "Group Headings", css: ".group h2" },
  { id: "searchInput", label: "Search Input", css: ".search input" },
  { id: "searchProvider", label: "Search Dropdown", css: ".provider" },
  { id: "reMenu", label: "re: Menu Panel", css: ".re-panel, .re-launcher, .re-row-title, .re-row-sub" },
  { id: "systemUI", label: "Load Button / Empty", css: ".load-btn, .empty, .user-pill, .greeting" }
];

function readReConfig(cfg) {
  const src = (cfg && typeof cfg === "object") ? cfg : {};
  const merged = JSON.parse(JSON.stringify(RE_DEFAULTS));
  if (typeof src.menu === "boolean") merged.menu = src.menu;
  if (src.mirror && typeof src.mirror === "object") {
    const m = src.mirror;
    if (typeof m.enabled === "boolean") merged.mirror.enabled = m.enabled;
    if (m.blur  != null) merged.mirror.blur  = Number(m.blur)  || 0;
    if (m.dim   != null) merged.mirror.dim   = Number(m.dim)   || 0;
    if (m.scale != null) merged.mirror.scale = Number(m.scale) || 1;
  }
  reConfig = merged;
}

function setupRe() {
  const root = document.getElementById("reRoot");
  if (!reConfig.menu) { root.hidden = true; return; }
  root.hidden = false;

  const launcher = document.getElementById("reLauncher");
  const panel    = document.getElementById("rePanel");
  const mainView = document.getElementById("reMainView");
  const fontsView = document.getElementById("reFontsView");

  if (localStorage.getItem(RE_STORE_MENU) === "1") setPanelOpen(true);
  else setPanelOpen(false);

  launcher.addEventListener("click", function () {
    const nowOpen = panel.hidden;
    setPanelOpen(nowOpen);
    localStorage.setItem(RE_STORE_MENU, nowOpen ? "1" : "0");
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !panel.hidden) {
      setPanelOpen(false);
      localStorage.setItem(RE_STORE_MENU, "0");
    }
  });

  document.addEventListener("click", function (e) {
    if (panel.hidden) return;
    if (root.contains(e.target)) return;
    setPanelOpen(false);
    localStorage.setItem(RE_STORE_MENU, "0");
  });

  // Fonts submenu logic
  document.getElementById("reBackBtn").addEventListener("click", () => {
    fontsView.hidden = true;
    mainView.hidden = false;
  });

  loadCustomFonts();
  renderRePanel();
  syncMirrorLayer();
}

function setPanelOpen(open) {
  const panel = document.getElementById("rePanel");
  const launcher = document.getElementById("reLauncher");
  panel.hidden = !open;
  launcher.setAttribute("aria-expanded", open ? "true" : "false");
  launcher.classList.toggle("is-open", open);
  
  if (!open) {
    document.getElementById("reFontsView").hidden = true;
    document.getElementById("reMainView").hidden = false;
  }
}

function renderRePanel() {
  const mainView = document.getElementById("reMainView");
  const fontsList = document.getElementById("reFontsList");
  mainView.innerHTML = "";
  fontsList.innerHTML = "";

  // ---- Wallpaper mirror row ----
  const row = document.createElement("div");
  row.className = "re-row";
  const meta = document.createElement("div");
  meta.className = "re-row-meta";
  meta.innerHTML = `<div class="re-row-title">Wallpaper mirror</div><div class="re-row-sub">${mirrorOn ? "Live view of your desktop" : "Blurred live capture of what's behind"}</div>`;
  
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "re-switch" + (mirrorOn ? " on" : "");
  toggle.setAttribute("role", "switch");
  toggle.setAttribute("aria-checked", mirrorOn ? "true" : "false");
  toggle.innerHTML = '<span class="re-switch-knob"></span>';
  toggle.addEventListener("click", function (e) { e.stopPropagation(); if (mirrorOn) stopMirror(); else startMirror(); });
  row.append(meta, toggle);
  mainView.appendChild(row);

  // ---- Fonts Menu Button ----
  const fontMenuRow = document.createElement("div");
  fontMenuRow.className = "re-row";
  fontMenuRow.style.cursor = "pointer";
  fontMenuRow.innerHTML = `<div class="re-row-meta"><div class="re-row-title">Customize Fonts</div><div class="re-row-sub">Open font settings</div></div>
                           <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;
  fontMenuRow.addEventListener("click", (e) => {
    e.stopPropagation();
    document.getElementById("reMainView").hidden = true;
    document.getElementById("reFontsView").hidden = false;
  });
  mainView.appendChild(fontMenuRow);

  // ---- Render Fonts List into submenu ----
  const storedFonts = JSON.parse(localStorage.getItem(RE_STORE_FONTS) || "{}");
  FONT_SLOTS.forEach(slot => {
    const fontRow = document.createElement("div");
    fontRow.className = "re-font-row";
    const label = document.createElement("span");
    label.className = "re-font-label";
    label.textContent = slot.label;
    
    const btnWrap = document.createElement("div");
    btnWrap.className = "re-font-actions";
    const fileBtn = document.createElement("button");
    fileBtn.className = "re-btn-small";
    fileBtn.textContent = storedFonts[slot.id] ? "Replace" : "Upload";
    fileBtn.onclick = () => pickFontFile(slot);

    if (storedFonts[slot.id]) {
      const resetBtn = document.createElement("button");
      resetBtn.className = "re-btn-small danger";
      resetBtn.textContent = "X";
      resetBtn.title = "Reset to default";
      resetBtn.onclick = () => resetFont(slot);
      btnWrap.appendChild(fileBtn);
      btnWrap.appendChild(resetBtn);
    } else {
      btnWrap.appendChild(fileBtn);
    }
    fontRow.append(label, btnWrap);
    fontsList.appendChild(fontRow);
  });
}

/* ---- Font Logic ---- */
function pickFontFile(slot) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".woff,.woff2,.ttf,.otf";
  input.onchange = function () {
    if (!input.files[0]) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = async function(e) {
      const dataUrl = e.target.result;
      await applyFontFace(slot.id, dataUrl, file.name);
      const stored = JSON.parse(localStorage.getItem(RE_STORE_FONTS) || "{}");
      stored[slot.id] = { dataUrl, name: file.name };
      try { localStorage.setItem(RE_STORE_FONTS, JSON.stringify(stored)); } 
      catch (err) { alert("Font file is too large to save in localStorage! It will work for this session but disappear on reload."); }
      renderRePanel();
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

async function applyFontFace(slotId, dataUrl, fontName) {
  const familyName = "re_custom_" + slotId;
  const slot = FONT_SLOTS.find(s => s.id === slotId);
  if (!slot) return;
  try {
    const font = new FontFace(familyName, `url(${dataUrl})`);
    await font.load();
    document.fonts.add(font);
    let styleTag = document.getElementById("style_" + slotId);
    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = "style_" + slotId;
      document.head.appendChild(styleTag);
    }
    styleTag.textContent = `${slot.css} { font-family: '${familyName}', sans-serif !important; }`;
  } catch (err) {
    alert("Failed to load font: " + err.message);
  }
}

function resetFont(slot) {
  const styleTag = document.getElementById("style_" + slot.id);
  if (styleTag) styleTag.remove();
  const stored = JSON.parse(localStorage.getItem(RE_STORE_FONTS) || "{}");
  if (stored[slot.id]) {
    delete stored[slot.id];
    localStorage.setItem(RE_STORE_FONTS, JSON.stringify(stored));
  }
  renderRePanel();
}

function loadCustomFonts() {
  const stored = JSON.parse(localStorage.getItem(RE_STORE_FONTS) || "{}");
  for (const [slotId, fontData] of Object.entries(stored)) {
    applyFontFace(slotId, fontData.dataUrl, fontData.name);
  }
}

/* ---- Mirror Logic ---- */
async function startMirror() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) return;
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: false });
    mirrorStream = stream;
    mirrorOn = true;
    localStorage.setItem(RE_STORE_MIRROR, "1");
    const v = document.getElementById("mirror-video");
    v.srcObject = stream; v.hidden = false; v.play().catch(() => {});
    stream.getVideoTracks()[0].addEventListener("ended", stopMirror);
    renderRePanel(); syncMirrorLayer();
  } catch (e) {
    mirrorOn = false; localStorage.setItem(RE_STORE_MIRROR, "0");
    renderRePanel(); syncMirrorLayer();
  }
}

function stopMirror() {
  if (mirrorStream) { mirrorStream.getTracks().forEach(t => t.stop()); mirrorStream = null; }
  const v = document.getElementById("mirror-video");
  v.pause(); v.srcObject = null; v.hidden = true;
  mirrorOn = false; localStorage.setItem(RE_STORE_MIRROR, "0");
  renderRePanel(); syncMirrorLayer();
}

function syncMirrorLayer() {
  const m = reConfig.mirror || RE_DEFAULTS.mirror;
  document.body.style.setProperty("--mirror-blur",  (m.blur  != null ? m.blur  : 28) + "px");
  document.body.style.setProperty("--mirror-dim",   (m.dim   != null ? m.dim   : 0.55));
  document.body.style.setProperty("--mirror-scale", (m.scale != null ? m.scale : 1.08));
  document.body.classList.toggle("has-mirror", mirrorOn);
}

/* ============================================================
   Helpers, Render, Search, Boot
   ============================================================ */
function initial(n) { return (n[0] || "?").toUpperCase(); }
function safeHost(url) { try { return new URL(url).hostname; } catch (e) { return ""; } }

function render(bookmarks = {}) {
  const app = document.getElementById("app");
  app.innerHTML = "";
  const groups = Object.entries(bookmarks);
  if (!groups.length) return showEmptyState();

  groups.forEach(entry => {
    const [groupName, items] = entry;
    const section = document.createElement("section");
    section.className = "group";
    section.innerHTML = `<h2>${groupName}</h2>`;
    const row = document.createElement("div");
    row.className = "group-links";
    Object.entries(items).forEach(pair => row.appendChild(makeBookmark(pair[0], pair[1])));
    section.appendChild(row);
    app.appendChild(section);
  });
}

function makeBookmark(name, data) {
  const a = document.createElement("a");
  a.className = "bookmark";
  a.href = data.link || "#";
  a.target = "_blank"; a.rel = "noopener";
  const icon = document.createElement("div"); icon.className = "icon";

  function fallback() { icon.innerHTML = ""; icon.textContent = initial(name); }
  if (data.favicons && data.link) {
    const img = document.createElement("img");
    img.src = "https://www.google.com/s2/favicons?sz=64&domain=" + safeHost(data.link);
    img.onerror = fallback; icon.appendChild(img);
  } else if (data.icon) {
    const img = document.createElement("img");
    img.src = data.icon; img.onerror = fallback; icon.appendChild(img);
  } else { icon.textContent = initial(name); }

  const label = document.createElement("span"); label.className = "name"; label.textContent = name;
  a.append(icon, label);
  if (data.description) {
    const desc = document.createElement("div"); desc.className = "desc"; desc.textContent = data.description; a.appendChild(desc);
  }
  return a;
}

function showEmptyState() {
  const app = document.getElementById("app");
  app.innerHTML = `<div class="empty"><p>No bookmarks loaded yet.</p><button id="loadBtn">Load bookmarks.json</button><p class="hint">or drop the file anywhere on this page.</p></div>`;
  document.getElementById("loadBtn").onclick = pickFile;
}

function loadConfig() {
  return new Promise(resolve => {
    try {
      const cached = localStorage.getItem(STORE);
      if (cached) return resolve(JSON.parse(cached));
    } catch (e) {}
    fetch("bookmarks.json", { cache: "no-store" }).then(res => {
      if (!res.ok) return resolve(null);
      return res.json().then(data => { localStorage.setItem(STORE, JSON.stringify(data)); resolve(data); });
    }).catch(() => resolve(null));
  });
}

function boot(config) {
  if (!config) {
    readReConfig(null);
    applySettings();
    setupRe();
    setupUser(null);
    setupSearch(null);
    return showEmptyState();
  }
  readReConfig(config.re);
  applySettings(config.settings);
  setupRe();
  setupUser(config.user);
  setupSearch(config.search);
  render(config.bookmarks);
}

function pickFile() {
  const input = document.createElement("input");
  input.type = "file"; input.accept = ".json,application/json";
  input.onchange = () => { if (input.files[0]) readFile(input.files[0]); };
  input.click();
}

function readFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      localStorage.setItem(STORE, JSON.stringify(data));
      boot(data);
    } catch (e) { alert("Invalid JSON:\n" + e.message); }
  };
  reader.readAsText(file);
}

const dropzone = document.getElementById("dropzone");
let dragDepth = 0;
window.addEventListener("dragenter", e => { e.preventDefault(); if(++dragDepth === 1) dropzone.classList.add("active"); });
window.addEventListener("dragover", e => e.preventDefault());
window.addEventListener("dragleave", e => { e.preventDefault(); if(--dragDepth === 0) dropzone.classList.remove("active"); });
window.addEventListener("drop", e => {
  e.preventDefault(); dragDepth = 0; dropzone.classList.remove("active");
  if (e.dataTransfer.files[0]) readFile(e.dataTransfer.files[0]);
});
document.getElementById("loadBtnTop").addEventListener("click", pickFile);

const DEFAULT_SEARCH = { enabled: true, default: "Google", providers: { "Google": "https://www.google.com/search?q=", "Brave": "https://search.brave.com/search?q=", "DuckDuckGo": "https://duckduckgo.com/?q=" } };
const PROVIDER_STORE = "homepage.search.provider";

function setupSearch(cfg) {
  const searchCfg = Object.assign({}, DEFAULT_SEARCH, cfg || {});
  const form = document.getElementById("searchForm");
  if (searchCfg.enabled === false) { form.hidden = true; return; }
  const providers = searchCfg.providers || {};
  const names = Object.keys(providers);
  if (!names.length) { form.hidden = true; return; }
  const select = document.getElementById("searchProvider");
  const input  = document.getElementById("searchInput");
  select.innerHTML = names.map(n => `<option value="${n}">${n}</option>`).join("");
  const stored = localStorage.getItem(PROVIDER_STORE);
  if (stored && providers[stored]) select.value = stored;
  else if (providers[searchCfg.default]) select.value = searchCfg.default;
  else select.value = names[0];
  select.addEventListener("change", () => localStorage.setItem(PROVIDER_STORE, select.value));
  form.addEventListener("submit", e => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    const looksLikeUrl = /^https?:\/\//i.test(q) || /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(q);
    if (looksLikeUrl) { window.location.href = /^https?:/i.test(q) ? q : "https://" + q; return; }
    const engine = providers[select.value];
    if (engine) window.top.location.href = engine + encodeURIComponent(q);
  });
  form.hidden = false;
}

document.addEventListener("keydown", e => {
  const input = document.getElementById("searchInput");
  const form  = document.getElementById("searchForm");
  if (!input || !form || form.hidden) return;
  if (e.key === "/" && document.activeElement !== input) { e.preventDefault(); input.focus(); input.select(); }
});

loadConfig().then(boot);

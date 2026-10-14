/* ============================================================
   Storage
   ============================================================ */
const STORE = "homepage.config.v1";

/* ============================================================
   Settings
   ============================================================ */
const DEFAULT_SETTINGS = {
  theme: "dark",
  alignment: "centered",
  layout: "horizontal",
};

let appliedCustomVars = [];

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
    // Background is empty — still let mirror mode own the layer if active
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
  appliedCustomVars.forEach(function (v) {
    document.body.style.removeProperty(v);
  });
  appliedCustomVars = [];
}

/* ============================================================
   re: fork features
   ============================================================ */
const RE_STORE_MIRROR  = "homepage.re.mirror.enabled";
const RE_STORE_MENU    = "homepage.re.menu.open";

const RE_DEFAULTS = {
  menu: true,
  mirror: {
    enabled: false,
    blur: 28,
    dim: 0.55,
    scale: 1.08,
  },
};

let reConfig   = JSON.parse(JSON.stringify(RE_DEFAULTS));
let mirrorOn   = false;
let mirrorStream = null;

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
  if (!reConfig.menu) {
    root.hidden = true;
    return;
  }
  root.hidden = false;

  const launcher = document.getElementById("reLauncher");
  const panel    = document.getElementById("rePanel");

  // restore last open state
  if (localStorage.getItem(RE_STORE_MENU) === "1") {
    setPanelOpen(true);
  } else {
    setPanelOpen(false);
  }

  launcher.addEventListener("click", function () {
    const nowOpen = panel.hidden;
    setPanelOpen(nowOpen);
    localStorage.setItem(RE_STORE_MENU, nowOpen ? "1" : "0");
  });

  // close on Escape
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !panel.hidden) {
      setPanelOpen(false);
      localStorage.setItem(RE_STORE_MENU, "0");
    }
  });

  // close when clicking outside
  document.addEventListener("click", function (e) {
    if (panel.hidden) return;
    if (root.contains(e.target)) return;
    setPanelOpen(false);
    localStorage.setItem(RE_STORE_MENU, "0");
  });

  renderRePanel();
  syncMirrorLayer();
}

function setPanelOpen(open) {
  const panel    = document.getElementById("rePanel");
  const launcher = document.getElementById("reLauncher");
  panel.hidden = !open;
  launcher.setAttribute("aria-expanded", open ? "true" : "false");
  launcher.classList.toggle("is-open", open);
}

function renderRePanel() {
  const body = document.getElementById("rePanelBody");
  body.innerHTML = "";

  // ---- Wallpaper mirror row ----
  const row = document.createElement("div");
  row.className = "re-row";

  const meta = document.createElement("div");
  meta.className = "re-row-meta";

  const title = document.createElement("div");
  title.className = "re-row-title";
  title.textContent = "Wallpaper mirror";

  const sub = document.createElement("div");
  sub.className = "re-row-sub";
  sub.textContent = mirrorOn
    ? "Live view of your desktop"
    : "Blurred live capture of what's behind";

  meta.append(title, sub);

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "re-switch";
  toggle.setAttribute("role", "switch");
  toggle.setAttribute("aria-checked", mirrorOn ? "true" : "false");
  toggle.setAttribute("aria-label", "Toggle wallpaper mirror");
  if (mirrorOn) toggle.classList.add("on");

  const knob = document.createElement("span");
  knob.className = "re-switch-knob";
  toggle.appendChild(knob);

  toggle.addEventListener("click", function (e) {
    e.stopPropagation();
    if (mirrorOn) {
      stopMirror();
    } else {
      startMirror();
    }
  });

  row.append(meta, toggle);
  body.appendChild(row);

  // If mirror is remembered as on but stream isn't running, hint the user
  if (!mirrorOn && localStorage.getItem(RE_STORE_MIRROR) === "1") {
    const hint = document.createElement("div");
    hint.className = "re-hint";
    hint.textContent = "Click the toggle to re-enable your desktop mirror.";
    body.appendChild(hint);
  }
}

/* ---- mirror lifecycle ---- */
async function startMirror() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
    alert("Your browser doesn't support screen capture (getDisplayMedia).");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 30 },
      audio: false,
    });

    mirrorStream = stream;
    mirrorOn = true;
    localStorage.setItem(RE_STORE_MIRROR, "1");

    const v = document.getElementById("mirror-video");
    v.srcObject = stream;
    v.hidden = false;

    // autoplay may be deferred; muted so it should be fine
    const p = v.play();
    if (p && p.catch) p.catch(function () {});

    // If user stops sharing via the browser's own UI
    stream.getVideoTracks()[0].addEventListener("ended", function () {
      stopMirror();
    });

    renderRePanel();
    syncMirrorLayer();
  } catch (e) {
    // User cancelled or denied — leave everything as-is
    mirrorOn = false;
    localStorage.setItem(RE_STORE_MIRROR, "0");
    renderRePanel();
    syncMirrorLayer();
  }
}

function stopMirror() {
  if (mirrorStream) {
    mirrorStream.getTracks().forEach(function (t) { t.stop(); });
    mirrorStream = null;
  }

  const v = document.getElementById("mirror-video");
  v.pause();
  v.srcObject = null;
  v.hidden = true;

  mirrorOn = false;
  localStorage.setItem(RE_STORE_MIRROR, "0");

  renderRePanel();
  syncMirrorLayer();
}

/* Push mirror's blur/dim/scale into the CSS layer and toggle visibility */
function syncMirrorLayer() {
  const m = reConfig.mirror || RE_DEFAULTS.mirror;
  document.body.style.setProperty("--mirror-blur",  (m.blur  != null ? m.blur  : 28) + "px");
  document.body.style.setProperty("--mirror-dim",   (m.dim   != null ? m.dim   : 0.55));
  document.body.style.setProperty("--mirror-scale", (m.scale != null ? m.scale : 1.08));

  document.body.classList.toggle("has-mirror", mirrorOn);
}

/* ============================================================
   Helpers
   ============================================================ */
function initial(n) { return (n[0] || "?").toUpperCase(); }
function safeHost(url) {
  try { return new URL(url).hostname; } catch (e) { return ""; }
}

/* ============================================================
   Render
   ============================================================ */
function render(bookmarks = {}) {
  const app = document.getElementById("app");
  app.innerHTML = "";

  const groups = Object.entries(bookmarks);
  if (!groups.length) return showEmptyState();

  groups.forEach(function (entry) {
    const groupName = entry[0];
    const items = entry[1];

    const section = document.createElement("section");
    section.className = "group";

    const h2 = document.createElement("h2");
    h2.textContent = groupName;
    section.appendChild(h2);

    const row = document.createElement("div");
    row.className = "group-links";

    Object.entries(items).forEach(function (pair) {
      row.appendChild(makeBookmark(pair[0], pair[1]));
    });

    section.appendChild(row);
    app.appendChild(section);
  });
}

function makeBookmark(name, data) {
  const a = document.createElement("a");
  a.className = "bookmark";
  a.href = data.link || "#";
  a.target = "_blank";
  a.rel = "noopener";

  const icon = document.createElement("div");
  icon.className = "icon";

  function fallback() {
    icon.innerHTML = "";
    icon.textContent = initial(name);
  }

  if (data.favicons && data.link) {
    const img = document.createElement("img");
    img.alt = "";
    img.src = "https://www.google.com/s2/favicons?sz=64&domain=" + safeHost(data.link);
    img.onerror = fallback;
    icon.appendChild(img);
  } else if (data.icon) {
    const img = document.createElement("img");
    img.alt = "";
    img.src = data.icon;
    img.onerror = fallback;
    icon.appendChild(img);
  } else {
    icon.textContent = initial(name);
  }

  const label = document.createElement("span");
  label.className = "name";
  label.textContent = name;

  a.append(icon, label);

  if (data.description) {
    const desc = document.createElement("div");
    desc.className = "desc";
    desc.textContent = data.description;
    a.appendChild(desc);
  }

  return a;
}

/* ============================================================
   Empty state
   ============================================================ */
function showEmptyState() {
  const app = document.getElementById("app");
  app.innerHTML =
    '<div class="empty">' +
      '<p>No bookmarks loaded yet.</p>' +
      '<button id="loadBtn">Load bookmarks.json</button>' +
      '<p class="hint">or drop the file anywhere on this page.</p>' +
    '</div>';
  document.getElementById("loadBtn").onclick = pickFile;
}

/* ============================================================
   Loading
   ============================================================ */
function loadConfig() {
  return new Promise(function (resolve) {
    try {
      const cached = localStorage.getItem(STORE);
      if (cached) return resolve(JSON.parse(cached));
    } catch (e) {}

    fetch("bookmarks.json", { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) return resolve(null);
        return res.json().then(function (data) {
          localStorage.setItem(STORE, JSON.stringify(data));
          resolve(data);
        });
      })
      .catch(function () { resolve(null); });
  });
}

function boot(config) {
  if (!config) {
    readReConfig(null);
    applySettings();
    setupRe();
    setupSearch(null);
    return showEmptyState();
  }
  readReConfig(config.re);
  applySettings(config.settings);
  setupRe();
  setupSearch(config.search);
  render(config.bookmarks);
}

/* ============================================================
   Import via file picker
   ============================================================ */
function pickFile() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json,application/json";
  input.onchange = function () {
    if (input.files[0]) readFile(input.files[0]);
  };
  input.click();
}

function readFile(file) {
  const reader = new FileReader();
  reader.onload = function () {
    try {
      const data = JSON.parse(reader.result);
      localStorage.setItem(STORE, JSON.stringify(data));
      boot(data);
    } catch (e) {
      alert("Invalid JSON:\n" + e.message);
    }
  };
  reader.readAsText(file);
}

/* ============================================================
   Drag & drop
   ============================================================ */
const dropzone = document.getElementById("dropzone");
let dragDepth = 0;

window.addEventListener("dragenter", function (e) {
  e.preventDefault();
  dragDepth++;
  if (dragDepth === 1) dropzone.classList.add("active");
});
window.addEventListener("dragover", function (e) { e.preventDefault(); });
window.addEventListener("dragleave", function (e) {
  e.preventDefault();
  dragDepth--;
  if (dragDepth === 0) dropzone.classList.remove("active");
});
window.addEventListener("drop", function (e) {
  e.preventDefault();
  dragDepth = 0;
  dropzone.classList.remove("active");
  const file = e.dataTransfer.files[0];
  if (file) readFile(file);
});

/* ============================================================
   Top-left load button
   ============================================================ */
document.getElementById("loadBtnTop").addEventListener("click", pickFile);

/* ============================================================
   Search bar
   ============================================================ */
const DEFAULT_SEARCH = {
  enabled: true,
  default: "Google",
  providers: {
    "Google":     "https://www.google.com/search?q=",
    "Brave":      "https://search.brave.com/search?q=",
    "DuckDuckGo": "https://duckduckgo.com/?q=",
  },
};

const PROVIDER_STORE = "homepage.search.provider";

function setupSearch(cfg) {
  const searchCfg = Object.assign({}, DEFAULT_SEARCH, cfg || {});
  const form = document.getElementById("searchForm");

  if (searchCfg.enabled === false) {
    form.hidden = true;
    return;
  }

  const providers = searchCfg.providers || {};
  const names = Object.keys(providers);
  if (!names.length) { form.hidden = true; return; }

  const select = document.getElementById("searchProvider");
  const input  = document.getElementById("searchInput");

  select.innerHTML = "";
  names.forEach(function (name) {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  });

  const stored = localStorage.getItem(PROVIDER_STORE);
  if (stored && providers[stored])        select.value = stored;
  else if (providers[searchCfg.default])  select.value = searchCfg.default;
  else                                    select.value = names[0];

  select.addEventListener("change", function () {
    localStorage.setItem(PROVIDER_STORE, select.value);
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;

    const looksLikeUrl = /^https?:\/\//i.test(q) ||
                         /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(q);

    if (looksLikeUrl) {
      window.location.href = /^https?:/i.test(q) ? q : "https://" + q;
      return;
    }

    const engine = providers[select.value];
    if (!engine) return;
    window.top.location.href = engine + encodeURIComponent(q);
  });

  form.hidden = false;
}

document.addEventListener("keydown", function (e) {
  const input = document.getElementById("searchInput");
  const form  = document.getElementById("searchForm");
  if (!input || !form || form.hidden) return;
  if (e.key === "/" && document.activeElement !== input) {
    e.preventDefault();
    input.focus();
    input.select();
  }
});

/* ============================================================
   Go
   ============================================================ */
loadConfig().then(boot);

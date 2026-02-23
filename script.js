const CHECKLIST_STORAGE_KEY = "access-matters-checklist-v2";
const PREFS_STORAGE_KEY = "access-matters-display-prefs-v1";

const DISPLAY_PREFS = [
  { key: "large-text", className: "pref-large-text", label: "Large text" },
  { key: "high-contrast", className: "pref-high-contrast", label: "High contrast" },
  { key: "extra-spacing", className: "pref-extra-spacing", label: "Extra spacing" },
  { key: "reduce-motion", className: "pref-reduce-motion", label: "Reduce motion" },
];

function readLocalJSON(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeLocalJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures (private mode, disabled storage, quota issues).
  }
}

function removeLocalValue(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
}

function updateYear() {
  const year = document.querySelector("#year");
  if (year) {
    year.textContent = String(new Date().getFullYear());
  }
}

function getChecklistElements() {
  const form = document.querySelector("#quick-check");
  if (!(form instanceof HTMLFormElement)) return null;

  return {
    form,
    boxes: Array.from(form.querySelectorAll('input[type="checkbox"][name="check"]')),
    statusText: document.querySelector("#checklist-status-text"),
    progress: document.querySelector("#checklist-progress"),
    percentText: document.querySelector("#checklist-percent"),
  };
}

function updateChecklistProgress({ boxes, statusText, progress, percentText }) {
  const total = boxes.length;
  const completed = boxes.filter((box) => box.checked).length;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  const summaryText = `${completed} of ${total} checks completed.`;

  if (statusText) {
    statusText.textContent = summaryText;
  }

  if (progress instanceof HTMLProgressElement) {
    progress.max = total || 1;
    progress.value = completed;
    progress.setAttribute("aria-valuetext", summaryText);
    progress.textContent = `${percent}%`;
  }

  if (percentText) {
    percentText.textContent = `${percent}%`;
  }
}

function loadSavedChecklist(boxes) {
  const saved = readLocalJSON(CHECKLIST_STORAGE_KEY);
  if (!Array.isArray(saved)) return;

  const selected = new Set(saved);
  for (const box of boxes) {
    box.checked = selected.has(box.value);
  }
}

function saveChecklist(boxes) {
  const checkedValues = boxes.filter((box) => box.checked).map((box) => box.value);
  writeLocalJSON(CHECKLIST_STORAGE_KEY, checkedValues);
}

function initChecklist() {
  const els = getChecklistElements();
  if (!els) return;

  const { form, boxes } = els;
  loadSavedChecklist(boxes);
  updateChecklistProgress(els);

  form.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.type !== "checkbox") return;

    saveChecklist(boxes);
    updateChecklistProgress(els);
  });

  form.addEventListener("reset", () => {
    requestAnimationFrame(() => {
      removeLocalValue(CHECKLIST_STORAGE_KEY);
      updateChecklistProgress(els);
    });
  });
}

function getDefaultPreferenceState() {
  return Object.fromEntries(DISPLAY_PREFS.map((pref) => [pref.key, false]));
}

function getSavedPreferenceState() {
  const base = getDefaultPreferenceState();
  const saved = readLocalJSON(PREFS_STORAGE_KEY);
  if (!saved || typeof saved !== "object" || Array.isArray(saved)) return base;

  for (const pref of DISPLAY_PREFS) {
    if (typeof saved[pref.key] === "boolean") {
      base[pref.key] = saved[pref.key];
    }
  }

  return base;
}

function applyPreferenceClasses(state) {
  const root = document.documentElement;
  for (const pref of DISPLAY_PREFS) {
    root.classList.toggle(pref.className, Boolean(state[pref.key]));
  }
}

function getPreferenceElements() {
  const prefButtons = Array.from(
    document.querySelectorAll("button[data-pref-toggle]")
  );
  const resetButton = document.querySelector("button[data-pref-reset]");
  const status = document.querySelector("#pref-status");

  if (!prefButtons.length) return null;

  return {
    prefButtons,
    resetButton,
    status,
  };
}

function getEnabledPreferenceLabels(state) {
  return DISPLAY_PREFS.filter((pref) => state[pref.key]).map((pref) => pref.label);
}

function updatePreferenceControls(els, state) {
  for (const button of els.prefButtons) {
    const key = button.getAttribute("data-pref-toggle");
    if (!key) continue;

    const pressed = Boolean(state[key]);
    button.setAttribute("aria-pressed", String(pressed));
  }
}

function updatePreferenceStatus(els, state, changeMessage) {
  if (!els.status) return;

  const enabled = getEnabledPreferenceLabels(state);
  const prefix = changeMessage ? `${changeMessage}.` : "";

  if (!enabled.length) {
    els.status.textContent = `${prefix} Display settings are off.`.trim();
    return;
  }

  els.status.textContent = `${prefix} Enabled: ${enabled.join(", ")}.`;
}

function savePreferenceState(state) {
  writeLocalJSON(PREFS_STORAGE_KEY, state);
}

function initPreferences() {
  const els = getPreferenceElements();
  if (!els) return;

  let state = getSavedPreferenceState();

  applyPreferenceClasses(state);
  updatePreferenceControls(els, state);
  updatePreferenceStatus(els, state);

  for (const button of els.prefButtons) {
    button.addEventListener("click", () => {
      const key = button.getAttribute("data-pref-toggle");
      if (!key) return;

      state = { ...state, [key]: !state[key] };
      applyPreferenceClasses(state);
      updatePreferenceControls(els, state);
      savePreferenceState(state);

      const label = DISPLAY_PREFS.find((pref) => pref.key === key)?.label || "Display setting";
      updatePreferenceStatus(els, state, `${label} updated`);
    });
  }

  if (els.resetButton instanceof HTMLButtonElement) {
    els.resetButton.addEventListener("click", () => {
      state = getDefaultPreferenceState();
      applyPreferenceClasses(state);
      updatePreferenceControls(els, state);
      removeLocalValue(PREFS_STORAGE_KEY);
      updatePreferenceStatus(els, state, "Display settings reset");
    });
  }
}

function getHashTargetFromLink(link) {
  const href = link.getAttribute("href");
  if (!href || href === "#" || !href.startsWith("#")) return null;
  const target = document.querySelector(href);
  return target instanceof HTMLElement ? target : null;
}

function focusHashTarget(target) {
  if (!(target instanceof HTMLElement)) return;

  const hadTabIndex = target.hasAttribute("tabindex");
  if (!hadTabIndex) {
    target.setAttribute("tabindex", "-1");
  }

  requestAnimationFrame(() => {
    target.focus({ preventScroll: true });
  });
}

function initHashLinkFocus() {
  const hashLinks = Array.from(document.querySelectorAll('a[href^="#"]'));

  for (const link of hashLinks) {
    link.addEventListener("click", (event) => {
      if (
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        event.button !== 0
      ) {
        return;
      }

      const target = getHashTargetFromLink(link);
      if (!target) return;

      // Let native anchor navigation update the hash/scroll first, then move focus.
      setTimeout(() => focusHashTarget(target), 0);
    });
  }

  window.addEventListener("hashchange", () => {
    const hash = window.location.hash;
    if (!hash) return;
    const target = document.querySelector(hash);
    if (target instanceof HTMLElement) {
      focusHashTarget(target);
    }
  });
}

function initActiveSectionNav() {
  const navLinks = Array.from(document.querySelectorAll(".nav-list a[href^='#']"));
  if (!navLinks.length) return;

  const sections = navLinks
    .map((link) => {
      const hash = link.getAttribute("href");
      if (!hash) return null;
      const section = document.querySelector(hash);
      return section instanceof HTMLElement ? { link, hash, section } : null;
    })
    .filter(Boolean);

  if (!sections.length) return;

  function setCurrent(hash) {
    const matchExists = sections.some(({ link }) => link.getAttribute("href") === hash);
    if (!matchExists) return;

    for (const { link } of sections) {
      if (link.getAttribute("href") === hash) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    }
  }

  function updateFromHash() {
    const hash = window.location.hash;
    if (!hash) return;
    setCurrent(hash);
  }

  for (const item of sections) {
    item.link.addEventListener("click", () => setCurrent(item.hash));
  }

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible?.target?.id) {
          setCurrent(`#${visible.target.id}`);
        }
      },
      {
        root: null,
        rootMargin: "-18% 0px -58% 0px",
        threshold: [0.1, 0.25, 0.5, 0.75],
      }
    );

    for (const item of sections) {
      observer.observe(item.section);
    }
  }

  window.addEventListener("hashchange", updateFromHash);
  updateFromHash();
}

function init() {
  updateYear();
  initPreferences();
  initChecklist();
  initHashLinkFocus();
  initActiveSectionNav();
}

document.addEventListener("DOMContentLoaded", init);

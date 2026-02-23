const STORAGE_KEY = "access-matters-checklist-v1";

function getChecklistElements() {
  const form = document.querySelector("#quick-check");
  if (!form) return null;

  return {
    form,
    boxes: Array.from(form.querySelectorAll('input[type="checkbox"][name="check"]')),
    statusText: document.querySelector("#checklist-status-text"),
    meterFill: document.querySelector("#meter-fill"),
    year: document.querySelector("#year"),
  };
}

function updateProgress({ boxes, statusText, meterFill }) {
  const total = boxes.length;
  const completed = boxes.filter((box) => box.checked).length;
  const percent = total ? Math.round((completed / total) * 100) : 0;

  if (statusText) {
    statusText.textContent = `${completed} of ${total} checks completed.`;
  }

  if (meterFill) {
    meterFill.style.width = `${percent}%`;
  }
}

function loadSavedState(boxes) {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    const values = JSON.parse(saved);
    if (!Array.isArray(values)) return;

    for (const box of boxes) {
      box.checked = values.includes(box.value);
    }
  } catch {
    // Ignore malformed local state and continue with defaults.
  }
}

function saveState(boxes) {
  const checkedValues = boxes.filter((box) => box.checked).map((box) => box.value);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(checkedValues));
}

function initChecklist() {
  const els = getChecklistElements();
  if (!els) return;

  const { form, boxes, year } = els;

  if (year) {
    year.textContent = String(new Date().getFullYear());
  }

  loadSavedState(boxes);
  updateProgress(els);

  form.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.type !== "checkbox") return;

    saveState(boxes);
    updateProgress(els);
  });

  form.addEventListener("reset", () => {
    requestAnimationFrame(() => {
      localStorage.removeItem(STORAGE_KEY);
      updateProgress(els);
    });
  });
}

document.addEventListener("DOMContentLoaded", initChecklist);

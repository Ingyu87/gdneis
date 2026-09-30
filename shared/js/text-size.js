(function () {
  const KEY = "gdneis.textSize";
  const STEPS = [87.5, 100, 112.5, 125, 137.5, 150];

  function readIndex() {
    const saved = Number.parseInt(localStorage.getItem(KEY) || "", 10);
    return Number.isInteger(saved) && saved >= 0 && saved < STEPS.length ? saved : 1;
  }

  function apply(index) {
    const next = Math.max(0, Math.min(STEPS.length - 1, index));
    localStorage.setItem(KEY, String(next));
    const size = `${STEPS[next]}%`;
    document.documentElement.style.fontSize = size;
    document.querySelectorAll("iframe").forEach((frame) => {
      try {
        if (frame.contentDocument) frame.contentDocument.documentElement.style.fontSize = size;
      } catch (error) {
        /* 같은 출처 문서만 조절한다. */
      }
    });
    document.querySelectorAll("[data-text-size-label]").forEach((label) => {
      label.textContent = `${STEPS[next]}%`;
    });
    document.querySelectorAll("[data-text-size-down]").forEach((button) => {
      button.disabled = next === 0;
    });
    document.querySelectorAll("[data-text-size-up]").forEach((button) => {
      button.disabled = next === STEPS.length - 1;
    });
  }

  function bind() {
    document.querySelectorAll("[data-text-size-down]").forEach((button) => {
      button.addEventListener("click", () => apply(readIndex() - 1));
    });
    document.querySelectorAll("[data-text-size-up]").forEach((button) => {
      button.addEventListener("click", () => apply(readIndex() + 1));
    });
    document.querySelectorAll("iframe").forEach((frame) => {
      frame.addEventListener("load", () => apply(readIndex()));
    });
    apply(readIndex());
  }

  apply(readIndex());
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
})();

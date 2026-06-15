const Harness = (() => {
  function debounce(fn, delay = 250) {
    let timer;
    return (...args) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => fn(...args), delay);
    };
  }

  function loadState(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? { ...fallback, ...JSON.parse(raw) } : { ...fallback };
    } catch (_error) {
      return { ...fallback };
    }
  }

  function saveState(key, state) {
    window.localStorage.setItem(key, JSON.stringify(state));
  }

  function clearState(key) {
    window.localStorage.removeItem(key);
  }

  async function copyText(text) {
    const value = String(text || "").trim();
    if (!value) return false;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
        return true;
      }
    } catch (_error) {
      // Fall through to the textarea copy path.
    }

    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();

    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (_error) {
      ok = false;
    }
    document.body.removeChild(textarea);
    return ok;
  }

  function showToast(message, tone = "success") {
    let toast = document.getElementById("gdneis-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "gdneis-toast";
      toast.className = "neis-toast";
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.dataset.tone = tone;
    toast.classList.add("visible");

    window.clearTimeout(toast._timer);
    toast._timer = window.setTimeout(() => {
      toast.classList.remove("visible");
    }, 1800);
  }

  function byteLength(text) {
    return new Blob([String(text || "")]).size;
  }

  function markCopied(element) {
    if (!element) return;
    const original = element.dataset.originalText || element.textContent;
    element.dataset.originalText = original;
    element.classList.add("clicked");
    element.textContent = "복사 완료";
    window.setTimeout(() => {
      element.textContent = original;
      element.classList.remove("clicked");
    }, 900);
  }

  return {
    debounce,
    loadState,
    saveState,
    clearState,
    copyText,
    showToast,
    byteLength,
    markCopied
  };
})();

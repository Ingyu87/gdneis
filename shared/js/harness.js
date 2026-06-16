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
    element.classList.add("clicked");
    window.setTimeout(() => element.classList.remove("clicked"), 900);
  }

  let lastCopiedSentence = "";

  function appendToTextarea(textarea, sentence) {
    const value = String(sentence || "").trim();
    if (!value) return "";
    const current = String(textarea.value || "").trim();
    textarea.value = current ? `${current} ${value}` : value;
    return textarea.value;
  }

  function appendLastCopied(textarea) {
    const value = String(lastCopiedSentence || "").trim();
    if (!value) {
      showToast("먼저 예시문장을 복사해 주세요.", "error");
      return false;
    }
    appendToTextarea(textarea, value);
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    showToast("복사한 문장을 최종 문장에 이어 붙였습니다.");
    return true;
  }

  function bindFinalAppendButton(button, textarea, onChange) {
    if (!button || !textarea) return;
    button.addEventListener("click", () => {
      if (appendLastCopied(textarea) && typeof onChange === "function") {
        onChange(textarea.value);
      }
    });
  }

  function createResultItem(sentence) {
    const item = document.createElement("div");
    item.className = "result-item";
    item.tabIndex = 0;

    const text = document.createElement("span");
    text.className = "result-item-text";
    text.textContent = sentence;

    const actions = document.createElement("div");
    actions.className = "result-item-actions";

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "copy-button";
    copyBtn.textContent = "복사";

    async function copySentence() {
      const ok = await copyText(sentence);
      if (ok) {
        lastCopiedSentence = sentence;
        markCopied(item);
        showToast("예시문장을 복사했습니다.");
      } else {
        showToast("복사에 실패했습니다. 문장을 직접 선택해 복사하세요.", "error");
      }
    }

    copyBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      copySentence();
    });

    text.addEventListener("click", (event) => {
      event.stopPropagation();
      copySentence();
    });

    item.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        copySentence();
      }
    });

    actions.appendChild(copyBtn);
    item.append(text, actions);
    return item;
  }

  function insertTeacherGuidanceNotice() {
    const card = document.querySelector(".neis-card");
    if (!card || card.querySelector(".neis-disclaimer")) return;

    const title = card.querySelector(".neis-card-title");
    if (!title) return;

    const disclaimer = document.createElement("aside");
    disclaimer.className = "neis-disclaimer";
    disclaimer.setAttribute("role", "note");
    disclaimer.innerHTML = `
      <strong>예시문장 안내 · 학교생활기록부 기재요령</strong>
      <p>본 도구가 생성하는 문장은 참고용 <strong>예시문장</strong>입니다.</p>
      <p>「학교생활기록부 기재요령」에 따르면, 학교생활기록부 서술형 항목은 교사의 고유권한으로 교사가 평소 학생을 직접 관찰·평가한 내용을 바탕으로 작성하는 것이 원칙입니다. AI를 활용하여 생성한 자료를 서술형 항목에 그대로 입력하는 행위는 학교생활기록부의 신뢰도를 저하시킬 수 있으므로 유의해야 합니다.</p>
      <p><strong>생성된 예시문장을 그대로 입력하지 말고, 실제 관찰 내용을 반영하여 교사가 반드시 수정·작성하여 기재해 주세요.</strong></p>
    `;
    title.insertAdjacentElement("afterend", disclaimer);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", insertTeacherGuidanceNotice);
  } else {
    insertTeacherGuidanceNotice();
  }

  return {
    debounce,
    loadState,
    saveState,
    clearState,
    copyText,
    showToast,
    byteLength,
    markCopied,
    createResultItem,
    appendToTextarea,
    appendLastCopied,
    bindFinalAppendButton,
    insertTeacherGuidanceNotice
  };
})();

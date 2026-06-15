const STORAGE_KEY = "gdneis.comments.state";

const fallbackState = {
  grade: "4학년",
  subject: "",
  excellent: 3,
  good: 3,
  effort: 3,
  combined: 5,
  generatedByDomain: {},
  combinedSuggestions: [],
  finalText: ""
};

let state = Harness.loadState(STORAGE_KEY, fallbackState);
let planData = {};

const els = {
  form: document.getElementById("comments-form"),
  grade: document.getElementById("grade-select"),
  subject: document.getElementById("subject-select"),
  excellent: document.getElementById("excellent-count"),
  good: document.getElementById("good-count"),
  effort: document.getElementById("effort-count"),
  combined: document.getElementById("combined-count"),
  generateBtn: document.getElementById("generate-btn"),
  combineBtn: document.getElementById("combine-btn"),
  clearBtn: document.getElementById("clear-btn"),
  combinedList: document.getElementById("combined-list"),
  domainResults: document.getElementById("domain-results"),
  finalText: document.getElementById("final-text"),
  byteCount: document.getElementById("byte-count"),
  copyFinalBtn: document.getElementById("copy-final-btn")
};

const persist = Harness.debounce(() => Harness.saveState(STORAGE_KEY, state), 200);

function gradeList() {
  return Object.keys(planData);
}

function subjectList(grade) {
  return Object.keys(planData[grade] || {});
}

function domainEntries() {
  return planData[state.grade]?.[state.subject] || [];
}

function syncFromInputs() {
  state.grade = els.grade.value;
  state.subject = els.subject.value;
  state.excellent = Number.parseInt(els.excellent.value, 10) || 0;
  state.good = Number.parseInt(els.good.value, 10) || 0;
  state.effort = Number.parseInt(els.effort.value, 10) || 0;
  state.combined = Math.max(Number.parseInt(els.combined.value, 10) || 1, 1);
  state.finalText = els.finalText.value;
  persist();
  renderMetaOnly();
}

function renderOptions() {
  const grades = gradeList();
  if (!grades.includes(state.grade)) state.grade = grades[0] || "4학년";
  els.grade.innerHTML = grades.map((grade) => `<option value="${grade}">${grade}</option>`).join("");
  els.grade.value = state.grade;

  const subjects = subjectList(state.grade);
  if (!subjects.includes(state.subject)) state.subject = subjects[0] || "";
  els.subject.innerHTML = subjects.map((subject) => `<option value="${subject}">${subject}</option>`).join("");
  els.subject.value = state.subject;
}

function renderMetaOnly() {
  els.byteCount.textContent = `${Harness.byteLength(state.finalText)} Byte`;
  els.combineBtn.disabled = Object.keys(state.generatedByDomain || {}).length === 0;
}

function appendToFinal(sentence) {
  const current = els.finalText.value.trim();
  state.finalText = current ? `${current} ${sentence}` : sentence;
  els.finalText.value = state.finalText;
  els.finalText.focus();
  els.finalText.setSelectionRange(state.finalText.length, state.finalText.length);
  renderMetaOnly();
  persist();
}

async function appendAndCopy(sentence, element, label) {
  appendToFinal(sentence);
  const ok = await Harness.copyText(state.finalText);
  if (ok) {
    if (element) {
      element.classList.add("clicked");
      window.setTimeout(() => element.classList.remove("clicked"), 900);
    }
    Harness.showToast(`${label} 이어 붙이고 최종 종합의견 전체를 복사했습니다.`);
  } else {
    Harness.showToast("복사에 실패했습니다.", "error");
  }
}

function renderSentenceItem(sentence, label) {
  const item = document.createElement("div");
  item.className = "result-item";
  item.tabIndex = 0;

  const text = document.createElement("span");
  text.className = "result-item-text";
  text.textContent = sentence;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "copy-button";
  button.textContent = "이어 붙이기";

  const add = () => appendAndCopy(sentence, item, label);
  item.append(text, button);
  item.addEventListener("click", add);
  item.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      add();
    }
  });
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    add();
  });
  return item;
}

function renderDomainResults() {
  els.domainResults.innerHTML = "";
  const entries = domainEntries();
  const generated = state.generatedByDomain || {};

  if (!Object.keys(generated).length) {
    els.domainResults.innerHTML = '<p class="neis-note">영역별 예시문장 생성 버튼을 누르면 평가 영역별 문장이 표시됩니다.</p>';
    return;
  }

  entries.forEach((entry, index) => {
    const data = generated[entry.domain];
    if (!data) return;

    const card = document.createElement("div");
    card.className = `domain-card ${index === 0 ? "open" : ""}`;
    const header = document.createElement("button");
    header.type = "button";
    header.className = "domain-header";
    header.textContent = entry.domain;
    header.addEventListener("click", () => card.classList.toggle("open"));

    const body = document.createElement("div");
    body.className = "domain-body";
    body.innerHTML = `
      <p class="neis-note">${entry.standard || ""}</p>
      <div class="level-title">상 예시문장</div>
    `;
    (data.excellent_sentences || []).forEach((sentence) => body.appendChild(renderSentenceItem(sentence, "상 예시문장을")));
    body.insertAdjacentHTML("beforeend", '<div class="level-title">중 예시문장</div>');
    (data.good_sentences || []).forEach((sentence) => body.appendChild(renderSentenceItem(sentence, "중 예시문장을")));
    body.insertAdjacentHTML("beforeend", '<div class="level-title">하 예시문장</div>');
    (data.effort_sentences || []).forEach((sentence) => body.appendChild(renderSentenceItem(sentence, "하 예시문장을")));

    card.append(header, body);
    els.domainResults.appendChild(card);
  });
}

function renderCombined() {
  els.combinedList.innerHTML = "";
  if (!state.combinedSuggestions.length) {
    els.combinedList.innerHTML = '<p class="neis-note">영역별 예시문장 생성 후 종합의견 조합 버튼을 누르세요.</p>';
    return;
  }
  state.combinedSuggestions.forEach((sentence) => {
    els.combinedList.appendChild(renderSentenceItem(sentence, "종합의견 예시문장을"));
  });
}

function render() {
  renderOptions();
  els.excellent.value = state.excellent;
  els.good.value = state.good;
  els.effort.value = state.effort;
  els.combined.value = state.combined;
  els.finalText.value = state.finalText;
  renderDomainResults();
  renderCombined();
  renderMetaOnly();
}

function mockDomainResult(domainEntry) {
  const domain = domainEntry.domain || state.subject;
  const standard = domainEntry.standard || "";
  return {
    excellent_sentences: [
      `${domain} 영역에서 ${standard ? "성취기준을 바탕으로 " : ""}핵심 개념을 잘 이해하고 활동에 적극적으로 참여함.`,
      `${domain} 학습 과정에서 자신의 생각을 분명히 표현하고 친구와 협력하여 과제를 해결함.`,
      `${domain} 활동에서 배운 내용을 생활 속 사례와 연결하여 설명하는 능력이 돋보임.`
    ].slice(0, state.excellent),
    good_sentences: [
      `${domain} 영역의 기본 내용을 이해하고 수업 활동에 꾸준히 참여함.`,
      `${domain} 학습에서 주어진 과제를 성실히 수행하며 배운 내용을 정리하려고 노력함.`,
      `${domain} 활동 중 친구의 의견을 듣고 자신의 생각을 말하며 학습에 참여함.`
    ].slice(0, state.good),
    effort_sentences: [
      `${domain} 영역의 기본 개념을 익히기 위해 수업 활동에 참여하며 점차 자신감을 키워 감.`,
      `${domain} 학습 과제를 해결하는 과정에서 도움을 받아 내용을 정리하고 끝까지 해내려는 태도를 보임.`,
      `${domain} 활동에 관심을 가지고 참여하며 배운 내용을 다시 확인하려고 노력함.`
    ].slice(0, state.effort)
  };
}

async function requestDomain(domainEntry) {
  const payload = {
    grade: state.grade,
    subject: state.subject,
    counts: {
      excellent: state.excellent,
      good: state.good,
      effort: state.effort
    },
    domainEntry
  };

  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function generateDomains() {
  syncFromInputs();
  const entries = domainEntries();
  if (!entries.length) {
    Harness.showToast("평가계획 데이터를 찾을 수 없습니다.", "error");
    return;
  }

  state.generatedByDomain = {};
  state.combinedSuggestions = [];
  renderDomainResults();
  renderCombined();
  els.generateBtn.disabled = true;
  els.generateBtn.textContent = "생성 중...";

  const generated = {};
  for (const entry of entries) {
    try {
      const result = await requestDomain(entry);
      generated[entry.domain] = {
        excellent_sentences: result.excellent_sentences || [],
        good_sentences: result.good_sentences || [],
        effort_sentences: result.effort_sentences || []
      };
    } catch (_error) {
      generated[entry.domain] = mockDomainResult(entry);
    }
  }

  state.generatedByDomain = generated;
  persist();
  renderDomainResults();
  renderMetaOnly();
  els.generateBtn.disabled = false;
  els.generateBtn.textContent = "1. 영역별 예시문장 생성";
  Harness.showToast("영역별 예시문장을 생성했습니다.");
}

function pickRandom(list) {
  if (!list.length) return "";
  return list[Math.floor(Math.random() * list.length)];
}

function combineOpinions() {
  syncFromInputs();
  const generated = state.generatedByDomain || {};
  const domains = Object.values(generated);
  if (!domains.length) {
    Harness.showToast("먼저 영역별 예시문장을 생성하세요.", "error");
    return;
  }

  const levels = ["excellent_sentences", "good_sentences", "effort_sentences"];
  const result = [];
  for (let i = 0; i < state.combined; i += 1) {
    const sentences = domains
      .map((domain, index) => pickRandom(domain[levels[index % levels.length]] || []))
      .filter(Boolean);
    if (sentences.length) result.push(sentences.join(" "));
  }

  state.combinedSuggestions = result;
  persist();
  renderCombined();
  Harness.showToast("종합의견 예시문장을 조합했습니다.");
}

async function copyFinal() {
  syncFromInputs();
  const ok = await Harness.copyText(state.finalText);
  Harness.showToast(ok ? "최종 종합의견을 복사했습니다." : "복사할 문장이 없습니다.", ok ? "success" : "error");
}

function bindEvents() {
  els.grade.addEventListener("change", () => {
    state.grade = els.grade.value;
    state.subject = "";
    state.generatedByDomain = {};
    state.combinedSuggestions = [];
    render();
    persist();
  });
  els.subject.addEventListener("change", () => {
    state.subject = els.subject.value;
    state.generatedByDomain = {};
    state.combinedSuggestions = [];
    syncFromInputs();
    renderDomainResults();
    renderCombined();
  });
  [els.excellent, els.good, els.effort, els.combined, els.finalText].forEach((el) => {
    el.addEventListener("input", syncFromInputs);
    el.addEventListener("change", syncFromInputs);
  });
  els.form.addEventListener("submit", (event) => {
    event.preventDefault();
    generateDomains();
  });
  els.combineBtn.addEventListener("click", combineOpinions);
  els.clearBtn.addEventListener("click", () => {
    Harness.clearState(STORAGE_KEY);
    state = { ...fallbackState };
    render();
    Harness.showToast("학기말 종합의견 저장 데이터를 초기화했습니다.");
  });
  els.copyFinalBtn.addEventListener("click", copyFinal);
}

async function init() {
  const response = await fetch("./data/evaluation-plan.json");
  planData = await response.json();
  bindEvents();
  render();
}

init().catch((error) => {
  els.domainResults.innerHTML = `<p class="neis-note">평가계획 데이터를 불러오지 못했습니다. ${error.message}</p>`;
});

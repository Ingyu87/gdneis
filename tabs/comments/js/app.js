const STORAGE_KEY = "gdneis.comments.state.v2";

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
  copyFinalBtn: document.getElementById("copy-final-btn"),
  appendFinalBtn: document.getElementById("append-final-btn"),
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

function domainKey(entry, index) {
  return `${index}:${entry.domain || ""}`;
}

function generatedForEntry(generated, entry, index) {
  return generated[domainKey(entry, index)] || generated[entry.domain] || null;
}

function splitStandards(standardText) {
  const text = String(standardText || "").trim();
  if (!text) return [];
  const matches = [...text.matchAll(/\[[^\]]+\]\s*([^\[]+)/g)];
  if (matches.length) return matches.map((match) => match[0].replace(/\/\s*$/, "").trim()).filter(Boolean);
  return text.split(/\s*\/\s*|\n+/).map((item) => item.trim()).filter(Boolean);
}

function cleanStandardText(standard) {
  return String(standard || "")
    .replace(/\[[^\]]+\]/g, "")
    .replace(/\/\s*$/g, "")
    .replace(/\s+/g, " ")
    .replace(/[.!?。]+$/g, "")
    .trim();
}

function sentenceEnd(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return "";
  return /[.!?。]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function normalizeRecordSentence(text) {
  return String(text || "")
    .replace(/\s*[,，]\s*/g, ". ")
    .replace(/\.\s*\./g, ".")
    .replace(/\s+/g, " ")
    .trim();
}

function standardSentence(domainEntry, level, variant, standard) {
  const focus = cleanStandardText(standard) || domainEntry.domain || state.subject;
  const templates = {
    excellent: [
      `성취기준 '${focus}'에 따라 핵심 개념을 정확히 이해하고 활동에서 스스로 설명함`,
      `성취기준 '${focus}'를 바탕으로 탐구 과정에 주도적으로 참여하며 배운 내용을 구체적으로 표현함`,
      `성취기준 '${focus}'와 관련한 과제를 성실히 해결하고 자신의 생각을 근거를 들어 말함`
    ],
    good: [
      `성취기준 '${focus}'의 기본 흐름을 이해하고 수업 활동에 꾸준히 참여함`,
      `성취기준 '${focus}'와 관련한 과제를 성실히 수행하며 배운 내용을 정리하려고 노력함`,
      `성취기준 '${focus}'를 학습하는 과정에서 친구의 의견을 듣고 자신의 생각을 말하며 참여함`
    ],
    effort: [
      `성취기준 '${focus}'의 기초를 익히기 위해 수업 활동에 참여하며 안내에 따라 과제를 수행함`,
      `성취기준 '${focus}'와 관련한 학습 내용을 다시 확인하며 차근차근 이해하려고 노력함`,
      `성취기준 '${focus}'를 배우는 과정에서 필요한 도움을 받아 활동에 참여하고 자신감을 길러 감`
    ]
  };
  const pool = templates[level] || templates.good;
  return sentenceEnd(pool[variant % pool.length]);
}

function mockLevelSentences(domainEntry, level, count) {
  const targetCount = Math.max(Number(count || 0), 0);
  const standards = splitStandards(domainEntry.standard);
  const standardList = standards.length ? standards : [domainEntry.standard || domainEntry.domain || state.subject];
  return Array.from({ length: targetCount }, (_, index) =>
    standardList.map((standard, standardIndex) => standardSentence(domainEntry, level, index + standardIndex, standard)).join(" ")
  );
}

function mockDomainResult(domainEntry) {
  return {
    excellent_sentences: mockLevelSentences(domainEntry, "excellent", state.excellent),
    good_sentences: mockLevelSentences(domainEntry, "good", state.good),
    effort_sentences: mockLevelSentences(domainEntry, "effort", state.effort)
  };
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
  const entries = domainEntries();
  const generated = state.generatedByDomain || {};
  els.combineBtn.disabled = !entries.length || !entries.every((entry, index) => generatedForEntry(generated, entry, index));
}

function syncFinalText(value) {
  state.finalText = value;
  els.finalText.value = value;
  renderMetaOnly();
  persist();
}

function renderSentenceItem(sentence) {
  return Harness.createResultItem(normalizeRecordSentence(sentence));
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
    const data = generatedForEntry(generated, entry, index);
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
    (data.excellent_sentences || []).forEach((sentence) => body.appendChild(renderSentenceItem(sentence)));
    body.insertAdjacentHTML("beforeend", '<div class="level-title">중 예시문장</div>');
    (data.good_sentences || []).forEach((sentence) => body.appendChild(renderSentenceItem(sentence)));
    body.insertAdjacentHTML("beforeend", '<div class="level-title">하 예시문장</div>');
    (data.effort_sentences || []).forEach((sentence) => body.appendChild(renderSentenceItem(sentence)));

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
    els.combinedList.appendChild(renderSentenceItem(sentence));
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
  const payloadJson = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payloadJson.error || `HTTP ${response.status}`);
  return payloadJson;
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
  const errors = [];
  for (const [index, entry] of entries.entries()) {
    try {
      const result = await requestDomain(entry);
      generated[domainKey(entry, index)] = {
        excellent_sentences: (result.excellent_sentences || []).map(normalizeRecordSentence),
        good_sentences: (result.good_sentences || []).map(normalizeRecordSentence),
        effort_sentences: (result.effort_sentences || []).map(normalizeRecordSentence)
      };
      if (result.apiError) errors.push(`${entry.domain}: ${result.apiError}`);
    } catch (error) {
      errors.push(`${entry.domain}: ${error.message}`);
      generated[domainKey(entry, index)] = mockDomainResult(entry);
    }
  }

  state.generatedByDomain = generated;
  persist();
  renderDomainResults();
  renderMetaOnly();
  els.generateBtn.disabled = false;
  els.generateBtn.textContent = "1. 영역별 예시문장 생성";

  if (errors.length) {
    Harness.showToast("API 생성 실패 영역은 성취기준 기반 기본문장으로 표시했습니다.", "error");
    console.warn("Domain generation fallback:", errors);
  } else {
    Harness.showToast("영역별 예시문장을 생성했습니다.");
  }
}

function pickRandom(list) {
  if (!list.length) return "";
  return list[Math.floor(Math.random() * list.length)];
}

function sentencePool(domainData) {
  return [
    ...(domainData.excellent_sentences || []),
    ...(domainData.good_sentences || []),
    ...(domainData.effort_sentences || [])
  ].filter(Boolean);
}

function combineOpinions() {
  syncFromInputs();
  const generated = state.generatedByDomain || {};
  const entries = domainEntries();
  if (!entries.length) {
    Harness.showToast("평가계획 데이터를 찾을 수 없습니다.", "error");
    return;
  }

  const domains = entries.map((entry, index) => ({
    entry,
    data: generatedForEntry(generated, entry, index)
  }));

  if (domains.some((domain) => !domain.data)) {
    Harness.showToast("먼저 영역별 예시문장을 생성하세요.", "error");
    return;
  }

  const emptyDomain = domains.find((domain) => sentencePool(domain.data).length === 0);
  if (emptyDomain) {
    Harness.showToast(`${emptyDomain.entry.domain} 영역은 조합할 문장이 없습니다. 다시 생성하세요.`, "error");
    return;
  }

  const result = [];
  for (let i = 0; i < state.combined; i += 1) {
    const sentences = domains.map((domain) => pickRandom(sentencePool(domain.data)));
    result.push(sentences.join(" "));
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
  Harness.bindFinalAppendButton(els.appendFinalBtn, els.finalText, syncFinalText);
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

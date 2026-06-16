const STORAGE_KEY = "gdneis.activity.state";

const TERM_PERIODS = {
  "1학기": "2026.03.01.-2026.08.18.",
  "2학기": "2026.08.19.-2027.02.11.",
  "1년": "2026.03.01.-2027.02.11.",
};

const fallbackState = {
  schoolYear: "2026",
  grade: "4",
  semester: "1",
  activityId: "",
  activityIds: [],
  basisCount: 3,
  combinedCount: 5,
  officerEnabled: false,
  officerTerm: "1학기",
  officerType: "학급",
  officerTitle: "회장",
  officerPeriod: TERM_PERIODS["1학기"],
  basisExamples: [],
  combinedSentences: [],
  finalText: "",
};

let state = Harness.loadState(STORAGE_KEY, fallbackState);
let themes = { common: [], byGrade: {} };

const els = {
  form: document.getElementById("activity-form"),
  schoolYear: document.getElementById("school-year"),
  grade: document.getElementById("grade-select"),
  semesterToggle: document.getElementById("semester-toggle"),
  basisCount: document.getElementById("basis-count"),
  combinedCount: document.getElementById("combined-count"),
  activityList: document.getElementById("activity-list"),
  activityBasis: document.getElementById("activity-basis"),
  officerEnabled: document.getElementById("officer-enabled"),
  officerFields: document.getElementById("officer-fields"),
  officerTerm: document.getElementById("officer-term"),
  officerType: document.getElementById("officer-type"),
  officerTitle: document.getElementById("officer-title"),
  officerPeriod: document.getElementById("officer-period"),
  generateBtn: document.getElementById("generate-btn"),
  combineBtn: document.getElementById("combine-btn"),
  sampleBtn: document.getElementById("sample-btn"),
  clearBtn: document.getElementById("clear-btn"),
  combinedList: document.getElementById("combined-list"),
  basisResults: document.getElementById("basis-results"),
  finalText: document.getElementById("final-text"),
  byteCount: document.getElementById("byte-count"),
  copyFinalBtn: document.getElementById("copy-final-btn"),
  appendFinalBtn: document.getElementById("append-final-btn"),
};

const persist = Harness.debounce(() => Harness.saveState(STORAGE_KEY, state), 200);

function countFromInput(el, fallback) {
  return Math.min(Math.max(Number.parseInt(el.value, 10) || fallback, 1), 25);
}

function entrySentences(entry) {
  if (Array.isArray(entry?.sentences)) return entry.sentences.filter(Boolean);
  return [
    ...(Array.isArray(entry?.excellent_sentences) ? entry.excellent_sentences : []),
    ...(Array.isArray(entry?.good_sentences) ? entry.good_sentences : []),
    ...(Array.isArray(entry?.effort_sentences) ? entry.effort_sentences : []),
  ].filter(Boolean);
}

function normalizeBasisEntry(entry, index = 0) {
  return {
    id: entry?.id || `basis-${index}`,
    category: entry?.category || "",
    title: entry?.title || "",
    basis: entry?.basis || "",
    sentences: entrySentences(entry),
  };
}

function normalizeSavedState() {
  if (!Array.isArray(state.activityIds)) {
    state.activityIds = state.activityId ? [state.activityId] : [];
  }
  if (!["1", "2"].includes(state.semester)) state.semester = fallbackState.semester;
  if (!TERM_PERIODS[state.officerTerm]) state.officerTerm = "1학기";
  if (!["학급", "학년", "전교"].includes(state.officerType)) state.officerType = "학급";
  if (!state.officerTitle || /[?�]/.test(state.officerTitle)) state.officerTitle = "회장";
  if (!state.officerPeriod || /[?�]/.test(state.officerPeriod)) state.officerPeriod = TERM_PERIODS[state.officerTerm];

  state.basisCount = Math.min(Math.max(Number.parseInt(state.basisCount ?? state.excellent, 10) || fallbackState.basisCount, 1), 25);
  state.combinedCount = Math.min(Math.max(Number.parseInt(state.combinedCount, 10) || fallbackState.combinedCount, 1), 25);
  state.basisExamples = Array.isArray(state.basisExamples) ? state.basisExamples.map(normalizeBasisEntry) : [];
  state.combinedSentences = Array.isArray(state.combinedSentences) ? state.combinedSentences : [];
}

function activityMatchesSemester(item) {
  if (!Array.isArray(item.terms) || !item.terms.length) return true;
  return item.terms.includes(state.semester);
}

function getActivities() {
  const common = (themes.common || []).filter((item) => item.grades?.includes(state.grade) && activityMatchesSemester(item));
  const gradeSpecific = (themes.byGrade[state.grade] || []).filter(activityMatchesSemester);
  return [...common, ...gradeSpecific];
}

function getSelectedActivities() {
  const activities = getActivities();
  const selected = activities.filter((item) => state.activityIds.includes(item.id));
  if (state.officerEnabled) return selected;
  return selected.length ? selected : activities.slice(0, 1);
}

function buildOfficerActivity() {
  if (!state.officerEnabled) return null;
  const label = `${state.grade}학년 ${state.officerTerm} ${state.officerType} ${state.officerTitle}(${state.officerPeriod})`;
  return {
    id: "__officer",
    terms: [state.semester],
    category: `${state.grade}학년 ${state.officerTerm} 임원 활동`,
    title: `${state.officerType} ${state.officerTitle} 임원 활동`,
    basis: `${label}으로 활동하며 회의 진행, 의견 조율, 학급 공동체 활동 지원, 맡은 역할의 책임 있는 수행을 관찰 근거로 반영`,
    source: "사용자 입력 임원 활동",
  };
}

function getSelectedActivitiesWithOfficer() {
  const activities = getSelectedActivities();
  const officerActivity = buildOfficerActivity();
  return officerActivity ? [...activities, officerActivity] : activities;
}

function setState(patch) {
  state = { ...state, ...patch };
  persist();
  render();
}

function syncFromInputs() {
  state.schoolYear = els.schoolYear.value;
  state.grade = els.grade.value;
  state.basisCount = countFromInput(els.basisCount, fallbackState.basisCount);
  state.combinedCount = countFromInput(els.combinedCount, fallbackState.combinedCount);
  state.officerEnabled = els.officerEnabled.checked;
  state.officerTerm = els.officerTerm.value;
  state.officerType = els.officerType.value;
  state.officerTitle = els.officerTitle.value.trim() || "회장";
  state.officerPeriod = els.officerPeriod.value.trim();
  state.finalText = els.finalText.value;
  persist();
  renderMetaOnly();
}

function renderSemesterToggle() {
  [...els.semesterToggle.querySelectorAll(".term-option")].forEach((button) => {
    const active = button.dataset.semester === state.semester;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function resetGeneratedResults() {
  state.basisExamples = [];
  state.combinedSentences = [];
}

function renderActivities() {
  const activities = getActivities();
  const availableIds = new Set(activities.map((item) => item.id));
  state.activityIds = state.activityIds.filter((id) => availableIds.has(id));

  if (!state.activityIds.length && activities[0] && !state.officerEnabled) {
    state.activityIds = [activities[0].id];
  }
  state.activityId = state.activityIds[0] || "";

  els.activityList.innerHTML = "";

  if (!activities.length) {
    els.activityList.innerHTML = '<p class="neis-note">선택한 학년·학기에 등록된 영역이 없습니다.</p>';
    return;
  }

  activities.forEach((item) => {
    const label = document.createElement("label");
    label.className = `choice-item ${state.activityIds.includes(item.id) ? "active" : ""} ${state.officerEnabled ? "disabled" : ""}`;
    label.innerHTML = `
      <input type="checkbox" value="${item.id}" ${state.activityIds.includes(item.id) ? "checked" : ""} ${state.officerEnabled ? "disabled" : ""}>
      <span>
        <span class="choice-item-title">${item.title}</span>
        <span class="choice-item-meta">${item.category}</span>
      </span>
    `;

    label.querySelector("input").addEventListener("change", (event) => {
      const selected = new Set(state.activityIds);
      if (event.target.checked) selected.add(item.id);
      else selected.delete(item.id);
      state.activityIds = Array.from(selected);
      if (!state.activityIds.length) state.activityIds = [item.id];
      state.activityId = state.activityIds[0] || "";
      resetGeneratedResults();
      persist();
      render();
    });

    els.activityList.appendChild(label);
  });

  const officerLabel = document.createElement("label");
  officerLabel.className = `choice-item ${state.officerEnabled ? "active" : ""}`;
  officerLabel.innerHTML = `
    <input type="checkbox" value="__officer" ${state.officerEnabled ? "checked" : ""}>
    <span>
      <span class="choice-item-title">학급임원 활동</span>
      <span class="choice-item-meta">${state.grade}학년 ${state.officerTerm} ${state.officerType} ${state.officerTitle}</span>
    </span>
  `;

  officerLabel.querySelector("input").addEventListener("change", (event) => {
    state.officerEnabled = event.target.checked;
    if (state.officerEnabled) state.activityIds = [];
    if (!state.officerPeriod) state.officerPeriod = TERM_PERIODS[state.officerTerm];
    resetGeneratedResults();
    persist();
    render();
  });

  els.activityList.appendChild(officerLabel);
}

function renderExampleItem(sentence) {
  return Harness.createResultItem(sentence);
}

function renderCombined() {
  els.combinedList.innerHTML = "";
  const combinedSentences = state.combinedSentences || [];
  if (!combinedSentences.length) {
    els.combinedList.innerHTML = '<p class="neis-note">영역별 예시문장 생성 후 종합 예시문장 조합 버튼을 누르세요.</p>';
    return;
  }

  combinedSentences.forEach((sentence) => {
    els.combinedList.appendChild(renderExampleItem(sentence));
  });
}

function renderBasisResults() {
  els.basisResults.innerHTML = "";
  const basisExamples = state.basisExamples || [];

  if (!basisExamples.length) {
    els.basisResults.innerHTML = '<p class="neis-note">영역별 예시문장 생성 버튼을 누르면 선택한 영역별 문장이 표시됩니다.</p>';
    return;
  }

  basisExamples.forEach((entry, index) => {
    const sentences = entrySentences(entry);
    if (!sentences.length) return;

    const group = document.createElement("div");
    group.className = `domain-card ${index === 0 ? "open" : ""}`;

    const header = document.createElement("button");
    header.type = "button";
    header.className = "domain-header";
    header.textContent = `${entry.title} · ${entry.category}`;
    header.addEventListener("click", () => group.classList.toggle("open"));

    const body = document.createElement("div");
    body.className = "domain-body";
    if (entry.basis) {
      const basisNote = document.createElement("p");
      basisNote.className = "neis-note";
      basisNote.textContent = entry.basis;
      body.appendChild(basisNote);
    }

    sentences.forEach((sentence) => body.appendChild(renderExampleItem(sentence)));
    group.append(header, body);
    els.basisResults.appendChild(group);
  });
}

function renderMetaOnly() {
  const activities = getSelectedActivitiesWithOfficer();
  const termLabel = `${state.semester}학기`;
  els.activityBasis.textContent = activities
    .map((item) => `${item.title}: ${item.basis}`)
    .join(" / ");
  if (els.activityBasis.textContent) {
    els.activityBasis.textContent = `${termLabel} 영역 - ${els.activityBasis.textContent}`;
  }
  els.officerFields.classList.toggle("hidden", !state.officerEnabled);
  els.generateBtn.textContent = "1. 영역별 예시문장 생성";
  els.combineBtn.disabled = !(state.basisExamples || []).length;
  els.byteCount.textContent = `${Harness.byteLength(state.finalText)} Byte`;
}

function render() {
  els.schoolYear.value = state.schoolYear;
  els.grade.value = state.grade;
  els.basisCount.value = state.basisCount;
  els.combinedCount.value = state.combinedCount;
  renderSemesterToggle();
  renderActivities();
  els.officerEnabled.checked = state.officerEnabled;
  els.officerTerm.value = state.officerTerm;
  els.officerType.value = state.officerType;
  els.officerTitle.value = state.officerTitle;
  els.officerPeriod.value = state.officerPeriod;
  els.finalText.value = state.finalText;
  renderCombined();
  renderBasisResults();
  renderMetaOnly();
}

function mockSentence(payload, item, variant) {
  const term = `${payload.semester}학기`;

  if (item?.id === "__officer") {
    const officer = `${payload.grade}학년 ${payload.officer.term} ${payload.officer.type} ${payload.officer.title}(${payload.officer.period})`;
    const sentences = [
      `${officer}으로 활동하며 ${term} 학급회의 진행과 의견 조율에 책임감을 가지고 참여하여 공동체 의사결정이 원활하게 이루어지도록 기여함.`,
      `${officer}으로 활동하며 ${term} 학급 구성원의 의견을 경청하고 필요한 역할을 스스로 찾아 실천하는 등 자치활동에서 리더십을 발휘함.`,
      `${officer}으로 활동하며 ${term} 학급 공동체의 약속 실천을 돕고 친구들이 자율적으로 참여할 수 있도록 차분히 이끄는 모습이 돋보임.`,
      `${officer}으로 활동하며 ${term} 회의와 공동체 활동에서 친구들의 의견을 듣고 학급 운영에 필요한 역할을 수행함.`,
    ];
    return sentences[variant % sentences.length];
  }

  const title = item?.title || "자율·자치활동";
  const sentences = [
    `${term} ${title} 과정에서 활동의 취지를 이해하고 친구들의 의견을 조율하며 공동의 문제 해결에 적극적으로 참여함.`,
    `${term} ${title}에 주도적으로 참여하여 학급 공동체의 약속을 실천하고 활동이 원활하게 이루어지도록 기여함.`,
    `${term} ${title}에서 맡은 역할을 책임감 있게 수행하고 친구들과 협력하여 배운 점을 실천으로 연결함.`,
    `${term} ${title} 과정에 꾸준히 참여하며 친구의 의견을 듣고 자신의 생각을 차분히 표현함.`,
    `${term} ${title}에 관심을 가지고 참여하며 활동 내용을 이해하고 친구들과 함께 실천함.`,
  ];
  return sentences[variant % sentences.length];
}

function mockBasisExamples(payload, activities) {
  return activities.map((activity) => ({
    ...activity,
    sentences: Array.from({ length: payload.counts.basis }, (_, index) => mockSentence(payload, activity, index)),
  }));
}

function pickRandom(list) {
  if (!list.length) return "";
  return list[Math.floor(Math.random() * list.length)];
}

function shuffled(list) {
  const result = [...list];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }
  return result;
}

function combineActivitySentences() {
  syncFromInputs();
  const basisExamples = (state.basisExamples || []).map(normalizeBasisEntry);
  if (!basisExamples.length) {
    Harness.showToast("먼저 영역별 예시문장을 생성하세요.", "error");
    return;
  }

  const activityBasisPairs = getSelectedActivitiesWithOfficer().map((activity, index) => ({
    activity,
    basis: basisExamples.find((entry) => entry.id === activity.id) || basisExamples[index],
  }));
  const result = [];
  for (let i = 0; i < state.combinedCount; i += 1) {
    const parts = shuffled(activityBasisPairs)
      .map(({ basis }) => pickRandom(entrySentences(basis)))
      .filter(Boolean);

    if (parts.length) result.push(parts.join(" "));
  }

  state.combinedSentences = result;
  persist();
  renderCombined();
  Harness.showToast("종합 예시문장을 조합했습니다.");
}

function mockExamples(payload) {
  const activities = payload.activityBasis?.length ? payload.activityBasis : [{ id: "default", title: "자율·자치활동", category: "자율·자치활동" }];
  return {
    basis_examples: mockBasisExamples(payload, activities),
  };
}

async function generateExamples() {
  const activities = getSelectedActivitiesWithOfficer();
  const payload = {
    schoolYear: state.schoolYear,
    grade: state.grade,
    semester: state.semester,
    counts: {
      basis: state.basisCount,
      combined: state.combinedCount,
    },
    activityBasis: activities,
    officer: {
      enabled: state.officerEnabled,
      term: state.officerTerm,
      type: state.officerType,
      title: state.officerTitle,
      period: state.officerPeriod,
    },
  };

  els.generateBtn.disabled = true;
  els.generateBtn.textContent = "생성 중...";
  state.combinedSentences = [];
  renderCombined();

  try {
    const response = await fetch("/api/generate-activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const json = await response.json();
    state.basisExamples = (json.basis_examples || json.basisExamples || []).map(normalizeBasisEntry);
    state.combinedSentences = [];
    persist();
    renderBasisResults();
    renderCombined();
    renderMetaOnly();
    Harness.showToast(json.mock ? "샘플 영역별 예시문장을 생성했습니다." : "영역별 예시문장을 생성했습니다.");
  } catch (_error) {
    const mock = mockExamples(payload);
    state.basisExamples = mock.basis_examples.map(normalizeBasisEntry);
    state.combinedSentences = [];
    persist();
    renderBasisResults();
    renderCombined();
    renderMetaOnly();
    Harness.showToast("로컬 샘플 영역별 예시문장을 생성했습니다.");
  } finally {
    els.generateBtn.disabled = false;
    els.generateBtn.textContent = "1. 영역별 예시문장 생성";
  }
}

function resetActivitySelection() {
  state.activityId = "";
  state.activityIds = [];
  resetGeneratedResults();
}

function bindEvents() {
  [
    els.schoolYear,
    els.combinedCount,
    els.officerEnabled,
    els.finalText,
  ].forEach((el) => {
    el.addEventListener("input", syncFromInputs);
    el.addEventListener("change", syncFromInputs);
  });

  [
    els.basisCount,
    els.officerType,
    els.officerTitle,
    els.officerPeriod,
  ].forEach((el) => {
    el.addEventListener("input", () => {
      resetGeneratedResults();
      syncFromInputs();
      render();
    });
    el.addEventListener("change", () => {
      resetGeneratedResults();
      syncFromInputs();
      render();
    });
  });

  els.grade.addEventListener("change", () => {
    state.grade = els.grade.value;
    resetActivitySelection();
    syncFromInputs();
    render();
  });

  els.semesterToggle.addEventListener("click", (event) => {
    const button = event.target.closest("[data-semester]");
    if (!button || button.dataset.semester === state.semester) return;
    state.semester = button.dataset.semester;
    resetActivitySelection();
    persist();
    render();
  });

  els.officerTerm.addEventListener("change", () => {
    els.officerPeriod.value = TERM_PERIODS[els.officerTerm.value];
    resetGeneratedResults();
    syncFromInputs();
    render();
  });

  els.form.addEventListener("submit", (event) => {
    event.preventDefault();
    syncFromInputs();
    generateExamples();
  });

  els.combineBtn.addEventListener("click", combineActivitySentences);

  els.sampleBtn.addEventListener("click", () => {
    setState({
      grade: "4",
      semester: "1",
      activityId: "",
      activityIds: [],
      basisCount: 3,
      combinedCount: 5,
      officerEnabled: true,
      officerTerm: "1학기",
      officerType: "학급",
      officerTitle: "부회장",
      officerPeriod: TERM_PERIODS["1학기"],
      basisExamples: [],
      combinedSentences: [],
    });
    Harness.showToast("샘플 입력을 채웠습니다.");
  });

  els.clearBtn.addEventListener("click", () => {
    Harness.clearState(STORAGE_KEY);
    state = { ...fallbackState };
    render();
    Harness.showToast("자율·자치활동 저장 데이터를 초기화했습니다.");
  });

  els.copyFinalBtn.addEventListener("click", async () => {
    syncFromInputs();
    const ok = await Harness.copyText(state.finalText);
    Harness.showToast(
      ok ? "최종 문장을 복사했습니다." : "복사에 실패했습니다. 문장을 직접 선택해 복사하세요.",
      ok ? "success" : "error"
    );
  });

  Harness.bindFinalAppendButton(els.appendFinalBtn, els.finalText, (value) => {
    state.finalText = value;
    renderMetaOnly();
    persist();
  });
}

async function init() {
  normalizeSavedState();
  const response = await fetch("./data/activity-themes.json");
  const json = await response.json();
  themes = json[state.schoolYear] || { common: [], byGrade: {} };
  bindEvents();
  render();
}

init().catch((error) => {
  els.basisResults.innerHTML = `<p class="neis-note">영역 데이터를 불러오지 못했습니다. ${error.message}</p>`;
});

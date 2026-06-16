const STORAGE_KEY = "gdneis.activity.state";

const TERM_PERIODS = {
  "1학기": "2026.03.01.-2026.08.18.",
  "2학기": "2026.08.19.-2027.02.11.",
  "1년": "2026.03.01.-2027.02.11.",
};

const LEVELS = [
  { key: "excellent", title: "상 예시문장", field: "excellent_sentences" },
  { key: "good", title: "중 예시문장", field: "good_sentences" },
  { key: "effort", title: "하 예시문장", field: "effort_sentences" },
];

const MAX_COMBINED_SENTENCES = 4;

const fallbackState = {
  schoolYear: "2026",
  grade: "4",
  semester: "1",
  activityId: "",
  activityIds: [],
  excellent: 3,
  good: 3,
  effort: 3,
  officerEnabled: false,
  officerTerm: "1학기",
  officerType: "학급",
  officerTitle: "회장",
  officerPeriod: TERM_PERIODS["1학기"],
  examplesByLevel: {
    excellent_sentences: [],
    good_sentences: [],
    effort_sentences: [],
  },
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
  excellent: document.getElementById("excellent-count"),
  good: document.getElementById("good-count"),
  effort: document.getElementById("effort-count"),
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

function normalizeSavedState() {
  if (!Array.isArray(state.activityIds)) {
    state.activityIds = state.activityId ? [state.activityId] : [];
  }
  if (!["1", "2"].includes(state.semester)) state.semester = fallbackState.semester;
  if (!TERM_PERIODS[state.officerTerm]) state.officerTerm = "1학기";
  if (!["학급", "학년", "전교"].includes(state.officerType)) state.officerType = "학급";
  if (!state.officerTitle || /[?�]/.test(state.officerTitle)) state.officerTitle = "회장";
  if (!state.officerPeriod || /[?�]/.test(state.officerPeriod)) state.officerPeriod = TERM_PERIODS[state.officerTerm];

  state.excellent = Number.parseInt(state.excellent, 10) || fallbackState.excellent;
  state.good = Number.parseInt(state.good, 10) || fallbackState.good;
  state.effort = Number.parseInt(state.effort, 10) || fallbackState.effort;

  if (!state.examplesByLevel) {
    state.examplesByLevel = { ...fallbackState.examplesByLevel };
  }

  if (Array.isArray(state.suggestions) && state.suggestions.length && !state.examplesByLevel.excellent_sentences?.length) {
    state.examplesByLevel = {
      excellent_sentences: state.suggestions,
      good_sentences: [],
      effort_sentences: [],
    };
  }
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
  return selected.length ? selected : activities.slice(0, 1);
}

function buildOfficerActivity() {
  if (!state.officerEnabled) return null;
  const label = `${state.grade}학년: ${state.officerTerm} ${state.officerType} ${state.officerTitle}(${state.officerPeriod})`;
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

function countFromInput(el, fallback) {
  return Math.max(Number.parseInt(el.value, 10) || fallback, 0);
}

function syncFromInputs() {
  state.schoolYear = els.schoolYear.value;
  state.grade = els.grade.value;
  state.excellent = countFromInput(els.excellent, fallbackState.excellent);
  state.good = countFromInput(els.good, fallbackState.good);
  state.effort = countFromInput(els.effort, fallbackState.effort);
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

function renderActivities() {
  const activities = getActivities();
  const availableIds = new Set(activities.map((item) => item.id));
  state.activityIds = state.activityIds.filter((id) => availableIds.has(id));

  if (!state.activityIds.length && activities[0]) {
    state.activityIds = [activities[0].id];
  }
  state.activityId = state.activityIds[0] || "";

  els.activityList.innerHTML = "";

  if (!activities.length) {
    els.activityList.innerHTML = '<p class="neis-note">선택한 학년·학기에 등록된 활동 근거가 없습니다.</p>';
    return;
  }

  activities.forEach((item) => {
    const label = document.createElement("label");
    label.className = `choice-item ${state.activityIds.includes(item.id) ? "active" : ""}`;
    label.innerHTML = `
      <input type="checkbox" value="${item.id}" ${state.activityIds.includes(item.id) ? "checked" : ""}>
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
    if (!state.officerPeriod) state.officerPeriod = TERM_PERIODS[state.officerTerm];
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
    els.combinedList.innerHTML = "<p class=\"neis-note\">근거별 예시문장 생성 후 종합 예시문장 조합 버튼을 누르세요.</p>";
    return;
  }

  const activities = getSelectedActivitiesWithOfficer().slice(0, MAX_COMBINED_SENTENCES);
  combinedSentences.forEach((sentence, index) => {
    if (activities[index]) {
      const label = document.createElement("div");
      label.className = "level-title";
      label.textContent = activities[index].title;
      els.combinedList.appendChild(label);
    }
    els.combinedList.appendChild(renderExampleItem(sentence));
  });
}

function renderBasisResults() {
  els.basisResults.innerHTML = "";
  const basisExamples = state.basisExamples || [];

  if (!basisExamples.length) {
    els.basisResults.innerHTML = "<p class=\"neis-note\">근거별 예시문장 생성 버튼을 누르면 선택한 활동 근거별 문장이 표시됩니다.</p>";
    return;
  }

  basisExamples.forEach((entry, index) => {
    const hasSentences = LEVELS.some((level) => (entry[level.field] || []).length);
    if (!hasSentences) return;

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
    LEVELS.forEach((level) => {
      const sentences = entry[level.field] || [];
      if (!sentences.length) return;
      body.insertAdjacentHTML("beforeend", `<div class="level-title">${level.title}</div>`);
      sentences.forEach((sentence) => body.appendChild(renderExampleItem(sentence)));
    });

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
    els.activityBasis.textContent = `${termLabel} 근거 - ${els.activityBasis.textContent}`;
  }
  els.officerFields.classList.toggle("hidden", !state.officerEnabled);
  els.generateBtn.textContent = "1. 근거별 예시문장 생성";
  els.combineBtn.disabled = !(state.basisExamples || []).length;
  els.byteCount.textContent = `${Harness.byteLength(state.finalText)} Byte`;
}

function render() {
  els.schoolYear.value = state.schoolYear;
  els.grade.value = state.grade;
  els.excellent.value = state.excellent;
  els.good.value = state.good;
  els.effort.value = state.effort;
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

function mockSentence(payload, item, level, variant) {
  const term = `${payload.semester}학기`;

  if (item?.id === "__officer") {
    const officer = `${payload.grade}학년: ${payload.officer.term} ${payload.officer.type} ${payload.officer.title}(${payload.officer.period})`;
    const excellent = [
      `${officer}으로 활동하며 ${term} 학급회의 진행과 의견 조율에 책임감을 가지고 참여하여 공동체 의사결정이 원활하게 이루어지도록 기여함.`,
      `${officer}으로 활동하며 ${term} 학급 구성원의 의견을 경청하고 필요한 역할을 스스로 찾아 실천하는 등 자치활동에서 리더십을 발휘함.`,
      `${officer}으로 활동하며 ${term} 학급 공동체의 약속 실천을 돕고 친구들이 자율적으로 참여할 수 있도록 차분히 이끄는 모습이 돋보임.`,
    ];
    const good = [
      `${officer}으로 활동하며 ${term} 학급 자치활동에 성실히 참여하고 맡은 역할을 꾸준히 수행함.`,
      `${officer}으로 활동하며 ${term} 회의와 공동체 활동에서 친구들의 의견을 듣고 학급 운영에 필요한 역할을 수행함.`,
    ];
    const effort = [
      `${officer}으로 활동하며 임원 역할을 이해하고 ${term} 학급 공동체 활동에 참여하려고 노력함.`,
      `${officer}으로 활동하며 ${term} 안내에 따라 회의와 학급 활동에서 자신의 역할을 실천하려는 태도를 보임.`,
    ];
    return { excellent, good, effort }[level][variant % { excellent, good, effort }[level].length];
  }

  const title = item?.title || "자율·자치활동";
  const excellent = [
    `${term} ${title} 과정에서 활동의 취지를 이해하고 친구들의 의견을 조율하며 공동의 문제 해결에 적극적으로 참여함.`,
    `${term} ${title}에 주도적으로 참여하여 학급 공동체의 약속을 실천하고 활동이 원활하게 이루어지도록 기여함.`,
    `${term} ${title}에서 맡은 역할을 책임감 있게 수행하고 친구들과 협력하여 배운 점을 실천으로 연결함.`,
  ];
  const good = [
    `${term} ${title} 과정에 꾸준히 참여하며 친구의 의견을 듣고 자신의 생각을 차분히 표현함.`,
    `${term} ${title}에서 맡은 역할을 성실히 수행하고 공동체 활동에 필요한 규칙과 약속을 실천함.`,
    `${term} ${title}에 관심을 가지고 참여하며 활동 내용을 이해하고 친구들과 함께 실천함.`,
  ];
  const effort = [
    `${term} ${title}의 활동 내용을 이해하고 안내에 따라 공동체 활동에 참여하려고 노력함.`,
    `${term} ${title} 과정에서 친구들과 함께하는 활동에 관심을 가지고 자신의 역할을 찾아감.`,
    `${term} ${title}에 참여하며 학급의 약속과 활동 절차를 이해하고 실천하려는 태도를 보임.`,
  ];
  return { excellent, good, effort }[level][variant % { excellent, good, effort }[level].length];
}

function mockSentencesForLevel(payload, level, count, officerBudget = null) {
  const activities = payload.activityBasis?.length ? payload.activityBasis : [{ title: "자율·자치활동" }];
  return Array.from({ length: count }, (_, index) => {
    const officerItem = activities.find((item) => item?.id === "__officer");
    const regularItems = activities.filter((item) => item?.id !== "__officer");
    const canUseOfficer = officerItem && (!officerBudget || officerBudget.remaining > 0);
    const cycleItems = canUseOfficer ? [...regularItems, officerItem] : regularItems;
    const safeItems = cycleItems.length ? cycleItems : activities;
    const item = safeItems[index % safeItems.length];
    const variant = Math.floor(index / safeItems.length);
    if (item?.id === "__officer" && officerBudget) officerBudget.remaining -= 1;
    return mockSentence(payload, item, level, variant);
  });
}

function distributeCount(total, itemCount) {
  if (!itemCount) return [];
  const base = Math.floor(total / itemCount);
  const remainder = total % itemCount;
  return Array.from({ length: itemCount }, (_, index) => base + (index < remainder ? 1 : 0));
}

function mockBasisLevelSentences(payload, item, level, count, officerBudget) {
  if (!count || count < 1) return [];
  if (item.id === "__officer") {
    const usable = Math.min(count, officerBudget.remaining);
    officerBudget.remaining -= usable;
    return Array.from({ length: usable }, (_, index) => mockSentence(payload, item, level, index));
  }
  return Array.from({ length: count }, (_, index) => mockSentence(payload, item, level, index));
}

function mockBasisExamples(payload, activities) {
  const excellentCounts = distributeCount(payload.counts.excellent, activities.length);
  const goodCounts = distributeCount(payload.counts.good, activities.length);
  const effortCounts = distributeCount(payload.counts.effort, activities.length);
  const officerBudget = { remaining: payload.officer?.enabled ? 2 : Number.POSITIVE_INFINITY };
  return activities.map((activity, index) => ({
    ...activity,
    excellent_sentences: mockBasisLevelSentences(payload, activity, "excellent", excellentCounts[index], officerBudget),
    good_sentences: mockBasisLevelSentences(payload, activity, "good", goodCounts[index], officerBudget),
    effort_sentences: mockBasisLevelSentences(payload, activity, "effort", effortCounts[index], officerBudget),
  }));
}

function pickRandom(list) {
  if (!list.length) return "";
  return list[Math.floor(Math.random() * list.length)];
}

function combineActivitySentences() {
  syncFromInputs();
  const basisExamples = state.basisExamples || [];
  if (!basisExamples.length) {
    Harness.showToast("먼저 근거별 예시문장을 생성하세요.", "error");
    return;
  }

  const activities = getSelectedActivitiesWithOfficer().slice(0, MAX_COMBINED_SENTENCES);
  const result = activities.map((activity, index) => {
    const basis = basisExamples.find((entry) => entry.id === activity.id) || basisExamples[index];
    if (!basis) return "";

    const parts = LEVELS
      .map((level) => pickRandom(basis[level.field] || []))
      .filter(Boolean);

    return parts.join(" ");
  }).filter(Boolean);

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
      excellent: state.excellent,
      good: state.good,
      effort: state.effort,
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
    state.examplesByLevel = {
      excellent_sentences: json.excellent_sentences || json.examplesByLevel?.excellent_sentences || [],
      good_sentences: json.good_sentences || json.examplesByLevel?.good_sentences || [],
      effort_sentences: json.effort_sentences || json.examplesByLevel?.effort_sentences || [],
    };
    state.basisExamples = json.basis_examples || json.basisExamples || [];
    state.combinedSentences = [];
    persist();
    renderBasisResults();
    renderCombined();
    renderMetaOnly();
    Harness.showToast(json.mock ? "샘플 근거별 예시문장을 생성했습니다." : "근거별 예시문장을 생성했습니다.");
  } catch (_error) {
    const mock = mockExamples(payload);
    state.examplesByLevel = { ...fallbackState.examplesByLevel };
    state.basisExamples = mock.basis_examples;
    state.combinedSentences = [];
    persist();
    renderBasisResults();
    renderCombined();
    renderMetaOnly();
    Harness.showToast("로컬 샘플 근거별 예시문장을 생성했습니다.");
  } finally {
    els.generateBtn.disabled = false;
    els.generateBtn.textContent = "1. 근거별 예시문장 생성";
  }
}

function resetActivitySelection() {
  state.activityId = "";
  state.activityIds = [];
  state.examplesByLevel = { ...fallbackState.examplesByLevel };
  state.basisExamples = [];
  state.combinedSentences = [];
}

function bindEvents() {
  [
    els.schoolYear,
    els.excellent,
    els.good,
    els.effort,
    els.officerEnabled,
    els.officerType,
    els.officerTitle,
    els.officerPeriod,
    els.finalText,
  ].forEach((el) => {
    el.addEventListener("input", syncFromInputs);
    el.addEventListener("change", syncFromInputs);
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
      excellent: 3,
      good: 3,
      effort: 3,
      officerEnabled: true,
      officerTerm: "1학기",
      officerType: "학급",
      officerTitle: "부회장",
      officerPeriod: TERM_PERIODS["1학기"],
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
  els.basisResults.innerHTML = `<p class="neis-note">활동 근거 데이터를 불러오지 못했습니다. ${error.message}</p>`;
});

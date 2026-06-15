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
  sampleBtn: document.getElementById("sample-btn"),
  clearBtn: document.getElementById("clear-btn"),
  finalText: document.getElementById("final-text"),
  byteCount: document.getElementById("byte-count"),
  copyFinalBtn: document.getElementById("copy-final-btn"),
  resultList: document.getElementById("result-list"),
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
}

function appendExample(sentence, item) {
  const current = els.finalText.value.trim();
  state.finalText = current ? `${current} ${sentence}` : sentence;
  els.finalText.value = state.finalText;
  els.finalText.focus();
  els.finalText.setSelectionRange(state.finalText.length, state.finalText.length);
  renderMetaOnly();
  persist();

  Harness.copyText(state.finalText).then((ok) => {
    if (ok) {
      item.classList.add("clicked");
      window.setTimeout(() => item.classList.remove("clicked"), 900);
      Harness.showToast("예시문장을 이어 붙이고 최종 문장 전체를 복사했습니다.");
    } else {
      Harness.showToast("복사에 실패했습니다. 문장을 직접 선택해 복사하세요.", "error");
    }
  });
}

function renderExampleItem(sentence) {
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

  item.append(text, button);
  item.addEventListener("click", () => appendExample(sentence, item));
  item.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      appendExample(sentence, item);
    }
  });
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    appendExample(sentence, item);
  });
  return item;
}

function renderExamples() {
  els.resultList.innerHTML = "";
  const examples = state.examplesByLevel || {};
  const total = LEVELS.reduce((sum, level) => sum + (examples[level.field] || []).length, 0);

  if (!total) {
    els.resultList.innerHTML = '<p class="neis-note">AI 예시문장 생성 버튼을 누르면 선택한 학년·학기 근거에 맞는 예시문장을 제시합니다.</p>';
    return;
  }

  LEVELS.forEach((level) => {
    const sentences = examples[level.field] || [];
    if (!sentences.length) return;

    const group = document.createElement("div");
    group.className = "domain-card open";

    const header = document.createElement("button");
    header.type = "button";
    header.className = "domain-header";
    header.textContent = level.title;
    header.addEventListener("click", () => group.classList.toggle("open"));

    const body = document.createElement("div");
    body.className = "domain-body";
    sentences.forEach((sentence) => body.appendChild(renderExampleItem(sentence)));

    group.append(header, body);
    els.resultList.appendChild(group);
  });
}

function renderMetaOnly() {
  const activities = getSelectedActivities();
  const termLabel = `${state.semester}학기`;
  els.activityBasis.textContent = activities
    .map((item) => `${item.title}: ${item.basis}`)
    .join(" / ");
  if (els.activityBasis.textContent) {
    els.activityBasis.textContent = `${termLabel} 근거 - ${els.activityBasis.textContent}`;
  }
  els.officerFields.classList.toggle("hidden", !state.officerEnabled);
  els.generateBtn.textContent = state.officerEnabled ? "임원 예시문장 생성" : "AI 예시문장 생성";
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
  renderExamples();
  renderMetaOnly();
}

function mockExamples(payload) {
  const activity = payload.activityBasis?.[0]?.title || "자율·자치활동";
  const term = `${payload.semester}학기`;

  if (payload.officer?.enabled) {
    const officer = `${payload.grade}학년: ${payload.officer.term} ${payload.officer.type} ${payload.officer.title}(${payload.officer.period})`;
    return {
      excellent_sentences: [`${officer}으로 활동하며 ${term} ${activity}에서 친구들의 의견을 경청하고 회의가 원활하게 이루어지도록 맡은 역할을 책임감 있게 수행함.`],
      good_sentences: [`${officer}으로 활동하며 ${term} 공동체 활동에 책임감을 가지고 참여하고 맡은 역할을 성실히 수행함.`],
      effort_sentences: [`${officer}으로 활동하며 임원 역할을 이해하고 ${term} 학급 공동체 활동에 참여하려고 노력함.`],
    };
  }

  return {
    excellent_sentences: [
      `${term} ${activity} 과정에서 활동의 취지를 이해하고 친구들의 의견을 조율하며 공동의 문제 해결에 적극적으로 참여함.`,
      `${term} ${activity}에 주도적으로 참여하여 학급 공동체의 약속을 실천하고 활동이 원활하게 이루어지도록 기여함.`,
      `${term} ${activity}에서 맡은 역할을 책임감 있게 수행하고 친구들과 협력하여 배운 점을 실천으로 연결함.`,
    ].slice(0, payload.counts.excellent),
    good_sentences: [
      `${term} ${activity} 과정에 꾸준히 참여하며 친구의 의견을 듣고 자신의 생각을 차분히 표현함.`,
      `${term} ${activity}에서 맡은 역할을 성실히 수행하고 공동체 활동에 필요한 규칙과 약속을 실천함.`,
      `${term} ${activity}에 관심을 가지고 참여하며 활동 내용을 이해하고 친구들과 함께 실천함.`,
    ].slice(0, payload.counts.good),
    effort_sentences: [
      `${term} ${activity}의 활동 내용을 이해하고 안내에 따라 공동체 활동에 참여하려고 노력함.`,
      `${term} ${activity} 과정에서 친구들과 함께하는 활동에 관심을 가지고 자신의 역할을 찾아감.`,
      `${term} ${activity}에 참여하며 학급의 약속과 활동 절차를 이해하고 실천하려는 태도를 보임.`,
    ].slice(0, payload.counts.effort),
  };
}

async function generateExamples() {
  const activities = getSelectedActivities();
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

  try {
    const response = await fetch("/api/generate-activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const json = await response.json();
    const examplesByLevel = {
      excellent_sentences: json.excellent_sentences || json.examplesByLevel?.excellent_sentences || [],
      good_sentences: json.good_sentences || json.examplesByLevel?.good_sentences || [],
      effort_sentences: json.effort_sentences || json.examplesByLevel?.effort_sentences || [],
    };
    setState({ examplesByLevel });
    Harness.showToast(json.mock ? "샘플 예시문장을 생성했습니다." : "특기사항 예시문장을 생성했습니다.");
  } catch (_error) {
    setState({ examplesByLevel: mockExamples(payload) });
    Harness.showToast("로컬 샘플 예시문장을 생성했습니다.");
  } finally {
    els.generateBtn.disabled = false;
    renderMetaOnly();
  }
}

function resetActivitySelection() {
  state.activityId = "";
  state.activityIds = [];
  state.examplesByLevel = { ...fallbackState.examplesByLevel };
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
  els.resultList.innerHTML = `<p class="neis-note">활동 근거 데이터를 불러오지 못했습니다. ${error.message}</p>`;
});

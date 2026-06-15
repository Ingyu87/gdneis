const STORAGE_KEY = "gdneis.activity.state";

const PARTICIPATION_STYLES = [
  "주도적으로 참여함",
  "꾸준히 참여함",
  "의견을 제안함",
  "친구와 협력함",
  "맡은 역할을 책임감 있게 수행함",
  "발표함",
  "자료를 정리함",
  "실천 활동에 참여함"
];

const TERM_PERIODS = {
  "1학기": "2026.03.01.-2026.08.18.",
  "2학기": "2026.08.19.-2027.02.11."
};

const fallbackState = {
  schoolYear: "2026",
  grade: "4",
  activityId: "",
  activityIds: [],
  participationStyles: [],
  officerEnabled: false,
  officerTerm: "1학기",
  officerType: "학급",
  officerTitle: "회장",
  officerPeriod: TERM_PERIODS["1학기"],
  suggestions: [],
  finalText: ""
};

let state = Harness.loadState(STORAGE_KEY, fallbackState);
let themes = { common: [], byGrade: {} };

const els = {
  form: document.getElementById("activity-form"),
  schoolYear: document.getElementById("school-year"),
  grade: document.getElementById("grade-select"),
  activityList: document.getElementById("activity-list"),
  activityBasis: document.getElementById("activity-basis"),
  styleChips: document.getElementById("style-chips"),
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
  resultList: document.getElementById("result-list")
};

const persist = Harness.debounce(() => Harness.saveState(STORAGE_KEY, state), 200);

if (!Array.isArray(state.activityIds)) {
  state.activityIds = state.activityId ? [state.activityId] : [];
}

function getActivities() {
  const common = themes.common.filter((item) => item.grades.includes(state.grade));
  const gradeSpecific = themes.byGrade[state.grade] || [];
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

function syncFromInputs() {
  state.schoolYear = els.schoolYear.value;
  state.grade = els.grade.value;
  state.officerEnabled = els.officerEnabled.checked;
  state.officerTerm = els.officerTerm.value;
  state.officerType = els.officerType.value;
  state.officerTitle = els.officerTitle.value;
  state.officerPeriod = els.officerPeriod.value;
  state.finalText = els.finalText.value;
  persist();
  renderMetaOnly();
}

function renderActivities() {
  const activities = getActivities();
  const availableIds = new Set(activities.map((item) => item.id));
  state.activityIds = state.activityIds.filter((id) => availableIds.has(id));
  if (!state.activityIds.length && activities[0]) {
    state.activityIds = [activities[0].id];
  }

  els.activityList.innerHTML = "";
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

function renderChips() {
  els.styleChips.innerHTML = "";
  PARTICIPATION_STYLES.forEach((style) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `chip ${state.participationStyles.includes(style) ? "active" : ""}`;
    button.textContent = style;
    button.addEventListener("click", () => {
      const selected = new Set(state.participationStyles);
      if (selected.has(style)) selected.delete(style);
      else selected.add(style);
      setState({ participationStyles: Array.from(selected) });
    });
    els.styleChips.appendChild(button);
  });
}

function renderSuggestions() {
  els.resultList.innerHTML = "";
  if (!state.suggestions.length) {
    els.resultList.innerHTML = '<p class="neis-note">AI 특기사항 생성 버튼을 누르면 후보 문장이 표시됩니다.</p>';
    return;
  }

  state.suggestions.forEach((sentence) => {
    const item = document.createElement("div");
    item.className = "result-item";
    item.textContent = sentence;
    item.addEventListener("click", async () => {
      const current = state.finalText.trim();
      state.finalText = current ? `${current}\n${sentence}` : sentence;
      els.finalText.value = state.finalText;
      renderMetaOnly();
      persist();
      const ok = await Harness.copyText(state.finalText);
      if (ok) {
        Harness.markCopied(item);
        Harness.showToast("후보 문장을 이어 붙이고 최종 문장 전체를 복사했습니다.");
      } else {
        Harness.showToast("복사에 실패했습니다. 문장을 직접 선택해 복사하세요.", "error");
      }
    });
    els.resultList.appendChild(item);
  });
}

function renderMetaOnly() {
  const activities = getSelectedActivities();
  els.activityBasis.textContent = activities.map((item) => `${item.title}: ${item.basis}`).join(" / ");
  els.officerFields.classList.toggle("hidden", !state.officerEnabled);
  els.byteCount.textContent = `${Harness.byteLength(state.finalText)} Byte`;
}

function render() {
  els.schoolYear.value = state.schoolYear;
  els.grade.value = state.grade;
  renderActivities();
  els.officerEnabled.checked = state.officerEnabled;
  els.officerTerm.value = state.officerTerm;
  els.officerType.value = state.officerType;
  els.officerTitle.value = state.officerTitle;
  els.officerPeriod.value = state.officerPeriod;
  els.finalText.value = state.finalText;
  renderChips();
  renderSuggestions();
  renderMetaOnly();
}

function mockSuggestions(payload) {
  const activity = payload.activityBasis?.map((item) => item.title).join(", ") || "자율·자치활동";
  const styles = payload.participationStyles?.join(", ") || "꾸준히 참여함";
  const officer = payload.officer?.enabled
    ? ` ${payload.grade}학년 ${payload.officer.term} ${payload.officer.type} ${payload.officer.title}(${payload.officer.period})로 활동하며`
    : "";

  return [
    `${activity}에 ${styles}의 태도로 참여하고 공동의 활동이 원활히 이루어지도록 기여함.`,
    `${activity} 과정에서 친구들의 의견을 경청하고 자신의 생각을 조리 있게 제안하며 협력적인 태도를 보임.`,
    `${activity}에 책임감 있게 참여하며 맡은 일을 끝까지 수행하고 학급 공동체 활동에 성실히 기여함.`,
    `${activity}에서${officer} 친구들과 함께 문제를 해결하려는 태도를 보이고 공동체 의식을 기름.`,
    `${activity}에 적극적으로 참여하며 활동 과정에서 배려와 소통의 태도를 실천하고 자신의 역할을 충실히 수행함.`
  ];
}

async function generateSuggestions() {
  const activities = getSelectedActivities();
  const payload = {
    schoolYear: state.schoolYear,
    grade: state.grade,
    activityBasis: activities,
    participationStyles: state.participationStyles,
    officer: {
      enabled: state.officerEnabled,
      term: state.officerTerm,
      type: state.officerType,
      title: state.officerTitle,
      period: state.officerPeriod
    }
  };

  els.generateBtn.disabled = true;
  els.generateBtn.textContent = "생성 중...";

  try {
    const response = await fetch("/api/generate-activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    const suggestions = Array.isArray(json.suggestions) ? json.suggestions : [];
    setState({ suggestions });
    Harness.showToast(json.mock ? "샘플 후보를 생성했습니다." : "특기사항 후보를 생성했습니다.");
  } catch (_error) {
    setState({ suggestions: mockSuggestions(payload) });
    Harness.showToast("로컬 샘플 후보를 생성했습니다.");
  } finally {
    els.generateBtn.disabled = false;
    els.generateBtn.textContent = "AI 특기사항 생성";
  }
}

function bindEvents() {
  [
    els.schoolYear,
    els.officerEnabled,
    els.officerType,
    els.officerTitle,
    els.officerPeriod,
    els.finalText
  ].forEach((el) => {
    el.addEventListener("input", syncFromInputs);
    el.addEventListener("change", syncFromInputs);
  });

  els.grade.addEventListener("change", () => {
    state.grade = els.grade.value;
    state.activityId = "";
    state.activityIds = [];
    syncFromInputs();
    render();
  });

  els.officerTerm.addEventListener("change", () => {
    els.officerPeriod.value = TERM_PERIODS[els.officerTerm.value];
    syncFromInputs();
  });

  els.form.addEventListener("submit", (event) => {
    event.preventDefault();
    syncFromInputs();
    generateSuggestions();
  });

  els.sampleBtn.addEventListener("click", () => {
    setState({
      grade: "4",
      participationStyles: ["의견을 제안함", "친구와 협력함", "맡은 역할을 책임감 있게 수행함"],
      officerEnabled: true,
      officerTerm: "1학기",
      officerType: "학급",
      officerTitle: "부회장",
      officerPeriod: TERM_PERIODS["1학기"]
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

  els.finalText.addEventListener("click", async () => {
    syncFromInputs();
    const ok = await Harness.copyText(state.finalText);
    Harness.showToast(
      ok ? "최종 문장을 복사했습니다." : "복사할 문장이 없습니다.",
      ok ? "success" : "error"
    );
  });
}

async function init() {
  const response = await fetch("./data/activity-themes.json");
  const json = await response.json();
  themes = json[state.schoolYear] || { common: [], byGrade: {} };
  bindEvents();
  render();
}

init().catch((error) => {
  els.resultList.innerHTML = `<p class="neis-note">활동 근거 데이터를 불러오지 못했습니다. ${error.message}</p>`;
});

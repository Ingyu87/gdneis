const STORAGE_KEY = "gdneis.behavior.state";

const fallbackState = {
  inputText: "",
  strengths: [],
  coachings: [],
  activeView: "strengths",
  finalText: ""
};

let state = Harness.loadState(STORAGE_KEY, fallbackState);

const els = {
  form: document.getElementById("behavior-form"),
  inputText: document.getElementById("input-text"),
  generateBtn: document.getElementById("generate-btn"),
  sampleBtn: document.getElementById("sample-btn"),
  clearBtn: document.getElementById("clear-btn"),
  tabs: document.querySelectorAll(".neis-subtab"),
  strengthsList: document.getElementById("strengths-list"),
  coachingsList: document.getElementById("coachings-list"),
  finalText: document.getElementById("final-text"),
  byteCount: document.getElementById("byte-count"),
  copyFinalBtn: document.getElementById("copy-final-btn")
};

const persist = Harness.debounce(() => Harness.saveState(STORAGE_KEY, state), 200);

function syncFromInputs() {
  state.inputText = els.inputText.value;
  state.finalText = els.finalText.value;
  persist();
  renderMetaOnly();
}

function mockResults(inputText) {
  const base = inputText || "학교생활 속 여러 활동";
  return {
    strengths: [
      `${base}에서 긍정적인 태도를 보이며 주변 친구들과 협력하려는 마음이 돋보임.`,
      `자신의 관심사를 바탕으로 활동에 참여하고 맡은 일을 성실히 수행하며 성장 가능성을 보임.`,
      `친구의 의견을 경청하고 함께 활동하려는 태도를 지니고 있어 공동체 생활에 안정적으로 참여함.`,
      `수업과 생활 장면에서 자신의 생각을 표현하려고 노력하며 긍정적인 관계 형성에 힘씀.`,
      `주어진 상황에서 도움을 주고받으며 학교생활에 필요한 책임감과 배려심을 키워 감.`
    ],
    coachings: [
      `활동 전 해야 할 일을 스스로 정리하는 습관을 기른다면 참여 태도가 더욱 안정될 것으로 기대됨.`,
      `친구의 의견을 들은 뒤 자신의 생각을 차분히 말하는 경험을 늘린다면 협력적 소통 능력이 향상될 것임.`,
      `과제 수행 시간을 미리 계획하고 끝까지 점검하는 태도를 기른다면 자기관리 역량이 더욱 자랄 것임.`,
      `관심 있는 활동에서 보이는 긍정적인 태도를 다양한 수업 장면으로 넓혀 간다면 더 큰 성장이 기대됨.`,
      `작은 역할부터 책임감 있게 수행하는 경험을 꾸준히 쌓는다면 공동체 안에서 자신감을 키울 수 있을 것임.`
    ]
  };
}

function renderMetaOnly() {
  els.byteCount.textContent = `${Harness.byteLength(state.finalText)} Byte`;
}

function renderList(container, sentences) {
  container.innerHTML = "";
  if (!sentences.length) {
    container.innerHTML = '<p class="neis-note">후보 문장 생성 버튼을 누르면 문장이 표시됩니다.</p>';
    return;
  }

  sentences.forEach((sentence) => {
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
        Harness.showToast("문장을 이어 붙이고 최종 문장 전체를 복사했습니다.");
      } else {
        Harness.showToast("복사에 실패했습니다.", "error");
      }
    });
    container.appendChild(item);
  });
}

function renderTabs() {
  els.tabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.view === state.activeView);
  });
  els.strengthsList.classList.toggle("hidden", state.activeView !== "strengths");
  els.coachingsList.classList.toggle("hidden", state.activeView !== "coachings");
}

function render() {
  els.inputText.value = state.inputText;
  els.finalText.value = state.finalText;
  renderList(els.strengthsList, state.strengths);
  renderList(els.coachingsList, state.coachings);
  renderTabs();
  renderMetaOnly();
}

async function generate() {
  syncFromInputs();
  if (!state.inputText.trim()) {
    Harness.showToast("관찰 문장을 입력하세요.", "error");
    return;
  }

  els.generateBtn.disabled = true;
  els.generateBtn.textContent = "생성 중...";
  try {
    const response = await fetch("/api/generate-behavior", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputText: state.inputText })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    state.strengths = Array.isArray(json.strengths) ? json.strengths : [];
    state.coachings = Array.isArray(json.coachings) ? json.coachings : [];
    if (!state.strengths.length && !state.coachings.length) Object.assign(state, mockResults(state.inputText));
    persist();
    render();
    Harness.showToast(json.mock ? "샘플 후보를 생성했습니다." : "후보 문장을 생성했습니다.");
  } catch (_error) {
    Object.assign(state, mockResults(state.inputText));
    persist();
    render();
    Harness.showToast("로컬 샘플 후보를 생성했습니다.");
  } finally {
    els.generateBtn.disabled = false;
    els.generateBtn.textContent = "후보 문장 생성";
  }
}

async function copyFinal() {
  syncFromInputs();
  const ok = await Harness.copyText(state.finalText);
  Harness.showToast(ok ? "최종 문장을 복사했습니다." : "복사할 문장이 없습니다.", ok ? "success" : "error");
}

function bindEvents() {
  els.inputText.addEventListener("input", syncFromInputs);
  els.finalText.addEventListener("input", syncFromInputs);
  els.finalText.addEventListener("click", copyFinal);
  els.copyFinalBtn.addEventListener("click", copyFinal);
  els.form.addEventListener("submit", (event) => {
    event.preventDefault();
    generate();
  });
  els.sampleBtn.addEventListener("click", () => {
    state.inputText = "수업 중 집중이 짧을 때가 있으나 친구를 잘 도와주고 모둠 활동에 관심을 보임";
    render();
    persist();
    Harness.showToast("샘플 입력을 채웠습니다.");
  });
  els.clearBtn.addEventListener("click", () => {
    Harness.clearState(STORAGE_KEY);
    state = { ...fallbackState };
    render();
    Harness.showToast("행동특성 저장 데이터를 초기화했습니다.");
  });
  els.tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      state.activeView = tab.dataset.view;
      persist();
      renderTabs();
    });
  });
}

bindEvents();
render();

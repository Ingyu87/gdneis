const STORAGE_KEY = "gdneis.behavior.state";
const API_ENDPOINT = "/api/generate-behavior";

const DEFAULT_STATE = {
  inputText: "",
  strengths: [],
  coachings: [],
  activeView: "strengths",
  finalText: "",
};

const SAMPLE_INPUT =
  "수업 시간에 친구의 발표를 경청하고 필요한 내용을 꼼꼼히 기록함. 모둠 활동에서는 맡은 역할을 책임감 있게 수행하려는 태도가 보이며 의견이 다를 때 차분히 조율하려고 노력함. 다만 과제 마감 전 점검이 늦어지는 경우가 있어 계획을 세워 실천하는 연습이 필요함.";

const els = {
  form: document.getElementById("behavior-form"),
  inputText: document.getElementById("input-text"),
  generateBtn: document.getElementById("generate-btn"),
  sampleBtn: document.getElementById("sample-btn"),
  clearBtn: document.getElementById("clear-btn"),
  subtabs: [...document.querySelectorAll(".neis-subtab")],
  strengthsList: document.getElementById("strengths-list"),
  coachingsList: document.getElementById("coachings-list"),
  finalText: document.getElementById("final-text"),
  byteCount: document.getElementById("byte-count"),
  copyFinalBtn: document.getElementById("copy-final-btn"),
  appendFinalBtn: document.getElementById("append-final-btn"),
};

let state = loadState();

function loadState() {
  const saved = Harness.loadState(STORAGE_KEY, DEFAULT_STATE);
  return { ...DEFAULT_STATE, ...saved };
}

function persist() {
  Harness.saveState(STORAGE_KEY, state);
}

function setLoading(isLoading) {
  els.generateBtn.disabled = isLoading;
  els.generateBtn.textContent = isLoading ? "생성 중..." : "예시문장 생성";
}

function updateByteCount() {
  els.byteCount.textContent = `${Harness.byteLength(els.finalText.value)} Byte`;
}

function renderTabs() {
  els.subtabs.forEach((tab) => {
    const isActive = tab.dataset.view === state.activeView;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });

  els.strengthsList.classList.toggle("hidden", state.activeView !== "strengths");
  els.coachingsList.classList.toggle("hidden", state.activeView !== "coachings");
}

function renderList(target, sentences, emptyText) {
  target.innerHTML = "";

  if (!sentences.length) {
    const empty = document.createElement("p");
    empty.className = "neis-note";
    empty.textContent = emptyText;
    target.appendChild(empty);
    return;
  }

  sentences.forEach((sentence) => {
    target.appendChild(Harness.createResultItem(sentence));
  });
}

function render() {
  els.inputText.value = state.inputText;
  els.finalText.value = state.finalText;
  renderTabs();
  renderList(els.strengthsList, state.strengths, "관찰 내용을 입력하면 강점 중심 예시문장이 표시됩니다.");
  renderList(els.coachingsList, state.coachings, "관찰 내용을 입력하면 성장 코칭 예시문장이 표시됩니다.");
  updateByteCount();
}

function mockResults(inputText) {
  const hasCooperation = /모둠|친구|협력|경청|발표|의견/.test(inputText);
  const hasResponsibility = /과제|기록|준비|책임|역할|마감/.test(inputText);

  const strengths = [
    hasCooperation
      ? "친구의 의견을 경청하고 필요한 내용을 차분히 정리하며 공동 활동에 안정적으로 참여함."
      : "수업과 생활 장면에서 주어진 활동에 성실히 참여하며 자신의 생각을 표현하려는 태도가 돋보임.",
    hasResponsibility
      ? "맡은 역할과 과제를 책임감 있게 수행하려고 노력하며 활동 과정에서 꾸준히 실천하려는 태도를 보임."
      : "학습 활동에 필요한 준비와 참여 태도가 안정적이며 주변 상황을 이해하며 행동하려는 모습을 보임.",
    "의견이 다른 상황에서도 차분히 조율하려고 노력하며 긍정적인 관계 형성에 기여함.",
    "자신에게 주어진 일을 끝까지 해내는 태도를 보이며 학교생활 전반에서 성실한 모습을 확인할 수 있음.",
    "주변 친구들과 원만하게 지내며 학급 활동에 필요한 배려와 책임감을 실천하려는 모습을 보임.",
  ];

  const coachings = [
    "활동 전에 해야 할 일을 몇 가지로 스스로 정리하는 습관을 기른다면 수업과 생활 장면에서 더욱 안정적으로 참여하는 긍정적인 방향으로 변화할 것으로 기대됨.",
    "친구의 말을 끝까지 들은 뒤 자신의 생각을 차분히 말하는 연습을 한다면 협력과 소통 태도가 더욱 긍정적인 방향으로 변화할 것으로 기대됨.",
    "과제 수행 시간을 미리 확인하고 마무리 여부를 스스로 점검하는 습관을 기른다면 자기관리 태도가 더욱 긍정적인 방향으로 변화할 것으로 기대됨.",
    "어려운 상황에서 바로 포기하지 않고 필요한 도움을 요청하거나 다시 시도하는 경험을 늘린다면 문제 해결 태도가 긍정적인 방향으로 변화할 것으로 기대됨.",
    "생활 속 약속을 작은 행동으로 정해 꾸준히 실천하는 습관을 기른다면 학교생활 적응 태도가 더욱 긍정적인 방향으로 변화할 것으로 기대됨.",
  ];

  return { strengths, coachings };
}

async function generateBehavior(event) {
  event.preventDefault();
  const inputText = els.inputText.value.trim();

  if (!inputText) {
    Harness.showToast("관찰 기록을 먼저 입력해 주세요.", "error");
    els.inputText.focus();
    return;
  }

  state.inputText = inputText;
  setLoading(true);

  try {
    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputText }),
    });

    if (!response.ok) {
      throw new Error("API response was not ok");
    }

    const data = await response.json();
    state.strengths = Array.isArray(data.strengths) ? data.strengths : [];
    state.coachings = Array.isArray(data.coachings) ? data.coachings : [];
    Harness.showToast(data.mock ? "샘플 예시문장으로 표시했습니다." : "예시문장을 생성했습니다.");
  } catch (error) {
    console.warn("Using local behavior fallback.", error);
    const fallback = mockResults(inputText);
    state.strengths = fallback.strengths;
    state.coachings = fallback.coachings;
    Harness.showToast("로컬 예시문장으로 표시했습니다.");
  } finally {
    setLoading(false);
    persist();
    render();
  }
}

async function copyFinalText() {
  const value = els.finalText.value.trim();

  if (!value) {
    Harness.showToast("복사할 최종 편집 문장이 없습니다.", "error");
    return;
  }

  const ok = await Harness.copyText(value);
  Harness.showToast(
    ok ? "최종 편집 문장을 복사했습니다." : "복사에 실패했습니다. 문장을 직접 선택해 복사해 주세요.",
    ok ? "success" : "error"
  );
}

els.form.addEventListener("submit", generateBehavior);
els.inputText.addEventListener("input", () => {
  state.inputText = els.inputText.value;
  persist();
});
els.finalText.addEventListener("input", () => {
  state.finalText = els.finalText.value;
  updateByteCount();
  persist();
});
els.copyFinalBtn.addEventListener("click", copyFinalText);
Harness.bindFinalAppendButton(els.appendFinalBtn, els.finalText, (value) => {
  state.finalText = value;
  updateByteCount();
  persist();
});
els.sampleBtn.addEventListener("click", () => {
  state.inputText = SAMPLE_INPUT;
  persist();
  render();
});
els.clearBtn.addEventListener("click", () => {
  state = { ...DEFAULT_STATE };
  persist();
  render();
});
els.subtabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    state.activeView = tab.dataset.view;
    persist();
    renderTabs();
  });
});

render();

(function () {
  const steps = [
    {
      id: "layout",
      label: "화면 구성",
      title: "화면 구성",
      text: "위쪽 탭에서 작업할 기록을 고릅니다. 학기말 종합의견, 자율·자치활동 관리, 행동특성 및 종합의견은 서로 따로 저장됩니다. 오른쪽 위 −와 +로 글씨 크기를 조절하고, 도움말은 언제든 다시 열 수 있습니다.",
      shot: shot(`
        <div class="shot-tabs">
          <span class="shot-tab on">학기말 종합의견</span>
          <span class="shot-tab">자율·자치활동 관리</span>
          <span class="shot-tab">행동특성 및 종합의견</span>
        </div>
        <div class="shot-card">
          <div class="shot-title">학기말 종합의견 작성</div>
          <p class="shot-note">학기를 고른 뒤 학년·과목별 예시문장을 만듭니다.</p>
        </div>
      `)
    },
    {
      id: "semester",
      tab: "comments",
      label: "학기 고르기",
      title: "학기 고르기",
      text: "학기말 종합의견에서 1학기 또는 2학기를 누릅니다. 1학기는 기존 평가계획이고, 2학기는 2026학년도 2학기 전과목 교수·학습 및 평가계획입니다. 학기를 바꾸면 그 학기 과목으로 바뀌고, 만들어 둔 예시문장은 비워집니다.",
      shot: shot(`
        <div class="shot-card">
          <div class="shot-title">학기말 종합의견 작성</div>
          <div class="shot-row">
            <span class="shot-label">학기</span>
            <span class="shot-pill"><span>1학기</span><span class="on">2학기</span></span>
          </div>
          <p class="shot-note">2학기를 누르면 2학기 평가 영역의 성취기준으로 문장을 만듭니다.</p>
        </div>
      `)
    },
    {
      id: "subject",
      tab: "comments",
      label: "학년·과목",
      title: "학년·과목",
      text: "학년을 고르면 그 학년 평가계획에 있는 과목만 나옵니다. 1·2학년은 국어, 수학, 통합이고, 3학년부터는 국어, 사회, 과학처럼 교과가 늘어납니다. 1·2학년 통합은 바른생활, 슬기로운 생활, 즐거운 생활을 나이스에 한 칸으로 넣습니다. 2학기 평가계획에 바른생활 성취기준이 없으면 화면에 안내가 뜨고, 없는 성취기준은 만들지 않습니다. 학년이나 과목을 바꾸면 이전 예시문장은 지워지니, 필요한 문장은 먼저 복사해 두세요.",
      shot: shot(`
        <div class="shot-card">
          <div class="shot-row">
            <span class="shot-label">학기</span>
            <span class="shot-pill"><span>1학기</span><span class="on">2학기</span></span>
            <span class="shot-label"><em>*</em> 학년</span>
            <span class="shot-select">4학년</span>
            <span class="shot-label"><em>*</em> 과목</span>
            <span class="shot-select">국어</span>
          </div>
          <p class="shot-note">4학년 2학기 국어는 문법, 쓰기, 매체, 읽기 영역으로 나뉩니다.</p>
        </div>
      `)
    },
    {
      id: "counts",
      tab: "comments",
      label: "문장 수",
      title: "문장 수",
      text: "상·중·하 문장 수는 영역마다 만들 예시의 개수입니다. 상은 성취기준을 잘 도달한 모습, 중은 기본 내용을 이해하고 참여한 모습, 하는 안내를 받으며 기초를 익히는 모습입니다. 종합 수는 나중에 조합할 종합의견 예시의 개수입니다.",
      shot: shot(`
        <div class="shot-card">
          <div class="shot-row">
            <span class="shot-label">상 문장 수</span><span class="shot-input">3</span>
            <span class="shot-label">중 문장 수</span><span class="shot-input">3</span>
            <span class="shot-label">하 문장 수</span><span class="shot-input">3</span>
            <span class="shot-label">종합 수</span><span class="shot-input">5</span>
          </div>
        </div>
      `)
    },
    {
      id: "domains",
      tab: "comments",
      label: "영역별 문장",
      title: "영역별 문장",
      text: "1. 영역별 예시문장 생성을 누르면 선택한 과목의 평가 영역마다 문장이 나옵니다. 영역 이름을 누르면 접고 펼 수 있습니다. 문장 오른쪽 복사로 한 문장만 가져갈 수 있습니다.",
      shot: shot(`
        <div class="shot-card">
          <div class="shot-row"><span class="shot-btn">1. 영역별 예시문장 생성</span></div>
          <div class="shot-domain">
            <strong>쓰기</strong>
            <p><span class="shot-copy">복사</span>성취기준의 중심 문장과 뒷받침 문장을 갖추어 문단을 쓰고, 문장과 문단을 중심으로 고쳐 씀.</p>
          </div>
        </div>
      `)
    },
    {
      id: "combine",
      tab: "comments",
      label: "종합의견 조합",
      title: "종합의견 조합",
      text: "영역별 문장이 모두 생긴 뒤 2. 종합의견 조합을 누릅니다. 영역마다 문장을 하나씩 뽑아 한 문단으로 잇고, 종합 수만큼 서로 다른 예시를 만듭니다. 조합 결과도 문장마다 복사할 수 있습니다.",
      shot: shot(`
        <div class="shot-card">
          <div class="shot-row">
            <span class="shot-btn">1. 영역별 예시문장 생성</span>
            <span class="shot-btn line">2. 종합의견 조합</span>
          </div>
          <div class="shot-domain">
            <strong>종합의견 조합 예시문장</strong>
            <p><span class="shot-copy">복사</span>문법 영역의 문장과 쓰기, 매체, 읽기 영역의 문장을 한 문단으로 이어 보여 줍니다.</p>
          </div>
        </div>
      `)
    },
    {
      id: "final",
      tab: "comments",
      label: "최종 문장",
      title: "최종 문장",
      text: "복사한 문장은 오른쪽 최종 종합의견에서 이어 붙이기로 넣거나 직접 고칩니다. 아래 바이트 수를 확인한 뒤 최종 종합의견 복사를 눌러 나이스 입력칸에 붙여 넣습니다. 저장 데이터 초기화는 이 탭에 남은 문장과 선택값을 지웁니다.",
      shot: shot(`
        <div class="shot-card">
          <div class="shot-title">최종 종합의견</div>
          <div class="shot-area">복사한 예시를 이어 붙이고, 관찰한 내용으로 고칩니다.</div>
          <p class="shot-note">128 Byte · 예시문장은 복사 후, 최종 종합의견의 이어 붙이기로 추가할 수 있습니다.</p>
          <div class="shot-row">
            <span class="shot-btn line">이어 붙이기</span>
            <span class="shot-btn">최종 종합의견 복사</span>
          </div>
        </div>
      `)
    },
    {
      id: "activity",
      tab: "activity",
      label: "자율·자치활동",
      title: "자율·자치활동",
      text: "자율·자치활동 관리 탭에서 학년도와 학년, 학기를 고르고 영역을 체크합니다. 1. 영역별 예시문장 생성 다음 2. 종합 예시문장 조합을 누르면 체크한 영역을 한 문단으로 잇습니다. 학급임원은 3학년부터 체크할 수 있고, 재임기간은 학교교육계획서 학사일정으로 채워집니다. 1학기는 2026.03.01.-2026.08.18., 2학기는 2026.08.19.-2027.02.11., 1년은 2026.03.01.-2027.02.11.입니다. 진로활동은 나이스의 별도 칸이라 이 탭에서 쓰지 않습니다.",
      shot: shot(`
        <div class="shot-tabs">
          <span class="shot-tab">학기말 종합의견</span>
          <span class="shot-tab on">자율·자치활동 관리</span>
          <span class="shot-tab">행동특성 및 종합의견</span>
        </div>
        <div class="shot-card">
          <div class="shot-row">
            <span class="shot-label"><em>*</em> 학년</span><span class="shot-select">4학년</span>
            <span class="shot-label"><em>*</em> 학기</span>
            <span class="shot-pill"><span class="on">1학기</span><span>2학기</span></span>
          </div>
          <label class="shot-choice"><input type="checkbox" checked disabled><span><b>학급회의하기</b><span>4학년 1학기 자율·자치</span></span></label>
          <label class="shot-choice"><input type="checkbox" disabled><span><b>학급임원 활동</b><span>4학년 1학기 학급 회장(2026.03.01.-2026.08.18.)</span></span></label>
        </div>
      `)
    },
    {
      id: "behavior",
      tab: "behavior",
      label: "행동특성",
      title: "행동특성",
      text: "행동특성 및 종합의견 탭에는 학년 동안 관찰한 모습을 적습니다. 예시문장 생성을 누르면 강점 중심 문장과 성장 코칭 문장이 나옵니다. 위쪽 단추로 두 묶음을 바꿔 보고, 오른쪽 최종 편집 문장에 이어 붙인 뒤 복사합니다. 한 장면의 부족함만 적지 않고, 교과 성취기준이나 학교폭력 조치 문구는 넣지 않습니다.",
      shot: shot(`
        <div class="shot-tabs">
          <span class="shot-tab">학기말 종합의견</span>
          <span class="shot-tab">자율·자치활동 관리</span>
          <span class="shot-tab on">행동특성 및 종합의견</span>
        </div>
        <div class="shot-card">
          <div class="shot-label">관찰 문장</div>
          <div class="shot-area">수업 중 집중이 짧지만 친구를 잘 도와주고 모둠 활동에 관심을 보임</div>
          <div class="shot-subtabs"><span class="on">강점 중심</span><span>성장 코칭</span></div>
          <div class="shot-domain"><p><span class="shot-copy">복사</span>친구를 도우며 모둠 활동에 관심을 보이고 함께하는 장면에서 역할을 맡아 감.</p></div>
        </div>
      `)
    },
    {
      id: "record",
      label: "나이스에 넣기",
      title: "나이스에 넣기",
      text: "나온 문장은 참고용 예시입니다. 학교생활기록부 서술형 항목은 교사가 평소 관찰·평가한 내용으로 쓰는 것이 원칙이므로, 학생의 실제 모습에 맞게 고친 뒤 입력합니다. 대회 참여, 수상, 인증, 방과후학교 내용은 성취수준에 넣지 않습니다. 만든 문장은 이 브라우저에만 남고, 나이스로 자동 전송되지 않습니다.",
      shot: shot(`
        <div class="shot-warn">
          <b>예시문장 안내</b><br>
          본 도구가 생성하는 문장은 참고용 예시문장입니다. 생성된 문장을 그대로 넣지 말고, 관찰한 내용으로 고쳐 기재합니다.
        </div>
      `)
    }
  ];

  function shot(inner) {
    return inner.trim();
  }

  const backdrop = document.createElement("div");
  backdrop.className = "help-backdrop";
  backdrop.hidden = true;
  backdrop.innerHTML = `
    <div class="help-dialog" role="dialog" aria-modal="true" aria-labelledby="help-title">
      <div class="help-head">
        <h2 id="help-title">도움말</h2>
        <button class="help-close" type="button" aria-label="닫기">×</button>
      </div>
      <div class="help-layout">
        <nav class="help-nav" aria-label="도움말 목차"></nav>
        <div class="help-main">
          <p class="help-caption">예시 화면입니다. 화면을 누르면 크게 볼 수 있습니다.</p>
          <button class="help-shot" type="button" aria-label="예시 화면 크게 보기"></button>
          <h3></h3>
          <p class="help-text"></p>
        </div>
      </div>
      <div class="help-foot">
        <button class="help-prev" type="button">이전</button>
        <div class="help-dots"></div>
        <button class="help-next" type="button">다음</button>
      </div>
    </div>
    <div class="help-zoom" hidden>
      <div class="help-zoom-card"></div>
    </div>
  `;
  document.body.appendChild(backdrop);

  const nav = backdrop.querySelector(".help-nav");
  const shotButton = backdrop.querySelector(".help-shot");
  const title = backdrop.querySelector(".help-main h3");
  const text = backdrop.querySelector(".help-text");
  const dots = backdrop.querySelector(".help-dots");
  const prev = backdrop.querySelector(".help-prev");
  const next = backdrop.querySelector(".help-next");
  const zoom = backdrop.querySelector(".help-zoom");
  const zoomCard = backdrop.querySelector(".help-zoom-card");
  const openButton = document.getElementById("help-open");
  let index = 0;
  let lastFocus = null;

  steps.forEach((step, stepIndex) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = step.label;
    button.addEventListener("click", () => show(stepIndex));
    nav.appendChild(button);

    const dot = document.createElement("button");
    dot.type = "button";
    dot.setAttribute("aria-label", `${step.label} 항목`);
    dot.addEventListener("click", () => show(stepIndex));
    dots.appendChild(dot);
  });

  function show(nextIndex) {
    index = Math.max(0, Math.min(steps.length - 1, nextIndex));
    const step = steps[index];
    nav.querySelectorAll("button").forEach((button, buttonIndex) => {
      button.classList.toggle("active", buttonIndex === index);
    });
    dots.querySelectorAll("button").forEach((button, buttonIndex) => {
      button.classList.toggle("active", buttonIndex === index);
    });
    shotButton.innerHTML = step.shot;
    title.textContent = step.title;
    text.textContent = step.text;
    prev.disabled = index === 0;
    next.textContent = index === steps.length - 1 ? "닫기" : "다음";
    nav.querySelectorAll("button")[index].scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  function openHelp(startId) {
    const start = steps.findIndex((step) => step.id === startId);
    lastFocus = document.activeElement;
    backdrop.hidden = false;
    show(start >= 0 ? start : 0);
    backdrop.querySelector(".help-close").focus();
  }

  function closeHelp() {
    zoom.hidden = true;
    backdrop.hidden = true;
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  }

  function startIdForTab() {
    const tab = (location.hash || "").replace("#", "");
    if (tab === "activity") return "activity";
    if (tab === "behavior") return "behavior";
    return "layout";
  }

  openButton.addEventListener("click", () => openHelp(startIdForTab()));
  backdrop.querySelector(".help-close").addEventListener("click", closeHelp);
  prev.addEventListener("click", () => show(index - 1));
  next.addEventListener("click", () => {
    if (index === steps.length - 1) closeHelp();
    else show(index + 1);
  });
  shotButton.addEventListener("click", () => {
    zoomCard.innerHTML = shotButton.innerHTML;
    zoom.hidden = false;
  });
  zoom.addEventListener("click", () => {
    zoom.hidden = true;
  });
  zoomCard.addEventListener("click", (event) => event.stopPropagation());
  document.addEventListener("keydown", (event) => {
    if (backdrop.hidden || event.key !== "Escape") return;
    if (!zoom.hidden) {
      zoom.hidden = true;
      return;
    }
    closeHelp();
  });
})();

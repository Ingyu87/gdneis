# 디자인 시스템 — NEIS UI 기반 통일 가이드

`PLAN.md`의 2장(디자인 시스템)을 구체화한 문서. 사용자가 제공한 나이스(NEIS) "자율·자치활동관리" 화면 캡처를 기준으로 색상·타이포·컴포넌트를 추출하고, 이를 `shared/css/neis-theme.css`로 구현한다. 3개 탭(`tabs/comments`, `tabs/activity`, `tabs/behavior`)은 기존 Tailwind 마크업을 유지한 채 이 테마 클래스/변수만 추가로 적용해 톤을 통일한다.

---

## 1. 참고 화면 분석 (캡처 기준)

캡처된 NEIS "자율·자치활동(자율활동)관리" 화면 구성:

1. **최상단 바**: 진한 네이비 바탕. 좌측에 "서울가동초등학교"(파란 배지) + 사용자명, 우측에 타이머/로그아웃/튜토리얼/사용자지원 버튼.
2. **상단 탭바**: 흰 배경. "학급담임"처럼 현재 활성 탭은 파란 글자 + 파란 굵은 밑줄(3px), 비활성 탭은 회색 글자.
3. **좌측 사이드바**: 옅은 회색 배경. 굵은 카테고리명 + 그 아래 파란 링크 형태의 하위 메뉴, 현재 페이지는 강조 표시.
4. **콘텐츠 카드**: 흰 배경, 둥근 모서리, 옅은 그림자. 좌측에 ■(네이비/블루) 불릿 + 굵은 제목, 우측에 경로 배지 + 아이콘 툴바(도움말/채팅/문서/즐겨찾기 등).
5. **서브탭**: 카드 내부에 "학생부자료기록 / 누가기록" 같은 보조 탭(활성: 파란 밑줄).
6. **필터 영역**: 라벨(필수 항목은 빨간 `*`) + 드롭다운(학년도/학년/반) + 파란 "조회" 버튼.
7. **안내 문구**: `※`로 시작하는 회색 보조 설명.
8. **테이블 툴바**: "Total N" 카운터, 설정(gear) 아이콘, +/- 아이콘, 우측 액션 버튼(일괄적용/문자열바꾸기/저장/삭제/출력 — 파란 solid 버튼).
9. **테이블**: 헤더 행은 짙은 네이비 배경 + 흰 굵은 글자(정렬 화살표 포함). 본문은 흰 배경, 옅은 회색 보더, 성명은 파란 밑줄 링크, 특기사항 칼럼은 입력창, 글자수는 "0 Byte" 형태의 회색 텍스트.
10. **하단 페이지 탭**: 열려있는 화면들을 탭 형태로 표시(초기화면 / 자율·자치활동(자율활동)관리), 우측에 목록보기/전체화면 버튼.

우리 앱은 사이드바·하단 페이지탭 같은 "시스템 전체" 요소까지 복제하지 않고, **① 최상단 헤더, ② 탭 내비게이션, ③ 콘텐츠 카드, ④ 서브탭/필터/테이블/버튼의 색상·형태**만 가져와 3개 탭에 공통 적용한다.

---

## 2. 디자인 토큰

`shared/css/neis-theme.css`에 CSS 변수로 정의:

```css
:root {
  /* Brand / Header */
  --neis-navy: #15335c;        /* 최상단 바, 테이블 헤더 */
  --neis-navy-dark: #0e2545;   /* hover/active 진한 톤 */
  --neis-blue: #2f6fb0;        /* 학교 배지, 링크, 보조 강조 */
  --neis-blue-bright: #2563eb; /* 활성 탭 밑줄/글자, 포커스 링 */
  --neis-sky: #8ee3f5;         /* 배경 그라데이션 보조색(행동특성 카드 등) */

  /* Surfaces */
  --neis-bg: #eef1f5;          /* 페이지 배경 (사이드바 톤) */
  --neis-card: #ffffff;        /* 콘텐츠 카드 배경 */
  --neis-border: #d1d5db;      /* 테이블/입력 보더 */
  --neis-border-light: #e5e7eb;

  /* Text */
  --neis-text: #1f2937;
  --neis-text-muted: #6b7280;
  --neis-required: #dc2626;    /* 필수 항목 * */

  /* Buttons */
  --neis-btn-primary: #2f6fb0;
  --neis-btn-primary-hover: #25588f;

  /* Radius / Shadow */
  --neis-radius: 0.75rem;       /* rounded-xl */
  --neis-shadow: 0 4px 6px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.08);
}
```

### 타이포그래피
- 폰트: `'Noto Sans KR', sans-serif` (전 탭 공통, 기존 behavior-helper에서 사용 중인 Google Fonts 링크 재사용)
- 페이지 타이틀(■ 불릿 포함): `font-size: 1.25rem(20px), font-weight: 700`
- 본문/테이블: `0.875rem(14px)`
- 보조 설명(`※` 문구): `0.8125rem(13px), color: var(--neis-text-muted)`

---

## 3. 공통 컴포넌트 (`shared/css/neis-theme.css`)

| 클래스 | 용도 | 핵심 스타일 |
|---|---|---|
| `.neis-app-header` | 최상단 네이비 바 | `background: var(--neis-navy)`, 흰 텍스트, flex 양끝 정렬 |
| `.neis-app-header .school-badge` | "서울가동초등학교" 배지 | `background: var(--neis-blue)`, 흰 글자, `rounded-md`, `padding: 2px 10px` |
| `.neis-tabbar` | 탭 내비게이션(3개 탭) | 흰 배경, `border-bottom: 1px solid var(--neis-border-light)` |
| `.neis-tab` | 개별 탭 | `padding: .5rem 1.25rem`, 비활성 `color: var(--neis-text-muted)` |
| `.neis-tab.active` | 활성 탭 | `color: var(--neis-blue-bright)`, `border-bottom: 3px solid var(--neis-blue-bright)`, `font-weight:600` |
| `.neis-card` | 콘텐츠 카드 | `background: var(--neis-card)`, `border-radius: var(--neis-radius)`, `box-shadow: var(--neis-shadow)`, `padding: 1.5rem` |
| `.neis-card-title` | ■ 불릿 + 굵은 제목 | `::before { content:"■"; color: var(--neis-blue); margin-right:.5rem }` |
| `.neis-subtabs` / `.neis-subtab` | 카드 내부 보조 탭 | `.neis-subtabs` — 얇은 하단 보더; `.active` — 파란 밑줄 |
| `.neis-note` | `※` 안내 문구 | `color: var(--neis-text-muted)`, `font-size:.8125rem` |
| `.neis-filter-row` | 라벨+드롭다운+조회 버튼 줄 | flex, gap, `label .required::before{content:"*";color:var(--neis-required)}` |
| `.neis-table` | 결과/명단 테이블 | `thead th { background: var(--neis-navy); color:#fff; }`, `td { border-bottom: 1px solid var(--neis-border-light) }` |
| `.neis-table .student-link` | 성명 등 링크형 텍스트 | `color: var(--neis-blue); text-decoration: underline;` |
| `.btn-primary` | 주요 액션(조회/생성/저장) | `background: var(--neis-btn-primary)`, 흰 글자, `rounded-lg`, hover 시 `var(--neis-btn-primary-hover)` + `translateY(-1px)` |
| `.btn-outline` | 보조 액션(일괄적용/문자열바꾸기 등) | 흰 배경 + `border: 1px solid var(--neis-blue)`, 글자 `var(--neis-blue)` |
| `.btn-danger-outline` | 삭제류 | `border: 1px solid #ef4444`, 글자 `#ef4444` |
| `.result-item` | AI 결과 카드(복사용) | 기존 behavior-helper 스타일 유지(흰 배경, 보더, hover 시 파란 보더 + 살짝 떠오름, `.clicked` 시 `#e0f2fe`) |
| `.byte-counter` | "0 Byte" 표시 | `color: var(--neis-text-muted)`, `font-size:.75rem`, 우측 정렬 |

---

## 4. 탭별 적용 가이드

### 셸(`index.html`)
- `.neis-app-header`: 좌측 "서울가동초등학교" 배지 + "나이스 입력 도우미" 타이틀, 우측에 현재 날짜(선택).
- `.neis-tabbar`: 3개 탭 — `학기말 종합의견` / `자율·자치활동 관리` / `행동특성 및 종합의견`. 클릭 시 `#comments`/`#activity`/`#behavior` 해시로 전환, 해당 iframe 표시.
- 전체 배경은 `var(--neis-bg)`.

### `tabs/comments` (학기말 종합의견)
- 기존 `bg-slate-100` 배경 → `var(--neis-bg)`로 통일.
- 메인 컨테이너(`max-w-6xl ... bg-white rounded-xl shadow-2xl`)에 `.neis-card` 적용.
- `<h1>` 영역에 `.neis-card-title` 적용 (■ 불릿 추가).
- 기존 3개 서브탭(종합의견 생성/수행평가 설계/교수학습과정안) → `.neis-subtabs`/`.neis-subtab`로 스타일만 교체 (로직 동일).
- "행을 클릭하면 복사" 결과 표/카드 → 가능한 부분은 `.neis-table` 또는 `.result-item`으로 톤 통일.

### `tabs/activity` (자율·자치활동 관리, 신규)
- 캡처 화면과 가장 가까운 탭이므로 **레이아웃을 거의 그대로** 따른다:
  - 상단 `.neis-card-title` ("자율·자치활동 특기사항 작성")
  - `.neis-filter-row`: 학년도/학년/반 선택 + "명단 불러오기"
  - `.neis-note`로 기재 가이드 핵심 규칙 요약 표시
  - `.neis-table`: 번호/성명/특기사항(textarea)/글자수(byte-counter) 컬럼 — 캡처와 동일 구조
  - 각 행 우측 또는 행 클릭 시 AI 생성 결과를 `.result-item` 카드 목록으로 표시(behavior 탭과 동일 패턴)
  - 액션 버튼: `.btn-primary`("AI 특기사항 생성"), `.btn-outline`("일괄적용"), `.btn-danger-outline`("삭제")

### `tabs/behavior` (행동특성 및 종합의견)
- 기존 `main-gradient`(하늘색 그라데이션) 배경 → 셸 배경(`var(--neis-bg)`)과 충돌하지 않도록, 카드 내부 강조 영역(예: 결과 영역 상단 띠)에만 `--neis-sky` 그라데이션을 부분 적용.
- 바깥 컨테이너(`#auto-mode-view`)에 `.neis-card` 적용.
- `<h1>`에 `.neis-card-title` 적용.
- 강점/코칭 탭 → `.neis-subtabs`/`.neis-subtab`로 교체.
- `.result-item`은 이미 동일한 패턴이므로 그대로 유지(테마 변수만 연결).
- "변환하기" 버튼 → `.btn-primary`.

---

## 5. 구현 순서
1. `shared/css/neis-theme.css` 작성 (위 토큰 + 컴포넌트 클래스).
2. `reference/`에 별도 스타일 가이드 미리보기 페이지(`style-guide.html`)를 만들어 컴포넌트들을 한 화면에서 확인.
3. 셸(`index.html`) 작성 시 헤더/탭바에 적용.
4. 각 탭 포팅 시 위 "탭별 적용 가이드"에 따라 순차 적용.

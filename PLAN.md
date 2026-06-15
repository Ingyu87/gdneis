# 서울가동초 나이스 입력 도우미 — 통합 설계 가이드

## 0. 폴더 구조 (정리 완료)

```
gdneis/
├── reference/                          # 참고자료 (코드에서 import하지 않는 자료 모음)
│   ├── guidelines/                     # 기재요령 등 지침 문서
│   │   ├── 2026 학교생활기록부 기재요령(초)_F_260219.pdf.md
│   │   └── 자율자치활동_기재가이드.md
│   ├── curriculum/                     # 학년별 교육과정 + 학교교육계획서
│   │   └── 2026학년도 N학년 교육과정.pdf.md (1~6학년) 외
│   ├── assessment-plans/               # 1학기 전과목 교수학습 및 평가계획 (1~6학년)
│   └── source-apps/                    # 기존에 만들어둔 원본 앱 (포팅용 소스)
│       ├── comments-helper/            # gdresults 저장소 원본 (학기말 종합의견)
│       └── behavior-helper/            # 행동특성 종합의견 원본 단일 HTML
│
├── tabs/                                # 실제 작업 폴더 — 탭별 1개
│   ├── comments/                        # 1. 학기말 종합의견 작성
│   ├── activity/                        # 2. 자율·자치활동 관리
│   └── behavior/                        # 3. 행동특성 및 종합의견
│
├── shared/                              # 공통 디자인 시스템 / 유틸
│   ├── css/                             # 공통 스타일 (NEIS 톤 헤더, 탭, 테이블 등)
│   └── js/                              # 공통 JS (클립보드 복사, 토스트, 헤더 컴포넌트)
│
├── api/                                 # Vercel 서버리스 함수 (Gemini 프록시 등, 탭 공통)
├── data/                                # 탭에서 공유하는 JSON 데이터 (필요 시)
├── index.html                          # 진입점: 상단 NEIS풍 헤더 + 3개 탭 셸
├── vercel.json
└── PLAN.md                              # 본 문서
```

> 작업 원칙: `reference/`는 읽기 전용 자료. 실제 코드 수정은 `tabs/`, `shared/`, `api/`, `index.html`에서만 진행.

---

## 1. 전체 앱 구조 (어떤 웹앱을 만들 것인가)

- **단일 정적 웹앱 + Vercel 서버리스 함수** 구조를 그대로 따른다 (이미 `comments-helper`가 이 구조로 동작 중이며, API 키 노출 없이 Gemini 호출 가능).
- 진입점 `index.html`은 스크린샷의 나이스 화면처럼 **상단 헤더 바 + 탭 내비게이션 + 콘텐츠 영역**으로 구성된 "셸(shell)" 역할만 한다.
- 3개 탭(학기말 종합의견 / 자율·자치활동 관리 / 행동특성 종합의견)은 각각 `tabs/<탭이름>/index.html`로 독립된 페이지를 유지하고, 셸에서는 **iframe**으로 로드한다.
  - 이유: 세 도구가 이미 각자의 Tailwind/스크립트 전역 변수를 갖고 있어, 하나의 DOM에 합치면 id 충돌·CSS 충돌 위험이 큼. iframe 분리가 가장 안전하고 빠르게 통합 가능.
  - 공통 헤더/탭바만 셸에서 관리하고, 각 탭 내부 콘텐츠는 카드(흰 배경, 둥근 모서리) 영역만 차지하도록 각 탭의 `<body>` 패딩/배경을 셸과 어울리게 조정.
- 라우팅: `index.html#comments`, `#activity`, `#behavior` 형태의 해시로 탭 상태 유지 (새로고침해도 같은 탭 유지).

---

## 2. 디자인 시스템 (스크린샷의 나이스 UI 참고)

스크린샷에서 가져올 핵심 요소:

| 요소 | 스타일 |
|---|---|
| 최상단 바 | 진한 네이비/블루(`#1c3f6e` 톤) 바탕, 좌측 학교명+사용자명 배지, 우측 아이콘 그룹 |
| 탭 내비게이션 | 흰 배경, 활성 탭은 파란 글자 + 파란 하단 굵은 보더(3px), 비활성은 회색 |
| 콘텐츠 카드 | 흰 배경, 둥근 모서리(`rounded-xl`), 옅은 그림자, 상단에 제목 + breadcrumb 스타일 경로 |
| 테이블 | 헤더 행은 짙은 네이비 배경(`#1B3A6B`)+흰 글자, `Total N` 카운터, 체크박스 첫 열, 줄무늬 없는 화이트 행 |
| 버튼 | 파란 그라데이션(`btn-primary`, 기존 behavior-helper의 스타일 재사용), `rounded-lg`, hover 시 살짝 떠오르는 효과 |
| 폰트 | Noto Sans KR |

→ `shared/css/neis-theme.css`에 다음을 정의해 3개 탭이 공통으로 import:
- CSS 변수: `--neis-navy`, `--neis-blue`, `--neis-bg`, `--neis-border`
- 공통 클래스: `.neis-header`, `.neis-tabbar`, `.neis-tab.active/.inactive`, `.neis-card`, `.neis-table`, `.btn-primary`, `.result-item`(복사 카드 — behavior-helper에서 이미 사용 중인 패턴을 공통화)

각 탭은 기존에 사용하던 Tailwind는 유지하면서, 위 공통 클래스만 추가로 import하여 톤을 통일한다. (전면 재작성 없이 점진적 통일)

---

## 3. 탭별 구현 계획

### 3-1. 학기말 종합의견 작성 (`tabs/comments/`)
- `reference/source-apps/comments-helper`를 그대로 포팅 (index.html, js/app.js, data/*.json, api/*.js).
- 변경 사항:
  - 공통 `shared/css/neis-theme.css` 링크 추가, 헤더/탭 영역은 셸이 담당하므로 자체 `<h1>` 타이틀 영역은 유지하되 시각적 톤만 맞춤.
  - `api/` 함수들은 루트 `api/`로 이동해 셸과 공유 (Vercel은 프로젝트 루트의 `api/`만 인식).
  - `data/evaluation-plan.json`, `data/performance-plan.json`은 `tabs/comments/data/`에 유지하고 fetch 경로만 조정.
- 기능은 기존 3개 서브탭(종합의견 생성 / 수행평가 설계 / 교수학습과정안) 그대로 유지.

### 3-2. 자율·자치활동 관리 (`tabs/activity/`)
- 신규 제작. 입력 흐름:
  1. 학년/반/번호/학생명 또는 학급 전체 명단 (수동 입력 또는 텍스트 붙여넣기)
  2. 학년 선택 → `data/activity-themes.json`에서 해당 학년의 적응활동/자치활동/창의주제활동/특색교육 주제 목록을 자동 로드
  3. 학생별 관찰 키워드(참여도, 역할, 협력도, 임원 여부 등) 입력
  4. (선택) 임원 활동 입력 시 "전교/학년/학급" + 재임기간을 별도 필드로 받아 `(YYYY.MM.DD.-YYYY.MM.DD.)` 형식으로 자동 포맷
  5. "생성하기" → `api/generate-activity.js` (Gemini) 호출, `reference/guidelines/자율자치활동_기재가이드.md`의 규칙을 시스템 프롬프트에 반영하여 특기사항 문장 생성
  6. 결과는 behavior-helper의 `result-item`(클릭 시 복사) 패턴 재사용, 학생별로 카드 묶음 표시
- 데이터 작업: `reference/curriculum/`의 학년별 교육과정에서 자율활동 주제를 추출해 `tabs/activity/data/activity-themes.json` 구조화 (학년 → {적응활동, 자치활동, 창의주제활동, 특색교육} → 주제 배열).
- UI는 스크린샷의 표(번호/성명/특기사항/글자수 컬럼) 톤을 참고해, 학생 목록을 좌측 또는 상단 표로 두고 우측/하단에 생성 결과 카드 표시.

### 3-3. 행동특성 및 종합의견 (`tabs/behavior/`)
- `reference/source-apps/behavior-helper/index.html`을 포팅.
- 변경 사항:
  - 클라이언트에서 직접 Gemini API를 호출하던 `callGeminiAPI`를 `api/generate-behavior.js` 서버리스 함수 호출로 교체 (API 키 노출 방지, comments-helper와 동일 패턴).
  - 공통 `shared/css/neis-theme.css` 적용해 배경/버튼 톤을 다른 탭과 통일 (단, `main-gradient` 배경은 카드 내부 강조 요소로 축소하거나 셸 배경에 맞춰 단순화).
  - 탭 UI(강점/코칭 전환)는 그대로 유지.

---

## 4. 공통 백엔드 (`api/`)
- `api/generate-comment.js`, `api/performance-design.js`, `api/lesson-plan.js` — comments 탭 이동분
- `api/generate-activity.js` — 자율·자치활동 특기사항 생성 (신규)
- `api/generate-behavior.js` — 행동특성 문장 변환 (behavior-helper 클라이언트 로직 이전)
- 모두 `process.env.GEMINI_API_KEY` 사용, Vercel 환경변수에 1회 등록.
- `vercel.json`에 4개 함수 모두 `maxDuration: 60` 등록.

---

## 5. 진행 순서 제안
1. `shared/css/neis-theme.css` + `index.html` 셸(헤더/탭바/iframe) 작성 — 빈 탭 3개로 틀 먼저 완성
2. `tabs/comments`: comments-helper 포팅 + api 경로 정리 → 셸에서 동작 확인
3. `tabs/behavior`: behavior-helper 포팅 + `api/generate-behavior.js` 분리 → 동작 확인
4. `tabs/activity`: `activity-themes.json` 데이터 구조화 → UI 구현 → `api/generate-activity.js` 작성
5. 전체 톤 통일 점검 (색상/폰트/버튼/카드) 후 Vercel 배포 및 `GEMINI_API_KEY` 환경변수 설정

# PRD — 서울가동초 나이스 입력 도우미 (gdneis)

## 1. 개요
- **제품명**: 서울가동초 나이스 입력 도우미
- **목적**: 학급 담임교사(백인규)가 NEIS 학생부 입력 업무(학기말 종합의견, 자율·자치활동 특기사항, 행동특성 및 종합의견)를 빠르고 일관된 톤으로 작성하도록 돕는 AI 보조 웹앱.
- **사용자**: 담임교사 1인(개인 사용), 추후 동학년 교사 공유 가능성 있음.
- **배포 형태**: Vercel 정적 호스팅 + 서버리스 함수(`api/`). Gemini API 키는 클라이언트에 노출하지 않고 **Vercel 환경변수**에 저장 후 서버리스 함수에서만 사용.

## 2. 목표 / 비목표
### 목표
- 3개 탭(학기말 종합의견 / 자율·자치활동 관리 / 행동특성 및 종합의견)을 하나의 앱에서 통일된 디자인으로 사용.
- 학년별 교육과정·평가계획·기재요령(`reference/`)에 기반한 프롬프트로 NEIS 기재요령에 맞는 문장 생성.
- 생성된 문장은 클릭 한 번으로 클립보드 복사 → NEIS 입력창에 바로 붙여넣기.

### 비목표
- NEIS 시스템과의 직접 연동(자동 입력, 크롤링 등)은 하지 않음.
- 다중 사용자 인증/권한 관리는 1차 범위 제외(필요 시 추후 검토).
- 학생 개인정보(이름 등)를 외부 DB에 저장하지 않음 — 브라우저 세션 내에서만 처리.

## 3. 정보 구조 (IA)

```
index.html (셸)
├── 헤더: 학교명 배지 + 앱 타이틀
├── 탭바: [학기말 종합의견] [자율·자치활동 관리] [행동특성 및 종합의견]
└── 콘텐츠: 선택된 탭을 iframe으로 로드
    ├── tabs/comments/index.html
    ├── tabs/activity/index.html
    └── tabs/behavior/index.html
```

상세 폴더 구조와 설계 배경은 `PLAN.md`, 디자인 토큰/컴포넌트는 `DESIGN.md`, 자율활동 기재 규칙은 `reference/guidelines/자율자치활동_기재가이드.md` 참고.

## 4. 기능 요구사항

### 4-1. 학기말 종합의견 작성 (`tabs/comments`)
- `reference/source-apps/comments-helper` 포팅.
- 입력: 학년, 과목, 수준별(잘함/보통/노력요함) 개수, 종합 개수.
- 출력: 영역별 예시 문장 → 선택해 종합의견으로 조합.
- 서브탭: 종합의견 생성 / 수행평가 설계·문항 제작 / 교수학습과정안(평가 기반).
- 데이터: `data/evaluation-plan.json`, `data/performance-plan.json` (학년/과목/영역별 성취기준 및 수행평가 구조).

### 4-2. 자율·자치활동 관리 (`tabs/activity`, 신규)
- 입력: 학년도/학년/반 선택 → 학년별 적응·자치·창의주제·특색교육 주제 목록(`data/activity-themes.json`) 자동 로드.
- 학생별 관찰 키워드(참여도, 협력도, 역할, 임원 여부/종류/재임기간) 입력.
- "AI 특기사항 생성" 클릭 시 `api/generate-activity.js` 호출 → 기재요령(자율·자치+동아리 통합 1문장, 임원 경력 표기 형식 `학년: 학기 직책(YYYY.MM.DD.-YYYY.MM.DD.)` 등) 반영한 문장 5개 생성.
- 결과는 `.result-item` 카드로 표시, 클릭 시 복사 → NEIS 특기사항 입력란에 붙여넣기.
- 테이블 UI는 캡처 화면(번호/성명/특기사항/글자수)과 동일한 톤(`.neis-table`).

### 4-3. 행동특성 및 종합의견 (`tabs/behavior`)
- `reference/source-apps/behavior-helper` 포팅.
- 입력: 결핍 중심 문장(자유 텍스트).
- 출력: "강점 중심 변환" 5개 + "성장을 위한 코칭 변환" 5개, 탭 전환 + 카드 클릭 복사.
- 클라이언트의 직접 Gemini 호출(`callGeminiAPI`, API 키 빈 문자열)을 **`api/generate-behavior.js` 서버리스 프록시 호출**로 교체.

## 5. 기술 스택 & 아키텍처
- 프론트엔드: 정적 HTML + Tailwind CDN + Vanilla JS (기존 두 도구와 동일 스타일 유지, 신규 코드도 동일 패턴).
- 공통 스타일: `shared/css/neis-theme.css` (`DESIGN.md` 기준), `shared/style-guide.html`로 컴포넌트 확인 가능.
- 백엔드: Vercel Serverless Functions (`api/*.js`, Node.js).
  - `api/generate-comment.js`, `api/performance-design.js`, `api/lesson-plan.js` — comments 탭
  - `api/generate-activity.js` — 자율·자치활동 탭 (신규)
  - `api/generate-behavior.js` — 행동특성 탭 (신규, 기존 클라이언트 로직 이전)
- LLM: **Gemini 2.5 Flash** (`gemini-2.5-flash`, 모든 API 함수 공통 모델 통일).
- 데이터: `tabs/*/data/*.json` 정적 파일(빌드 타임 포함, 별도 DB 없음).

## 6. 환경변수 & 배포 (Vercel)

| 변수명 | 용도 | 적용 범위 |
|---|---|---|
| `GEMINI_API_KEY` | Gemini 2.5 Flash 호출용 API 키 | 모든 `api/*.js` 서버리스 함수 (Production/Preview/Development 공통 등록) |

- API 키는 **절대 프론트엔드 코드/번들에 포함하지 않음**. 모든 AI 호출은 `fetch('/api/...')` → 서버리스 함수 → Gemini API.
- `vercel.json`에 4~5개 함수의 `maxDuration: 60` 등록(기존 comments-helper 설정 패턴 유지), `api/` 폴더는 프로젝트 루트에 위치(여러 함수가 Vercel에 의해 자동 라우팅되도록).
- 배포 절차:
  1. GitHub 저장소(`Ingyu87/gdneis`) Vercel에 Import.
  2. Project Settings → Environment Variables → `GEMINI_API_KEY` 등록.
  3. Deploy → 자동 빌드(정적 파일이라 빌드 커맨드 불필요, Output Directory `./`).
  4. 배포 후 각 탭의 AI 생성 기능이 `/api/...` 경로로 정상 호출되는지 확인.

## 7. 보안 / 개인정보
- 학생 이름 등 입력 데이터는 브라우저 메모리에서만 처리, 서버에 영구 저장하지 않음(요청-응답 단위로만 Gemini API에 전달).
- 서버리스 함수는 `POST`만 허용, 입력값 검증(필수 필드 누락 시 400 반환) — comments-helper의 `api/generate.js` 패턴 준수.
- `.gitignore`에 `.env`, `.env.local`, `.vercel/` 포함(이미 적용됨) — 로컬 테스트 시 키 파일이 커밋되지 않도록.

## 8. 마일스톤
1. ✅ 폴더 구조 정리 + `PLAN.md`
2. ✅ 디자인 시스템 (`DESIGN.md`, `shared/css/neis-theme.css`, `shared/style-guide.html`)
3. ⬜ 셸(`index.html`) + 탭 전환 구현
4. ⬜ `tabs/comments` 포팅 (+ `api/` 루트 이동)
5. ⬜ `tabs/behavior` 포팅 + `api/generate-behavior.js`
6. ⬜ `tabs/activity` 신규 구현(`activity-themes.json` 데이터 작업 포함) + `api/generate-activity.js`
7. ⬜ `vercel.json` 통합, `GEMINI_API_KEY` 환경변수 등록 후 Vercel 배포
8. ⬜ 전체 톤/기능 통합 점검

# 정적 HTML → React 전면 통합 마이그레이션 기록

> 이 저장소(**arise-ai-renewal**)는 원본 프로덕션 저장소(**arise-pnu-ai**)의 섬처럼 분리돼 있던
> 정적 HTML 페이지들을 **단일 React SPA로 전면 통합**한 결과물의 보존본입니다.
> 원본 프로덕션은 그대로 두고(무손상), 통합 버전을 여기에 따로 올려 둡니다.

- **작업 브랜치:** `feat/react-migration` (원본 `main` 대비 **37커밋**)
- **원본 복원 기준점:** 태그 `pre-react-migration`, 브랜치 `main`(`02d952e`)
- **상태:** 빌드 통과 · 단위테스트 49/49 · 사이트 디자인·기능 **1:1 무변경** 검증 완료
- **미배포:** 로컬 검증 + 직접 검수 + 승인 후에만 배포(자동배포 금지)

---

## 무엇을 했나

섬처럼 **개별로 떠 있던 정적 HTML 4종**(arise · eligibility · scholarship · admission-v3-dark)을
하나의 React 라우터/정석 구조(`routes` · `hooks` · `lib`)로 통합했습니다.
**디자인·기능의 외형/동작은 1바이트도 바꾸지 않고**, 내부만 컴포넌트화하고 페이지 간 이동을 SPA로 전환했습니다.

## 단계별 (strangler 점진 이식)

| 단계 | 내용 |
|---|---|
| **0** | 패리티 검증 하니스 (`puppeteer-core` + `node:test`, 픽셀/DOM/시나리오 diff). Date 동결. |
| **1** | `arise.html` 제거 — nginx 301 + React Router `<Navigate>`로 URL 보존 |
| **2** | `eligibility.html`·`scholarship.html` → `/eligibility`·`/scholarship` React 컴포넌트 |
| **3** | `admission-v3-dark.html` → `/admission` (intro + 4뷰 + 신청 모달 + FX 장식), **lazy 청크** |
| **4** | `src/pages` → `src/routes` 재편 · orphan/죽은코드 제거 · 내부 이동 전부 `<Link>` SPA화 |

## 새 구조 (`frontend/src/`)

```
App.jsx                      라우트 정의(통합)
routes/
  Gateway.jsx · Login.jsx · DeptEditRequest.jsx
  EligibilityCheck.jsx · ScholarshipCheck.jsx        ← 계산기 2종 (단계2)
  admin/  AdminLogin · AdminDashboard · DeptDirectoryAdmin · DeptChangeRequestsAdmin
  admission/  AdmissionPage.jsx · admission-v3-dark.css
              IntroView · views/{WhyGrad,Eligibility,Benefits,Departments}View
              ApplyModal · DeptDetailModal · deptLogic.js                ← admission (단계3)
hooks/   useCountdown · useHashView · useDepartments · useFxDecorations
lib/     eligibility.js · scholarship.js · apply-survey.js               순수 로직
scripts/ parity-check.mjs + lib/{chrome-path,targets,compare}.mjs        검증 하니스(단계0)
```

## 핵심 엔지니어링 결정

- **1:1 무변경 이식**: 인라인 `<style>`은 값 그대로 `.css`로 이동, DOM은 JSX로 1:1 미러, 인라인 JS는 동일 계산식/동일 fetch/동일 카운트다운으로 hook·lib에 포팅.
- **admission 전역 CSS 누출 차단**: `admission-v3-dark.css`의 bare 전역 셀렉터(`body`/`*`/`::selection`/`html` 등)를 `.adm-v3-dark` 래퍼로 스코프. 보편/요소 셀렉터는 **`:where(.adm-v3-dark)`** 접두로 **명시도를 그대로 보존**(스코핑이 자체 캐스케이드를 깨지 않도록). admission 청크는 lazy 로드로 타 라우트 초기 번들과 격리.
- **레거시 `.html` URL 보존**: 외부 링크·QR·북마크 대비, React Router `<Navigate replace>`로 `/eligibility.html`→`/eligibility` 등 리다이렉트.
- **페이지 간 이동은 `<Link>`**: 전체 새로고침 제거(허용된 명백한 개선). 외부·OAuth·`tel:`·페이지내 앵커·새 탭은 그대로 유지.
- **테스트 의존성 무추가**: `node:test`(내장)만 사용. 신규 런타임 의존 없음.

## 검증

- `npm run build` 통과 · 단위테스트 **49/49** · 빌드 산출물에서 **admission CSS 전역 누출 0건** 확인.
- 컴포넌트별 **adversarial 다중-렌즈 검증**을 적용해, 단일 리뷰가 통과시켰던 **실제 회귀 2건**을 적발·수정:
  - `DepartmentsView` 헤더가 다른 뷰의 스캐폴드(마스트헤드+브레드크럼+`edx`)로 잘못 복제됐던 것 → 원본 `view-bar`/`container` 구조로 1:1 복원 (`617b51b`)
  - `EligibilityCheck`의 `.cdetail`에 행마다 여분 `<span>` 노드가 추가됐던 것 → 원본대로 정합 (`d1f0197`)

## 로컬 실행

```bash
# 백엔드 (포트 3001, Postgres 필요)
cd backend && npm run dev
# 프론트 (포트 5173, /auth·/api → 3001 프록시)
cd frontend && npm run dev
```

## 배포 시 잔여 작업 (승인 후)

- `frontend/public/admission-v3-dark.html` **삭제** + `dist` **클린 빌드**.
  (Express 정적 서빙이 SPA fallback보다 우선이라, 잔존 시 `/admission-v3-dark.html`→`/admission` 리다이렉트를 가림. 현재는 라이브↔로컬 검수 비교용으로 일부러 보존.)

## 원본과의 관계

- **원본 프로덕션:** `arise-pnu-ai` (이 저장소의 `origin` 아님 — 별도 운영).
- **이 저장소:** 위 통합 버전의 보존본. 원본을 되돌리려면 `main`(`02d952e`) 또는 태그 `pre-react-migration`.
- 단계별 상세는 각 커밋 메시지에 기록돼 있습니다 (`git log --oneline main..feat/react-migration`).

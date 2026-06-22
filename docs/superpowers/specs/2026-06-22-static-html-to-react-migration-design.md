# 정적 HTML → React 전면 통합 마이그레이션 설계

- 작성일: 2026-06-22
- 상태: 설계 확정(구현계획 대기)
- 기준 커밋: `870a963` (HEAD)

## 1. 목표

지금 **섬처럼 따로 노는 파일들**(정적 HTML 4종 + 분산된 React 조각)을, **하나의 응집된 프로젝트**로 통합하고 **정석(idiomatic) React 구조**로 재편한다. 최종 상태는 "모든 화면이 단일 React 라우터/구조 안에 들어오고 SPA로 연결된 온전한 React 앱".

대상 정적 페이지(`frontend/public/`):

| 페이지 | 라인 | 성격 |
|---|---|---|
| `admission-v3-dark.html` | 3,529 | 사실상 미니앱 — 다중 in-page 뷰(why/자격/혜택/디렉터리) · `/api/departments` 학과 디렉터리 · 신청 모달+OAuth · 카운트다운 · BK21 필터 |
| `eligibility.html` | 431 | 독립 클라이언트 자격 계산기 |
| `scholarship.html` | 297 | 독립 클라이언트 장학 계산기 |
| `arise.html` | 161 | 죽은 페이지(prod에서 `/`로 301) |

## 2. 제약 (최우선)

1. **무변경(無變更)**: 사이트의 **디자인·기능은 그 무엇도 변경 금지**. 파일/구조 변경만 허용. 작업 후 사용자가 직접 검수.
   - 단, **기존 대비 명백한 개선 방향**은 허용(예: SPA 전환으로 페이지 이동 시 전체 새로고침 깜빡임 제거). 무단 "개선"은 하지 않고, 개선 여지는 **적용 전 제안**한다. 기본값은 1:1 보존.
2. **롤백 준비**: 작업 전 복원 기준점 고정, 단계별 커밋, 배포 시 이전 이미지 보존.
3. **배포 게이트**: 로컬 검증 → **사용자 OK → 그때만 배포**. (자동 배포 금지)

## 3. 패리티 기준

**"정리하며 이식"** — 외형·동작은 동일하게 유지하되 내부는 제대로 컴포넌트화한다(택1 결과 #2).

## 4. 범위

### 이번 패스에 포함 (출력 0 변화)
- 모든 화면을 단일 React 라우터 + `routes·components·hooks·styles` 구조로 편입
- 페이지 **내부** 컴포넌트화 (같은 DOM 렌더)
- 인라인 `<style>`을 **값 그대로** CSS 파일로 이동
- 페이지 간 이동을 `<Link>`(SPA)로 연결

### 이번 패스에서 보류 (추후 별도 검증 단계)
- 페이지 간 공유 헤더/푸터로 **합치기**
- CSS를 토큰으로 **통폐합** · 룩 통일
- 디자인/UX 손질 일체

> 사유: "정석 통합"의 이상은 교차 페이지 정리(공유화·토큰화)를 포함하나, 이는 픽셀·동작이 미세하게 바뀔 위험이 있어 **무변경 규칙과 충돌**한다. 따라서 이번엔 *구조/라우팅 통합*까지만 하고, 진짜 의미의 디자인 통일은 무변경 검수를 깨끗이 한 뒤 별도로 진행한다.

## 5. 목표 아키텍처

```text
src/
├─ main.jsx · App.jsx            # App = 라우터 정의만
├─ routes/                       # URL 1개 = 파일 1개
│  ├─ Gateway.jsx
│  ├─ admission/                 # admission-v3-dark 분해
│  │  ├─ AdmissionPage.jsx
│  │  ├─ views/  WhyGrad · Eligibility · Benefits · Departments
│  │  └─ ApplyModal.jsx
│  ├─ EligibilityCheck.jsx       # ← eligibility.html
│  ├─ ScholarshipCheck.jsx       # ← scholarship.html
│  ├─ admin/  AdminLogin · AdminDashboard · DeptDirectory · DeptChangeRequests
│  ├─ DeptEditRequest.jsx
│  └─ variants/  bymonolog/* · google/*     # 기존 유지
├─ components/                   # 공유 UI: Layout · Card · Chip · DDayBadge …
├─ hooks/                        # useAuth(OAuth) · useDepartments · useCountdown · useSmoothScroll
├─ lib/                          # api 클라이언트 · content · utils
└─ styles/
   ├─ tokens.css                 # 디자인 토큰(공통 기반)
   ├─ themes/                    # dark-amber · pnu-blue (페이지 테마 보존)
   └─ global.css · tailwind.css
public/                          # 에셋만 (html 섬 제거)
```

**통합 원칙**
1. 단일 라우터 — 모든 화면이 React Router 라우트. `public/*.html` 섬 제거(에셋만)
2. 페이지 간 이동은 `<Link>` — raw `href`/`window.location` 제거 → 진짜 SPA
3. 페이지 **내부** 공유 컴포넌트/훅. (교차 페이지 dedup은 보류 — 4절)
4. 흩어진 CSS를 `styles/`로 이동하되 **값은 보존**(각 페이지 테마 그대로 재현)
5. **기존 URL 보존**: `/admission-v3-dark.html`·`/eligibility.html`·`/scholarship.html`·`/arise.html` → 새 라우트로 리다이렉트(외부 링크·QR·북마크 보호)

## 6. 무변경 보장 기법 (faithful port)

- 각 페이지의 현재 **DOM을 JSX로 1:1 미러**
- 인라인 `<style>` 내용을 **1바이트도 안 바꾸고** 스코프 CSS 파일로 이동
- JS 로직을 **동일 효과로 포팅**(같은 계산식·같은 fetch·같은 모달 흐름·같은 카운트다운 표기)
- `public/` 자산 경로 동일
- admission의 `data-view` 해시 동기 뷰 전환 → React 상태(+`location.hash` 동기)로 동일 동작 재현

## 7. 단계별 계획 (strangler)

각 단계 = **독립 커밋 → 로컬 검증(라이브 vs 로컬 1:1) → 사용자 검수 → OK 시 배포**. 단계 간 공존 가능(예: 계산기만 React여도 admission 정적본과 공존).

| 단계 | 대상 | 작업 | 위험 |
|---|---|---|---|
| **0. 안전 기반** | — | 복원 태그 고정 · 작업 브랜치 · **검증 하니스** 작성 | 없음 |
| **1. arise 제거** | `arise.html` | 삭제(이미 prod 301). `/arise.html→/` 301 유지 확인 | 최저 |
| **2. 계산기 2종** | `eligibility·scholarship.html` | → `routes/EligibilityCheck·ScholarshipCheck.jsx`. DOM 1:1, CSS 그대로, 계산 JS 포팅. 기존 `.html` URL 리다이렉트. **faithful-port 패턴·CSS·검증 방식 확립** | 낮음 |
| **3. admission (핵심)** | `admission-v3-dark.html` | `routes/admission/`로 분해(AdmissionPage + views + ApplyModal + 훅). data-view→React 상태(+hash). **병렬 라우트로 먼저 만들어 라이브와 1:1 검증 후 교체**. `/admission-v3-dark.html` 리다이렉트 보존 | 중간(격리·병렬 검증으로 완화) |
| **4. 통합 마감** | 전역 | orphan(`AdmissionForm·Eligibility.jsx`)·죽은 `RedirectToAdmission`·`rootToArise` 제거. raw `href`→`<Link>`. 구조 정착 | 낮음 |

**배포 cadence**: 단계별 검증→OK→배포(권장, 위험 작고 롤백 단위 명확). 전체 검증 후 일괄 배포도 가능 — 각 게이트에서 사용자가 결정.

## 8. 검증 하니스 (단계 0에서 구축)

현재 라이브(`https://arise-ai.pusan.ac.kr/<path>`)와 새 로컬을 같은 경로로 띄워 비교:
1. **풀페이지 스크린샷 픽셀 diff** (주요 뷰포트)
2. **핵심 텍스트/DOM 노드 비교**
3. **동작 시나리오**: 계산기 입력→결과값 동일 · 신청 모달 흐름(OAuth 리다이렉트 포함) · 카운트다운 표기 · 디렉터리 계열→학과→세부전공 필터
- 단계마다 통과해야 다음 단계로. 결과를 사용자에게 제시 후 검수.

## 9. 롤백 전략

- 작업 전 **git 태그/복원 기준 커밋**(`870a963`) 고정. 작업은 **단계별 커밋** → 문제 시 해당 단계만 `git`으로 즉시 원복.
- 배포 롤백: **이전 was 이미지 보존**(기존 운영 방식) → 한 줄로 직전 버전 복귀.

## 10. 재사용/정리 대상

- **orphan `AdmissionForm.jsx`(432)·`Eligibility.jsx`(331)**: 부분·구버전 → **참고만**, 현재 정적본 기준으로 재구성(단계 3·2). 마감 단계에서 제거.
- `RedirectToAdmission` 헬퍼, dev `rootToArise` 미들웨어(미등록 dead): 마감 단계 제거.

## 11. 위험 & 완화

| 위험 | 완화 |
|---|---|
| admission(3,529줄) 동작 미세 차이 | 병렬 라우트 + 검증 하니스로 1:1 대조, 격리 단계 |
| 인라인 CSS 이동 중 값 변형 | 값 무수정 이동 + 픽셀 diff |
| 기존 `.html` 링크/QR 깨짐 | `.html` → 새 라우트 리다이렉트 보존 |
| 라이브(신청기간) 영향 | 접수 시작(7.9) 전 저트래픽 창 활용 · 단계별 배포·롤백 |

## 12. 범위 밖(후속 별도 작업)

- 페이지 간 디자인/룩 통일, 공유 헤더·푸터 dedup, CSS 토큰 통폐합
- 이번 마이그레이션의 무변경 검수가 끝난 뒤 별도 spec으로 진행

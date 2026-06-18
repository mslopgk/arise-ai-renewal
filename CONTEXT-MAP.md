# CONTEXT-MAP

이 리포는 **단일 배포** 안에 3개의 바운디드 컨텍스트를 담는다. 통합 결정: [`docs/adr/0006`](./docs/adr/0006-monorepo-merge-s30-arise-ai.md).

```
브라우저 ─▶ 단일 Caddy ─▶ 단일 Express
   /              → arise 게이트웨이 (arise.html)
   /s30/*         → s30 (arise-ai 마케팅)
   /admission-*·/eligibility·/admin·/api·/auth → arise
```

## 1) arise 게이트웨이 (상위 랜딩)
- **위치**: `frontend/public/arise.html` (+ `/logos`, `/media`)
- **역할**: arise-ai 최상위 진입. 좌측 PNU 영상 + 우측 3카드 — ① s30 `about/#aura`(A.U.R.A 마스터플랜) · ② s30 `partners/#google`(Google 협력) · ③ arise 신청(`/admission.html`).
- **URL**: `/` (prod: Express가 `dist/arise.html` 서빙 / dev: Vite `root-to-arise` 미들웨어)
- 별도 CONTEXT.md 없음(단일 페이지).

## 2) s30 — arise-ai 마케팅 사이트
- **위치**: `s30/` (Vite 정적 멀티페이지, `base:'/s30/'`, React 아님·백엔드 없음)
- **내용**: 랜딩 · `about`(A.U.R.A 2.0 마스터플랜) · `partners`(Google for Education) · `programs` · `roadmap` · `news` · `achievements`
- **URL**: `/s30/*`
- **서빙**: `s30/dist` → prod Express `/s30` 정적 / dev Vite `serve-s30` 미들웨어(영상 range 지원)
- **빌드**: `cd s30 && npm run build`
- 별도 CONTEXT.md 없음(현재).

## 3) arise — 학·석사 연계과정 사전신청 시스템
- **위치**: `frontend/`(Vite+React admin + public 정적: `admission-v1/v2/v3`, `eligibility`) + `backend/`(Express + SQLite + Google Sheets 미러)
- **URL**: `/admission-*.html` · `/eligibility.html` · `/admin` · `/login` · `/api/*` · `/auth/*`
- **글로서리**: [`CONTEXT.md`](./CONTEXT.md) · **결정**: `docs/adr/0001~0005`

## 시스템 전역
- **ADR**: `docs/adr/` (0001~0006). 0006 = 본 통합.
- **배포**: 단일 Express + Caddy, 1 도메인. 현재 `arise-ai.pusan.ac.kr`, 향후 `arise-ai.pusan.ac.kr` 동일 서버 연결(+ OAuth redirect 재구성).
- **빌드(통합)**: `s30` 빌드 + `frontend` 빌드 → Express(prod)가 `/` + `/s30/` 전부 서빙.

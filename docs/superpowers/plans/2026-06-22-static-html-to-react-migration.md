# 정적 HTML → React 전면 통합 마이그레이션 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 섬처럼 분리된 정적 HTML 4종(admission-v3-dark·eligibility·scholarship·arise)을 단일 React 라우터/정석 구조(`routes·hooks·lib`)로 통합하되, **사이트 디자인·기능은 1:1 무변경**.

**Architecture:** strangler 단계(0 하니스 → 1 arise → 2 계산기 → 3 admission → 4 마감). faithful port = DOM을 JSX로 1:1 미러 · 인라인 `<style>`을 값 그대로 CSS로 이동 · JS를 동일 효과로 포팅. admission은 `/admission-next` 병렬 라우트로 라이브와 1:1 검증 후 `/admission`으로 교체. 단계별 독립 커밋, 로컬 검증 → 사용자 승인 → 배포.

**Tech Stack:** React 18 · react-router-dom 6 · Vite 5 · Tailwind v4(기존) · 검증 하니스 = puppeteer-core@25.1.0(기설치 devDep) + `node:test`(내장). 신규 런타임/사이트 영향 의존 추가 없음.

## Global Constraints

- **무변경(1:1)**: 디자인·기능 외형/동작을 그 무엇도 바꾸지 않는다. 인라인 `<style>`은 값 1바이트도 안 바꾸고 CSS로 이동, DOM은 JSX로 1:1 미러, JS는 동일 계산식·동일 fetch·동일 모달흐름·동일 카운트다운 표기로 포팅. 명백한 개선(SPA `<Link>` 새로고침 제거)만 허용하되 DOM/CSS/문구 무변경 + 적용 전 제안.
- **단계적(strangler)**: 0→1→2→3→4, 단계 간 공존 허용. admission은 병렬 라우트 선검증 후 교체.
- **단계별 독립 커밋**: 각 Task=1커밋. Step 사이클 = 실패테스트→실패확인→구현→통과확인→커밋. **`.html` 삭제와 대응 `<Navigate>` 등록은 반드시 같은 커밋**(중간 상태 비파손).
- **배포 게이트**: 로컬 검증 → **사용자 OK → 그때만 배포**(자동배포 금지). 단계별 게이트.
- **복원 기준점**: 현재 HEAD `245ab92`를 태그 `pre-react-migration`으로 고정. 작업 브랜치 `feat/react-migration`. (spec 본문의 `870a963`은 spec 직전 ancestor이므로 무시 — `245ab92` 사용.)
- **테스트 의존성 무추가**: `node:test`(내장)만 사용. vitest/@testing-library 추가하지 않음(아래 확정사항 ①).
- **프로덕션 서빙 주의**: `backend/src/server.js`의 `express.static(dist,{extensions:['html']})`(L104)가 SPA fallback(`app.get('*')`, L108)보다 먼저 → **잔존 `.html`이 React 라우트/리다이렉트를 가린다.** 배포 전 `frontend/dist` 클린 빌드 필수, `.html` 삭제와 라우트 등록은 동일 커밋.
- **보안**: `dangerouslySetInnerHTML`은 신뢰된 정적 문자열(detail/reason/scholNote/BK21_HTML/SVG)만. 사용자 입력(학과명 등)은 JSX 텍스트로 렌더.

---

## 이번 패스 산출 트리 (실제)

```text
frontend/
├─ scripts/  parity-check.mjs · lib/{chrome-path,targets,compare}.mjs · parity-check.test.mjs   # 단계0 하니스
└─ src/
   ├─ App.jsx                      # 라우트 정의(통합)
   ├─ routes/
   │  ├─ EligibilityCheck.jsx (+ .css)        # ← eligibility.html (단계2)
   │  ├─ ScholarshipCheck.jsx (+ .css)        # ← scholarship.html (단계2)
   │  └─ admission/  AdmissionPage.jsx · admission-v3-dark.css · views/{Intro,WhyGrad,Eligibility,Benefits,Departments}View.jsx · ApplyModal.jsx · DeptDetailModal.jsx · deptLogic.js   # ← admission-v3-dark.html (단계3)
   ├─ hooks/  useCountdown · useHashView · useDepartments · useFxDecorations   # (단계3)
   └─ lib/    eligibility.js · scholarship.js · apply-survey.js                # 순수 로직 (단계2·3)
```

> **이번 패스 미생성(의도적 보류 — spec §4·§12)**: `components/`(공유 UI)·`styles/{tokens.css,themes/}`. 공유화·CSS 토큰 통폐합·룩 통일은 **무변경 검수 완료 후 별도 spec**으로 진행. spec 5절 트리와의 차이는 의도된 것.
> 기존 `src/lib/useSmoothScroll.js`(훅이 lib에 있음)는 범위 밖 — **이동 금지**(무변경). `frontend/.gitignore`는 비어 있고 루트 `.gitignore`가 `.shot/`·아티팩트를 커버.

## 실행 순서 & 섹션 인덱스

`단계0(하니스)` → `단계1(arise 삭제)` → `단계2(계산기)` → `단계3(admission)` → `단계4(통합 마감)`.
아래 상세는 4개 영역 섹션으로 묶여 있다: **[A] 단계0 하니스** · **[B] 단계1·4 + 라우팅/리다이렉트 인프라** · **[C] 단계2 계산기** · **[D] 단계3 admission**. 라우팅 섹션[B]은 단계1(arise)과 단계4(마감)를 함께 담으므로, 실행은 [B의 단계1] → [C] → [D] → [B의 단계4] 순서로 진행한다. Task 번호는 영역별로 매겨져 있으니 **섹션명 + Task번호**로 식별한다.

## ★ 착수 전 확정사항 (critic 반영 — 아래 상세 섹션과 충돌 시 이 결정이 우선한다)

1. **테스트 러너 = `node:test` 단일.** 계산기·admission 초안의 `vitest`/`@testing-library`/`renderHook` import는 **모두 제거**한다. 검증 전략: **순수 함수**(eligibility/scholarship 판정, `computeCountdown`, `viewFromHash`, `mapAnswers` 등)는 `node:test`로 단위검증, **훅·컴포넌트 동작/UI 1:1**은 **패리티 하니스(브라우저, 단계0)** 로 검증. 신규 npm 의존 추가 금지.
2. **레거시 `.html` URL 보존 = React Router `<Navigate replace>` 단일.** `server.js` 수정하지 않는다(admission 초안의 server.js 301 step 폐기). 대신 **각 `.html` 정적본 삭제 + 대응 라우트/`<Navigate>` 등록을 같은 커밋**으로 — 계산기는 단계2, **admission은 단계3 교체 커밋에서 `public/admission-v3-dark.html` 삭제**(단계4로 미루지 않음). 이로써 prod 정적본 우선서빙 가림 구간이 없다.
3. **복원 SHA = `245ab92`** (모든 `870a963` 언급을 대체).
4. **admission 4개 뷰는 항상 마운트**하고 `is-open`류 클래스만 토글한다(언마운트 금지 — 초기 애니메이션/아코디언 높이 보존). 구현 Step의 필수 체크항목.
5. **admission 전역 CSS 누출 방지**: `admission-v3-dark.css`의 `body{}`·`*{}`·`::selection`·`html{scroll-behavior}` 등 bare 전역 셀렉터는 SPA 공유 `#root`에서 타 라우트로 누출 위험. **CSS 값은 절대 변형 금지**. 완화 = (권장) admission 루트 래퍼 클래스로 스코프 시도하되 위험하면 보류하고, **무변경 검수에 "/admission 진입·이탈 후 Gateway·계산기 영향 0" 게이트를 필수**로 둔다.
6. **OAuth `returnTo` 비대칭 보존**: `openApply`는 `pathname+hash+'?modal=apply'`(hash 포함), **제출 401**은 `pathname+'?modal=apply'`(hash 미포함). 제출 401 분기에서 `buildReturnTo`(hash 포함)를 재사용하지 말고 원본대로 hash 없는 문자열을 직접 생성. 패리티 하니스 '리다이렉트 URL 문자열 동일' 시나리오로 검증.
7. **하니스 카운트다운 동결 대상 = `#cd-status`(+`#dday`)**. `#cd-title`은 정적 라벨(`원서접수 2026.7.9~7.16`)이므로 시간동결 비교 대상에서 제외(오탐 방지). `targets.mjs` 반영.
8. **Task 번호**: 최종 실행 시 섹션명으로 식별(영역별 자체 번호 유지). 라우팅 섹션의 `Task A·B`=단계1, `Task F·G·H`=단계4.

## 검증 하니스 2종 관계
- `scripts/parity-check.mjs` (단계0): **픽셀 diff + 텍스트/DOM + 동작 시나리오** — 무변경 1:1 검증의 핵심.
- 라우팅 섹션의 `routes.smoke` (있으면): **라우트 도달성 스모크** — 역할 분담(패리티 vs 스모크)으로 양립.

## spec 커버리지 (critic 확인)
spec 12개 섹션 전부 task로 커버됨. 의도적 보류(`components/`·`styles/` 통폐합·룩 통일)는 spec §4·§12와 정합. 실질 누락 없음.


---

<!-- ===== 섹션 [A] 단계0 하니스 ===== -->
## 단계 0 — 안전 기반 + 검증 하니스

> 산출물 파일: `frontend/scripts/parity-check.mjs`(진입점) + `frontend/scripts/lib/{chrome-path,targets,compare}.mjs`(순수 모듈) + `frontend/scripts/parity-check.test.mjs`(단위 테스트). 실행: `cd frontend && npm run parity -- <targets> --local http://localhost:<임의포트>` 또는 `node scripts/parity-check.mjs ...`. 단위 테스트: `npm run test:parity`.

### Task 0: 복원 기준점 고정 + 작업 브랜치 생성

**Files:** (코드 변경 없음 — git 상태만 조작)

**Interfaces:**
- Produces: 복원 태그 `pre-react-migration`(현재 HEAD `245ab92` 고정), 작업 브랜치 `feat/react-migration`.

- [ ] **Step 1: 클린·HEAD 확인** — `git status --porcelain` 비어 있고 HEAD=`245ab92…` 확인. dirty면 중단·보고.
- [ ] **Step 2: 복원 태그 생성** — `git tag -a pre-react-migration -m "restore point before static-HTML→React migration"`. (주의: spec이 적은 `870a963`은 spec 작성 전 값이므로 무시, 실제 HEAD를 고정.)
- [ ] **Step 3: 작업 브랜치** — `git switch -c feat/react-migration`. Expected: `Switched to a new branch`.
- [ ] **Step 4: 고정 확인** — `git rev-list -n1 pre-react-migration`(=245ab92) + `git branch --show-current`(=feat/react-migration).

> 커밋 없음(태그·브랜치는 워킹트리 변경 아님). 다음 Task부터 커밋.

---

### Task 1: Chrome 실행파일 경로 탐지 (순수 함수 + 단위 테스트)

**Files:**
- Create: `frontend/scripts/lib/chrome-path.mjs`
- Test: `frontend/scripts/parity-check.test.mjs`

**Interfaces:**
- Produces: `resolveChromePath(env, candidates, existsFn): string`(env override[`PUPPETEER_EXECUTABLE_PATH`/`CHROME_PATH`]가 존재하면 우선, 아니면 첫 존재 후보, 없으면 throw), `DEFAULT_CHROME_CANDIDATES: string[]`(Windows Chrome/Edge 기본 경로 — 확인된 실경로 `C:/Program Files/Google/Chrome/Application/chrome.exe` 포함).

- [ ] **Step 1: 실패 테스트 작성** — `frontend/scripts/parity-check.test.mjs` 생성. `node:test`+`node:assert/strict`. 케이스: env override 우선 / `PUPPETEER_EXECUTABLE_PATH`도 인정 / 첫 존재 후보 폴백 / 존재 안 하는 override는 무시·폴백 / 없으면 `/Chrome not found/` throw / `DEFAULT_CHROME_CANDIDATES`에 알려진 Chrome 경로 포함.
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveChromePath, DEFAULT_CHROME_CANDIDATES } from './lib/chrome-path.mjs';
test('env override wins when it exists', () => {
  assert.equal(resolveChromePath({ CHROME_PATH: 'X:/c/chrome.exe' }, DEFAULT_CHROME_CANDIDATES, p => p === 'X:/c/chrome.exe'), 'X:/c/chrome.exe');
});
test('falls back to first existing candidate', () => {
  assert.equal(resolveChromePath({}, ['A/none.exe','B/chrome.exe'], p => p === 'B/chrome.exe'), 'B/chrome.exe');
});
test('throws when nothing found', () => {
  assert.throws(() => resolveChromePath({}, ['A/x.exe'], () => false), /Chrome not found/);
});
test('candidates include known Chrome path', () => {
  assert.ok(DEFAULT_CHROME_CANDIDATES.some(p => p.includes('Google/Chrome/Application/chrome.exe')));
});
```
- [ ] **Step 2: 실패 확인** — `node --test frontend/scripts/parity-check.test.mjs` → FAIL `Cannot find module … chrome-path.mjs`.
- [ ] **Step 3: 구현** — `frontend/scripts/lib/chrome-path.mjs`:
```js
export const DEFAULT_CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
];
export function resolveChromePath(env, candidates, existsFn) {
  const override = env.PUPPETEER_EXECUTABLE_PATH || env.CHROME_PATH;
  if (override && existsFn(override)) return override;
  for (const c of candidates) if (existsFn(c)) return c;
  throw new Error('Chrome not found. CHROME_PATH 또는 PUPPETEER_EXECUTABLE_PATH 환경변수로 chrome.exe 경로를 지정하세요.');
}
```
- [ ] **Step 4: 통과 확인** — `node --test …test.mjs` → PASS (6 tests).
- [ ] **Step 5: 커밋** — `git add frontend/scripts/lib/chrome-path.mjs frontend/scripts/parity-check.test.mjs && git commit -m "test(parity): Chrome 실행파일 경로 탐지 순수함수"` (+ Co-Authored-By 트레일러).

---

### Task 2: 검증 대상·셀렉터·시나리오 정의 (데이터 모듈 + 단위 테스트)

**Files:**
- Create: `frontend/scripts/lib/targets.mjs`
- Modify: `frontend/scripts/parity-check.test.mjs`(테스트 append)

**Interfaces:**
- Produces: `TARGETS: Target[]`(`{ key, livePath, localPath, textSelectors[], domCountSelectors[], scenarios[] }`, 4종: arise/eligibility/scholarship/admission), `resolveTargets(filterKeys, all=TARGETS): Target[]`(빈 필터=전체, 알 수 없는 key throw).

- [ ] **Step 1: 실패 테스트 append** — 4종 모두 정의 / 각 대상 live·local 경로·시나리오 보유 / 빈 필터=전체 / 특정 key 선택 / 알 수 없는 key `/unknown target/i` throw / admission 시나리오에 카운트다운·디렉터리·모달 포함.
- [ ] **Step 2: 실패 확인** — `node --test …test.mjs` → FAIL `Cannot find module … targets.mjs`.
- [ ] **Step 3: 구현** — `frontend/scripts/lib/targets.mjs`. 셀렉터·시나리오는 원본에서 확인한 실제 마커 사용. 핵심값:
  - arise: `livePath='/arise.html'`, `localPath='/arise.html'`(단계1에서 `/`로 301 검증 전환), 시나리오=prod 301 확인.
  - eligibility: `textSelectors=['title','h1','.lead','#result','#resultBasis']`, `domCountSelectors=['select','input','.card']`, 시나리오=계열/단과대학 선택→밴드 pill / 수동입력 토글 / 동일입력→tier·`#resultBasis` 동일 / 미입력 폼에러.
  - scholarship: `textSelectors=['title','h1','.lead','#result']`, `domCountSelectors=['select','input','.card','.seg']`, 시나리오=세그먼트 토글 분기 / 동일입력→연계·SAM·BK21·연구지원 판정 동일 / 폼에러.
  - admission: `textSelectors=['title','#cd-title','#cd-status','h1','h2','h3']`, `domCountSelectors=['[data-view]','.dept-card','.ix','.dbadge']`, 시나리오=data-view 타일 전환+`location.hash` 동기 / hashchange 직접진입 / 카운트다운 `#cd-status`·`#cd-title`(시간 동결 비교) / `/api/departments`→계열→학과→세부전공 필터 / BK21 토글 / 신청모달 미인증 시 `/auth/google?returnTo=…&modal=apply` 리다이렉트 / 모달 학과·세부전공 담기·제거.
```js
export function resolveTargets(filterKeys, all = TARGETS) {
  if (!filterKeys || filterKeys.length === 0) return all;
  return filterKeys.map((k) => {
    const t = all.find((x) => x.key === k);
    if (!t) throw new Error(`unknown target: ${k} (valid: ${all.map((x) => x.key).join(',')})`);
    return t;
  });
}
```
- [ ] **Step 4: 통과 확인** — `node --test …test.mjs` → PASS (12 tests 누적).
- [ ] **Step 5: 커밋** — `git add frontend/scripts/lib/targets.mjs frontend/scripts/parity-check.test.mjs && git commit -m "test(parity): 검증 대상·셀렉터·시나리오 정의"` (+ 트레일러).

---

### Task 3: 비교 순수 함수 — 텍스트/DOM 정규화 + PNG 픽셀 diff (단위 테스트)

**Files:**
- Create: `frontend/scripts/lib/compare.mjs`
- Modify: `frontend/scripts/parity-check.test.mjs`(테스트 append + 테스트전용 `makeSolidPng`/`crc32`/`chunk` 헬퍼)

**Interfaces:**
- Produces: `normalizeText(s):string`(공백 축약·trim·NBSP→space), `diffTextMap(liveMap, localMap):{selector,live,local}[]`(불일치만), `diffCountMap(liveMap, localMap):{selector,live,local}[]`(개수 불일치만), `decodePngRaw(buffer):{width,height,data:Uint8Array(RGBA)}`(외부의존 0, `node:zlib` inflate, 8-bit colorType 2/6, filter 0~4), `pixelDiff(a, b, {threshold=12}):{width,height,mismatched,total,ratio,sizeMismatch}`(채널 합산 절대차>threshold만 카운트, 크기 다르면 sizeMismatch+작은쪽 비교).

- [ ] **Step 1: 실패 테스트 append** — normalizeText / diffTextMap(동일=빈배열, 다르면 항목) / diffCountMap(불일치만) / pixelDiff(동일=0, threshold미만 무시, 초과 카운트, 크기다름 sizeMismatch) / decodePngRaw 라운드트립(테스트전용 `makeSolidPng`로 1x1 합성→디코드 검증).
- [ ] **Step 2: 실패 확인** — FAIL `Cannot find module … compare.mjs`.
- [ ] **Step 3: 구현** — `frontend/scripts/lib/compare.mjs`:

```js
import zlib from 'node:zlib';

export function normalizeText(s) {
  if (s == null) return '';
  return String(s).replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}

export function diffTextMap(liveMap, localMap) {
  const out = [];
  const keys = new Set([...Object.keys(liveMap || {}), ...Object.keys(localMap || {})]);
  for (const selector of keys) {
    const live = normalizeText(liveMap?.[selector]);
    const local = normalizeText(localMap?.[selector]);
    if (live !== local) out.push({ selector, live, local });
  }
  return out;
}

export function diffCountMap(liveMap, localMap) {
  const out = [];
  const keys = new Set([...Object.keys(liveMap || {}), ...Object.keys(localMap || {})]);
  for (const selector of keys) {
    const live = liveMap?.[selector] ?? 0;
    const local = localMap?.[selector] ?? 0;
    if (live !== local) out.push({ selector, live, local });
  }
  return out;
}

// --- 최소 PNG 디코더 (node:zlib inflate; 8-bit colorType 2/6; filter 0~4) ---
const PNG_SIG = [137, 80, 78, 71, 13, 10, 26, 10];

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

export function decodePngRaw(buffer) {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  for (let i = 0; i < 8; i++) if (buf[i] !== PNG_SIG[i]) throw new Error('not a PNG');
  let pos = 8, width = 0, height = 0, bitDepth = 0, colorType = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos); pos += 4;
    const type = buf.toString('ascii', pos, pos + 4); pos += 4;
    const data = buf.subarray(pos, pos + len); pos += len + 4; // +4 = CRC skip
    if (type === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); bitDepth = data[8]; colorType = data[9]; }
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
  }
  if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6))
    throw new Error(`unsupported PNG (bitDepth=${bitDepth}, colorType=${colorType}); expected 8-bit truecolor(2)/truecolor+alpha(6)`);
  const channels = colorType === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = new Uint8Array(width * height * 4);
  let prev = new Uint8Array(stride), rp = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[rp++];
    const cur = new Uint8Array(stride);
    for (let x = 0; x < stride; x++) {
      const rb = raw[rp++];
      const a = x >= channels ? cur[x - channels] : 0;
      const b = prev[x];
      const c = x >= channels ? prev[x - channels] : 0;
      let v;
      switch (filter) {
        case 0: v = rb; break;
        case 1: v = rb + a; break;
        case 2: v = rb + b; break;
        case 3: v = rb + ((a + b) >> 1); break;
        case 4: v = rb + paeth(a, b, c); break;
        default: throw new Error('unknown PNG filter ' + filter);
      }
      cur[x] = v & 0xff;
    }
    for (let x = 0; x < width; x++) {
      const si = x * channels, di = (y * width + x) * 4;
      out[di] = cur[si]; out[di + 1] = cur[si + 1]; out[di + 2] = cur[si + 2];
      out[di + 3] = channels === 4 ? cur[si + 3] : 255;
    }
    prev = cur;
  }
  return { width, height, data: out };
}

export function pixelDiff(a, b, { threshold = 12 } = {}) {
  const sizeMismatch = a.width !== b.width || a.height !== b.height;
  const w = Math.min(a.width, b.width), h = Math.min(a.height, b.height);
  let mismatched = 0; const total = w * h;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const ia = (y * a.width + x) * 4, ib = (y * b.width + x) * 4;
    const d = Math.abs(a.data[ia] - b.data[ib]) + Math.abs(a.data[ia + 1] - b.data[ib + 1])
      + Math.abs(a.data[ia + 2] - b.data[ib + 2]) + Math.abs(a.data[ia + 3] - b.data[ib + 3]);
    if (d > threshold) mismatched++;
  }
  return { width: w, height: h, mismatched, total, ratio: total ? mismatched / total : 0, sizeMismatch };
}
```
- [ ] **Step 4: 통과 확인** — `node --test …test.mjs` → PASS (21 tests 누적).
- [ ] **Step 5: 커밋** — `git add frontend/scripts/lib/compare.mjs frontend/scripts/parity-check.test.mjs && git commit -m "test(parity): 텍스트/DOM diff + PNG 픽셀비교 순수함수"` (+ 트레일러).

---

### Task 4: 패리티 하니스 진입점 parity-check.mjs (오케스트레이션)

**Files:**
- Create: `frontend/scripts/parity-check.mjs`
- Modify: `frontend/package.json`(scripts.parity / test:parity 추가)

**Interfaces:**
- Consumes: Task1 `resolveChromePath`/`DEFAULT_CHROME_CANDIDATES`, Task2 `TARGETS`/`resolveTargets`, Task3 `normalizeText`/`diffTextMap`/`diffCountMap`/`pixelDiff`/`decodePngRaw`, `puppeteer-core`.
- CLI: `node scripts/parity-check.mjs [targets] [--live <base>=https://arise-ai.pusan.ac.kr] [--local <base>=http://localhost:5173] [--viewport WxH,...=1280x800,390x844] [--out=frontend/.shot] [--threshold=12] [--no-live]`. 포트 충돌 회피 위해 `--local`로 임의 포트 지정. 종료코드 0=통과/1=회귀.

- [ ] **Step 1: package.json 스크립트 추가** — `"parity": "node scripts/parity-check.mjs"`, `"test:parity": "node --test scripts/parity-check.test.mjs"`.
- [ ] **Step 2: 진입점 작성** — `frontend/scripts/parity-check.mjs`(전체 코드 plan Task 4 참조). 핵심: `puppeteer.launch({ executablePath: exe, headless:'new' })`; 각 target×viewport마다 로컬·(옵션)라이브 `page.goto`→풀페이지 PNG·텍스트맵·노드개수 추출; `evaluateOnNewDocument`로 `Date` 동결(2026-06-22 고정 — 카운트다운 시간의존 패리티 위험 제거); `.shot/<key>_<WxH>_{local,live}.png` 저장; `pixelDiff`+`diffTextMap`+`diffCountMap`로 회귀 집계; 시나리오 체크리스트 콘솔 출력; `parity-summary.json` 기록.
- [ ] **Step 3: .shot/ gitignore 확인** — `git check-ignore frontend/.shot/x.png` 출력됨(이미 `.gitignore`에 `.shot/` 존재). 없으면 추가.
- [ ] **Step 4: 단위 테스트 회귀** — `cd frontend && npm run test:parity` → PASS (21 tests, 진입점이 순수모듈 안 깸).
- [ ] **Step 5: 스모크(라이브 무중단)** — 임의 포트 dev 기동 `cd frontend && npx vite --port 5188 --strictPort` 후 `cd frontend && npm run parity -- eligibility --no-live --local http://localhost:5188 --viewport 1280x800`. Expected: `[parity] chrome: …chrome.exe`, `.shot/eligibility_1280x800_local.png` 생성, 시나리오 체크리스트 출력, 종료코드 0. (라이브 풀런 `npm run parity -- eligibility,scholarship --local http://localhost:5188`은 단계1~4 검증 시 사용 — 단계0에선 동작만 확인해 라이브/접수기간 영향 회피.)
- [ ] **Step 6: 커밋** — `git add frontend/scripts/parity-check.mjs frontend/package.json && git commit -m "feat(parity): puppeteer-core 패리티 검증 하니스 진입점"` (+ 트레일러).


---

<!-- ===== 섹션 [B] 단계1·4 + 라우팅/리다이렉트 인프라 ===== -->
> 이 섹션은 전체 마이그레이션 플랜 중 **[담당] 단계 1 + 단계 4 + 라우팅/리다이렉트 인프라**만 다룬다. 계산기 2종(단계 2)·admission 분해(단계 3)는 별도 섹션 담당. 본 섹션의 Task는 그 두 단계의 **앞(인프라 Task A·B)과 뒤(마감 Task F·G·H)**에 배치된다.
>
> **검증 도구 현실**: frontend에 테스트 러너 없음(vitest/jest 부재). 존재하는 것: `puppeteer-core`(단계 0 하니스용) + backend `node --test`. 따라서 본 섹션의 "실패 테스트→통과"는 **puppeteer 기반 라우팅 하니스**(`frontend/test/routes.smoke.mjs`, Node 내장 `node:test`로 구동)와 **`vite build` 성공**으로 구현한다. 순수 신규 로직(리다이렉트 라우트·하니스)은 완전 코드, src/ 파일 이동은 레시피+경로맵으로 적는다.

### 핵심 설계 결정 — `.html` URL 보존 메커니즘 (React Router 권장)

세 후보를 검토한 결과 **React Router `<Navigate replace>`** 를 단일 채택한다.

| 후보 | dev 동작 | prod 동작 | 판정 |
|---|---|---|---|
| **React Router `<Navigate>`** | `public/*.html` 삭제 후 Vite SPA fallback→`index.html`→RR이 처리 | `.html` 파일 삭제 후 `express.static` miss→`app.get('*')` fallback→`index.html`→RR이 처리 | **채택** — dev·prod 동일 경로, 코드 1곳, SPA 무깜빡임 |
| Express `res.redirect` | dev엔 Express가 안 끼어듦(Vite 5173 단독) → dev/prod 불일치 | 가능하나 dev 미적용 | 탈락(이중 유지) |
| nginx `return 301` | dev에 nginx 없음 → 검증 불가 | 가능 | 탈락(단, arise는 **이미** nginx 301 존재 → 그건 유지) |

**왜 dev·prod 동일이 핵심인가**: 무변경 검수를 "로컬(dev)에서 라이브와 1:1 대조"로 하는데, 리다이렉트가 dev에 없으면 검증 자체가 불가. RR 방식은 `.html`을 `public/`에서 지운 그 순간부터 dev·prod 양쪽에서 동작한다.

**전제 조건(중요)**: RR 리다이렉트는 해당 `.html`이 `public/`에 **존재하지 않을 때만** 발동한다. 파일이 남아있으면 dev Vite·prod `express.static`이 정적 파일을 **먼저** 가로채 RR까지 도달하지 못한다. 따라서 각 `.html` 삭제 Task와 그에 대응하는 `<Navigate>` 등록 Task는 **반드시 한 커밋**으로 묶는다(중간 상태에서 깨지지 않게).

**arise 예외**: `arise.html`은 **이미 prod nginx에서 `/`로 301** 처리 중(`deploy/nginx/conf.d/arise-ai.conf:48-50`). 이 nginx 규칙은 외부망/QR 보호용으로 **유지**하고, RR에는 보강용으로 `/arise.html → /` Navigate를 추가한다(dev에서도 동작하도록).

---

### Task A: 라우팅/리다이렉트 인프라 — App.jsx 라우트 골격 + `.html` 리다이렉트 + 라우팅 스모크 하니스

> 단계 2·3에서 만들 새 라우트(`/eligibility`·`/scholarship`·`/admission`)와 그 `.html` 리다이렉트의 **목적지 라우트를 먼저 등록**한다. 단계 2·3은 이 라우트의 `element=` 를 placeholder→실제 컴포넌트로 바꾸기만 하면 된다(병렬 작업 가능). 본 Task에서 새 컴포넌트는 만들지 않고, 임시 placeholder element로 라우트만 깐다.

**Files:**
- Modify: `frontend/src/App.jsx` (현 전체 — 1:1은 아래 신규 코드로 치환)
- Create: `frontend/test/routes.smoke.mjs` (puppeteer 라우팅 하니스)
- Modify: `frontend/package.json` (scripts에 `test:routes` 추가)

**Interfaces:**
- Produces: App.jsx가 다음 라우트를 export 함 — `/`(Gateway), `/eligibility`(placeholder), `/scholarship`(placeholder), `/admission`(placeholder), 그리고 리다이렉트 라우트 `/eligibility.html`·`/scholarship.html`·`/admission-v3-dark.html`·`/arise.html`. 단계 2는 `/eligibility`·`/scholarship` element를 `EligibilityCheck`·`ScholarshipCheck`로 교체. 단계 3은 `/admission`을 `AdmissionPage`로 교체.
- Consumes: 기존 `Gateway`, `Login`, `AdminLogin`, `AdminDashboard`, `DeptEditRequest`, Bymonolog/Google variant 컴포넌트(경로는 Task F의 이동 후 기준 — 단, **Task A 시점엔 아직 `./pages/`** 이므로 import 경로는 현행 유지. Task F에서 일괄 갱신).

- [ ] **Step 1: 라우팅 스모크 하니스 작성(실패 테스트)** — `frontend/test/routes.smoke.mjs`

```js
// 라우팅/리다이렉트 스모크: 빌드된 dist를 정적 서빙(SPA fallback 포함)하고
// puppeteer로 경로별 최종 URL·핵심 DOM을 확인한다. node --test로 구동.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const DIST = resolve(__dirname, '..', 'dist');
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
  '.json':'application/json', '.woff2':'font/woff2', '.jpg':'image/jpeg',
  '.png':'image/png', '.svg':'image/svg+xml', '.mp4':'video/mp4', '.ico':'image/x-icon' };

// prod Express와 동일한 규칙을 최소 재현: 정적 우선 → 없으면 index.html(SPA fallback)
let server, browser, base;
before(async () => {
  server = createServer(async (req, res) => {
    const path = decodeURIComponent((req.url || '/').split('?')[0]);
    let file = join(DIST, path === '/' ? 'index.html' : path);
    try {
      const st = await stat(file);
      if (st.isDirectory()) file = join(file, 'index.html');
    } catch {
      file = join(DIST, 'index.html'); // SPA fallback
    }
    try {
      const buf = await readFile(file);
      res.setHeader('Content-Type', MIME[extname(file).toLowerCase()] || 'application/octet-stream');
      res.end(buf);
    } catch { res.statusCode = 404; res.end('nf'); }
  });
  await new Promise(r => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}`;
  // CHROME_PATH 환경변수로 크롬 실행파일 지정(폐쇄망/Windows 대응)
  browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH,
    headless: 'new', args: ['--no-sandbox'],
  });
});
after(async () => { await browser?.close(); server?.close(); });

async function gotoFinalPath(path) {
  const page = await browser.newPage();
  await page.goto(base + path, { waitUntil: 'networkidle0' });
  // RR replace 후 클라이언트 URL
  const finalPath = await page.evaluate(() => location.pathname);
  const html = await page.content();
  await page.close();
  return { finalPath, html };
}

test('게이트웨이 /가 렌더된다', async () => {
  const { finalPath } = await gotoFinalPath('/');
  assert.equal(finalPath, '/');
});

test('/eligibility.html → /eligibility 로 리다이렉트', async () => {
  const { finalPath } = await gotoFinalPath('/eligibility.html');
  assert.equal(finalPath, '/eligibility');
});

test('/scholarship.html → /scholarship 로 리다이렉트', async () => {
  const { finalPath } = await gotoFinalPath('/scholarship.html');
  assert.equal(finalPath, '/scholarship');
});

test('/admission-v3-dark.html → /admission 로 리다이렉트', async () => {
  const { finalPath } = await gotoFinalPath('/admission-v3-dark.html');
  assert.equal(finalPath, '/admission');
});

test('/arise.html → / 로 리다이렉트(보강)', async () => {
  const { finalPath } = await gotoFinalPath('/arise.html');
  assert.equal(finalPath, '/');
});
```

- [ ] **Step 2: 하니스 실행 → 실패 확인**

`frontend/package.json`의 scripts에 추가:
```json
    "test:routes": "node --test test/routes.smoke.mjs"
```
Run (frontend 디렉터리): `set CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe && npm run build && npm run test:routes`
Expected: FAIL — 현 App.jsx엔 `/eligibility` 등 라우트·리다이렉트가 없어 `/eligibility.html`이 (a) 빌드 전엔 `public/eligibility.html` 정적본으로 떠 `finalPath`가 `/eligibility.html`로 남음 → assert 불일치. (`/arise.html`도 동일)

- [ ] **Step 3: App.jsx 신규 라우트 골격 + 리다이렉트 구현**

App.jsx 전체를 아래로 치환. (변경점: 죽은 `RedirectToAdmission` 제거, 새 라우트·`<Navigate>` 리다이렉트 추가. import 경로는 **현행 `./pages/` 유지** — 파일 이동은 Task F에서.)
```jsx
import { Routes, Route, Navigate } from 'react-router-dom';

// Pages & Auth
import Gateway from './pages/Gateway.jsx';
import Login from './pages/Login.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import DeptEditRequest from './pages/DeptEditRequest.jsx';

// Bymonolog variant
import BymonologPage from './variants/bymonolog/page.jsx';
import BymonologHubPage from './variants/bymonolog/hub/page.jsx';
import BymonologGradPage from './variants/bymonolog/grad/page.jsx';
import BymonologAuraPage from './variants/bymonolog/aura/page.jsx';

// Google variant
import GooglePage from './variants/google/page.jsx';

// 단계 2·3에서 실제 컴포넌트로 교체할 placeholder.
// (이 Task에서는 라우트 자리만 확보 — element 교체는 각 단계 담당)
function Placeholder({ name }) {
  return <div className="container">[{name}] 준비 중 — 단계별 이식 대기</div>;
}

export default function App() {
  return (
    <Routes>
      {/* Gateway */}
      <Route path="/" element={<Gateway />} />

      {/* 계산기 2종 (단계 2에서 element 교체) */}
      <Route path="/eligibility" element={<Placeholder name="EligibilityCheck" />} />
      <Route path="/scholarship" element={<Placeholder name="ScholarshipCheck" />} />

      {/* admission (단계 3에서 element 교체) */}
      <Route path="/admission" element={<Placeholder name="AdmissionPage" />} />

      {/* Admin */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminDashboard />} />

      {/* Auth / Login */}
      <Route path="/login" element={<Login />} />

      {/* 학과 정보 수정 신청 */}
      <Route path="/dept-edit-request" element={<DeptEditRequest />} />

      {/* Bymonolog routes */}
      <Route path="/bymonolog" element={<BymonologPage />} />
      <Route path="/bymonolog/hub" element={<BymonologHubPage />} />
      <Route path="/bymonolog/grad" element={<BymonologGradPage />} />
      <Route path="/bymonolog/aura" element={<BymonologAuraPage />} />

      {/* Google variant */}
      <Route path="/google" element={<GooglePage />} />

      {/* === 레거시 .html URL 보존(외부 링크·QR·북마크) === */}
      {/* 전제: 대응 public/*.html 파일이 삭제되어 있어야 발동(단계 2·3에서 같은 커밋으로 삭제) */}
      <Route path="/eligibility.html" element={<Navigate to="/eligibility" replace />} />
      <Route path="/scholarship.html" element={<Navigate to="/scholarship" replace />} />
      <Route path="/admission-v3-dark.html" element={<Navigate to="/admission" replace />} />
      {/* arise는 nginx에서 이미 301(/) — RR 보강(dev 포함) */}
      <Route path="/arise.html" element={<Navigate to="/" replace />} />

      {/* Fallback to gateway */}
      <Route path="*" element={<Gateway />} />
    </Routes>
  );
}
```

- [ ] **Step 4: 하니스 실행 → 통과 확인**

먼저 `/arise.html`이 발동하려면 `public/arise.html`이 없어야 하나, 그 삭제는 Task B다. **순서 의존**: Task A의 하니스 중 `/arise.html`·`/eligibility.html`·`/scholarship.html`·`/admission-v3-dark.html` 케이스는 각 `.html` 삭제 Task(B/단계2/단계3) 완료 후에 GREEN이 된다. 본 Step에서는 `/`·`/eligibility`·`/scholarship`·`/admission`(직접 접근) 4건이 PASS함을 확인하고, 리다이렉트 4건은 `// TODO: 대응 .html 삭제 후 GREEN` 주석으로 `{ skip: true }` 표시했다가 해당 삭제 Task에서 skip 해제한다.

App.jsx에 직접 접근 라우트가 생겼으므로 `/eligibility`·`/scholarship`·`/admission` 직접 방문 3건 + `/` 1건:
Run: `npm run build && npm run test:routes`
Expected: 직접접근 4건 PASS. (리다이렉트 4건은 skip 상태)

- [ ] **Step 5: 커밋**

```bash
git add frontend/src/App.jsx frontend/test/routes.smoke.mjs frontend/package.json
git commit -m "feat(routing): React Router 라우트 골격 + .html 리다이렉트 인프라 + 스모크 하니스

- /eligibility·/scholarship·/admission 라우트 placeholder 선등록(단계2·3 element 교체 대상)
- 레거시 .html → 새 라우트 <Navigate replace> (대응 public/*.html 삭제 시 발동)
- 죽은 RedirectToAdmission 헬퍼 제거
- puppeteer 라우팅 스모크 하니스(node --test) 추가

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task B: 단계 1 — `arise.html` 삭제 + `/arise.html→/` 리다이렉트(nginx 유지 + RR 보강) 검증

> arise는 **이미 prod 301**이고 React `Gateway`가 `/`를 차지한 상태. 남은 일은 (1) 죽은 `public/arise.html` 삭제, (2) 죽은 dev `rootToArise` 미들웨어 제거(이미 plugins 미등록), (3) nginx 301 규칙 **유지** 확인, (4) RR 보강 리다이렉트 GREEN 전환.

**Files:**
- Delete: `frontend/public/arise.html`
- Modify: `frontend/vite.config.js` (죽은 `rootToArise` 객체 + 주석 제거 — plugins엔 원래 미등록이므로 동작 변화 없음)
- Modify: `frontend/test/routes.smoke.mjs` (`/arise.html` 케이스 skip 해제)
- Verify(무수정): `deploy/nginx/conf.d/arise-ai.conf:48-50` (`location = /arise.html { return 301 https://$host/; }` 그대로 유지)

**Interfaces:**
- Consumes: Task A의 `/arise.html → /` Navigate 라우트.
- Produces: 없음(정리 Task).

- [ ] **Step 1: `/arise.html` 스모크 skip 해제(실패 테스트로 전환)**

`frontend/test/routes.smoke.mjs`의 `/arise.html` 테스트에서 `{ skip: true }`(있다면) 제거.
- [ ] **Step 2: 실패 확인** — Run: `npm run build && npm run test:routes`
Expected: FAIL — 아직 `public/arise.html`이 빌드돼 dist에 남아 정적 우선 서빙 → `finalPath`가 `/arise.html`(또는 arise 페이지 DOM). RR 미발동.

- [ ] **Step 3: `arise.html` 삭제 + 죽은 vite 미들웨어 제거**

(a) 파일 삭제:
```bash
git rm frontend/public/arise.html
```
(b) `frontend/vite.config.js`에서 `rootToArise` 블록 제거. 현재 `vite.config.js:17-31`의 다음 죽은 코드를 통째로 삭제:
```js
// dev 전용: 루트(/) → arise-ai 게이트웨이(arise.html). 빌드/프로덕션엔 영향 없음.
const rootToArise = {
  name: 'root-to-arise',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const path = (req.url || '').split('?')[0];
      if (path === '/' || path === '/index.html') {
        res.statusCode = 302;
        res.setHeader('Location', '/arise.html');
        return res.end();
      }
      next();
    });
  },
};
```
(plugins 배열은 `[react(), tailwindcss(), serveS30]` 그대로 — `rootToArise`는 원래 미등록이라 제거해도 동작 무변경. dev에서 `/`는 Vite가 `index.html`(React Gateway) 서빙으로 이미 동작.)

- [ ] **Step 4: 통과 확인**

Run: `npm run build && npm run test:routes`
Expected: `/arise.html → /` PASS. 기존 직접접근 4건도 PASS.
추가 수동 확인(dev): `npm run dev` 후 브라우저 `http://localhost:5173/` → React Gateway 표시(arise 정적 아님). `http://localhost:5173/arise.html` → `/`로 이동.

- [ ] **Step 5: nginx 규칙 유지 확인(무수정)**

`deploy/nginx/conf.d/arise-ai.conf`의 `location = /arise.html { return 301 https://$host/; }`가 **그대로 존재**하는지 눈으로 확인(수정 금지). 이유: 외부망 nginx 301은 RR 도달 전 단계에서 캐시·QR을 보호하는 1차 방어선. RR은 dev·내부 보강.

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "refactor(stage1): 죽은 arise.html 삭제 + dev rootToArise 미들웨어 제거

- frontend/public/arise.html 삭제(prod는 이미 nginx 301 → /, React Gateway가 / 차지)
- vite.config.js의 미등록(dead) rootToArise 플러그인 객체 제거 — 동작 무변경
- nginx /arise.html 301 규칙은 외부망 보호용으로 유지
- 스모크: /arise.html → / GREEN

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

> **여기서 단계 2(EligibilityCheck·ScholarshipCheck)·단계 3(AdmissionPage 분해)가 진행된다(별도 섹션 담당).** 각 단계는: 새 컴포넌트 작성 → App.jsx의 대응 placeholder element 교체 → **같은 커밋에서** `public/<해당>.html` 삭제 + 스모크 리다이렉트 케이스 skip 해제. 아래 Task F~H는 그 단계들이 끝난 뒤의 마감 작업이다.

---

### Task F: 단계 4(1/3) — `src/` 구조 재편 (pages/ → routes/, 관리자 → routes/admin/)

> 목표 구조(spec 5절): `src/{routes,components,hooks,lib,styles}`. 본 Task는 **파일 이동 + import 경로 갱신만** — 코드 내용·DOM·CSS 값은 **1바이트도 변경 금지**(순수 mechanical move). `git mv`로 히스토리 보존.

**Files (이동 맵):**

| 현재 경로 | 이동 후 경로 | 비고 |
|---|---|---|
| `src/pages/Gateway.jsx` | `src/routes/Gateway.jsx` | |
| `src/pages/gateway.css` | `src/routes/gateway.css` | Gateway가 `./gateway.css` import → 동일 폴더라 import 경로 무변경 |
| `src/pages/Login.jsx` | `src/routes/Login.jsx` | `../api.js` → `../api.js`(routes/도 src/ 직속이라 동일 depth) |
| `src/pages/AdminLogin.jsx` | `src/routes/admin/AdminLogin.jsx` | depth +1 → 상대경로 갱신 필요 |
| `src/pages/AdminDashboard.jsx` | `src/routes/admin/AdminDashboard.jsx` | 형제 import(`./DeptDirectoryAdmin.jsx`) 유지, depth +1 |
| `src/pages/DeptDirectoryAdmin.jsx` | `src/routes/admin/DeptDirectoryAdmin.jsx` | |
| `src/pages/DeptChangeRequestsAdmin.jsx` | `src/routes/admin/DeptChangeRequestsAdmin.jsx` | |
| `src/pages/DeptEditRequest.jsx` | `src/routes/DeptEditRequest.jsx` | 상대 import 없음(자체완결) |
| `src/pages/eligibility.css` | (단계 2가 `routes/`로 옮김 — 이미 이동돼 있으면 skip) | |
| `src/pages/admission.css` | (단계 3이 `routes/admission/`로 옮김 — orphan AdmissionForm은 Task G에서 삭제) | |

> `variants/`, `lib/`, `api.js`, `fonts.js`, `styles.css`, `tailwind.css`, `main.jsx`는 spec 구조상 그대로 둔다(variants는 "기존 유지", lib는 이미 `lib/`). **styles/ 폴더로의 CSS 통폐합은 spec 4절에서 보류** — 이번 패스 범위 밖.

**Interfaces:**
- Consumes: Task A의 App.jsx(현재 `./pages/` import).
- Produces: App.jsx가 `./routes/`·`./routes/admin/` 경로로 import. AdminDashboard가 `./DeptDirectoryAdmin.jsx`·`./DeptChangeRequestsAdmin.jsx`(동일 폴더) import.

- [ ] **Step 1: 스모크가 이동 후에도 통과해야 함(가드)** — 현 스모크(`routes.smoke.mjs`)가 빌드 산출물 기준이라 import 경로가 깨지면 `vite build` 실패로 잡힌다. 별도 새 테스트 불필요. 이동 전 기준선: `npm run build && npm run test:routes` → 전부 PASS 확인(이동 전 GREEN 기록).

- [ ] **Step 2: `git mv`로 파일 이동**

```bash
cd frontend
mkdir -p src/routes/admin
git mv src/pages/Gateway.jsx              src/routes/Gateway.jsx
git mv src/pages/gateway.css              src/routes/gateway.css
git mv src/pages/Login.jsx                src/routes/Login.jsx
git mv src/pages/DeptEditRequest.jsx      src/routes/DeptEditRequest.jsx
git mv src/pages/AdminLogin.jsx           src/routes/admin/AdminLogin.jsx
git mv src/pages/AdminDashboard.jsx       src/routes/admin/AdminDashboard.jsx
git mv src/pages/DeptDirectoryAdmin.jsx   src/routes/admin/DeptDirectoryAdmin.jsx
git mv src/pages/DeptChangeRequestsAdmin.jsx src/routes/admin/DeptChangeRequestsAdmin.jsx
```

- [ ] **Step 3: import 경로 갱신 (mechanical)**

(a) `frontend/src/App.jsx` — import 경로 치환:
```jsx
import Gateway from './routes/Gateway.jsx';
import Login from './routes/Login.jsx';
import AdminLogin from './routes/admin/AdminLogin.jsx';
import AdminDashboard from './routes/admin/AdminDashboard.jsx';
import DeptEditRequest from './routes/DeptEditRequest.jsx';
```
(variants/google import은 무변경.)

(b) `frontend/src/routes/Login.jsx` — `import { api } from '../api.js';` → 경로 동일(`routes/`도 `src/` 직속, depth 동일) → **무변경**.

(c) `frontend/src/routes/Gateway.jsx` — `import './gateway.css';` → 동일 폴더 → **무변경**.

(d) `frontend/src/routes/admin/AdminLogin.jsx` — 상대 import 없음(`react-router-dom`만) → **무변경**.

(e) `frontend/src/routes/admin/AdminDashboard.jsx` — 형제 import 유지:
```jsx
import DeptDirectoryAdmin from './DeptDirectoryAdmin.jsx';
import DeptChangeRequestsAdmin from './DeptChangeRequestsAdmin.jsx';
```
(`./` 동일 폴더라 무변경. recharts·react-router-dom import도 무변경.)

(f) `frontend/src/routes/admin/DeptDirectoryAdmin.jsx`·`DeptChangeRequestsAdmin.jsx` — 내부 `fetch(...)` 절대경로 사용, 상대 import 없음 → **무변경**.

> 검증 보조: 이동 후 `frontend/src` 전체에서 `from './pages/`·`from '../pages/` 잔존 grep → 0건이어야 함.

- [ ] **Step 4: 빌드·스모크 통과 확인**

Run: `npm run build && npm run test:routes`
Expected: `vite build` 성공(미해결 import 없음), 스모크 전부 PASS(`/`·`/admin/login`·`/admin`·`/login`·`/dept-edit-request`·variant·리다이렉트). 추가: dev에서 `http://localhost:5173/admin/login` 렌더 수동 확인.

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "refactor(structure): src/pages → src/routes 재편 (관리자는 routes/admin/)

- Gateway·Login·DeptEditRequest → routes/
- AdminLogin·AdminDashboard·DeptDirectoryAdmin·DeptChangeRequestsAdmin → routes/admin/
- App.jsx import 경로 갱신, 코드/DOM/CSS 값 무변경(git mv 이력 보존)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task G: 단계 4(2/3) — orphan/죽은 코드 제거 (AdmissionForm.jsx · Eligibility.jsx · 잔여 dead)

> spec 10·11절. **검증 후** 제거 — 어느 라우트/컴포넌트에서도 import되지 않음을 grep으로 확인하고 삭제. `RedirectToAdmission`는 Task A에서 이미 제거됨. `rootToArise`는 Task B에서 이미 제거됨. 본 Task는 orphan 컴포넌트 2종 + 그 전용 CSS 처리.

**Files:**
- Delete: `frontend/src/pages/AdmissionForm.jsx` (orphan, 432줄 — 단계 3의 `AdmissionPage`가 대체)
- Delete: `frontend/src/pages/Eligibility.jsx` (orphan, 331줄 — 단계 2의 `EligibilityCheck`가 대체)
- 조건부 Delete: `frontend/src/pages/admission.css` — **단, 단계 3이 이 CSS를 `routes/admission/`로 이동·소비하면 삭제 금지.** AdmissionForm.jsx만 이 CSS를 import하는 게 아니라 단계3 산출물도 쓸 수 있으므로, 삭제 전 `import.*admission.css` grep으로 잔존 소비자 0건 확인 후에만 삭제.
- 조건부 Delete: `frontend/src/pages/eligibility.css` — 동일 원칙(단계 2가 `routes/`로 옮겼으면 `pages/` 잔본만 삭제).

**Interfaces:**
- Consumes: 없음(제거 대상이 무소비임을 검증).
- Produces: 없음.

- [ ] **Step 1: orphan 무참조 검증(실패 시 중단)**

Run (frontend): grep으로 import 참조 확인 —
```
grep -rn "AdmissionForm" src --include=*.jsx | grep -v "AdmissionForm.jsx:"
grep -rn "from .*pages/Eligibility" src
grep -rn "import.*['\"].*pages/Eligibility\.jsx" src
```
Expected: 0건(자기 자신 정의 라인 제외). 단계 2·3 산출물이 `routes/`에 있고 이름이 다르면(`EligibilityCheck`·`AdmissionPage`) 충돌 없음. **1건이라도 잡히면 삭제 보류하고 보고**.

- [ ] **Step 2: admission.css / eligibility.css 소비자 확인**

```
grep -rn "admission\.css" src
grep -rn "eligibility\.css" src
```
- `pages/admission.css`를 **오직** `pages/AdmissionForm.jsx`만 import → 둘 다 삭제 가능.
- 단계 3이 `routes/admission/`에서 별도 CSS를 쓰면 `pages/admission.css`는 무참조 → 삭제. (eligibility 동일)
- 결과에 따라 삭제 목록 확정.

- [ ] **Step 3: 삭제 실행**

```bash
git rm frontend/src/pages/AdmissionForm.jsx
git rm frontend/src/pages/Eligibility.jsx
# Step 2에서 무참조로 확인된 경우에만:
git rm frontend/src/pages/admission.css      # (단계3가 안 쓰면)
git rm frontend/src/pages/eligibility.css    # (단계2가 routes/로 옮겼으면)
```
> Task F 이후 `src/pages/`가 비면 폴더도 함께 사라진다(git은 빈 폴더 미추적).

- [ ] **Step 4: 빌드·스모크 통과 확인**

Run: `npm run build && npm run test:routes`
Expected: 빌드 성공(삭제된 파일을 아무도 import 안 함), 스모크 전부 PASS.

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "chore(stage4): orphan 컴포넌트 제거 (AdmissionForm·Eligibility + 잔여 CSS)

- 구버전 orphan AdmissionForm.jsx(432)·Eligibility.jsx(331) 삭제 — 단계2·3 산출물이 대체
- 무참조 확인된 pages/*.css 정리
- (RedirectToAdmission·rootToArise는 Task A·B에서 선제거)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task H: 단계 4(3/3) — 페이지 간 raw href/window.location → `<Link>` 교체 + server.js 정적/SPA fallback 검토

> spec 5절 원칙 2("페이지 간 이동은 `<Link>`"). **내부 라우트 이동만** `<Link>`로 바꾼다. 외부 링크(`https://e-onestop...`)·OAuth 전이동(`/auth/google`)·전화(`tel:`)·새 탭(`target=_blank`)·해시 같은 페이지 내 스크롤(`#intro`)은 **무변경**.

**Files:**
- Modify: `frontend/src/routes/Gateway.jsx` (1곳 — Task F 이동 후 경로)
- Verify(검토만): `backend/src/server.js:98-115` 정적 서빙 + SPA fallback이 새 구조와 충돌 없는지
- 참고(단계2·3 산출물 내 잔여 raw href 점검 체크리스트 — 해당 단계가 처리했어야 하나 마감에서 재확인)

**Interfaces:**
- Consumes: Task A의 `/admission` 라우트, Task F의 Gateway 경로.
- Produces: 없음.

- [ ] **Step 1: 게이트웨이 raw href → `<Link>` 교체 대상 식별(실패 테스트)**

`routes.smoke.mjs`에 SPA 무리로드 테스트 추가:
```js
test('게이트웨이 03 신청 카드는 SPA Link(전체 새로고침 없이 /admission)', async () => {
  const page = await browser.newPage();
  await page.goto(base + '/', { waitUntil: 'networkidle0' });
  // SPA 네비게이션이면 페이지 unload 없이 URL이 /admission으로 바뀐다
  await page.evaluate(() => { window.__navMarker = true; });
  await page.click('a.gateway-btn.apply');
  await page.waitForFunction(() => location.pathname === '/admission');
  const survived = await page.evaluate(() => window.__navMarker === true);
  await page.close();
  assert.equal(survived, true, 'full reload가 일어나 marker가 사라짐 → 아직 raw href');
});
```
- [ ] **Step 2: 실패 확인** — Run: `npm run build && npm run test:routes`
Expected: FAIL — `Gateway.jsx:97`이 `<a href="/admission-v3-dark.html">`라 클릭 시 (a) full reload로 `__navMarker` 소실 + (b) 목적지가 `/admission-v3-dark.html`(→리다이렉트→`/admission`)이라 marker 검사 실패.

- [ ] **Step 3: Gateway.jsx 신청 카드 `<a>` → `<Link>` 교체**

`frontend/src/routes/Gateway.jsx`의 03 카드(원본 `pages/Gateway.jsx:97-102` 미러)를 교체:
```jsx
            {/* Menu 3: 학·석사 연계과정 신청 (SPA 내부 라우트) */}
            <li>
              <Link className="gateway-btn apply" to="/admission">
                <span className="num">03</span>
                <strong>학·석사 연계과정 신청</strong>
                <span className="desc">대학원 연계과정 안내 · 학과 디렉터리 · 사전 신청</span>
                <span className="btn-arrow"><span className="arrow-icon"></span></span>
              </Link>
            </li>
```
(`Link`는 이미 `import { Link } from 'react-router-dom'` 되어 있음 — Gateway.jsx:2. className·DOM 구조·문구 동일, `<a href>`→`<Link to>`만 변경 = SPA화 = spec이 허용하는 "명백한 개선".)

- [ ] **Step 4: 통과 확인** — Run: `npm run build && npm run test:routes`
Expected: 신규 SPA 테스트 PASS(marker 생존 + `/admission` 도달), 기존 전부 PASS.

- [ ] **Step 5: server.js 정적/SPA fallback 충돌 검토(무수정 결론)**

`backend/src/server.js:98-115` 정적 인계:
- `express.static(distPath, { index:false, extensions:['html'] })` — `index:false`라 `/`는 명시 핸들러(`app.get('/')`)가 `index.html` 서빙(React). 충돌 없음.
- `extensions:['html']`: extensionless 요청(`/eligibility`)이 dist에 `eligibility.html`이 **있을 때만** 정적 매칭. 단계 2·3이 `public/*.html`을 삭제했으므로 dist에 그 파일 없음 → `/eligibility`는 정적 miss → `app.get('*')` SPA fallback → `index.html` → RR이 `/eligibility` 처리. **정상**.
- `/eligibility.html`(명시) 요청: dist에 파일 없음 → static miss → `*` fallback → `index.html` → RR `<Navigate to="/eligibility">`. **정상**.
- fallback 제외 목록(`/auth`·`/api`·`/s30`·`/health`)에 `.html` 없음 → 새 구조와 충돌 없음.
- **결론: server.js 수정 불필요.** 단, dist에 옛 `.html`이 잔존하지 않도록 **배포 전 `frontend/dist` 클린 빌드**(`rm -rf dist && npm run build`)를 배포 절차에 명시(잔존 시 정적 우선이라 리다이렉트가 가려짐).

- [ ] **Step 6: 잔여 raw href 마감 점검(체크리스트)**

단계 2·3 산출 컴포넌트 내 내부이동 href가 `<Link>`로 됐는지 grep 재확인(원본 `.html` 참조표):
- `eligibility.html:195,205,206` → EligibilityCheck에서 `/admission`·`/scholarship`로 `<Link>` (단계2 책임 — 미처리 시 여기서 교체)
- `scholarship.html:159,160` → ScholarshipCheck에서 `/eligibility`·`/admission` `<Link>` (단계2)
- `admission-v3-dark.html:1950,2034` → `/eligibility` `<Link>`; `:2188` → `/scholarship` `<Link>` (단계3)
- `admission-v3-dark.html:3450` `/dept-edit-request` FAB → `<Link>` (단계3)
- **무변경 유지(외부/특수)**: `e-onestop.pusan.ac.kr`(외부), `/auth/google?returnTo=`(OAuth 전이동 — `window.location` 유지), `tel:`, `#intro`/`#`(페이지 내), `target=_blank` 학과 홈페이지.
Run: `grep -rn 'href=\"/\(eligibility\|scholarship\|admission\|dept-edit\)' src` → 내부이동 raw href 0건 확인.

- [ ] **Step 7: 커밋**

```bash
git add -A
git commit -m "refactor(stage4): 페이지 간 내부이동 raw href → <Link> (SPA화) + server.js fallback 검토

- Gateway 03 신청 카드 <a href=/admission-v3-dark.html> → <Link to=/admission>(전체 새로고침 제거)
- server.js 정적(extensions:html)+SPA fallback이 새 라우트·리다이렉트와 무충돌 확인(수정 불필요)
- 배포 절차에 dist 클린 빌드 명시(잔존 .html이 리다이렉트 가리는 것 방지)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### 자가 검토 결과

- **단계1 커버**: arise.html 삭제(Task B Step3) + `/arise.html→/` 301 nginx 유지 확인(Task B Step5) + RR 보강(Task A). ✅
- **.html 보존 메커니즘**: RR `<Navigate>` 채택·근거·전제(파일 삭제 동반)·구현 코드 제시. dev/prod 동일성·Express/nginx 대안 기각 사유 명시. ✅
- **구조 재편**: 이동 맵(8파일) + import 갱신 6항목 + grep 가드. ✅
- **단계4 마감**: orphan 2종 + RedirectToAdmission(Task A 선처리)·rootToArise(Task B 선처리) 제거, raw href→Link 교체표, server.js fallback 검토(수정 불필요 결론). ✅
- **순서 의존 명시**: `.html` 삭제와 Navigate 등록을 같은 커밋으로 묶는 제약, 스모크 skip→해제 흐름. ✅
- **placeholder 스캔**: 모든 코드 step에 실제 코드/명령/기대출력 기재, "TBD/적절히" 없음. ✅


---

<!-- ===== 섹션 [C] 단계2 계산기 ===== -->
## 단계 2 — 계산기 2종(eligibility·scholarship)을 React 라우트로 이식

> 전제(맥락): 현재 `frontend/public/{eligibility,scholarship}.html` 는 빌드 시 `dist/`로 복사되어 prod에서 `express.static(distPath,{index:false,extensions:['html']})`(backend/src/server.js:104)가 SPA fallback(server.js:108)보다 먼저 서빙한다. 이 단계에서 두 정적 HTML을 제거하면 `/eligibility.html`·`/scholarship.html` 요청은 SPA로 떨어지므로, 리다이렉트는 **React Router 레벨**(`<Navigate replace>`)로 보존한다(arise.html은 nginx 301 — 그 패턴과 별개. App.jsx 기존 라우트와 일관). 두 페이지로의 링크 출처: `admission-v3-dark.html`(아직 정적, 단계 3) 3곳 + 서로의 footer. admission의 `/eligibility.html`·`/scholarship.html` 링크는 이 단계 이후 `.html`→route 리다이렉트로 계속 동작해야 한다.
>
> 패턴 확립: 이 단계에서 **faithful-port 패턴(DOM 1:1 미러 + 인라인 `<style>` 값보존 스코프 이동)·순수함수 lib 추출·node --test 단위테스트** 방식을 확립한다. 단계 3(admission)이 이를 재사용한다.

---

### Task 2.0 — 프론트엔드 테스트 러너 추가 (node --test)

순수 신규(설정). 실패테스트→구현→커밋 사이클 없이 인프라만 추가하지만, 빈 통과를 막기 위해 sanity 테스트 1건을 포함한다.

**Files:**
- `frontend/package.json` (modify) — `scripts.test` 추가
- `frontend/src/lib/__smoke__.test.js` (create, 임시 sanity — Task 2.1 통과 후 삭제 가능)

**Interfaces:** 없음(설정).

**Steps:**
- [ ] `frontend/package.json` 의 `scripts` 에 `"test": "node --test src/lib"` 추가. (lib 디렉터리의 `*.test.js`만 실행 — JSX/Vite와 무관한 순수 JS만 테스트. backend `"test":"node --test"` 패턴 동일.)
- [ ] 임시 sanity 테스트 작성:
```js
// frontend/src/lib/__smoke__.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
test('node --test 러너 동작 확인', () => { assert.equal(1 + 1, 2); });
```
- [ ] 실행 확인: `cd frontend && npm test` → 1 pass.
- [ ] 커밋: `test(frontend): node --test 러너 도입(src/lib 단위테스트)`

---

### Task 2.1 — eligibility 계산 로직을 순수 함수 모듈로 추출 (lib + 테스트)

원본 `frontend/public/eligibility.html:210-428`의 `<script>` IIFE에서 **DOM과 무관한 순수 로직만** 추출한다. DOM 핸들러(`addEventListener`/`getElementById`/`render`)는 추출 대상이 아님(Task 2.2의 컴포넌트로 간다). 추출 대상: `CREDIT_TABLE`, `COLLEGES`, `bandExact`, `bandNearest`, `requiredCum`, `gradGpaThreshold`, 그리고 checkBtn 핸들러(원본 324-391) 내부의 검증·판정 계산을 순수 함수 `evaluateEligibility(input)`로 묶는다.

**Files:**
- `frontend/src/lib/eligibility.js` (create)
- `frontend/src/lib/eligibility.test.js` (create)

**Interfaces:**
```js
// frontend/src/lib/eligibility.js
// 원본 eligibility.html:215-274 의 데이터 테이블을 1바이트도 바꾸지 말고 그대로 옮긴다.
export const CREDIT_TABLE = [ /* 원본 215-232 그대로 */ ];
export const COLLEGES = [ /* 원본 240-274 그대로 */ ];

// 원본 233-236 그대로
export function bandExact(g) { for (let i=0;i<CREDIT_TABLE.length;i++) if (CREDIT_TABLE[i].g===g) return CREDIT_TABLE[i]; return null; }
export function bandNearest(g) { let best=CREDIT_TABLE[0],bd=Infinity; CREDIT_TABLE.forEach((b)=>{const d=Math.abs(b.g-g); if(d<bd){bd=d;best=b;}}); return best; }
export function requiredCum(band, sem) { return sem<=band.cum.length ? band.cum[sem-1] : band.g; }
export function gradGpaThreshold(g) { return g===6 ? 4.0 : (g===7 ? 3.5 : 3.0); }

// 라벨 맵 — 원본 319-320 그대로
export const SEM_LABEL = {4:'4학기(2학년 2학기)',5:'5학기(3학년 1학기)',6:'6학기(3학년 2학기)',7:'7학기(4학년 1학기)',8:'8학기(4학년 2학기)',9:'9학기 이상'};
export const GRAD_LABEL = {6:'6학기(조기졸업)',7:'7학기',8:'8학기(정규)',over8:'8학기 초과'};

// checkBtn 핸들러(원본 324-391)의 검증+판정을 순수화.
// input: { manualMode, gradManual, resolvedG, collegeIndex, branchIndex, sem, gradSemRaw, gpa, earned }
//   - resolvedG: 소속 선택으로 결정된 졸업학점(null이면 미선택). manualMode면 gradManual(number) 사용.
//   - sem/gradSemRaw 등은 원본과 동일하게 문자열→숫자 파싱 책임을 호출부가 가짐(컴포넌트). 여기선 숫자/원시값 받음.
// return: { ok:false, error } | { ok:true, tier, checks[], basis, scholNote, band }
//   tier ∈ 'pass'|'maybe'|'fail'; checks 는 원본 366-378의 {state,title,detail,reason} 배열을 그대로 생성.
export function evaluateEligibility(input) { /* 아래 레시피 */ }
```

**추출 레시피(원본 324-391 → evaluateEligibility 매핑, 로직 동일):**
- 원본 332-342(band 결정): `manualMode`면 `gm=gradManual; if(isNaN(gm)||gm<=0) return {ok:false,error:'졸업 요구학점을 입력하거나 소속을 선택하세요.'}; band=bandNearest(gm); basisSrc='직접 입력 '+gm+'학점 → '+band.g+'학점 band(근사)'`. 아니면 `if(resolvedG===null) return {ok:false,error:'학부 소속을 선택하세요.'}; band=bandExact(resolvedG)||bandNearest(resolvedG); basisSrc` 는 `COLLEGES[collegeIndex].c` + (분기학과면 `' · '+branches[branchIndex].l`) + `' → 졸업 '+band.g+'학점'`.
- 원본 344-351(필수/범위 검증): `missing` 배열 동일, 빈 sem/gradSemRaw/NaN gpa/NaN earned 검사, `gpa<0||gpa>4.5`, `earned<0` → 각각 `{ok:false,error:...}` 반환. **에러 메시지 문자열 원본 그대로.**
- 원본 353-364(파생값): `over8 = gradSemRaw==='over8'`; `gradSem = over8?9:parseInt(gradSemRaw,10)`; `gpaThr = gradGpaThreshold(over8?8:gradSem)`; `reqCum = requiredCum(band,sem)`; `reqR = Math.round(reqCum*10)/10`; `g1 = sem>=4&&sem<=7`; `g2 = gpa>=3.0`; `g3 = earned>=reqCum`; `g4 = gpa>=gpaThr`; `imminent = over8?false:(sem>=gradSem)`.
- 원본 366-378(checks 4종): `{state,title,detail,reason}` 4개 객체를 원본 문자열 템플릿(b태그·reason 문구 포함) **그대로** 생성. (detail은 HTML 문자열 — 컴포넌트에서 `dangerouslySetInnerHTML`로 렌더하므로 lib에서 문자열로 보존.)
- 원본 380-388(tier): `allOk=g1&&g2&&g3&&g4`; `if(allOk)'pass'; else if(sem>7)'fail'; else if(imminent&&gpa<3.0)'fail'; else 'maybe'`.
- 원본 416-420(scholNote): `over8`면 8학기초과 제외 문구, `gradSemRaw==='8'`이면 3.8 문구, 아니면 `''`. lib는 `scholNote:{kind:'over8'|'reg8'|null}` 또는 문자열을 반환(컴포넌트에서 동일 HTML 생성). **택1: 문자열 그대로 반환이 1:1 보존에 안전** → `scholNote` 에 원본 416-420 HTML 문자열 그대로.
- 반환: `{ ok:true, tier, checks, basis:basisSrc, scholNote, band }`.

**Steps:**
- [ ] (실패테스트) `eligibility.test.js` 작성 — 아래 케이스. 먼저 `node --test src/lib` 실행해 **모듈 없음으로 실패** 확인.
- [ ] (구현) `eligibility.js` 작성 — 데이터 테이블/순수함수는 원본 라인범위 그대로 복붙, `evaluateEligibility`는 위 레시피.
- [ ] (통과) `cd frontend && npm test` → 전 케이스 통과 확인.
- [ ] 커밋: `feat(frontend): eligibility 자격판정 순수로직 lib 추출 + 단위테스트`

**테스트 케이스(실행으로 검증한 기대값 — 그대로 사용):**
```js
// frontend/src/lib/eligibility.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CREDIT_TABLE, COLLEGES, bandExact, bandNearest, requiredCum,
  gradGpaThreshold, evaluateEligibility,
} from './eligibility.js';

// --- 데이터/순수함수 ---
test('CREDIT_TABLE: 16개 band, 137학점 band의 cum 보존', () => {
  assert.equal(CREDIT_TABLE.length, 16);
  assert.deepEqual(bandExact(137).cum, [17,34,51,68,85,102,119.5,137]);
});
test('bandExact: 없는 g는 null', () => { assert.equal(bandExact(999), null); });
test('bandNearest: 130 → 129band, 100 → 104band', () => {
  assert.equal(bandNearest(130).g, 129);
  assert.equal(bandNearest(100).g, 104);
});
test('requiredCum: sem이 cum 길이 이하면 누적, 초과면 졸업학점 g', () => {
  assert.equal(requiredCum(bandExact(126), 5), 80);   // 126band 5학기 = 80
  assert.equal(requiredCum(bandExact(137), 7), 119.5); // 137band 7학기 = 119.5
  assert.equal(requiredCum(bandExact(137), 9), 137);   // sem9 > len8 → g
});
test('gradGpaThreshold: 6→4.0, 7→3.5, 그 외→3.0', () => {
  assert.equal(gradGpaThreshold(6), 4.0);
  assert.equal(gradGpaThreshold(7), 3.5);
  assert.equal(gradGpaThreshold(8), 3.0);
});

// --- evaluateEligibility: 검증 에러(원본 메시지 보존) ---
const base = { manualMode:false, gradManual:NaN, resolvedG:137, collegeIndex:5, branchIndex:1, sem:5, gradSemRaw:'8', gpa:3.2, earned:85 };
test('소속 미선택(resolvedG null) → 에러', () => {
  const r = evaluateEligibility({ ...base, resolvedG:null });
  assert.equal(r.ok, false);
  assert.equal(r.error, '학부 소속을 선택하세요.');
});
test('manual 모드 빈/0 졸업학점 → 에러', () => {
  const r = evaluateEligibility({ ...base, manualMode:true, gradManual:0 });
  assert.equal(r.ok, false);
  assert.equal(r.error, '졸업 요구학점을 입력하거나 소속을 선택하세요.');
});
test('필수 누락 → 에러 메시지에 누락 항목 나열', () => {
  const r = evaluateEligibility({ ...base, sem:NaN, gpa:NaN });
  assert.equal(r.ok, false);
  assert.match(r.error, /^다음을 입력하세요: /);
  assert.match(r.error, /현재 이수 학기/);
  assert.match(r.error, /평점평균/);
});
test('gpa 범위 밖 → 에러', () => {
  assert.equal(evaluateEligibility({ ...base, gpa:4.7 }).error, '평점평균은 0~4.5 사이여야 합니다.');
});

// --- evaluateEligibility: tier 경계값(실행으로 검증) ---
test('PASS: 공대(137) 5학기 졸업8 gpa3.2 earned85 → 4요건 충족', () => {
  const r = evaluateEligibility({ ...base });
  assert.equal(r.ok, true);
  assert.equal(r.tier, 'pass');
  assert.equal(r.checks.length, 4);
  assert.ok(r.checks.every((c) => c.state === 'ok'));
});
test('FAIL: 8학기(상한 초과) → 신청 불가', () => {
  const r = evaluateEligibility({ ...base, sem:8, earned:130 });
  assert.equal(r.tier, 'fail');
  assert.equal(r.checks[0].state, 'no'); // 이수학기 체크 no
});
test('FAIL: 졸업 임박 + gpa<3.0 (7학기 졸업7 gpa2.8) → 회복불가', () => {
  const r = evaluateEligibility({ manualMode:false, resolvedG:126, collegeIndex:0, branchIndex:-1, sem:7, gradSemRaw:'7', gpa:2.8, earned:111 });
  assert.equal(r.tier, 'fail');
});
test('MAYBE: 보완여지(5학기 졸업8 gpa2.8) → 추후 가능', () => {
  const r = evaluateEligibility({ ...base, gpa:2.8, earned:80, resolvedG:126, collegeIndex:0, branchIndex:-1 });
  assert.equal(r.tier, 'maybe');
});
test('MAYBE: 수료학점 미달(earned50)은 보완 가능 → maybe (fail 아님)', () => {
  const r = evaluateEligibility({ ...base, resolvedG:126, collegeIndex:0, branchIndex:-1, earned:50 });
  assert.equal(r.tier, 'maybe');
  assert.equal(r.checks[2].state, 'warn'); // 수료학점 항목 warn
});
test('MAYBE: 조기졸업(6학기) gpaThr 4.0 미달(gpa3.9) → 졸업성적 항목 warn, tier maybe', () => {
  const r = evaluateEligibility({ ...base, resolvedG:126, collegeIndex:0, branchIndex:-1, gradSemRaw:'6', gpa:3.9, earned:80 });
  assert.equal(r.tier, 'maybe');
  assert.equal(r.checks[3].state, 'warn');
});
test('scholNote: 정규8학기는 3.8 안내, 8학기초과는 제외 안내, 그 외 빈문자열', () => {
  assert.match(evaluateEligibility({ ...base }).scholNote, /3\.8/);
  const over8 = evaluateEligibility({ ...base, gradSemRaw:'over8' });
  assert.match(over8.scholNote, /제외/);
  assert.equal(evaluateEligibility({ ...base, gradSemRaw:'7' }).scholNote, '');
});
test('basis 문자열: 소속·졸업학점 표기 포함', () => {
  const r = evaluateEligibility({ ...base });
  assert.match(r.basis, /졸업 137학점/);
});
```

---

### Task 2.2 — EligibilityCheck 라우트 컴포넌트 (DOM 1:1 미러 + 스코프 CSS)

원본 `eligibility.html:86-208`(body)을 JSX로 1:1 미러, `:9-84`의 인라인 `<style>`을 값 보존하여 `EligibilityCheck.css`로 이동(단, SPA 전역 오염 방지를 위해 **루트 래퍼 클래스로 스코프**). DOM 이벤트 로직(원본 276-427)은 Task 2.1 lib + React state로 재현.

**Files:**
- `frontend/src/routes/EligibilityCheck.jsx` (create)
- `frontend/src/routes/EligibilityCheck.css` (create)

**Interfaces:**
```jsx
// frontend/src/routes/EligibilityCheck.jsx
export default function EligibilityCheck(): JSX // 무인자 라우트 컴포넌트
```

**CSS 이동 레시피(원본 9-84 → EligibilityCheck.css, 값 1바이트 무변경):**
- 컴포넌트 최상위 래퍼에 `className="elig-root"` 부여(원본 `<div class="wrap">`를 감싸거나 wrap에 함께 부여). 
- 원본 `:root{...}`(9-13) → `.elig-root{ --pnu-blue:#1E40FF; ... }` (변수값 그대로, 셀렉터만 `.elig-root`로).
- 원본 `*{box-sizing...}`(14) → `.elig-root *{box-sizing:border-box;margin:0;padding:0}` (전역 `*` 오염 방지를 위해 스코프 프리픽스만 추가, **선언값 무변경**).
- 원본 `body{...}`(15) → `.elig-root{font-family:...;background:var(--bg);color:var(--ink);line-height:1.6;-webkit-font-smoothing:antialiased}` (body 스타일을 래퍼로 이관 — 값 동일). 페이지 배경이 뷰포트 전체를 덮던 효과는 라우트 컨테이너가 `min-height:100vh`를 갖도록 `.elig-root{min-height:100vh}` 1줄만 추가(명백한 개선/동등 — 배경색 누락 방지).
- 나머지 모든 셀렉터(`.wrap`,`header`,`.brand .kicker`,`h1`,`.card`,…,`.hidden`)는 앞에 `.elig-root ` 프리픽스를 **기계적으로** 붙이고 **선언 블록은 글자 그대로** 복사. `@media(max-width:520px){.row{...}}`(37)도 `.elig-root .row`로.
- 폰트: 원본 `<link rel="stylesheet" href="/fonts/pretendard/pretendardvariable.css"/>`(7)은 이미 전역 로드되어 있으면 중복 불필요. 안전하게 컴포넌트에서 `import '/fonts/...'` 대신, 기존 앱이 pretendard를 전역 로드하는지 확인 후(미로드면 css에 `@import url('/fonts/pretendard/pretendardvariable.css');` 1줄). **폰트 패밀리 문자열은 원본 그대로.**

**DOM 미러 레시피(원본 86-208 → JSX):**
- `eligibility.html:88-98`(header/h1/lead/privacy) → 동일 마크업 JSX. `class`→`className`, self-closing 정리, `<img onerror=...>`는 `onError={(e)=>{e.currentTarget.style.display='none'}}`.
- `:101-164`(입력 카드): 
  - 단과대학 `<select id="college">`는 `COLLEGES`(lib)로 옵션 렌더(원본 281). 선택 state `collegeIndex`.
  - 분기 `<select id="branch">`는 선택 단과대학이 `branches` 있을 때만 표시(원본 291-308 로직 → `collegeIndex` 변화 시 `branchIndex` 리셋 + 표시). 
  - `bandPill`(원본 283-289 showBand/clearBand) → `resolvedG`/표시문구 state. pill 표시는 `band-pill show` className 토글.
  - manual 토글(원본 311-316) → `manualMode` state, manualBox/collegeField 표시 전환.
  - sem/gradSem/gpa/earned 입력은 controlled inputs(원본 122-160 옵션값 동일).
  - `checkBtn`(원본 162) onClick → `evaluateEligibility(...)` 호출. 입력 파싱은 원본 326-329와 동일(`parseInt(sem,10)`, `parseFloat(gpa)` 등) 후 lib에 전달.
- `:167-197`(결과): `result` 표시 state. `verdict` className `verdict {tier}`. tag/title/msg는 원본 396-400 `map` 객체 그대로(컴포넌트 상수). `resultBasis`=`기준(학부 소속): `+basis. `checklist`는 `checks.map`으로 `<li class="check">` 생성 — icon `ok?'✓':warn?'!':'✕'`, reason div는 `c.state!=='ok'`일 때 `dangerouslySetInnerHTML`(detail/ reason HTML 보존, 원본 411-412). `scholNote`는 lib가 준 HTML을 `dangerouslySetInnerHTML`. `reco-note`(178)는 정적 JSX. consult/next 박스 표시는 `tier==='pass'` 토글(원본 422-423).
- `:200-202`(notice), `:204-207`(footer): 정적 JSX. **footer 링크 갱신** → `/scholarship.html` `<a>` 를 `<Link to="/scholarship">`로, `/admission-v3-dark.html`는 **raw `<a href>` 유지**(단계 3 전까지 정적). 결과창 next 박스의 `/admission-v3-dark.html`도 raw `<a>` 유지.
- 결과 표시 시 `result.scrollIntoView({behavior:'smooth',block:'start'})`(원본 426) → `useRef`+`useEffect`(tier 변경 시) 동일 호출.

**Steps:**
- [ ] (구현) `EligibilityCheck.css` 작성(원본 9-84 스코프 이동) → `EligibilityCheck.jsx` 작성(원본 86-208 미러, lib 연결).
- [ ] (검증) Task 2.4에서 라우트 연결 후, dev에서 `/eligibility` 렌더 → 라이브 `eligibility.html`과 1:1 비교(입력→결과 동일, 스크린샷 diff). 컴포넌트 단위로는 별도 자동테스트 없음(로직은 2.1에서 커버). 
- [ ] 커밋: `feat(frontend): EligibilityCheck 라우트(원본 eligibility.html DOM 1:1 미러 + 스코프 CSS)`

---

### Task 2.3 — scholarship 계산 로직 lib 추출 + 단위테스트

원본 `scholarship.html:164-294`에서 순수 로직 추출: `COLLEGES`(sam 플래그 포함), 라벨 맵, `judgeReg`·`judgeSAM`·`judgeBK`·`judgeResearch`, 그리고 render의 요약 카운트(원본 274-277)를 `summarize(items)`로. `BK21_HTML` 문자열도 보존(reason에 포함됨).

**Files:**
- `frontend/src/lib/scholarship.js` (create)
- `frontend/src/lib/scholarship.test.js` (create)

**Interfaces:**
```js
// frontend/src/lib/scholarship.js
export const COLLEGES = [ /* 원본 scholarship.html:170-188 그대로(c,gye,sam) */ ];
export const TRACK_LABEL = { ms:'학·석사 연계(석사)', msp:'학·석박사 통합' }; // 원본 201
export const GRAD_LABEL = { 6:'6학기(조기졸업)',7:'7학기',8:'8학기(정규)',over8:'8학기 초과' }; // 원본 202
export const TIER_BADGE = { ok:'예상 해당', cond:'조건부 / 심사 필요', no:'미해당' }; // 원본 272
export const BK21_HTML = '...'; // 원본 207-213 그대로

// 원본 216-240의 judge* 를 순수화. track 은 인자로 받음(원본은 클로저 var track).
export function judgeReg(gradSemRaw, gpa, contract, track) { /* 원본 216-225 */ }
export function judgeSAM(co) { /* 원본 226-230 */ }
export function judgeBK(lastSem, nextGrad) { /* 원본 231-237 */ }
export function judgeResearch(track) { /* 원본 238-240 */ }

// 입력 전체 검증 + 4종 판정 묶음(원본 242-269 checkBtn).
// input: { track, collegeIndex, gradSemRaw, gpa, lastSem, nextGrad, contract }
// return: { ok:false, error } | { ok:true, items:[{name,r}], summary:{nOk,nCond,nNo}, summaryText:{n,d} }
export function evaluateScholarship(input) { /* 레시피 */ }
```

**추출 레시피(원본 242-294, 로직 동일):**
- judge* 4종: 원본 216-240 본문을 그대로(반환 객체 `{tier,amt,meta,reason,flag?}` 키 동일). `judgeReg`/`judgeResearch`의 `track`·`trackLabel` 의존은 인자로 받기. `gpa.toFixed(2)` 등 문자열 포맷 보존. `BK21_HTML` 상수 참조.
- `evaluateScholarship`: 원본 242-260 검증(`miss` 배열: track/college/gradSem/gpa/lastSem/nextGrad/contract, `isNaN(gpa)` 포함, `gpa<0||gpa>4.5`) → `{ok:false,error}` 메시지 원본 그대로. 통과 시 원본 262-268 `items` 4종 생성(name 문자열 `'① 연계과정 장학금'` 등 원본 그대로).
- `summarize`/요약(원본 274-277): `nOk`/`nCond`/`nNo`, `summaryText.n`=`'예상 해당 N종 · 조건부 N종 · 미해당 N종'`, `.d`=원본 277 문구(trackLabel 치환). lib에 포함.

**Steps:**
- [ ] (실패테스트) `scholarship.test.js` 작성(아래) → `node --test src/lib`로 모듈 없음 실패 확인.
- [ ] (구현) `scholarship.js` 작성(원본 라인범위 그대로 + 레시피).
- [ ] (통과) `cd frontend && npm test` → 통과 확인.
- [ ] 커밋: `feat(frontend): scholarship 장학판정 순수로직 lib 추출 + 단위테스트`

**테스트 케이스(실행으로 검증한 tier — 그대로 사용):**
```js
// frontend/src/lib/scholarship.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  COLLEGES, judgeReg, judgeSAM, judgeBK, judgeResearch, evaluateScholarship,
} from './scholarship.js';

// --- 데이터 ---
test('COLLEGES: 17개, sam=true는 인문/사회과학/자연과학 3곳', () => {
  assert.equal(COLLEGES.length, 17);
  assert.equal(COLLEGES.filter((c) => c.sam).length, 3);
  assert.deepEqual(COLLEGES.filter((c) => c.sam).map((c) => c.c), ['인문대학','사회과학대학','자연과학대학']);
});

// --- judgeReg: 연계과정 장학금(등록금) ---
test('judgeReg: 계약학과 예 → no', () => { assert.equal(judgeReg('8',3.9,'y','ms').tier, 'no'); });
test('judgeReg: 8학기초과 → no', () => { assert.equal(judgeReg('over8',3.9,'n','ms').tier, 'no'); });
test('judgeReg: 정규8학기 gpa>=3.8 → ok, 3.79 → cond, NaN → cond', () => {
  assert.equal(judgeReg('8',3.8,'n','ms').tier, 'ok');
  assert.equal(judgeReg('8',3.79,'n','ms').tier, 'cond');
  assert.equal(judgeReg('8',NaN,'n','ms').tier, 'cond');
});
test('judgeReg: 조기/일반 졸업(6·7학기)은 3.8 무관 → ok', () => {
  assert.equal(judgeReg('6',2.0,'n','ms').tier, 'ok');
  assert.equal(judgeReg('7',2.0,'n','ms').tier, 'ok');
});
test('judgeReg: 석박통합 meta에 박사 학기 표기', () => {
  assert.match(judgeReg('7',3.0,'n','msp').meta, /박사/);
});

// --- judgeSAM / judgeBK / judgeResearch ---
test('judgeSAM: sam=true → cond(flag), false → no', () => {
  const ok = judgeSAM({ gye:'인문', sam:true });
  assert.equal(ok.tier, 'cond'); assert.equal(ok.flag, true);
  assert.equal(judgeSAM({ gye:'공학', sam:false }).tier, 'no');
});
test('judgeBK: 항상 cond(조건/사유만 분기)', () => {
  assert.equal(judgeBK('y','y').tier, 'cond');
  assert.equal(judgeBK('n','y').tier, 'cond');
  assert.equal(judgeBK('y','n').tier, 'cond');
});
test('judgeResearch: 항상 ok', () => { assert.equal(judgeResearch('ms').tier, 'ok'); });

// --- evaluateScholarship: 검증 + 요약 ---
const ok = { track:'ms', collegeIndex:0, gradSemRaw:'7', gpa:3.5, lastSem:'y', nextGrad:'y', contract:'n' };
test('트랙 미선택 → 에러', () => {
  const r = evaluateScholarship({ ...ok, track:null });
  assert.equal(r.ok, false);
  assert.match(r.error, /희망 트랙/);
});
test('gpa 범위 밖 → 에러', () => {
  assert.equal(evaluateScholarship({ ...ok, gpa:5 }).error, '평점평균은 0~4.5 사이여야 합니다.');
});
test('인문대(sam)·7학기·gpa3.5·계약X → reg ok, sam cond, bk cond, research ok = 해당2/조건2/미해당0', () => {
  const r = evaluateScholarship({ ...ok });
  assert.equal(r.ok, true);
  assert.equal(r.items.length, 4);
  assert.equal(r.summary.nOk, 2);
  assert.equal(r.summary.nCond, 2);
  assert.equal(r.summary.nNo, 0);
  assert.match(r.summaryText.n, /예상 해당 2종 · 조건부 2종 · 미해당 0종/);
});
test('공대·정규8학기·계약Y → reg no, sam no, bk cond, research ok = 해당1/조건1/미해당2', () => {
  const r = evaluateScholarship({ track:'ms', collegeIndex:5, gradSemRaw:'8', gpa:3.0, lastSem:'n', nextGrad:'n', contract:'y' });
  assert.equal(r.summary.nOk, 1);
  assert.equal(r.summary.nCond, 1);
  assert.equal(r.summary.nNo, 2);
});
```

---

### Task 2.4 — ScholarshipCheck 라우트 + 두 페이지 라우트/리다이렉트 연결 + 정적 HTML 제거

ScholarshipCheck 컴포넌트(원본 scholarship.html:66-162 미러 + 9-64 스코프 CSS)를 만들고, App.jsx에 두 라우트와 `.html` 리다이렉트를 등록하고, `public/{eligibility,scholarship}.html`을 삭제한다.

**Files:**
- `frontend/src/routes/ScholarshipCheck.jsx` (create)
- `frontend/src/routes/ScholarshipCheck.css` (create)
- `frontend/src/App.jsx` (modify)
- `frontend/public/eligibility.html` (delete)
- `frontend/public/scholarship.html` (delete)

**Interfaces:**
```jsx
export default function ScholarshipCheck(): JSX
```
App.jsx 추가:
```jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import EligibilityCheck from './routes/EligibilityCheck.jsx';
import ScholarshipCheck from './routes/ScholarshipCheck.jsx';
// ...
<Route path="/eligibility" element={<EligibilityCheck />} />
<Route path="/scholarship" element={<ScholarshipCheck />} />
{/* 기존 .html URL 보존(외부 링크·QR·admission 정적본 링크 — 단계3 전까지). 정적파일 삭제로 SPA가 받으므로 라우터에서 리다이렉트 */}
<Route path="/eligibility.html" element={<Navigate to="/eligibility" replace />} />
<Route path="/scholarship.html" element={<Navigate to="/scholarship" replace />} />
```

**ScholarshipCheck CSS 이동 레시피(원본 9-64):** EligibilityCheck와 동일 방식 — 래퍼 `className="schol-root"`, `:root`→`.schol-root` 변수, `*`→`.schol-root *`, `body`→`.schol-root{...; min-height:100vh}`(배경 보존 1줄), 나머지 셀렉터 `.schol-root ` 프리픽스 + 선언 그대로. `@media(max-width:520px)` 동일 처리. **scholarship의 `--no` 값은 `#9aa1ad`로 eligibility(`#c0392b`)와 다름 — 각 파일에 그대로 보존**(통폐합 금지).

**ScholarshipCheck DOM 미러 레시피(원본 66-162):**
- `:68-78`(header/h1/lead/privacy) 미러.
- `:81-139`(입력): 트랙 세그(원본 87-90) → `track` state, 버튼 `aria-pressed` 토글(원본 195-199). college select는 `COLLEGES`로 `co.c+' ('+co.gye+')'` 옵션(원본 190). gradSem/gpa/lastSem/nextGrad/contract controlled. `checkBtn`(137) → `evaluateScholarship`.
- `:142-156`(결과): `rsum` n/d ← summaryText. `scards` ← items.map: `scard {tier}` className, scard-top(h3 name + amt), badge(`TIER_BADGE[tier]`), reason `dangerouslySetInnerHTML`(BK21_HTML 포함 보존), `r.flag`면 verify-chip, meta(원본 282-286 그대로). contact/notice 정적.
- `:158-161`(footer) → `/eligibility.html` `<a>`를 `<Link to="/eligibility">`로, `/admission-v3-dark.html` raw `<a>` 유지.
- 결과 표시 시 scrollIntoView(원본 292) → useRef+useEffect.

**Steps:**
- [ ] (구현) `ScholarshipCheck.css`(원본 9-64 스코프) → `ScholarshipCheck.jsx`(원본 66-162 미러, lib 연결).
- [ ] (구현) App.jsx에 4개 Route + Navigate import 추가.
- [ ] (구현) `public/eligibility.html`·`public/scholarship.html` 삭제.
- [ ] (검증) `cd frontend && npm run build && cd ../backend && NODE_ENV=production npm start` (또는 dev: 두 서버) 로 prod 유사 환경에서:
  - `/eligibility`·`/scholarship` 렌더 → 라이브와 1:1(입력→결과 동일, 풀페이지 스크린샷 diff).
  - `/eligibility.html`·`/scholarship.html` 요청 → 각각 `/eligibility`·`/scholarship`로 리다이렉트(주소창 교체, replace).
  - 정적 `admission-v3-dark.html`의 3개 링크(1950·2034·2188) 클릭 → 리다이렉트로 정상 도달.
  - 두 페이지 footer 상호 링크 SPA 이동(새로고침 깜빡임 없음 — 명백한 개선, 출력 동일).
- [ ] (검증) `npm test`(frontend) 전체 그린 재확인.
- [ ] 커밋: `feat(frontend): ScholarshipCheck 라우트 + /eligibility·/scholarship 라우트·.html 리다이렉트, 정적 HTML 제거`

**검증 게이트:** 로컬 1:1 검증 결과를 사용자에게 제시 → OK → 그때만 배포(단계 0 검증 하니스/스크린샷 diff 활용, MEMORY: deploy-only-after-user-ok).


---

<!-- ===== 섹션 [D] 단계3 admission ===== -->
> 본 절은 설계 spec 7절 "단계 3"의 구현계획이다. **무변경(1:1)·strangler·병렬 라우트 선검증·단계별 커밋·로컬검증→승인→배포·`.html` 리다이렉트 보존** 원칙을 따른다. 단계 0(검증 하니스)·단계 2(계산기 faithful-port 패턴)는 선행 완료를 전제한다. 모든 Task는 `### Task N` 단위로 독립 커밋하며, 체크박스 Step은 **실패테스트 작성 → 실패 확인 → 구현 → 통과 확인 → 커밋** 순서를 강제한다.

> **격리 전략(중요):** 라이브 교체 전까지 모든 신규 코드는 `/admission-next` 병렬 라우트에서만 동작한다. 기존 `/admission-v3-dark.html` 정적본은 단계 3 마지막 Task(교체)까지 **무손상 유지**된다.

---

## 0. 원본 인벤토리 (작업 기준 — 이 표가 모든 1:1 이식의 라인참조 원천)

원본: `frontend/public/admission-v3-dark.html` (3,529줄). 구조는 **단일 `#intro` 셸 + 4개 전체화면 `.view` 오버레이**이며, `data-view`/`location.hash`로 전환한다(스크롤 라우팅 아님).

### (1) data-view 뷰 인벤토리

| view key | `#id` | 원본 라인 | 테마 스코프 | 렌더 내용 |
|---|---|---|---|---|
| (intro) | `#intro` | 1622–1818 | `#intro{…}` 로컬 토큰(1627–1703) | 배경영상(`/media/pnu80-intro.mp4`)+스크림+ghost"연계", mast(브랜드·`data-apply` CTA·dateline), 히어로(h1 "석사·박사를 더 빠르게", lead/desc), **카운트다운**(`#dday`/`#cd-h/m/s`/`#cd-status`), 목차 `nav.index` 4버튼(`data-view` 01~04), foot 연락처 |
| why-grad | `#view-why-grad` | 1821–1912 | `.edx`(1357–1614) + `.qitem` 아코디언(1333–1355) | mast(`data-back` brand + crumb), 인트로 카피, **아코디언 2문항**(Q1 왜 대학원/Q2 왜 연계, 각 `.grid.g4` 4카드 SVG 포함), CTA(`data-apply`/`data-view=departments`), foot |
| eligibility | `#view-eligibility` | 1914–2046 | `.edx` | phead, **자가진단 진입**(`<a href="/eligibility.html">`), 핵심수치 `.grid.g4` 4 stat, 이수학기 `.track`(4–7 on), 평점 `.gauge`(66.7%), 졸업 GPA `.spec`, 자격상세 `.spec`, 수료학점 note, next `nav.index`, CTA, foot |
| benefits | `#view-benefits` | 2048–2202 | `.edx` | phead, 핵심혜택 `.blist` 4행, 장학4종 `.grid.g4`, 지급조건 note(기준/제외), 비금전혜택 `.grid.g4`, next, CTA(`href=/scholarship.html`), foot |
| departments | `#view-departments` | 2204–2971 | 전역 다크토큰(`.view-scroll`, **`.edx` 아님**) + cascade CSS(2211–2451) | view-bar(`data-back`), view-hero, **3컬럼 캐스케이드**(계열→학과→세부전공, `#casColGye/Dept/Major`), 검색(`#casSearch`)+BK21토글(`#casBk21`)+카운트(`#casCount`), 학과/전공 상세 **팝업 모달**(`#casmModal`/`#casmBody`, `dd-*` 디자인) |

비-뷰 전역 요소: **Apply 모달**(`#applyModal`, 2977–3017), **toast**(`#toast`, 3019), **수정신청 FAB**(`.dr-fab → /dept-edit-request`, 3420–3456), **피드백 FAB**(`.fb-fab`, 3458–3527).

### (2) 인라인 JS 기능 인벤토리

| 기능 | 원본 라인 | 동작 요약 | 비고 |
|---|---|---|---|
| 인트로 카운트다운 | 1785–1817 | `openTime 2026-07-09T09:00+09`, `closeTime 2026-07-16T23:59:59+09`. 접수 전→시작까지/접수 중→마감까지/마감. D-day + 시:분:초(100h↑면 `99:99:99` 대기). `setInterval 1000` | **활성** 코드. `useCountdown`으로 |
| 학과 데이터 fetch + 공유 | 3074–3083 | `fetch('/api/departments')` 1회 → `departments` + `window.PNU.onDepartments(cb)` pub/sub. 실패 시 `[]` | `useDepartments`(앱 1회 fetch, context 공유) |
| 캐스케이드 렌더/필터/모달 | 2521–2967 (`init_departments` IIFE) | 6계열 `CATS`(아이콘 SVG 인라인), `SAMPLE` 폴백, `enrich()` 병합, `matchesQ`(이름+전공+해시태그), `candidates`(BK21+검색), `deptsForCol`(검색=전계열/아님=활성계열), renderGye/Dept/Major, selectDept(전공2+면 컬럼/아니면 모달), `detailHtml`/`majorDetailHtml`, openModal/closeModal(ESC·backdrop·포커스복원), `init`(멱등) | 본문 최대·핵심. `useDepartments` 데이터 + Departments 뷰 컴포넌트군 |
| 신청 모달 + OAuth | 3167–3187, 3171–3180 | `openApply()`: `fetch('/auth/me')` → **401이면 `/auth/google?returnTo=<path><hash>?modal=apply`** 로 `location.href` 리다이렉트 → `fetch('/api/surveys/1/my-response')` 200이면 "이미 제출" toast, 아니면 모달 open | OAuth 흐름·returnTo 인코딩 **바이트 동일** |
| 지망 picks(1~3) | 3037–3072 | `MAX_PICKS=3`, addPick/removePick/renderPicks, 중복·초과 toast | ApplyModal 로컬 상태 |
| 모달 picker(학과→전공→추가) | 3085–3165 | optgroup(계열별, 미모집 제외), 전공 2+면 필수, hint 메시지, add-state 활성/비활성 | ApplyModal |
| 제출 | 3189–3231 | `fetch('/api/surveys/1')`→질문 매핑(single=트랙, short_text=지망 ord순)→`POST /api/surveys/1/responses`. 201/409/401 분기 | 매핑 로직 1:1 |
| 뷰 전환 엔진 | 3233–3296 | `VIEW_KEYS`, `showView`(intro 숨김·`.is-open`·`location.hash`동기·`init_*` 멱등호출·아코디언 maxHeight 재계산·모션), `showIntro`(`history.replaceState`), `routeFromHash`(hashchange), 위임 클릭(`data-view`/`data-apply`/`data-back`), ESC(모달/뷰 닫기) | **`useHashView` 훅 + 라우터 동기** 핵심 |
| 공유 API 노출 | 3297–3308 | `window.PNU` + `window.showToast` | React에선 context로 대체, 단 `window.PNU`/`window.showToast` **호환 shim 유지**(외부 의존 없음 확인했으나 안전) |
| 2차 카운트다운 | 3311–3326 | `#cd-d` 탐색 → **DOM에 없어 early-return(죽은 코드)** | **이식 불필요**(Task에서 누락 아님을 명시·증거) |
| stat count-up / reveal IO | 3328–3355 | `[data-count]`·`.reveal` 옵저버 — **매칭 노드 0개(죽은 코드)** | 동일하게 이식 불필요(증거 첨부) |
| FX 장식 | 3357–3392 | `.fx-grad`/`.fx-shimmer` 클래스 부착, 카드 마우스 스포트라이트(`.fx-spot`), 뷰 유성(meteor), deptViewRoot MutationObserver 재장식 | 시각 효과 1:1 — `useFxDecorations` 훅으로 포팅(또는 effect) |
| 초기 라우팅 | 3394–3396 | `?modal=apply`면 200ms 후 `openApply`, `routeFromHash()` | OAuth 복귀 처리 — 보존 |
| 아코디언 | 3400–3417 | `.qitem .qbar` 토글 maxHeight, 초기 open 높이, resize 재계산 | why-grad 전용 |
| 피드백 FAB | 3511–3526 | `FEEDBACK_FORM_URL` 유효 URL이면 href, 아니면 alert | 상수 보존 |

### (3) React 분해 설계 — 파일 책임·인터페이스

```text
src/
├─ routes/admission/
│  ├─ AdmissionPage.jsx       # 셸: 뷰 라우팅(useHashView)+intro+4뷰+ApplyModal+2 FAB+toast 마운트
│  ├─ IntroView.jsx           # #intro 1:1 (배경영상·mast·히어로·카운트다운·목차·foot)
│  ├─ views/WhyGradView.jsx   # #view-why-grad (.edx + 아코디언)
│  ├─ views/EligibilityView.jsx
│  ├─ views/BenefitsView.jsx
│  ├─ views/DepartmentsView.jsx  # 캐스케이드 컬럼 + 검색/BK21 + 상세 모달(DeptDetailModal)
│  ├─ ApplyModal.jsx          # 신청 모달(picks·picker·제출·OAuth openApply)
│  ├─ catData.jsx             # CATS 6계열(아이콘 SVG)·SAMPLE 폴백·enrich/matchesQ 등 순수함수
│  └─ admission-v3-dark.css   # 인라인 <style> 전부 값 그대로 이동
├─ hooks/
│  ├─ useCountdown.js         # 접수 카운트다운(순수 시간 계산 + tick)
│  ├─ useDepartments.js       # /api/departments 1회 fetch + 공유(context)
│  ├─ useHashView.js          # location.hash ↔ activeView 동기(VIEW_KEYS)
│  └─ useFxDecorations.js     # FX 장식 부착(스포트라이트·유성·grad/shimmer)
└─ lib/
   └─ apply-survey.js         # 제출 매핑 순수함수(survey→answers) + buildReturnTo
```

| 파일 | 책임 | 인터페이스(요지) |
|---|---|---|
| `AdmissionPage.jsx` | 셸·라우팅 오케스트레이션 | `useHashView()`로 active view 결정. `<IntroView/>`+4 뷰(active만 `is-open`), `<ApplyModal/>`(open 상태 lift), 2 FAB, toast. `?modal=apply` 초기 처리 |
| `IntroView.jsx` | 인트로 셸 1:1 | props 없음. 내부 `useCountdown`, 목차 버튼 `onShowView(key)` 콜백, CTA `onApply()` |
| `views/*View.jsx` | 각 뷰 1:1 미러 | `{ onShowView, onApply, onBack }` 콜백 props |
| `DepartmentsView.jsx` | 캐스케이드+모달 | `useDepartments()` 데이터 + 로컬 state `{gye,deptId,majorName,q,bk21}` |
| `ApplyModal.jsx` | 신청 모달 | `{ open, onClose, departments }`. picks/ picker/ submit 로컬. `openApply`는 부모가 호출(OAuth 게이트) |
| `useCountdown.js` | 시간 계산 훅 | `useCountdown({openTime,closeTime}) → {dday,h,m,s,statusLabel}` |
| `useDepartments.js` | 데이터 공유 | `useDepartments() → {departments, loaded}` (Provider 1회 fetch) |
| `useHashView.js` | 해시 뷰 동기 | `useHashView(VIEW_KEYS) → {view, showView, showIntro}` |
| `apply-survey.js` | 제출 매핑 | `mapAnswers(survey, trackLabel, picks) → answers[]`, `buildReturnTo(loc)` |

---

### Task 1 — useCountdown 훅 (순수 신규 · 완전 코드)
**Files:** `frontend/src/hooks/useCountdown.js`(신규), `frontend/src/hooks/useCountdown.test.js`(신규)
**Interfaces:** `useCountdown({ openTime, closeTime }) → { dday, h, m, s, statusLabel }`. 원본 1786–1816 로직과 **표기 1:1**(접수 전/중/마감 분기, D-day=`'D-'+floor(t/86400000)`, totalH≥100이면 `h=m=s='99'`, 미만이면 `pad(totalH)`:`pad(min%60)`:`pad(sec%60)`, statusLabel `'Status · '+label`).

```js
// useCountdown.js
import { useState, useEffect, useRef } from 'react';

const pad = (n) => String(Math.max(0, n)).padStart(2, '0');

// 순수 계산: 원본 admission-v3-dark.html:1794-1814 tick() 그대로
export function computeCountdown(now, openTime, closeTime) {
  let target, label;
  if (now < openTime) { target = openTime; label = '접수 시작까지'; }
  else if (now <= closeTime) { target = closeTime; label = '접수 중 · 마감까지'; }
  else { target = null; label = '접수 마감'; }

  if (target === null) {
    return { dday: '마감', h: '00', m: '00', s: '00', statusLabel: 'Status · ' + label };
  }
  const t = Math.max(0, target - now);
  const dday = 'D-' + Math.floor(t / 86400000);
  const totalH = Math.floor(t / 3600000);
  if (totalH >= 100) {
    return { dday, h: '99', m: '99', s: '99', statusLabel: 'Status · ' + label };
  }
  return {
    dday,
    h: pad(totalH),
    m: pad(Math.floor(t / 60000) % 60),
    s: pad(Math.floor(t / 1000) % 60),
    statusLabel: 'Status · ' + label,
  };
}

export function useCountdown({ openTime, closeTime }) {
  const [state, setState] = useState(() => computeCountdown(Date.now(), openTime, closeTime));
  const ref = useRef({ openTime, closeTime });
  ref.current = { openTime, closeTime };
  useEffect(() => {
    const tick = () => setState(computeCountdown(Date.now(), ref.current.openTime, ref.current.closeTime));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return state;
}
```

```js
// useCountdown.test.js (vitest)
import { describe, it, expect } from 'vitest';
import { computeCountdown } from './useCountdown.js';

const OPEN  = new Date('2026-07-09T09:00:00+09:00').getTime();
const CLOSE = new Date('2026-07-16T23:59:59+09:00').getTime();

describe('computeCountdown (admission intro 패리티)', () => {
  it('접수 전 100h 이상: 시계는 99:99:99 대기, D-day는 일수', () => {
    const now = new Date('2026-07-01T09:00:00+09:00').getTime(); // 8일 전
    const r = computeCountdown(now, OPEN, CLOSE);
    expect(r.dday).toBe('D-8');
    expect([r.h, r.m, r.s]).toEqual(['99','99','99']);
    expect(r.statusLabel).toBe('Status · 접수 시작까지');
  });
  it('접수 전 100h 미만: 실제 시:분:초', () => {
    const now = OPEN - (10*3600000 + 5*60000 + 3*1000); // 10:05:03 전
    const r = computeCountdown(now, OPEN, CLOSE);
    expect(r.dday).toBe('D-0');
    expect([r.h, r.m, r.s]).toEqual(['10','05','03']);
  });
  it('접수 중: 마감까지 카운트 + 라벨', () => {
    const now = new Date('2026-07-12T12:00:00+09:00').getTime();
    const r = computeCountdown(now, OPEN, CLOSE);
    expect(r.dday.startsWith('D-')).toBe(true);
    expect(r.statusLabel).toBe('Status · 접수 중 · 마감까지');
  });
  it('마감 후: "마감" + 00:00:00', () => {
    const now = CLOSE + 1000;
    const r = computeCountdown(now, OPEN, CLOSE);
    expect(r.dday).toBe('마감');
    expect([r.h, r.m, r.s]).toEqual(['00','00','00']);
    expect(r.statusLabel).toBe('Status · 접수 마감');
  });
});
```

- [ ] Step 1.1: 위 `useCountdown.test.js` 작성 → 실행해 **실패**(모듈 없음) 확인
- [ ] Step 1.2: `useCountdown.js` 구현 → 테스트 통과 확인
- [ ] Step 1.3: 커밋 `feat(admission): useCountdown 훅 — 접수 카운트다운 표기 패리티`

---

### Task 2 — apply-survey 순수 매핑 + returnTo 빌더 (순수 신규 · 완전 코드)
**Files:** `frontend/src/lib/apply-survey.js`(신규), `frontend/src/lib/apply-survey.test.js`(신규)
**Interfaces:** `mapAnswers(survey, trackLabel, picks) → { answers } | { error }`, `buildReturnTo({ pathname, hash, search }) → string`. 원본 3199–3217(질문 매핑)·3173/3200/3228(returnTo)과 1:1.

```js
// apply-survey.js
// 원본 admission-v3-dark.html:3205 norm() 그대로 — 공백 제거 + 원문자 제거
const norm = (s) => String(s || '').replace(/\s+/g, '').replace(/[①②③]/g, '');

// 원본:3203-3213 매핑 로직 1:1. 실패 시 {error} 반환(원본은 toast+reject).
export function mapAnswers(survey, trackLabel, picks) {
  const questions = (survey && survey.questions) || [];
  const trackQ = questions.find((q) => q.type === 'single');
  const textQs = questions.filter((q) => q.type === 'short_text')
    .sort((a, b) => (a.ord || 0) - (b.ord || 0));
  if (!trackQ) return { error: '⚠ 트랙 질문을 찾을 수 없습니다.' };
  const trackOpt = (trackQ.options || []).find((o) => norm(o.label) === norm(trackLabel));
  if (!trackOpt) return { error: '⚠ 선택한 트랙을 매핑할 수 없습니다.' };
  if (textQs.length < 1) return { error: '⚠ 지망 입력 항목을 찾을 수 없습니다.' };
  const answers = [{ question_id: trackQ.id, selected_option_ids: [trackOpt.id] }];
  picks.forEach((p, i) => { if (textQs[i]) answers.push({ question_id: textQs[i].id, text_value: p.text }); });
  return { answers };
}

// 원본:3173 openApply 의 returnTo — path + hash + '?modal=apply'
export function buildReturnTo({ pathname, hash, search } = {}) {
  return pathname + (hash || '') + '?modal=apply';
}
```

```js
// apply-survey.test.js
import { describe, it, expect } from 'vitest';
import { mapAnswers, buildReturnTo } from './apply-survey.js';

const survey = {
  questions: [
    { id: 10, type: 'single', options: [
      { id: 1, label: '① 학·석사 연계과정' },
      { id: 2, label: '② 학·석박사통합 연계과정' },
    ] },
    { id: 21, type: 'short_text', ord: 2 },
    { id: 20, type: 'short_text', ord: 1 },
    { id: 22, type: 'short_text', ord: 3 },
  ],
};

describe('mapAnswers', () => {
  it('트랙 라벨을 원문자/공백 무시 매칭하고, 지망을 ord 순 short_text에 채운다', () => {
    const picks = [{ text: 'A학과' }, { text: 'B학과 / 전공' }];
    const { answers } = mapAnswers(survey, '학석사연계과정', picks);
    expect(answers[0]).toEqual({ question_id: 10, selected_option_ids: [1] });
    expect(answers[1]).toEqual({ question_id: 20, text_value: 'A학과' });   // ord 1
    expect(answers[2]).toEqual({ question_id: 21, text_value: 'B학과 / 전공' }); // ord 2
  });
  it('트랙 옵션 매핑 실패 시 error', () => {
    expect(mapAnswers(survey, '없는트랙', [{ text: 'x' }]).error).toMatch(/매핑할 수 없습니다/);
  });
  it('single 질문 없으면 error', () => {
    expect(mapAnswers({ questions: [] }, 'x', []).error).toMatch(/트랙 질문/);
  });
});

describe('buildReturnTo', () => {
  it('path + hash + ?modal=apply', () => {
    expect(buildReturnTo({ pathname: '/admission-next', hash: '#departments' }))
      .toBe('/admission-next#departments?modal=apply');
  });
});
```

- [ ] Step 2.1: `apply-survey.test.js` 작성 → **실패** 확인
- [ ] Step 2.2: `apply-survey.js` 구현 → 통과 확인
- [ ] Step 2.3: 커밋 `feat(admission): 신청 제출 매핑·returnTo 순수함수 + 테스트`

---

### Task 3 — useHashView 훅 (순수 신규 · 완전 코드)
**Files:** `frontend/src/hooks/useHashView.js`(신규), `frontend/src/hooks/useHashView.test.jsx`(신규)
**Interfaces:** `useHashView(viewKeys) → { view, showView, showIntro }`. 원본 3249–3282 동작 재현: 유효 hash면 그 view, 아니면 intro(null). `showView(k)`는 `location.hash=k`(다르면), `showIntro()`는 `history.replaceState(null,'',pathname+search)`. `hashchange` 리스너로 외부 변경(뒤로가기·OAuth 복귀) 반영.

```js
// useHashView.js
import { useState, useEffect, useCallback, useRef } from 'react';

function viewFromHash(viewKeys) {
  const h = window.location.hash.replace(/^#/, '');
  return viewKeys.indexOf(h) >= 0 ? h : null; // null = intro
}

export function useHashView(viewKeys) {
  const keysRef = useRef(viewKeys); keysRef.current = viewKeys;
  const [view, setView] = useState(() => viewFromHash(viewKeys));

  useEffect(() => {
    const onHash = () => setView(viewFromHash(keysRef.current));
    window.addEventListener('hashchange', onHash);
    onHash(); // 마운트 시 초기 라우팅(원본 routeFromHash)
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const showView = useCallback((key) => {
    if (keysRef.current.indexOf(key) < 0) { // 원본:3250 무효 키 → intro
      if (window.location.hash) history.replaceState(null, '', location.pathname + location.search);
      setView(null); return;
    }
    if (location.hash.slice(1) !== key) location.hash = key; // 원본:3262
    setView(key);
  }, []);

  const showIntro = useCallback(() => {
    if (window.location.hash) history.replaceState(null, '', location.pathname + location.search); // 원본:3276
    setView(null);
  }, []);

  return { view, showView, showIntro };
}
```

```jsx
// useHashView.test.jsx (vitest + @testing-library/react, jsdom)
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHashView } from './useHashView.js';

const KEYS = ['why-grad','eligibility','benefits','departments'];

describe('useHashView', () => {
  beforeEach(() => { history.replaceState(null, '', '/admission-next'); });

  it('초기 hash 없으면 intro(null)', () => {
    const { result } = renderHook(() => useHashView(KEYS));
    expect(result.current.view).toBeNull();
  });
  it('초기 유효 hash면 그 view', () => {
    history.replaceState(null, '', '/admission-next#departments');
    const { result } = renderHook(() => useHashView(KEYS));
    expect(result.current.view).toBe('departments');
  });
  it('showView로 hash 동기', () => {
    const { result } = renderHook(() => useHashView(KEYS));
    act(() => result.current.showView('benefits'));
    expect(location.hash).toBe('#benefits');
    expect(result.current.view).toBe('benefits');
  });
  it('showIntro로 hash 제거', () => {
    history.replaceState(null, '', '/admission-next#why-grad');
    const { result } = renderHook(() => useHashView(KEYS));
    act(() => result.current.showIntro());
    expect(location.hash).toBe('');
    expect(result.current.view).toBeNull();
  });
  it('외부 hashchange(뒤로가기) 반영', () => {
    const { result } = renderHook(() => useHashView(KEYS));
    act(() => { location.hash = 'eligibility'; window.dispatchEvent(new HashChangeEvent('hashchange')); });
    expect(result.current.view).toBe('eligibility');
  });
});
```

- [ ] Step 3.1: `useHashView.test.jsx` 작성 → **실패** 확인
- [ ] Step 3.2: `useHashView.js` 구현 → 통과 확인
- [ ] Step 3.3: 커밋 `feat(admission): useHashView — data-view↔location.hash 동기 훅`

---

### Task 4 — useDepartments 훅 + Provider (순수 신규 · 완전 코드)
**Files:** `frontend/src/hooks/useDepartments.js`(신규, Context+Provider+hook), `frontend/src/hooks/useDepartments.test.jsx`(신규)
**Interfaces:** `<DepartmentsProvider>`, `useDepartments() → { departments, loaded }`. 원본 3080–3083 fetch 의미 1:1(`fetch('/api/departments')` → `r.ok ? r.json() : []`, 비배열·실패 시 `[]`, loaded=true).

```jsx
// useDepartments.js
import { createContext, useContext, useState, useEffect } from 'react';

const DepartmentsContext = createContext({ departments: [], loaded: false });

export function DepartmentsProvider({ children }) {
  const [state, setState] = useState({ departments: [], loaded: false });
  useEffect(() => {
    let alive = true;
    // 원본 admission-v3-dark.html:3080-3083 의미 1:1
    fetch('/api/departments')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => { if (alive) setState({ departments: Array.isArray(data) ? data : [], loaded: true }); })
      .catch(() => { if (alive) setState({ departments: [], loaded: true }); });
    return () => { alive = false; };
  }, []);
  return <DepartmentsContext.Provider value={state}>{children}</DepartmentsContext.Provider>;
}

export function useDepartments() { return useContext(DepartmentsContext); }
```

```jsx
// useDepartments.test.jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { DepartmentsProvider, useDepartments } from './useDepartments.jsx';

function Probe() {
  const { departments, loaded } = useDepartments();
  return <div>{loaded ? `loaded:${departments.length}` : 'loading'}</div>;
}
beforeEach(() => { vi.restoreAllMocks(); });
afterEach(() => { vi.restoreAllMocks(); });

describe('useDepartments', () => {
  it('배열 응답을 그대로 노출', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([{id:1},{id:2}]) }));
    render(<DepartmentsProvider><Probe/></DepartmentsProvider>);
    await waitFor(() => expect(screen.getByText('loaded:2')).toBeInTheDocument());
  });
  it('실패 시 빈 배열 + loaded', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('net')));
    render(<DepartmentsProvider><Probe/></DepartmentsProvider>);
    await waitFor(() => expect(screen.getByText('loaded:0')).toBeInTheDocument());
  });
  it('비-ok 응답 시 빈 배열', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve(null) }));
    render(<DepartmentsProvider><Probe/></DepartmentsProvider>);
    await waitFor(() => expect(screen.getByText('loaded:0')).toBeInTheDocument());
  });
});
```
> 파일 확장자는 JSX이므로 `useDepartments.jsx`로 둔다(테스트 import 경로 일치). hooks 디렉터리 JSX 허용 여부는 Task 0의 vite/eslint 설정과 일치시킨다.

- [ ] Step 4.1: 테스트 작성 → **실패** 확인
- [ ] Step 4.2: `useDepartments.jsx` 구현 → 통과 확인
- [ ] Step 4.3: 커밋 `feat(admission): useDepartments — /api/departments 1회 fetch 공유 Provider`

---

### Task 5 — 학과 캐스케이드 순수 로직 추출 (순수 신규 · 완전 코드)
**Files:** `frontend/src/routes/admission/deptLogic.js`(신규), `frontend/src/routes/admission/deptLogic.test.js`(신규)
**Interfaces:** 원본 `init_departments`(2521–2967) 내부의 **순수 함수만** 추출(렌더는 Task 8에서 JSX로). `CATS`(6계열·아이콘 SVG 문자열 그대로), `SAMPLE`(2540–2564 그대로), `enrich(d)`(2575–2586), `matchesQ(d, q)`(2591–2598), `candidates(list, {q,bk21})`(2601–2607), `deptsForCol(list,{gye,q,bk21})`(2612–2618), `deptMajors(d)`(2698), `normUrl`(2572), `esc`(불필요 — JSX가 처리, 제외).

> 이식 레시피: 원본 2521–2967에서 **상태/DOM 조작을 제외한 계산부**만 그대로 옮긴다. `state` 전역 → 함수 인자. `departments` 클로저 → 인자. 정규화 규칙(`localeCompare(...,'ko')` 정렬)·해시태그 결합 검색·`recruit===false` 판정은 **연산 1:1**. `CATS`/`SAMPLE` 객체는 **바이트 복사**.

```js
// deptLogic.test.js — 핵심 분기 패리티 (값은 원본 규칙대로)
import { describe, it, expect } from 'vitest';
import { enrich, matchesQ, candidates, deptsForCol, deptMajors, normUrl } from './deptLogic.js';

const depts = [
  { id:1, name:'고분자공학과', gyeyeol:'공학', recruit:true, bk21:true, hashtags:['#배터리'], majors:[] },
  { id:2, name:'국어국문학과', gyeyeol:'인문·사회', recruit:true, bk21:false, majors:[{name:'국어학'},{name:'문학'}] },
  { id:3, name:'미모집과', gyeyeol:'공학', recruit:false, bk21:false, majors:[] },
];

describe('deptLogic', () => {
  it('matchesQ: 이름+전공명+해시태그(표시값) 검색', () => {
    expect(matchesQ(depts[0], '배터리')).toBe(true);   // 해시태그
    expect(matchesQ(depts[1], '문학')).toBe(true);      // 전공명
    expect(matchesQ(depts[0], '없는키워드')).toBe(false);
    expect(matchesQ(depts[0], '')).toBe(true);          // 빈 검색=전부
  });
  it('candidates: bk21 토글 + 검색', () => {
    expect(candidates(depts, { q:'', bk21:true }).map(d=>d.id)).toEqual([1]);
    expect(candidates(depts, { q:'', bk21:false }).length).toBe(3);
  });
  it('deptsForCol: 검색 모드는 전 계열, 아니면 활성 계열', () => {
    expect(deptsForCol(depts, { gye:null, q:'국문', bk21:false }).map(d=>d.id)).toEqual([2]);
    expect(deptsForCol(depts, { gye:'공학', q:'', bk21:false }).map(d=>d.id).sort()).toEqual([1,3]);
    expect(deptsForCol(depts, { gye:null, q:'', bk21:false })).toEqual([]); // 계열 미선택
  });
  it('deptMajors: 2개 이상일 때만 노출', () => {
    expect(deptMajors(depts[1]).length).toBe(2);
    expect(deptMajors(depts[0]).length).toBe(0);
  });
  it('enrich: 실제값 우선, 없으면 SAMPLE 폴백', () => {
    const x = enrich({ name:'고분자공학과' }); // 실데이터 비어있음 → SAMPLE
    expect(x.isSample).toBe(true);
    expect(x.homepage).toMatch(/polymer\.pusan/);
  });
  it('normUrl: 스킴 없으면 https 보강', () => {
    expect(normUrl('a.b')).toBe('https://a.b');
    expect(normUrl('http://x')).toBe('http://x');
    expect(normUrl('')).toBe('');
  });
});
```

- [ ] Step 5.1: `deptLogic.test.js` 작성 → **실패** 확인
- [ ] Step 5.2: 원본 2540–2618·2698·2572를 `deptLogic.js`로 1:1 이식 → 통과 확인
- [ ] Step 5.3: 커밋 `feat(admission): 학과 캐스케이드 순수 로직(필터·enrich·정렬) 추출 + 테스트`

---

### Task 6 — CSS 추출(인라인 `<style>` 전부 → admission-v3-dark.css) + 병렬 라우트 스캐폴드
**Files:** `frontend/src/routes/admission/admission-v3-dark.css`(신규), `frontend/src/routes/admission/AdmissionPage.jsx`(신규, 빈 셸), `frontend/src/App.jsx`(라우트 추가)
**Interfaces:** `<Route path="/admission-next" element={<AdmissionPage/>}/>` 등록. AdmissionPage는 CSS만 import + 빈 `<main id="intro">`로 시작(이후 Task에서 채움).

> **CSS 이식 레시피(값 무수정):** 원본의 모든 `<style>` 블록을 순서대로 한 파일에 합친다 — 라인범위:
> - 9–1356 (`:root` 다크앰버 토큰 + 전역/GNB/hero/stats/섹션/장학/자격/스케줄/프로세스/FAQ/contact/footer/dept directory/pager/picks/picker/modal/toast/intro stage/tiles/view chrome/motion/FX/아코디언)
> - 1357–1616 (`#ed-scoped` — `.edx{…}` 세부 뷰 토큰·컴포넌트 + 통합 오버라이드)
> - 1622–1704 (`#intro` 로컬 토큰·컴포넌트, `<main>` 내부 `<style>`)
> - 2211–2451 (departments 캐스케이드 `cas-*`/`casm-*`/`dd-*`)
> - 3421–3448 (`.dr-fab`), 3460–3502 (`.fb-fab`)
> **주의:** `body{…}`·`html{…}`·`*{box-sizing}`·`body::after`(필름그레인)·`::selection` 같은 전역 셀렉터는 **그대로 옮기되**, 병렬 검증 단계에선 `/admission-next`에서만 마운트되므로 영향 범위 동일. 폰트 `<link>`(7–8행)는 이미 `fonts.js`로 번들됨 — Task 0에서 확인된 경우 재선언 생략, 아니면 페이지에서 동일 폰트 보장.
> CSS는 **클래스명·셀렉터·값 1바이트도 변경 금지**. `@property --fxang` 포함.

- [ ] Step 6.1: 원본 6개 `<style>` 블록을 라인범위대로 `admission-v3-dark.css`에 합쳐 복사(값 무수정). 빌드 통과(import 시 에러 없음) 확인
- [ ] Step 6.2: `AdmissionPage.jsx` 빈 셸(`import './admission-v3-dark.css'` + 최소 마크업) + `App.jsx`에 `/admission-next` 라우트 추가 → `/admission-next` 200·CSS 로드 확인(브라우저 또는 빌드)
- [ ] Step 6.3: 커밋 `feat(admission): 인라인 CSS 전량 추출 + /admission-next 병렬 라우트 스캐폴드`

---

### Task 7 — IntroView + 정적 4뷰(why/elig/benefits) 1:1 미러 (기계적 이식 · 레시피)
**Files:** `frontend/src/routes/admission/IntroView.jsx`, `views/WhyGradView.jsx`, `views/EligibilityView.jsx`, `views/BenefitsView.jsx`(신규), `AdmissionPage.jsx`(조립)
**Interfaces:** 각 뷰 `{ onShowView, onApply, onBack }`. AdmissionPage가 `useHashView`로 active 결정, active 뷰에만 `is-open` 클래스 부여(원본 `.view.is-open` 동작).

> **이식 레시피(DOM 1:1):**
> - `IntroView` ← 원본 **1706–1783**(video/scrim/ghost/mast/hero/목차/foot)을 JSX로 미러. 카운트다운부(1741–1745)는 `useCountdown({openTime:Date.parse('2026-07-09T09:00:00+09:00'), closeTime:Date.parse('2026-07-16T23:59:59+09:00')})` 결과를 `#dday`/`#cd-h/m/s`/`#cd-status`에 바인딩. 목차 4버튼 `data-view` → `onClick={()=>onShowView(key)}`(why-grad/eligibility/benefits/departments). `data-apply` → `onClick={onApply}`. **class 속성 전부 보존**(`rise d1`…). `<style>` 인라인 토큰은 Task 6 CSS로 이동했으므로 마크업만.
> - `WhyGradView` ← 원본 **1821–1912**. `<section class="view" id="view-why-grad">`…아코디언 2문항(`.qitem.open` 초기 open 상태 유지). 아코디언 토글은 **로컬 state**로(원본 3400–3417 maxHeight 로직 대체: open이면 `.open` 클래스 + CSS `max-height`는 충분히 큰 고정값 대신 ref 측정). **단, 외형 1:1을 위해 `qpane` 펼침 높이 계산을 effect로 재현**(열림 시 `scrollHeight`). `data-back`→`onBack`, `data-apply`→`onApply`, `data-view`→`onShowView`.
> - `EligibilityView` ← **1914–2046**. 자가진단 `<a href="/eligibility.html">`는 **그대로 `<a href>` 유지**(단계 2에서 `/eligibility`로 갈지·.html 유지할지는 단계 2 결정 따름 — 단계 3에선 원본대로 `/eligibility.html`, 단계 4 마감에서 `<Link>`화). `.track`/`.gauge`/`.spec` 전부 정적 마크업 1:1.
> - `BenefitsView` ← **2048–2202**. `.blist`/장학4종/note/비금전혜택 정적 1:1. CTA `href="/scholarship.html"` 동일 보존.
> - `AdmissionPage`: `const {view, showView, showIntro} = useHashView(['why-grad','eligibility','benefits','departments'])`. intro는 `view===null`일 때 표시(`display` 토글로 원본 `intro.style.display` 재현), 각 뷰는 `className={'view' + (view===k ? ' is-open' : '')}`. 뷰 전환 모션(`playViewMotion`, 원본 3241–3248)·intro 영상 play/pause(3240·3254·3274)는 effect로 재현.

> **무변경 체크:** 원본은 모든 뷰가 항상 DOM에 있고 CSS `display:none/flex`로만 토글한다 → React도 **항상 마운트 + 클래스 토글**(언마운트 아님)로 동일 동작·동일 초기 애니메이션 보장.

- [ ] Step 7.1: 검증 하니스(단계 0)로 `/admission-v3-dark.html`(라이브/로컬 정적) vs `/admission-next` **intro + 3뷰** 스크린샷·DOM 텍스트 비교 시나리오를 **실패 상태로** 준비(아직 미구현)
- [ ] Step 7.2: IntroView 미러 → 카운트다운 표기·목차 클릭 뷰전환·해시 동기 수동확인
- [ ] Step 7.3: WhyGrad/Eligibility/Benefits 미러 + AdmissionPage 조립 → 3뷰 진입/뒤로/CTA 동작 확인
- [ ] Step 7.4: 검증 하니스 재실행 → intro+3뷰 픽셀·텍스트 패리티 통과 확인(결과 캡처)
- [ ] Step 7.5: 커밋 `feat(admission): IntroView + why/eligibility/benefits 뷰 1:1 이식`

---

### Task 8 — DepartmentsView + 상세 모달 (캐스케이드 로직 → React · 레시피 + 핵심 코드)
**Files:** `frontend/src/routes/admission/views/DepartmentsView.jsx`, `DeptDetailModal.jsx`(신규), `deptLogic.js`(Task5 재사용)
**Interfaces:** `DepartmentsView({ onBack })` — `useDepartments()` 데이터 + 로컬 `state{gye,deptId,majorName,q,bk21}`. 3컬럼 렌더는 `deptLogic`의 순수 함수로 목록 산출, JSX로 렌더(원본 innerHTML 문자열 → JSX). `DeptDetailModal({ dept, major, onClose })` ← `detailHtml`(2771–2822)/`majorDetailHtml`(2825–2863) 마크업 1:1 JSX화.

> **이식 레시피:**
> - 컬럼1/2/3 ← `renderGye`(2621–2645)/`renderDept`(2648–2695)/`renderMajor`(2710–2740)의 **출력 DOM 구조를 JSX로 미러**. innerHTML 문자열 → 동일 클래스·동일 children. 카운트 배지(`n개 학과`, `★ bk`), `is-active`/`no-recruit`/`norec`/검색모드 계열표시 조건 전부 1:1.
> - 선택 동작 ← `selectGye`/`selectDept`/`selectMajor`(2700–2767): `selectDept`는 전공 2+면 컬럼3 포커스, 아니면 즉시 모달(원본 2706–2707). 포커스 이동(`focusFirst`)은 ref로 재현.
> - 모달 ← `openModal`/`openMajorModal`/`closeModal`(2865–2895): `DeptDetailModal` 컴포넌트로. ESC·backdrop 클릭·포커스 복원(2929–2935·2868·2893) effect로 재현. `document.body.style.overflow='hidden'` 동일.
> - 검색·BK21 ← `bindOnce`(2898–2920): controlled input `q`, 토글 `bk21`(BK21로 활성학과 사라지면 deptId 초기화, 2914–2918 1:1). 카운트 `casCount`(2949–2953) = `총 N개 학과`.
> - 상세 facts/tags/media: `mediaHtml`(2744–2748)·facts 빌더(2789–2800·2842–2850) 마크업 1:1. `tel:`/`normUrl`/`target=_blank rel=noopener` 동일.
> - **하이라이트 코드(상태 전이만, 렌더는 위 레시피):**
> ```jsx
> // DepartmentsView 상태 전이 — 원본 selectGye/selectDept/bk21 토글 1:1
> const [st, setSt] = useState({ gye:null, deptId:null, majorName:null, q:'', bk21:false });
> const selectGye = (gye) => setSt(s => ({ ...s, gye, deptId:null, majorName:null }));
> const selectDept = (id) => {
>   const d = deptById(departments, id);
>   const hasMajors = deptMajors(d).length > 0;
>   setSt(s => ({ ...s, deptId:id, majorName:null }));
>   if (!hasMajors) openModal(d, '');   // 원본 2707
> };
> const toggleBk21 = () => setSt(s => {
>   const next = !s.bk21; let deptId = s.deptId;
>   if (next && deptId != null) { const d = deptById(departments, deptId); if (d && !d.bk21) deptId = null; }
>   return { ...s, bk21: next, deptId };
> });
> const onSearch = (v) => setSt(s => ({ ...s, q:v, deptId:null, majorName:null })); // 원본 2902-2906
> ```

> **무변경 체크:** 원본은 `window.PNU.onDepartments`로 데이터 수신 후 재렌더 — React는 `useDepartments().loaded` 변화로 동일. 데이터 없을 때 빈 컬럼 안내(`emptyCol`, 2751–2753) 메시지 텍스트 1:1.

- [ ] Step 8.1: 검증 하니스에 departments 시나리오(계열→학과→세부전공 필터, BK21 토글, 검색, 학과/전공 모달 open/close) **실패 상태**로 추가
- [ ] Step 8.2: DepartmentsView 3컬럼 + 검색/BK21/카운트 렌더 → mock `/api/departments`로 목록·필터 1:1 확인
- [ ] Step 8.3: DeptDetailModal(학과/전공) + ESC/backdrop/포커스복원 → 모달 패리티 확인
- [ ] Step 8.4: 검증 하니스 재실행(departments 전 시나리오) → 통과 캡처
- [ ] Step 8.5: 커밋 `feat(admission): DepartmentsView 캐스케이드 + 상세 모달 1:1 이식`

---

### Task 9 — ApplyModal + OAuth openApply + FAB 2종 + 전역 toast (레시피 + OAuth 코드)
**Files:** `frontend/src/routes/admission/ApplyModal.jsx`(신규), `AdmissionPage.jsx`(openApply·toast·FAB 마운트·`?modal=apply` 처리)
**Interfaces:** `ApplyModal({ open, onClose, departments, onSubmitted })`. picks/picker/submit 로컬. `openApply()`는 AdmissionPage가 보유(OAuth 게이트 후 open).

> **이식 레시피:**
> - 모달 마크업 ← 원본 **2977–3017** 1:1. picks 리스트(`renderPicks` 3052–3072)·picker(`buildPickDeptSelect`/`renderPickMajorSelect`/`updatePickAddState`/`handlePickAdd` 3086–3165) 동작 1:1. optgroup 계열별·미모집 제외·전공 2+필수·hint 메시지·MAX_PICKS=3 toast 모두 동일.
> - 제출 ← 원본 **3189–3231**: `fetch('/api/surveys/1')`→`mapAnswers`(Task2)→`POST /api/surveys/1/responses`. 201→완료 toast+reset, 409→이미제출, 401→`/auth/google?returnTo=...?modal=apply` 리다이렉트(`buildReturnTo`). 분기 1:1.
> - **OAuth openApply(핵심 — 코드로):**
> ```jsx
> // 원본 admission-v3-dark.html:3171-3180 1:1
> async function openApply() {
>   try {
>     const meRes = await fetch('/auth/me', { credentials:'include' });
>     if (meRes.status === 401) {
>       window.location.href = '/auth/google?returnTo=' +
>         encodeURIComponent(buildReturnTo(window.location)); // path+hash+?modal=apply
>       return;
>     }
>     if (!meRes.ok) { showToast('⚠ 사용자 정보를 불러올 수 없습니다.'); return; }
>     const myRes = await fetch('/api/surveys/1/my-response', { credentials:'include' });
>     if (myRes.status === 200) { showToast('이미 희망 제출을 완료하셨습니다.'); return; }
>     setApplyOpen(true);
>   } catch { showToast('⚠ 네트워크 오류. 잠시 후 다시 시도해주세요.'); }
> }
> // 초기: ?modal=apply 면 200ms 후 openApply (원본:3395, OAuth 복귀 처리)
> useEffect(() => {
>   if (new URLSearchParams(location.search).get('modal') === 'apply') {
>     const t = setTimeout(openApply, 200); return () => clearTimeout(t);
>   }
> }, []);
> ```
> - toast ← 원본 `showToast`(3029–3034) 3초. AdmissionPage 로컬 상태 + `#toast` 마크업(3019).
> - 수정신청 FAB ← **3450–3456**(`/dept-edit-request`, 이미 React 라우트 존재 → `<Link>` 가능하나 외형 1:1 위해 `<a>` 유지 가능, 단계 4에서 `<Link>`화 검토). 피드백 FAB ← **3503–3526**(`FEEDBACK_FORM_URL` 상수 그대로, 유효 URL이면 href·아니면 alert).
> - `window.PNU`/`window.showToast` shim: 외부 의존 없음 확인(grep 결과 admission 페이지 내부에서만 사용) → **재현 불필요**하나, 안전을 위해 AdmissionPage mount 시 `window.showToast=showToast`만 노출(원본 3308). `window.PNU.addPick` 등은 디렉터리→모달 직접 연동이 React props로 대체되므로 생략(증거: 디렉터리 "담기"는 이 페이지에서 모달 picker로만, PNU.addPick 외부 호출처 없음).

> **OAuth 패리티 주의:** `returnTo`에 **hash 포함**(원본 openApply는 `location.hash` 포함, 제출 401은 미포함 — 원본 3173 vs 3200/3228 차이 그대로 유지). buildReturnTo는 openApply용(hash 포함). 제출 401 리다이렉트는 원본대로 hash 없이 `pathname+'?modal=apply'`.

- [ ] Step 9.1: 검증 하니스에 신청 흐름 시나리오(미로그인→/auth/google 리다이렉트 URL 검증, 로그인+미제출→모달 open, picks 추가/제거/3개 초과 toast, 제출 201/409 분기) **실패 상태** 추가
- [ ] Step 9.2: ApplyModal(picks·picker·제출) 구현 → mock fetch로 제출 매핑·분기 확인
- [ ] Step 9.3: openApply OAuth 게이트 + `?modal=apply` 초기 처리 → 리다이렉트 URL이 라이브와 **문자 동일**한지 확인
- [ ] Step 9.4: FAB 2종 + toast 마운트 → 외형·동작 확인
- [ ] Step 9.5: 검증 하니스 재실행(신청 전 시나리오) → 통과 캡처
- [ ] Step 9.6: 커밋 `feat(admission): ApplyModal+OAuth openApply+FAB+toast 1:1 이식`

---

### Task 10 — FX 장식 + 죽은 코드 비이식 증명 + 전체 패리티 검수
**Files:** `frontend/src/hooks/useFxDecorations.js`(신규, 선택), `AdmissionPage.jsx`(FX 연결)
**Interfaces:** `useFxDecorations(rootRef)` — 원본 3357–3392(`.fx-grad`/`.fx-shimmer` 부착, `.fx-spot` 스포트라이트, `.fx-meteor` 유성, deptViewRoot MutationObserver) 재현. `prefers-reduced-motion` 동일 가드.

> **이식 레시피:** FX는 순수 시각 효과 — 원본 셀렉터(`.view-title, .intro-slogan .em, .final-cta h2 em` / `.stat-number, .scho-hero-amount-num` / 카드 SEL 목록)와 메테오 개수(12)·duration/delay 난수식 1:1. React에선 AdmissionPage rootRef 기준 effect로 1회 적용 + departments 동적 카드엔 DepartmentsView 렌더 후 재적용(MutationObserver 대신 의존성 effect 가능).
> **죽은 코드 비이식(증거 필수):** 다음은 원본에 있으나 매칭 DOM 노드가 없어 no-op임을 검증 하니스로 **증명 후 미이식**:
> - 2차 카운트다운(3311–3326): `#cd-d` 부재 → early return. (intro 카운트다운만 활성)
> - stat count-up(3328–3349): `.stat[data-count]` 부재 → 0개. (`.edx .stat`엔 `data-count` 없음)
> - reveal IO(3351–3354): `.reveal` 부재 → 0개.
> 각 항목 "라이브 DOM에 해당 노드 0개" 쿼리 결과를 근거로 남긴다.

- [ ] Step 10.1: 죽은 코드 3건이 라이브에서 no-op임을 쿼리로 확인(증거 기록) → 비이식 결정
- [ ] Step 10.2: useFxDecorations 구현 + 연결 → FX 외형(그라데이션·시머·스포트라이트·유성) 1:1 확인
- [ ] Step 10.3: **전체 검증 하니스**(intro+4뷰+신청+FX, 주요 뷰포트 픽셀 diff + 시나리오)를 `/admission-v3-dark.html` vs `/admission-next`로 실행 → 전 항목 통과 캡처
- [ ] Step 10.4: 커밋 `feat(admission): FX 장식 이식 + 죽은 코드 비이식(증거) + 전체 패리티 검수`

---

### Task 11 — /admission 교체 + .html 리다이렉트 보존 (라우트/리다이렉트 · 코드)
**Files:** `frontend/src/App.jsx`(`/admission` 라우트), `frontend/src/pages/Gateway.jsx`(링크 `<Link to="/admission">`), `backend/src/server.js`(`/admission-v3-dark.html` 301), `frontend/public/admission-v3-dark.html`(교체 후 제거는 단계 4)
**Interfaces:** 정식 라우트 `/admission` = AdmissionPage. 기존 `/admission-v3-dark.html` → `/admission` 301(외부 링크·QR·북마크 보호). `/admission-next`는 검증용 임시 → 본 Task에서 `/admission`으로 승격(또는 alias 유지).

> **리다이렉트 구현(서버, 정적 미들웨어 **이전**에 등록 — `express.static`이 `.html`을 서빙하기 전 가로채야 함):**
> ```js
> // backend/src/server.js — isProd 정적 블록의 express.static 호출 '이전'에 추가
> app.get('/admission-v3-dark.html', (req, res) =>
>   res.redirect(301, '/admission' + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '')));
> // (쿼리 ?modal=apply / hash 보존: hash는 브라우저가 자동 유지, 쿼리는 명시 전달)
> ```
> > 검토 포인트: 현재 `express.static(distPath,{extensions:['html']})`(server.js:104)가 `/admission-v3-dark.html`을 dist 정적 파일로 서빙하므로, **이 라우트는 static use() 보다 위(먼저)** 등록해야 한다. SPA fallback(`app.get('*')`, :108)은 그대로 두면 `/admission`은 index.html로 서빙되어 React가 렌더.
> > dev 모드: Vite가 `public/admission-v3-dark.html`을 그대로 서빙하므로, dev에서의 리다이렉트는 vite.config의 미들웨어 또는 단계 4에서 정적본 제거로 자연 해소. 단계 3에선 **정적본 무손상 유지**가 원칙이므로, 교체 시점에 라이브(prod)에서만 301이 걸리고 정적 파일은 단계 4에서 삭제.
> Gateway 링크(Gateway.jsx:97 `<a href="/admission-v3-dark.html">`)는 `<Link to="/admission">`로 교체(SPA 내부 이동).

- [ ] Step 11.1: 서버 리다이렉트 테스트(있다면 supertest, 없으면 수동 절차) — `/admission-v3-dark.html` GET → 301 Location `/admission` **실패 상태** 작성/확인
- [ ] Step 11.2: `/admission` 라우트 등록(AdmissionPage) + Gateway `<Link>` 교체 + 서버 301 → 통과 확인
- [ ] Step 11.3: 검증 하니스를 `/admission`(라이브 정적본 대비) 최종 재실행 → 통과 캡처. `/admission-v3-dark.html`·`?modal=apply` OAuth 복귀·`#departments` 등 해시 진입 동작 확인
- [ ] Step 11.4: 커밋 `feat(admission): /admission 정식 라우트 교체 + /admission-v3-dark.html 301 리다이렉트 보존`
- [ ] Step 11.5: (배포 게이트) 로컬 검증 결과 사용자 제시 → **OK 후에만** 배포. `/admission-next`는 단계 4 마감에서 제거.


---

## 위험 종합

**단계 0 — 안전 기반 + 검증 하니스**
- 복원 기준 SHA 불일치: spec은 870a963을 복원 기준으로 적었으나 현재 실제 HEAD는 245ab92(spec 커밋 자신). 계획은 실제 HEAD를 pre-react-migration 태그로 고정하도록 교정함 — 870a963을 그대로 태깅하면 spec 추가가 롤백 범위에서 빠짐.
- puppeteer-core는 번들 Chromium이 없어 시스템 Chrome 실경로(C:/Program Files/Google/Chrome/Application/chrome.exe, 존재 확인됨)에 의존. 머신마다 경로가 다르면 CHROME_PATH/PUPPETEER_EXECUTABLE_PATH env로 override 필요(Task1이 처리).
- admission 카운트다운이 Date.now() 라이브 값에 의존 → 라이브와 로컬을 다른 순간에 캡처하면 #cd-status/#cd-title이 달라 픽셀·텍스트 diff 오탐. evaluateOnNewDocument로 Date를 2026-06-22로 동결해 완화(Task4).
- 라이브(arise-ai)와 로컬은 폰트 렌더링·안티앨리어싱·서브픽셀 차이로 픽셀이 100% 일치하지 않을 수 있음 → ratio>1% 만 회귀로 카운트하고 threshold(채널차 12)로 노이즈 흡수. 최종 외형 동일성은 스크린샷을 사용자가 육안 검수.
- 포트 5173~5176을 타 대학 프로젝트가 점유 → 하니스 dev 서버는 --local 임의 포트(예 5188) 인자로 띄워야 하며 Vite strictPort라 충돌 시 즉시 실패(스모크에 npx vite --port 5188 --strictPort 명시).
- 단계0 스모크에서 라이브 풀런(--no-live 없이)을 돌리면 접수기간(7.9~) 전이라도 prod에 트래픽 발생 → 단계0에선 --no-live로 동작만 확인하고 라이브 대조는 단계1~4 검증 게이트에서 수행.

**단계 1(arise 제거) · 단계 4(통합 마감) · 라우팅/리다이렉트 인프라**
- 순서 의존: .html 리다이렉트(Navigate)는 대응 public/*.html이 삭제돼야만 발동(dev Vite·prod express.static이 정적 파일을 먼저 가로챔). 각 .html 삭제와 Navigate 등록을 반드시 같은 커밋으로 묶어야 하며, 단계2·3 산출과 타이밍이 얽힘. 본 섹션 Task A는 리다이렉트 라우트를 미리 깔되 스모크 케이스를 skip→각 삭제 Task에서 해제하는 방식으로 분리.
- 배포 잔존물: prod dist에 옛 eligibility.html/scholarship.html/admission-v3-dark.html이 클린 빌드 없이 남으면 express.static이 정적본을 우선 서빙해 React 리다이렉트가 영영 가려진다. 배포 절차에 rm -rf frontend/dist 후 재빌드를 반드시 명시(server.js Step5).
- 검증 도구 공백: frontend에 단위 테스트 러너 없음 → puppeteer-core + node:test 하니스를 신규 도입. CHROME_PATH 환경변수로 크롬 실행파일을 지정해야 하며(Windows/폐쇄망), CI/타 머신에서 경로 다를 수 있음. 미설정 시 하니스 자체가 launch 실패.
- 구조 이동 회귀: src/pages→routes 이동 시 상대 import 누락/오타로 빌드는 통과해도 런타임 라우트가 깨질 수 있음. depth 변하는 admin/ 4파일은 실제로는 내부 상대 import이 없어 안전하나, App.jsx import 경로 5줄 갱신을 빠뜨리면 즉시 빌드 실패로 검출. 이동 후 from './pages/ grep 0건 가드 필수.
- orphan 삭제 오판: AdmissionForm.jsx/Eligibility.jsx가 정말 무참조인지는 단계2·3 산출 컴포넌트가 다른 이름(EligibilityCheck·AdmissionPage)을 쓴다는 전제에 의존. 만약 단계2·3가 동일 파일명을 재사용했다면 삭제가 활성 코드를 지울 수 있음 → Task G Step1 grep 게이트에서 1건이라도 잡히면 중단·보고.
- Gateway <Link> SPA화는 spec이 허용하는 '명백한 개선'(전체 새로고침 제거)이나 외형/동작 1:1 무변경 규칙상 사용자 검수 대상. className·DOM·문구는 동일 유지하여 픽셀 변화 없음을 보장.

**단계 2 — 계산기 2종 (eligibility · scholarship) React 이식**
- CSS 전역 오염: 두 원본은 `*`·`body`·`select`·`input` 등 bare 셀렉터로 전역 스타일을 깔아 SPA 다른 라우트에 누출됨. 완화 = 모든 셀렉터를 `.elig-root`/`.schol-root` 래퍼로 기계적 스코프하되 선언값은 1바이트도 안 바꿈. body→래퍼 이관 시 배경이 뷰포트를 못 덮는 회귀를 막으려 래퍼에 `min-height:100vh` 1줄만 추가(동등/개선, 출력 동일).
- 리다이렉트 메커니즘: 정적 HTML 삭제 후 express.static이 더는 `/eligibility.html`을 서빙하지 않으므로 반드시 React Router `<Navigate replace>`가 받아야 함. App.jsx 라우트 등록 누락 시 admission 정적본(1950·2034·2188행)과 외부 QR 링크가 깨짐 → Task 2.4 검증 게이트에서 .html 4경로 + admission 링크 클릭을 명시 확인.
- detail/reason/scholNote/BK21_HTML이 HTML 문자열(b·div·br 태그 포함)이라 컴포넌트에서 dangerouslySetInnerHTML로 렌더해야 1:1 보존됨. lib는 이 문자열을 원본 템플릿 그대로 생성(이스케이프·태그 변형 금지).
- scholarship과 eligibility의 `--no` 변수값이 다름(#9aa1ad vs #c0392b). 이번 패스는 무변경 원칙이므로 각 스코프 CSS에 원본값 그대로 보존 — 토큰 통폐합 금지(spec 4·12절: 후속 별도 작업).
- admission-v3-dark.html은 이 단계에서 정적으로 남으므로 두 새 컴포넌트의 `/admission-v3-dark.html` 링크는 raw <a>로 유지(SPA 외부 이동). 단계 3에서 라우트화될 때 <Link>로 전환 — 지금 <Link>로 바꾸면 404.

**단계 3 — admission-v3-dark(3,529줄) React 분해 구현계획**
- 원본은 4개 뷰가 항상 DOM에 있고 CSS display로만 토글 — React에서 언마운트하면 초기 애니메이션(rise/introIn)·아코디언 초기 open 높이가 달라진다. 반드시 '항상 마운트 + is-open 클래스 토글'로 구현해야 1:1.
- 전역 셀렉터(body{}, *{}, body::after 필름그레인, ::selection, html{scroll-behavior})를 admission-v3-dark.css로 옮기면 /admission 외 다른 React 페이지에 누출될 위험. 병렬 검증 단계(/admission-next)에선 그 라우트에서만 마운트되나, 정식 라우트(SPA 공유 #root)에서는 CSS가 전역 적용된다 — 페이지 진입/이탈 시 스코프 클래스로 감싸거나 라우트 언마운트 시 제거 보장 필요(무변경 검수 핵심 항목).
- OAuth returnTo 문자열은 라이브와 바이트 동일해야 한다: openApply는 hash 포함(원본 3173), 제출 401은 hash 미포함(3200/3228). 이 비대칭을 그대로 보존하지 않으면 OAuth 복귀 후 뷰 상태가 달라진다.
- /admission-v3-dark.html 301은 express.static({extensions:['html']}) 보다 먼저 등록해야 가로채진다. dev(Vite)에선 정적본이 그대로 서빙되므로 dev/prod 동작 차이 — 단계 3에선 정적본 유지(prod만 301), 단계 4에서 정적본 삭제로 통일.
- 죽은 코드(2차 카운트다운 #cd-d, stat count-up [data-count], reveal IO .reveal)는 라이브에서 no-op이나, '미이식=누락'으로 오인될 수 있음. 검증 하니스로 매칭 노드 0개를 증명한 근거를 커밋에 남겨야 한다.
- departments 캐스케이드의 innerHTML→JSX 이식 시 esc()는 React가 자동 처리하지만, dangerouslySetInnerHTML로 옮긴 SVG 아이콘(CATS) 문자열·dd- 상세 마크업은 신뢰된 정적 문자열만 사용해야 하고 사용자 입력(학과명 등)은 JSX 텍스트로 렌더해 XSS 표면을 늘리지 않아야 한다.
- window.PNU/window.showToast 전역을 외부에서 참조하지 않음을 grep으로 확인했으나, 향후 다른 정적 페이지가 참조할 가능성 — 안전상 window.showToast shim만 노출하고 PNU.addPick류는 props로 대체(증거 기반).

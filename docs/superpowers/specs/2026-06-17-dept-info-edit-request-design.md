# 학과 디렉토리 페이지 수정 — 설계

날짜: 2026-06-17 · 상태: 승인됨 · 출처: 교육혁신본부 전공디자인팀(박선영) 수정 요청 이메일(2026-06-16)

## 목표
교육혁신실 이메일 요청 2건을 반영한다.
1. **문구 수정** — 학과 디렉터리 페이지(`admission-v3-dark.html`)의 안내 문구 2곳.
2. **신규 페이지 "학과 정보 수정 신청"** — 학과 관계자가 직접 학과 디렉터리 정보를 제출/수정 요청하고, 관리자가 검토·승인하면 디렉터리에 반영되는 페이지. 기존 「의견·질문」(구글 폼 FAB)은 **그대로 유지**.

## 핵심 결정
- **저장·반영**: 자체 PostgreSQL 테이블(`dir_change_requests`) + 관리자 검토 큐. **승인 시 디렉터리에 자동 반영**.
- **접근 권한**: `@pusan.ac.kr` Google OAuth 게이트(기존 `requireAuth` 재사용). 제출자 이메일은 OAuth에서 검증 캡처.
- **학과 입력**: 기존 디렉터리(`GET /api/departments`) 기반 **연동 드롭다운**(계열→학과→세부전공) + 단계별 "신규/목록에 없음" 자유 입력 fallback. 드롭다운 선택이 곧 반영 대상을 확정하므로 모호한 매칭이 없다.
- **이미지**: 기존 패턴 재사용 — 클라이언트 파일→base64(dataURL) → DB `bytea` 저장, 2MB 제한·`image/*`만 허용(`parseImage`/`applyImage`/`MAX_IMG`).
- **페이지 형태**: SPA React 라우트(OAuth 게이트·API 연동·이미지 미리보기 때문). 정적 HTML 도구 페이지(eligibility/scholarship)와 달리 로그인 흐름이 필요.

## 요청 ① — 문구 수정 (`frontend/public/admission-v3-dark.html`)
| 위치 | 수정 전 | 수정 후 |
|---|---|---|
| 2435행 (대제목 하단) | `계열 → 학과 → 학과를 클릭하면 상세 정보가 팝업으로 열립니다. ★는 BK21 참여학과.` | `계열 → 학과 → 세부전공 순으로 탐색해 보세요.` |
| 2452행 (검색창 옆 칩 `#casBk21`) | `★ BK21만` | `★ BK21 참여학과` |

- **범위 한정**: 이메일이 지정한 2곳만 수정. 2441행(히어로 캡션)·2488행(미선택 안내)의 유사 "팝업으로 열립니다" 문구는 **건드리지 않는다**(요청 외).

## 요청 ② — 신규 페이지 "학과 정보 수정 신청"

### 데이터 모델 — `dir_change_requests`
`db.js`의 `initSchema()`에 `CREATE TABLE IF NOT EXISTS`로 추가.

| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | SERIAL PK | |
| created_at | timestamptz default now() | |
| status | TEXT default 'pending' | `pending` \| `approved` \| `rejected` |
| submitter_email | TEXT | OAuth 검증 이메일(`req.user.email`) |
| applicant_name | TEXT | 신청자명 (메타) |
| affiliation | TEXT | 소속 (메타) |
| ext_phone | TEXT | 내선전화번호 (메타) |
| target_level | TEXT | `dept` \| `major` — 세부전공 지정 시 `major` |
| dept_id | INTEGER NULL | 기존 학과 선택 id, NULL=신규 학과 |
| major_id | INTEGER NULL | 기존 세부전공 선택 id, NULL=신규/해당없음 |
| gyeyeol | TEXT | 계열 |
| dept_name | TEXT | 학과명 |
| major_name | TEXT NULL | 세부전공명 |
| intro | TEXT | 간략한 소개 |
| location | TEXT | 위치 |
| phone | TEXT | 전화번호(학과/전공 공개 전화) |
| homepage | TEXT | 홈페이지 주소 |
| bk21_url | TEXT | BK21 사업단 홈페이지 주소 |
| image_mime | TEXT | 이미지 MIME |
| image_data | bytea | 이미지 바이너리 |
| reviewed_at | timestamptz NULL | 검토 시각 |
| reviewed_by | INTEGER NULL | 검토 관리자 id |
| reject_reason | TEXT NULL | 반려 사유 |

### 이메일 12항목 → 필드 매핑
| 이메일 항목 | 처리 |
|---|---|
| 신청자명 / 소속 / 내선전화번호 | 신청 메타(디렉터리 **미반영**, 관리자 연락용) |
| (자동) 제출자 이메일 | OAuth 검증 캡처 → `submitter_email` |
| 계열 / 학과 / 세부전공 | 반영 대상 식별 + `gyeyeol`/`dept_name`/`major_name` |
| 간략한 소개 → `intro` · 위치 → `location` · 전화번호 → `phone` · 홈페이지 → `homepage` | 디렉터리 필드 |
| BK21 사업단 홈페이지 → `bk21_url` (+ 반영 시 `bk21=1`) | 디렉터리 필드 |
| 학과 이미지(파일첨부) → `image_mime`/`image_data` | 기존 `applyImage` 재사용 |

### 대상 지정 + 자동 반영 로직
- 폼 드롭다운에서 기존 학과/세부전공을 고르면 그 `id`를, "신규/목록에 없음"이면 자유 입력 → `id=null`.
- `세부전공` 지정 → `target_level='major'`, 아니면 `'dept'`.
- **승인 시** (`tx()`로 원자적 처리):
  - **dept 레벨**: `dept_id` 있으면 `dir_departments` UPDATE, 없으면 INSERT.
  - **major 레벨**: 학과 확정(기존 `dept_id` 또는 신규 학과를 먼저 INSERT) 후 `dir_majors` UPDATE(있으면)/INSERT.
  - **부분 수정 안전장치**: UPDATE 시 **값이 채워진 필드만** 덮어쓰고 빈 항목은 기존값 유지. `recruit`/`hashtags`/`ord`는 폼에 없으므로 미손상. INSERT는 제공값 + 스키마 기본값.
  - `bk21_url`이 채워지면 `bk21=1` 설정(`bk21_name`은 관리자가 CRUD에서 보완).
  - 이미지가 있으면 `applyImage`로 적용.
  - 완료 후 `status='approved'`, `reviewed_at`/`reviewed_by` 기록.
- **반려 시**: `status='rejected'`, `reject_reason` 저장, 디렉터리 미반영.

### API (신규 라우터 `backend/src/dir-requests.js`)
- `POST /api/dir-change-requests` (`requireAuth`) — 제출. 필수값·이미지(`parseImage`/`MAX_IMG`/`image/*`) 검증, `submitter_email`=`req.user.email`, `status='pending'`로 저장.
- 관리자(`requireAdmin`, `/api/admin/*`):
  - `GET /api/admin/dir-change-requests?status=` — 목록(이미지 bytea 제외).
  - `GET /api/admin/dir-change-requests/:id` — 상세.
  - `GET /api/admin/dir-change-requests/:id/image` — 이미지 서빙(mime + bytea).
  - `POST /api/admin/dir-change-requests/:id/approve` — 자동 반영 + 상태 변경.
  - `POST /api/admin/dir-change-requests/:id/reject` — 본문 `reason`, 상태 변경.
- `server.js`에 라우터 마운트(공개 제출은 `/api`, 관리자는 기존 admin 네임스페이스 규약 따름).

### 프론트 제출 페이지 — `/dept-edit-request`, `frontend/src/pages/DeptEditRequest.jsx`
- `App.jsx`에 라우트 등록(`*` 폴백 위).
- **게이트**: 마운트 시 `/auth/me` 호출 → 401이면 `/login?returnTo=/dept-edit-request`로(기존 OAuth 흐름 그대로).
- **폼**: 신청자명·소속·내선전화번호(text) / `GET /api/departments` 기반 계열→학과→세부전공 **연동 드롭다운**(각 단계 "신규/목록에 없음" → 자유 입력 노출) / 간략한 소개(textarea) / 위치·전화번호·홈페이지·BK21 사업단 홈페이지(text) / 학과 이미지(`FileReader.readAsDataURL` 미리보기 + 클라이언트 2MB 체크).
- 제출 → `POST /api/dir-change-requests` → 성공 화면("접수되었습니다, 검토 후 반영").
- 기존 스타일 토큰/컴포넌트 관습 사용.

### 관리자 검토 UI — `AdminDashboard.jsx` "학과 수정 신청" 탭
- 신규 컴포넌트 `frontend/src/pages/DeptChangeRequestsAdmin.jsx`, 탭 라벨에 pending 건수 배지.
- **목록**: 제출일·신청자명·소속·대상(기존 학과/전공명 또는 "신규")·상태. pending/전체 필터.
- **상세**: 전 항목 표시 + 이미지 미리보기 + (가능하면) 현재 디렉터리 값과 비교 표시. **승인/반려** 버튼(반려 시 사유 입력).
- 기존 다크 관리자 스타일 유지.

## 인증·안전
- 제출은 `@pusan.ac.kr` OAuth 게이트(`requireAuth`). 관리자 검토/반영은 모두 `requireAdmin`.
- 이미지 2MB·`image/*` 제한(제출·반영 양쪽). `express.json` 한도(현재 8mb) 내.
- 승인 반영은 `tx()`로 원자적. 신청자 메타(이름·소속·내선)는 디렉터리에 반영하지 않음.

## 엣지 케이스
- 신규 학과 + 세부전공 동시 신청 → 승인 시 학과 INSERT 후 그 id로 전공 INSERT(한 트랜잭션).
- 이미지 미첨부 허용. 비이미지/2MB 초과는 제출 시 거부.
- UPDATE 시 빈 선택 필드는 기존값 유지(데이터 손실 방지).
- 같은 제출자의 복수 신청 허용(unique 제약 없음).

## 테스트
- **백엔드**: 제출 검증(필수 누락·잘못된 이미지·도메인 게이트), 승인 반영(기존 학과 UPDATE / 신규 학과 INSERT / major 레벨 / 신규 학과+전공 동시), 반려.
- **수동**: 로컬에서 `@pusan.ac.kr` 로그인→제출→관리자 승인→디렉터리·이미지 반영 확인. (로컬 OAuth 테스트는 `.env`에 `GOOGLE_CLIENT_ID/SECRET` 필요.)

## 예상 일정 (클라이언트 회신용)
- 문구 수정: ~0.5시간
- 백엔드(테이블 + 제출 + 관리자 API + 자동 반영): ~1.5일
- 프론트 제출 페이지(연동 드롭다운·이미지·검증): ~1.5일
- 관리자 검토 탭: ~1일
- 테스트 + 배포: ~1일
- **합계 약 4~5 영업일(1주 내외), 기능 구현 가능**

## 비고
- 진입점: `/dept-edit-request` URL을 교육혁신실이 학과들에 공유. 학생용 메인 노출은 기본 비노출(추후 선택).
- 기존 「의견·질문」(구글 폼 FAB, `FEEDBACK_FORM_URL`)은 변경 없음.
- 배포는 사용자 로컬 검증 + 명시 승인 후에만(자동 배포 금지).

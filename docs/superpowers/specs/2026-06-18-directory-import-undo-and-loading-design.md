# 디렉터리 CSV 가져오기 — 되돌리기(스냅샷) + 적용 로딩/에러 표시 — 설계

날짜: 2026-06-18 · 상태: 승인됨 · 출처: 사용자 요청 — "잘못된 CSV를 올렸을 때 롤백, 적용 중 로딩 팝업 + 실패 시 원인 표시"

## 목표
[[2026-06-18-directory-csv-bulk-import-design]] 의 CSV 가져오기에 두 가지를 추가한다.
1. **되돌리기(undo)** — 성공적으로 반영된 직전 가져오기를 사후 취소.
2. **적용 UX** — 적용 중 "적용 중입니다…" 로딩 표시, 실패 시 **구체적 원인**을 모달에 표시.

## 핵심 결정
- **되돌리기 = 디렉터리 2개 테이블 스냅샷/복원** (전체 DB 덤프 아님).
  - 커밋 직전 같은 트랜잭션에서 `dir_departments`·`dir_majors` 전 행(이미지 bytea 포함)을 백업 테이블에 복사. **최근 1건만 보관**.
  - 되돌리기 = 트랜잭션 내에서 현재 디렉터리 비우고(`DELETE FROM dir_departments` → majors는 FK CASCADE) 스냅샷으로 재삽입(원래 id·이미지 보존, 시퀀스 보정). 복원 후 스냅샷 삭제(1회성).
  - **전체 DB 덤프를 안 쓰는 이유**: 범위가 DB 전체라 무관한 데이터(응답·수정신청)까지 되돌아가고, drop/restore로 다운타임·권한·바이너리 부담. 테이블 스냅샷은 디렉터리에만 한정되고 다운타임 없음, 의존성 0.
  - **단점(명시·UI 경고)**: 되돌리기는 디렉터리 *전체*를 그 가져오기 직전으로 복원하므로, 그 사이 한 다른 디렉터리 편집도 함께 사라진다. "최근 1건"이라 "방금 잘못 올림 → 즉시 취소" 흐름에 적합.
- **적용 로딩/에러**: 모달에 `phase` 상태(idle→applying→error/done). 실패 시 commit 라우트가 **구체적 메시지**를 반환하도록 개선(`{error:'internal'}` → `{error, message}`)하고 모달 빨간 패널에 표시. 닫지 않고 재시도 가능.
- **FK 안전성 확인**: 디렉터리를 참조하는 FK는 `dir_majors.dept_id`(ON DELETE CASCADE)뿐. `dir_change_requests`는 dept_id/major_id를 FK 없이 보관 → wipe-restore가 다른 테이블을 건드리지 않음.

## 스키마 추가 (`db.js` `initSchema()`, CREATE IF NOT EXISTS)
```sql
CREATE TABLE IF NOT EXISTS dir_snapshots (
  id SERIAL PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  summary TEXT
);
-- 백업 테이블: 원본 컬럼 + snapshot_id (원본과 동일 타입; jsonb/bytea 네이티브 복사)
CREATE TABLE IF NOT EXISTS dir_dept_backup (
  snapshot_id INTEGER NOT NULL REFERENCES dir_snapshots(id) ON DELETE CASCADE,
  id INTEGER, gyeyeol TEXT, name TEXT, recruit INTEGER, homepage TEXT, hashtags jsonb,
  location TEXT, phone TEXT, bk21 INTEGER, bk21_name TEXT, bk21_url TEXT, intro TEXT,
  ord INTEGER, image_mime TEXT, image_data bytea, created_at timestamptz
);
CREATE TABLE IF NOT EXISTS dir_major_backup (
  snapshot_id INTEGER NOT NULL REFERENCES dir_snapshots(id) ON DELETE CASCADE,
  id INTEGER, dept_id INTEGER, name TEXT, recruit INTEGER, homepage TEXT, hashtags jsonb,
  location TEXT, phone TEXT, bk21 INTEGER, bk21_name TEXT, bk21_url TEXT, intro TEXT,
  ord INTEGER, image_mime TEXT, image_data bytea
);
```

## 백엔드

### 모듈 `directory-import.js` — 추가 함수 (exec 주입, 트랜잭션 내 사용)
- `snapshotDirectory(exec, summary)` — `DELETE FROM dir_snapshots`(최근 1건 유지) → `INSERT dir_snapshots RETURNING id` → 백업 테이블에 `INSERT ... SELECT $sid, <컬럼들> FROM dir_*`(컬럼 명시).
- `restoreLatestSnapshot(exec)` — 최신 snapshot id 조회(없으면 `{ok:false, error:'no_snapshot'}`) → `DELETE FROM dir_departments`(majors cascade) → 백업에서 depts·majors 재삽입(컬럼 명시, id 포함) → `setval(pg_get_serial_sequence(...), GREATEST(MAX(id),1))` 양 테이블 → `DELETE FROM dir_snapshots WHERE id=$sid` → `{ok:true, depts, majors}`(복원 건수).
- `getSnapshotInfo(exec)` — `SELECT id, created_at, summary FROM dir_snapshots ORDER BY id DESC LIMIT 1` → `{exists, created_at, summary}`.

### 라우트 (`admin.js`, `requireAdmin`)
- **commit 수정**: 같은 `tx` 안에서 `snapshotDirectory(t, summary)` 먼저 → `applyPlan(t, plan)`. 실패 catch에서 **구체 메시지 반환**: `res.status(500).json({ error: 'commit_failed', message: e.message })`.
  - `summary` = `가져오기 직전 백업 · 추가 ${added}·수정 ${updated}`.
- **신규** `POST /directory/import/undo` → `tx(restoreLatestSnapshot)`; `ok=false`면 `409 {error:'no_snapshot'}`, 성공 `{depts, majors}`. catch → `500 {error:'undo_failed', message}`.
- **신규** `GET /directory/snapshot` → `getSnapshotInfo` → `{exists, created_at, summary}` (UI 버튼 활성화 판단).

## 프런트엔드 (`DeptDirectoryAdmin.jsx`, frontend-design 적용)
- **로드 시** `GET /directory/snapshot`으로 되돌리기 가능 여부 조회 → 상태 `snapshot`.
- **툴바**: 기존 버튼 + **"마지막 가져오기 되돌리기"**(스냅샷 있을 때만 활성, 없으면 비활성/숨김). 클릭 → `confirm`(경고: "이 가져오기 이후의 디렉터리 변경도 함께 되돌아갑니다") → `POST undo` → 결과 alert → 스냅샷 재조회 + `load()`.
- **미리보기 모달 — 적용 흐름 개편**: 상태 `phase`(`'idle'|'applying'|'error'`) + `errorMsg`.
  - 적용 클릭 → `phase='applying'`: 버튼들 비활성 + **"적용 중입니다…" 스피너** 표시.
  - 성공 → 결과 alert(`추가/수정/스킵`) → 모달 닫고 스냅샷 재조회 + `load()`.
  - 실패 → `phase='error'`, 모달 안 **빨간 패널에 서버 `message`**(없으면 일반 문구) 표시. 모달 유지, "다시 시도"/"취소" 가능.
- 스피너는 CSS 키프레임(인라인 `<style>` 또는 기존 스타일 객체) — 기존 다크 인라인 스타일 토큰 정합.

## 에러 처리·안전장치
- 스냅샷·적용·복원 모두 **단일 트랜잭션**(부분 적용 불가). 가져오기 실패 시 스냅샷도 함께 롤백(저장 안 됨) → 되돌릴 게 없음(정상).
- 되돌리기는 1회성(복원 후 스냅샷 삭제) → 중복 되돌리기 방지.
- 이미지 bytea는 네이티브 행 복사로 보존(되돌려도 이미지 유지).

## 테스트
- **단위(fake exec)**: `snapshotDirectory`가 `DELETE dir_snapshots`→`INSERT dir_snapshots RETURNING`→백업 `INSERT...SELECT` 순서로 호출하는지; `restoreLatestSnapshot`이 스냅샷 없을 때 `{ok:false}` 반환.
- **통합(실제 Postgres, 롤백)**: 한 tx 안에서 snapshot → 디렉터리 변경(수정+신규) → `restoreLatestSnapshot` → 디렉터리가 변경 전과 동일(행 수·특정 값·이미지 유무) 검증 → throw로 전체 롤백(데이터 무변경).
- **HTTP(임시 관리자)**: commit(스냅샷 생성됨) → `GET /snapshot` exists=true → undo → 디렉터리 원복 → `GET /snapshot` exists=false. 실패 메시지 경로(예: 잘못된 입력)로 commit `message` 반환 확인. 임시 관리자·테스트 데이터 정리.
- **브라우저(로그인)**: 가져오기 적용 중 "적용 중입니다…" → 결과; 되돌리기 버튼 동작; 스크린샷.

## 범위 외 (YAGNI)
다단계 이력(N건) 되돌리기, 임의 시점 선택 복원, 전체 DB 백업, 되돌리기의 되돌리기(redo). 필요 시 후속.

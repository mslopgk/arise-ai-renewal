# 학과 디렉터리 관리(CRUD) — 설계

날짜: 2026-06-08 · 상태: 승인됨

## 목표
`/admin` 관리자 페이지에서 학과 디렉터리(계열→학과→세부전공, 현재 147개)의 학과·세부전공 정보를 **수정·추가·삭제**하고 **이미지를 업로드**할 수 있게 한다. 변경은 영구 저장되고 디렉터리에 즉시 반영된다.

## 핵심 결정
- **저장**: PostgreSQL 테이블화(현재 정적 `departments.json`은 이미지에 구워져 런타임 수정 불가). 최초 1회 JSON으로 시드 후 **DB가 원본**. `pnug_pgdata` 볼륨에 저장돼 재배포에도 유지.
- **이미지**: 클라이언트 파일→base64 업로드 → DB `bytea` 저장 → 동일 출처 서빙(폐쇄망 대응). 추가 의존성 없음(express.json 한도 상향).
- **세부전공(majors)**: 학과 편집 화면에서 함께 CRUD.

## 데이터 모델
- **`dir_departments`**: id PK, gyeyeol, name, recruit bool, homepage, hashtags jsonb, location, phone, bk21 bool, bk21_name, bk21_url, intro, ord int, image_mime, image_data bytea, created_at
- **`dir_majors`**: id PK, dept_id FK(ON DELETE CASCADE), name, recruit, homepage, hashtags jsonb, intro, location, phone, bk21, bk21_name, bk21_url, ord, image_mime, image_data bytea
- 시드: `dir_departments` 비어있으면 `backend/src/data/departments.json` 147개(+majors)로 채움.

## API
- 공개:
  - `GET /api/departments` — **DB에서 읽어** 기존 JSON 형태로 반환(image 있으면 `image: "/api/departments/:id/image"`, 전공 image는 `/api/departments/:id/majors/:mid/image`). 디렉터리가 이걸 fetch.
  - `GET /api/departments/:id/image`, `GET /api/departments/:id/majors/:mid/image` — bytea + mime 서빙(캐시 헤더).
- 관리자(`requireAdmin`):
  - `POST /api/admin/departments` (생성), `PUT /api/admin/departments/:id` (수정), `DELETE /api/admin/departments/:id` (cascade)
  - `POST /api/admin/departments/:id/majors`, `PUT .../:mid`, `DELETE .../:mid`
  - 이미지: 위 생성/수정 본문에 `image`(dataURL/base64) 포함 시 저장, `imageClear:true`로 제거. (학과·전공 공용)

## 디렉터리 연결
- `admission-v3-dark.html`: `fetch('/data/departments.json')` → `fetch('/api/departments')`.
- React 앱의 동일 데이터 사용처(신청 폼 전공 select 등)도 `/api/departments`로 통일.

## 관리자 UI (`AdminDashboard`에 "학과 디렉터리 관리" 섹션)
- 학과 목록(계열 필터 + 검색) → 행 클릭 시 편집 폼.
- 편집 폼 필드: 이름·계열(select, 8계열)·모집여부(toggle)·홈페이지·위치·전화·BK21(+이름·URL)·소개·해시태그(쉼표/줄 입력)·이미지(업로드/미리보기/삭제) + **세부전공 하위 목록**(추가/수정/삭제, 각 전공 동일 필드).
- "신규 학과 추가" 버튼. "삭제"는 확인 다이얼로그.
- 기존 다크 관리자 스타일 유지.

## 인증·안전
- 모든 쓰기 `requireAdmin`. 공개 읽기/이미지 서빙만 오픈.
- 삭제 confirm. 이미지 용량 제한(~2MB), image/* 만 허용.

## 비고
- `departments.json`(repo)은 이후 **초기 시드 전용**(원본 아님). 운영 데이터는 DB.
- 적용 후엔 정적 `/data/departments.json`은 미사용(남겨두되 디렉터리는 API 사용).

-- 학과 디렉터리에서 협동과정·계약학과 제거 (2026-06-12)
-- 근거: 학석박사 연계과정 신청 불가 학과 — 대학원혁신실 회신.
-- dir_majors는 dept_id FK가 ON DELETE CASCADE지만 명시적으로 먼저 지운다.
-- 트랜잭션: 중간 실패 시 아무것도 변경되지 않음.

\set ON_ERROR_STOP on

BEGIN;

SELECT '--- 삭제 전 분포 ---' AS info;
SELECT gyeyeol, count(*) AS n FROM dir_departments GROUP BY gyeyeol ORDER BY gyeyeol;

DELETE FROM dir_majors
 WHERE dept_id IN (SELECT id FROM dir_departments WHERE gyeyeol IN ('협동과정', '계약학과'));

DELETE FROM dir_departments
 WHERE gyeyeol IN ('협동과정', '계약학과');

SELECT '--- 삭제 후 분포 ---' AS info;
SELECT gyeyeol, count(*) AS n FROM dir_departments GROUP BY gyeyeol ORDER BY gyeyeol;
SELECT count(*) AS remaining_departments FROM dir_departments;
SELECT count(*) AS remaining_coop_contract
  FROM dir_departments WHERE gyeyeol IN ('협동과정', '계약학과');

COMMIT;

import pg from 'pg';

const { Pool } = pg;

// timestamptz/timestamp는 JS Date 대신 원본 문자열로 받는다.
// (CSV·시트 미러·JSON 출력에서 Date.toString() 대신 안정적인 문자열 유지 — 기존 SQLite TEXT 동작에 근접)
pg.types.setTypeParser(1184, (v) => v); // timestamptz
pg.types.setTypeParser(1114, (v) => v); // timestamp

// === 연결 풀 ===
// DATABASE_URL 우선, 없으면 PG* 개별 변수. (Docker compose에서 postgres 서비스로 연결)
export const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, max: 10 }
    : {
        host: process.env.PGHOST || 'localhost',
        port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
        user: process.env.PGUSER || 'pnug',
        password: process.env.PGPASSWORD || 'pnug',
        database: process.env.PGDATABASE || 'pnug',
        max: 10,
      }
);

pool.on('error', (err) => console.error('[pg] idle client error:', err.message));

// SQLite의 '?' 위치 플레이스홀더 → Postgres '$n' 변환.
// (이 코드베이스 SQL 문자열에는 리터럴 '?'가 없으므로 안전)
function toPg(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => '$' + ++i);
}

// node:sqlite의 db.prepare(sql).get/all/run(...params) 호환 셰임 — 단, 비동기.
// 호출부는 `await db.prepare(sql).get(a, b)` 형태로 await만 추가하면 됨.
export function prepare(sql) {
  const text = toPg(sql);
  return {
    get: async (...params) => (await pool.query(text, params)).rows[0],
    all: async (...params) => (await pool.query(text, params)).rows,
    run: async (...params) => await pool.query(text, params),
  };
}

// 파라미터 없는 DDL/멀티스테이트먼트 실행.
export async function exec(sql) {
  await pool.query(sql);
}

// 트랜잭션 — 전용 client를 써서 BEGIN/COMMIT/ROLLBACK이 같은 커넥션을 타도록 보장.
// fn은 { get, all, run } 헬퍼를 받는다.
export async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn({
      get: async (sql, ...p) => (await client.query(toPg(sql), p)).rows[0],
      all: async (sql, ...p) => (await client.query(toPg(sql), p)).rows,
      run: async (sql, ...p) => await client.query(toPg(sql), p),
    });
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// 기존 `import { db } from './db.js'; db.prepare(...)` 호환용.
export const db = { prepare, exec };

export async function initSchema() {
  await exec(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      google_sub TEXT UNIQUE,
      email TEXT NOT NULL UNIQUE,
      email_verified INTEGER DEFAULT 0,
      name TEXT,
      picture TEXT,
      created_at timestamptz DEFAULT now(),
      last_login_at timestamptz DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS surveys (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      author_id INTEGER NOT NULL REFERENCES users(id),
      is_public INTEGER DEFAULT 1,
      closes_at timestamptz,
      created_at timestamptz DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS questions (
      id SERIAL PRIMARY KEY,
      survey_id INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
      ord INTEGER NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('single','multi','scale5','short_text','long_text')),
      body TEXT NOT NULL,
      is_required INTEGER DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_questions_survey_ord ON questions(survey_id, ord);

    CREATE TABLE IF NOT EXISTS question_options (
      id SERIAL PRIMARY KEY,
      question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      ord INTEGER NOT NULL,
      label TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS responses (
      id SERIAL PRIMARY KEY,
      survey_id INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      submitted_at timestamptz DEFAULT now(),
      sheet_synced_at timestamptz,  -- NULL = 시트 미러 미동기. 채워지면 시트에 append됨.
      UNIQUE (survey_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_responses_survey ON responses(survey_id);
    CREATE INDEX IF NOT EXISTS idx_responses_sync ON responses(sheet_synced_at);

    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at timestamptz DEFAULT now(),
      last_login_at timestamptz
    );

    CREATE TABLE IF NOT EXISTS answers (
      id SERIAL PRIMARY KEY,
      response_id INTEGER NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
      question_id INTEGER NOT NULL REFERENCES questions(id),
      selected_option_ids TEXT,  -- JSON array 문자열, 예 "[12]" 또는 "[12,15]"
      numeric_value INTEGER CHECK (numeric_value IS NULL OR (numeric_value BETWEEN 1 AND 5)),
      text_value TEXT,
      UNIQUE (response_id, question_id)
    );
    CREATE INDEX IF NOT EXISTS idx_answers_question ON answers(question_id);

    -- === 학과 디렉터리 (관리자 편집용) ===
    CREATE TABLE IF NOT EXISTS dir_departments (
      id SERIAL PRIMARY KEY,
      gyeyeol TEXT NOT NULL,
      name TEXT NOT NULL,
      recruit INTEGER DEFAULT 1,
      homepage TEXT,
      hashtags jsonb DEFAULT '[]'::jsonb,
      location TEXT,
      phone TEXT,
      bk21 INTEGER DEFAULT 0,
      bk21_name TEXT,
      bk21_url TEXT,
      intro TEXT,
      ord INTEGER DEFAULT 0,
      image_mime TEXT,
      image_data bytea,
      created_at timestamptz DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_dir_dept_gye ON dir_departments(gyeyeol);

    CREATE TABLE IF NOT EXISTS dir_majors (
      id SERIAL PRIMARY KEY,
      dept_id INTEGER NOT NULL REFERENCES dir_departments(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      recruit INTEGER DEFAULT 1,
      homepage TEXT,
      hashtags jsonb DEFAULT '[]'::jsonb,
      location TEXT,
      phone TEXT,
      bk21 INTEGER DEFAULT 0,
      bk21_name TEXT,
      bk21_url TEXT,
      intro TEXT,
      ord INTEGER DEFAULT 0,
      image_mime TEXT,
      image_data bytea
    );
    CREATE INDEX IF NOT EXISTS idx_dir_maj_dept ON dir_majors(dept_id);
  `);
}

// 디렉터리가 비어있으면 정적 departments.json 으로 1회 시드한다(이후 DB가 원본).
export async function seedDirectoryIfEmpty(seedJson) {
  const row = await prepare('SELECT count(*)::int n FROM dir_departments').get();
  if (row && row.n > 0) return { seeded: false, count: row.n };
  let n = 0;
  await tx(async (t) => {
    for (let i = 0; i < seedJson.length; i++) {
      const d = seedJson[i];
      const dep = await t.get(
        `INSERT INTO dir_departments (gyeyeol,name,recruit,homepage,hashtags,location,phone,bk21,bk21_name,bk21_url,intro,ord)
         VALUES (?,?,?,?,?::jsonb,?,?,?,?,?,?,?) RETURNING id`,
        d.gyeyeol || '', d.name || '', d.recruit === false ? 0 : 1, d.homepage || null,
        JSON.stringify(d.hashtags || []), d.location || null, d.phone || null,
        d.bk21 ? 1 : 0, d.bk21_name || null, d.bk21_url || null, d.intro || null, i
      );
      const majors = Array.isArray(d.majors) ? d.majors : [];
      for (let j = 0; j < majors.length; j++) {
        const m = majors[j];
        await t.run(
          `INSERT INTO dir_majors (dept_id,name,recruit,homepage,hashtags,location,phone,bk21,bk21_name,bk21_url,intro,ord)
           VALUES (?,?,?,?,?::jsonb,?,?,?,?,?,?,?)`,
          dep.id, m.name || '', m.recruit === false ? 0 : 1, m.homepage || null,
          JSON.stringify(m.hashtags || []), m.location || null, m.phone || null,
          m.bk21 ? 1 : 0, m.bk21_name || null, m.bk21_url || null, m.intro || null, j
        );
      }
      n++;
    }
  });
  return { seeded: true, count: n };
}

// 공개 /api/departments 용 JSON 트리 조립 (정적 departments.json 과 동일 형태).
export async function getDirectoryTree() {
  const depts = await prepare(
    `SELECT id,gyeyeol,name,recruit,homepage,hashtags,location,phone,bk21,bk21_name,bk21_url,intro,
            (image_data IS NOT NULL) AS has_image
     FROM dir_departments ORDER BY ord, id`
  ).all();
  const majors = await prepare(
    `SELECT id,dept_id,name,recruit,homepage,hashtags,location,phone,bk21,bk21_name,bk21_url,intro,
            (image_data IS NOT NULL) AS has_image
     FROM dir_majors ORDER BY ord, id`
  ).all();
  const byDept = {};
  majors.forEach((m) => { (byDept[m.dept_id] = byDept[m.dept_id] || []).push(m); });
  const shape = (r, imgUrl) => {
    const o = {
      id: r.id, gyeyeol: r.gyeyeol, name: r.name, recruit: r.recruit !== 0,
      homepage: r.homepage || '', hashtags: Array.isArray(r.hashtags) ? r.hashtags : [],
      bk21: r.bk21 === 1,
    };
    if (r.bk21_name) o.bk21_name = r.bk21_name;
    if (r.bk21_url) o.bk21_url = r.bk21_url;
    if (r.location) o.location = r.location;
    if (r.phone) o.phone = r.phone;
    if (r.intro) o.intro = r.intro;
    if (r.has_image) o.image = imgUrl;
    return o;
  };
  return depts.map((d) => {
    const o = shape(d, `/api/departments/${d.id}/image`);
    o.majors = (byDept[d.id] || []).map((m) => shape(m, `/api/departments/${d.id}/majors/${m.id}/image`));
    return o;
  });
}

// 이미지 bytea + mime 조회
export async function getDeptImage(deptId) {
  return await prepare('SELECT image_mime, image_data FROM dir_departments WHERE id = ?').get(deptId);
}
export async function getMajorImage(majorId) {
  return await prepare('SELECT image_mime, image_data FROM dir_majors WHERE id = ?').get(majorId);
}

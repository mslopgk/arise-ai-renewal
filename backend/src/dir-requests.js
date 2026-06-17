import express from 'express';
import { createChangeRequest, parseImageDataUrl, MAX_REQ_IMG } from './db.js';

const router = express.Router();

const str = (v, max) => {
  if (v == null) return '';
  const s = String(v).trim();
  return max ? s.slice(0, max) : s;
};
const numOrNull = (v) => {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

// 학과 정보 수정/삭제 신청 제출 — 공개(로그인 불필요). 상태 pending 으로 큐에 적재.
router.post('/', async (req, res) => {
  const b = req.body || {};
  const action = b.action === 'delete' ? 'delete' : 'upsert';

  const applicant_name = str(b.applicant_name, 100);
  const affiliation = str(b.affiliation, 200);
  const ext_phone = str(b.ext_phone, 50);
  if (!applicant_name) return res.status(422).json({ error: 'applicant_name_required' });
  if (!affiliation) return res.status(422).json({ error: 'affiliation_required' });

  const dept_id = numOrNull(b.dept_id);
  const major_id = numOrNull(b.major_id);
  const gyeyeol = str(b.gyeyeol, 50);
  const dept_name = str(b.dept_name, 200);
  const major_name = str(b.major_name, 200);
  const note = str(b.note, 1000);

  if (action === 'delete') {
    // 삭제는 기존 대상만(major_id 있으면 세부전공, 없으면 학과 전체) + 사유 필수
    if (!dept_id) return res.status(422).json({ error: 'delete_requires_existing_target' });
    if (!note) return res.status(422).json({ error: 'delete_reason_required' });
  } else {
    // 대상 학과 식별: 기존 선택(dept_id) 또는 신규(dept_name)
    if (!dept_id && !dept_name) return res.status(422).json({ error: 'dept_required' });
    if (!dept_id && !gyeyeol) return res.status(422).json({ error: 'gyeyeol_required_for_new_dept' });
  }

  // target_level: 세부전공 지정 시 major (삭제는 기존 major_id 기준, 수정은 신규 major_name 포함)
  const isMajor = action === 'delete' ? !!major_id : !!(major_id || major_name);

  // 이미지(선택, 수정·추가에서만) — base64 dataURL → bytea, 2MB·image/* 검증
  let image_mime = null, image_data = null;
  if (action === 'upsert' && b.image) {
    const img = parseImageDataUrl(b.image);
    if (!img) return res.status(400).json({ error: 'bad_image' });
    if (!/^image\//.test(img.mime)) return res.status(400).json({ error: 'not_image' });
    if (img.buf.length > MAX_REQ_IMG) return res.status(413).json({ error: 'image_too_large' });
    image_mime = img.mime; image_data = img.buf;
  }

  const id = await createChangeRequest({
    action,
    submitter_email: null, // 로그인 불필요 — 신청자명·소속·내선전화로 식별
    applicant_name, affiliation, ext_phone,
    target_level: isMajor ? 'major' : 'dept',
    dept_id, major_id, gyeyeol, dept_name, major_name, note,
    // 내용 필드는 수정·추가에서만 의미 있음(삭제는 빈 값)
    intro: action === 'upsert' ? str(b.intro, 2000) : '',
    location: action === 'upsert' ? str(b.location, 300) : '',
    phone: action === 'upsert' ? str(b.phone, 100) : '',
    homepage: action === 'upsert' ? str(b.homepage, 500) : '',
    bk21_url: action === 'upsert' ? str(b.bk21_url, 500) : '',
    image_mime, image_data,
  });

  res.status(201).json({ id });
});

export default router;

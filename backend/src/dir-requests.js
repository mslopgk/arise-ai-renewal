import express from 'express';
import { requireAuth } from './auth.js';
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

// 학과 정보 수정 신청 제출 — 인증 사용자(@pusan.ac.kr)만. 상태 pending 으로 큐에 적재.
router.post('/', requireAuth, async (req, res) => {
  const b = req.body || {};

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

  // 대상 학과 식별: 기존 선택(dept_id) 또는 신규(dept_name)
  if (!dept_id && !dept_name) return res.status(422).json({ error: 'dept_required' });
  if (!dept_id && !gyeyeol) return res.status(422).json({ error: 'gyeyeol_required_for_new_dept' });

  // 세부전공이 지정되면 major 레벨
  const isMajor = !!(major_id || major_name);

  // 이미지(선택) — base64 dataURL → bytea, 2MB·image/* 검증 (관리자 CRUD와 동일 패턴)
  let image_mime = null, image_data = null;
  if (b.image) {
    const img = parseImageDataUrl(b.image);
    if (!img) return res.status(400).json({ error: 'bad_image' });
    if (!/^image\//.test(img.mime)) return res.status(400).json({ error: 'not_image' });
    if (img.buf.length > MAX_REQ_IMG) return res.status(413).json({ error: 'image_too_large' });
    image_mime = img.mime; image_data = img.buf;
  }

  const id = await createChangeRequest({
    submitter_email: req.user.email,
    applicant_name, affiliation, ext_phone,
    target_level: isMajor ? 'major' : 'dept',
    dept_id, major_id, gyeyeol, dept_name, major_name,
    intro: str(b.intro, 2000), location: str(b.location, 300),
    phone: str(b.phone, 100), homepage: str(b.homepage, 500), bk21_url: str(b.bk21_url, 500),
    image_mime, image_data,
  });

  res.status(201).json({ id });
});

export default router;

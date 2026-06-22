import { useEffect, useRef } from 'react';
import { enrich, normUrl } from './deptLogic';

// Mirror mediaHtml(~2744-2748) as JSX
function MediaSection({ img }) {
  return (
    <div className="dd-media">
      <div className="dd-media-frame">
        {img
          ? <img src={img} alt="" loading="lazy" />
          : (
            <div className="dd-media-ph" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                <circle cx="9" cy="9" r="2"/>
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
              </svg>
            </div>
          )
        }
      </div>
    </div>
  );
}

// Mirror detailHtml(~2771-2822) as JSX
function DeptDetail({ dept }) {
  const x = enrich(dept);
  const noRec = dept.recruit === false;
  const bkUrl = normUrl(dept.bk21_url);

  // facts array (2789-2800)
  const facts = [];
  if (dept.location) facts.push(
    <div className="dd-fact" key="location">
      <dt>📍 위치</dt>
      <dd>{dept.location}</dd>
    </div>
  );
  if (dept.phone) facts.push(
    <div className="dd-fact" key="phone">
      <dt>📞 전화</dt>
      <dd><a href={`tel:${String(dept.phone).replace(/[^\d-]/g, '')}`}>{dept.phone}</a></dd>
    </div>
  );
  facts.push(
    <div className="dd-fact" key="homepage">
      <dt>홈페이지</dt>
      <dd className={x.homepage ? undefined : 'is-ph'}>
        {x.homepage
          ? <a href={normUrl(x.homepage)} target="_blank" rel="noopener noreferrer">방문하기 ↗</a>
          : '준비 중'
        }
      </dd>
    </div>
  );
  if (dept.bk21) facts.push(
    <div className="dd-fact" key="bk21">
      <dt>★ BK21 사업단</dt>
      <dd className={x.bk21_name ? undefined : 'is-ph'}>
        {x.bk21_name
          ? (bkUrl
              ? <a href={bkUrl} target="_blank" rel="noopener noreferrer">{x.bk21_name} ↗</a>
              : x.bk21_name)
          : '준비 중'
        }
      </dd>
    </div>
  );

  return (
    <div className="dd-detail">
      <div className="dd-hero">
        <div className="dd-hero-body">
          <h2 className="dd-hero-name" id="casmTitle">{dept.name}</h2>
          <div className="dept-badges">
            <span className="dept-badge gye">{dept.gyeyeol}</span>
            {dept.bk21 && <span className="dept-badge bk21">★ BK21</span>}
            {noRec && <span className="dept-badge norec">미모집</span>}
            {x.isSample && <span className="dd-ph-note">예시 데이터 · 추후 교체</span>}
          </div>
          {x.intro
            ? (
              <p className="dd-intro">
                {x.intro}
                {x.isSample && <span className="dd-ph-note">예시 · 추후 교체</span>}
              </p>
            )
            : <p className="dd-intro" style={{ color: 'var(--ink-4)', fontStyle: 'italic' }}>학과 설명 준비 중입니다.</p>
          }
          <dl className="dd-facts">{facts}</dl>
          {(x.hashtags && x.hashtags.length)
            ? (
              <div className="dd-tags">
                {x.hashtags.map((t, i) => {
                  const s = String(t)[0] !== '#' ? '#' + t : t;
                  return <span key={i} className="dd-tag">{s}</span>;
                })}
              </div>
            )
            : (
              <div className="dd-tags">
                <span className="dd-tag is-ph">해시태그 준비 중</span>
              </div>
            )
          }
        </div>
        <MediaSection img={x.image} />
      </div>
    </div>
  );
}

// Mirror majorDetailHtml(~2825-2863) as JSX
function MajorDetail({ major: m, dept }) {
  const px = enrich(dept);
  const homepage = m.homepage || px.homepage;
  const intro    = m.intro || px.intro;
  const hashtags = (m.hashtags && m.hashtags.length) ? m.hashtags : px.hashtags;
  const location = m.location || dept.location;
  const phone    = m.phone || dept.phone;
  const bk21     = (m.bk21 != null) ? m.bk21 : dept.bk21;
  const bk21_name = m.bk21_name || px.bk21_name;
  const bk21_url  = m.bk21_url || dept.bk21_url;
  const noRec    = m.recruit === false;

  const facts = [];
  if (location) facts.push(
    <div className="dd-fact" key="location">
      <dt>📍 위치</dt>
      <dd>{location}</dd>
    </div>
  );
  if (phone) facts.push(
    <div className="dd-fact" key="phone">
      <dt>📞 전화</dt>
      <dd><a href={`tel:${String(phone).replace(/[^\d-]/g, '')}`}>{phone}</a></dd>
    </div>
  );
  if (homepage) facts.push(
    <div className="dd-fact" key="homepage">
      <dt>홈페이지</dt>
      <dd><a href={normUrl(homepage)} target="_blank" rel="noopener noreferrer">방문하기 ↗</a></dd>
    </div>
  );
  if (bk21 && bk21_name) {
    const bu = normUrl(bk21_url);
    facts.push(
      <div className="dd-fact" key="bk21">
        <dt>★ BK21 사업단</dt>
        <dd>{bu ? <a href={bu} target="_blank" rel="noopener noreferrer">{bk21_name} ↗</a> : bk21_name}</dd>
      </div>
    );
  }

  return (
    <div className="dd-detail">
      <div className="dd-hero">
        <div className="dd-hero-body">
          <h2 className="dd-hero-name" id="casmTitle">{m.name}</h2>
          <div className="dept-badges">
            <span className="dept-badge gye">{dept.gyeyeol}</span>
            <span className="dept-badge" style={{ background: 'var(--bg-2)', color: 'var(--ink-3)' }}>{dept.name}</span>
            {bk21 && <span className="dept-badge bk21">★ BK21</span>}
            {noRec && <span className="dept-badge norec">미모집</span>}
          </div>
          {intro && <p className="dd-intro">{intro}</p>}
          {facts.length > 0 && <dl className="dd-facts">{facts}</dl>}
          {(hashtags && hashtags.length) && (
            <div className="dd-tags">
              {hashtags.map((t, i) => {
                const s = String(t)[0] !== '#' ? '#' + t : t;
                return <span key={i} className="dd-tag">{s}</span>;
              })}
            </div>
          )}
        </div>
        <MediaSection img={m.image || px.image} />
      </div>
    </div>
  );
}

/**
 * DeptDetailModal — mirrors casmModal shell (2513-2518) + openModal/openMajorModal/closeModal (2865-2895)
 * Props:
 *   dept   — department object (required)
 *   major  — major object or null (null → dept detail; object → major detail)
 *   onClose — callback to close
 */
export default function DeptDetailModal({ dept, major, onClose }) {
  const dialogRef = useRef(null);
  const lastFocusRef = useRef(null);

  // On mount: save focus, move focus to dialog, lock scroll (mirror 2868-2884)
  useEffect(() => {
    lastFocusRef.current = document.activeElement;
    if (dialogRef.current) dialogRef.current.focus();
    document.body.style.overflow = 'hidden';
    return () => {
      // On unmount: restore scroll + focus (mirror closeModal 2886-2895)
      document.body.style.overflow = '';
      try { if (lastFocusRef.current) lastFocusRef.current.focus(); } catch (e) {}
    };
  }, []);

  // ESC to close (mirror 2929-2935)
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape' || e.keyCode === 27) onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!dept) return null;

  return (
    <div
      className="casm-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="casmTitle"
    >
      {/* backdrop click closes (mirror data-casm-close on backdrop) */}
      <div className="casm-backdrop" onClick={onClose} />
      <div className="casm-dialog" id="casmDialog" tabIndex={-1} ref={dialogRef}>
        {/* close button (mirror data-casm-close) */}
        <button
          type="button"
          className="casm-close"
          id="casmClose"
          aria-label="닫기"
          onClick={onClose}
        >✕</button>
        <div id="casmBody">
          {major
            ? <MajorDetail major={major} dept={dept} />
            : <DeptDetail dept={dept} />
          }
        </div>
      </div>
    </div>
  );
}

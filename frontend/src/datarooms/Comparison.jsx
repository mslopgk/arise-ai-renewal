import React, { useEffect, useState, useRef } from 'react';
import { CHART_DATA } from '../lib/chart_data_10years';

const PAL = {
  '부산대학교': ['#FFCDD2', '#EF5350', '#B71C1C'],
  '경북대학교': ['#BBDEFB', '#1E88E5', '#0D47A1'],
  '전남대학교': ['#C8E6C9', '#43A047', '#1B5E20'],
  '충남대학교': ['#FFE0B2', '#FB8C00', '#E65100'],
  '충북대학교': ['#EDE7F6', '#7E57C2', '#311B92'],
  '전북대학교': ['#B2DFDB', '#26A69A', '#004D40'],
  '경상국립대학교': ['#D7CCC8', '#8D6E63', '#3E2723'],
  '강원대학교': ['#F9FBE7', '#C0CA33', '#827717'],
  '제주대학교': ['#FCE4EC', '#EC407A', '#880E4F'],
  '서울대학교': ['#E1F5FE', '#039BE5', '#01579B'],
  '한국과학기술원': ['#ECEFF1', '#78909C', '#263238'],
  '광주과학기술원': ['#E0F7FA', '#00ACC1', '#006064'],
  '울산과학기술원': ['#FBE9E7', '#F4511E', '#BF360C'],
  '포항공과대학교': ['#F5F5F5', '#9E9E9E', '#424242'],
  '연세대학교': ['#E8EAF6', '#5C6BC0', '#283593'],
  '고려대학교': ['#EFEBE9', '#8D6E63', '#4E342E'],
  '성균관대학교': ['#E0F2F1', '#00897B', '#004D40'],
  '한양대학교': ['#FFF8E1', '#FFB300', '#E65100'],
};

const ALIAS = {};
Object.keys(CHART_DATA.schools).forEach(k => {
  ALIAS[k] = CHART_DATA.schools[k].alias || k;
});

const ENROLL_STACKS = [
  { cat: '학부', fld: '정원내', ci: 0, lbl: '학부 정원내', hat: false },
  { cat: '학부', fld: '정원외', ci: 0, lbl: '학부 정원외', hat: true },
  { cat: '일반대학원', fld: '정원내', ci: 1, lbl: '일반대학원 정원내', hat: false },
  { cat: '일반대학원', fld: '정원외', ci: 1, lbl: '일반대학원 정원외', hat: true },
  { cat: '전문대학원', fld: '정원내', ci: 2, lbl: '전문대학원 정원내', hat: false },
  { cat: '전문대학원', fld: '정원외', ci: 2, lbl: '전문대학원 정원외', hat: true },
];

const GRAD_ENROLL_STACKS = [
  { cat: '일반대학원', fld: '정원내', ci: 1, lbl: '일반대학원 정원내', hat: false },
  { cat: '일반대학원', fld: '정원외', ci: 1, lbl: '일반대학원 정원외', hat: true },
  { cat: '전문대학원', fld: '정원내', ci: 2, lbl: '전문대학원 정원내', hat: false },
  { cat: '전문대학원', fld: '정원외', ci: 2, lbl: '전문대학원 정원외', hat: true },
];

const COMP_거점 = {
  enroll: ['경북대학교', '전남대학교', '강원대학교', '충남대학교', '전북대학교'],
  grad: ['경북대학교', '전남대학교', '충남대학교', '전북대학교', '강원대학교'],
};

// Helpers
function getVal(sch, yr, cat, fld) {
  return CHART_DATA.schools[sch]?.years?.[yr]?.[cat]?.[fld] || 0;
}

function niceMax(v) {
  if (!v) return 10000;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / mag;
  const nice = n < 1.2 ? 1.2 : n < 1.5 ? 1.5 : n < 2 ? 2 : n < 3 ? 3 : n < 5 ? 5 : n < 7 ? 7 : 10;
  return nice * mag;
}

function niceStep(max, target = 5) {
  const rough = max / target;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const n = rough / mag;
  const s = n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10;
  return s * mag;
}

function darken(hex, t) {
  const r = parseInt(hex.slice(1, 3), 16),
        g = parseInt(hex.slice(3, 5), 16),
        b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r * (1 - t))},${Math.round(g * (1 - t))},${Math.round(b * (1 - t))})`;
}

export default function Comparison() {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
  const tooltipRef = useRef(null);

  // States
  const [metric, setMetric] = useState('enroll'); // 'enroll' or 'grad'
  const [group, setGroup] = useState('거점국립대'); // '거점국립대', '서울대+과학원', '주요 사립대', '개별대학'
  const [selectedSchool, setSelectedSchool] = useState('');

  const hitsRef = useRef([]);

  // Initialization of dropdown
  const schoolsList = Object.keys(CHART_DATA.schools).filter(k => k !== '부산대학교');
  useEffect(() => {
    if (schoolsList.length > 0 && !selectedSchool) {
      setSelectedSchool(schoolsList[0]);
    }
  }, []);

  const compSchools = () => {
    const all = CHART_DATA.schools;
    if (group === '개별대학') return selectedSchool ? [selectedSchool] : [];
    if (group === '거점국립대') return COMP_거점[metric] || COMP_거점.enroll;
    return Object.keys(all).filter(k => all[k].group === group);
  };

  const drawHatch = (ctx, x, y, w, h, color) => {
    if (h <= 0 || w <= 0) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.strokeStyle = darken(color, 0.15);
    ctx.lineWidth = 1.5;
    for (let i = -(h + w); i < w + h + 10; i += 5) {
      ctx.beginPath();
      ctx.moveTo(x + i, y);
      ctx.lineTo(x + i + h, y + h);
      ctx.stroke();
    }
    ctx.restore();
  };

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const years = CHART_DATA.years;
    const comps = compSchools();
    const schools = ['부산대학교', ...comps];
    const stacks = metric === 'grad' ? GRAD_ENROLL_STACKS : ENROLL_STACKS;

    const wrap = canvas.parentElement;
    const CW = Math.max(600, wrap.clientWidth - 8);
    const nY = years.length, nS = schools.length;
    const CH = Math.max(360, Math.min(540, CW * 0.46));

    const dpr = window.devicePixelRatio || 1;
    canvas.width = CW * dpr;
    canvas.height = CH * dpr;
    canvas.style.width = CW + 'px';
    canvas.style.height = CH + 'px';
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, CW, CH);

    const M = { t: 24, r: 16, b: nS > 3 ? 100 : 84, l: 72 };
    const IW = CW - M.l - M.r;
    const IH = CH - M.t - M.b;

    // Y Scale
    let maxV = 0;
    years.forEach(yr => schools.forEach(s => {
      const tot = stacks.reduce((a, st) => a + getVal(s, yr, st.cat, st.fld), 0);
      if (tot > maxV) maxV = tot;
    }));
    const yMax = niceMax(maxV);
    const yStep = niceStep(yMax);

    // Background & grid
    ctx.fillStyle = '#FAFAFA';
    ctx.fillRect(M.l, M.t, IW, IH);
    ctx.font = '11px Arial';
    for (let v = 0; v <= yMax; v += yStep) {
      const py = M.t + IH - (v / yMax) * IH;
      ctx.strokeStyle = '#E0E0E0';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(M.l, py);
      ctx.lineTo(M.l + IW, py);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#555';
      ctx.textAlign = 'right';
      const lbl = v >= 10000 ? (v / 10000).toLocaleString('ko', { maximumFractionDigits: 1 }) + '만' : v.toLocaleString();
      ctx.fillText(lbl, M.l - 6, py + 4);
    }

    // Y Axis label
    ctx.save();
    ctx.translate(13, M.t + IH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.font = '11px Arial';
    ctx.fillStyle = '#555';
    ctx.textAlign = 'center';
    ctx.fillText('인원 (명)', 0, 0);
    ctx.restore();

    // Bar Layout
    const yearW = IW / nY;
    const barAreaW = yearW * (nS <= 3 ? 0.78 : nS <= 5 ? 0.85 : 0.90);
    const barTotalW = barAreaW / nS;
    const barW = Math.max(3, barTotalW * 0.82);
    const showSchLbl = barTotalW >= 12;

    const hits = [];

    years.forEach((yr, yi) => {
      const yearX = M.l + yi * yearW + (yearW - barAreaW) / 2;

      // Year division line
      if (yi > 0) {
        const isMajor = (parseInt(yr) % 5 === 1);
        ctx.strokeStyle = isMajor ? '#999' : '#CCC';
        ctx.lineWidth = isMajor ? 1.5 : 1;
        ctx.setLineDash(isMajor ? [] : [5, 4]);
        ctx.beginPath();
        ctx.moveTo(M.l + yi * yearW, M.t);
        ctx.lineTo(M.l + yi * yearW, M.t + IH);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      schools.forEach((sch, si) => {
        const bx = yearX + si * barTotalW + (barTotalW - barW) / 2;
        let bottY = M.t + IH;
        const segs = [];
        const pal = PAL[sch] || ['#ccc', '#888', '#333'];

        stacks.forEach(st => {
          const val = getVal(sch, yr, st.cat, st.fld);
          if (val <= 0) return;
          const bh = (val / yMax) * IH;
          const by = bottY - bh;
          const col = pal[st.ci];
          ctx.fillStyle = col;
          ctx.fillRect(bx, by, barW, bh);
          if (st.hat) drawHatch(ctx, bx, by, barW, bh, col);
          if (bh > 1.5) {
            ctx.strokeStyle = 'rgba(255,255,255,0.5)';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(bx, by, barW, bh);
          }
          segs.push({ lbl: st.lbl, val, color: col, hat: st.hat });
          bottY -= bh;
        });

        const totalH = M.t + IH - bottY;
        if (sch === '부산대학교' && totalH > 0) {
          ctx.strokeStyle = '#1a1a2e';
          ctx.lineWidth = 1.8;
          ctx.strokeRect(bx - 0.5, bottY - 0.5, barW + 1, totalH + 1);
        }

        hits.push({ sch, yr, x: bx, y: bottY, w: barW, h: totalH, segs });

        // School label
        if (showSchLbl) {
          const cx = bx + barW / 2;
          ctx.save();
          ctx.translate(cx, M.t + IH + 7);
          ctx.rotate(-Math.PI / 4);
          ctx.font = sch === '부산대학교' ? 'bold 9px Arial' : '9px Arial';
          ctx.fillStyle = sch === '부산대학교' ? '#B71C1C' : '#444';
          ctx.textAlign = 'right';
          ctx.fillText(ALIAS[sch] || sch, 0, 0);
          ctx.restore();
        }
      });

      // Year label
      const ylx = M.l + yi * yearW + yearW / 2;
      const ylOffset = showSchLbl ? (nS > 3 ? 80 : 66) : 18;
      const isBold = (parseInt(yr) % 5 === 1) || yr === '2025';
      ctx.font = isBold ? 'bold 11px Arial' : '11px Arial';
      ctx.fillStyle = '#333';
      ctx.textAlign = 'center';
      ctx.fillText(yr + '년', ylx, M.t + IH + ylOffset);
    });

    // Axis line
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(M.l, M.t);
    ctx.lineTo(M.l, M.t + IH);
    ctx.lineTo(M.l + IW, M.t + IH);
    ctx.stroke();

    hitsRef.current = hits;
  };

  useEffect(() => {
    renderCanvas();
    const handleResize = () => renderCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [metric, group, selectedSchool]);

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    const tooltip = tooltipRef.current;
    if (!canvas || !tooltip) return;

    const r = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const scX = (canvas.width / dpr) / r.width;
    const scY = (canvas.height / dpr) / r.height;
    const mx = (e.clientX - r.left) * scX;
    const my = (e.clientY - r.top) * scY;

    const hit = hitsRef.current.find(h => mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h && h.h > 0);

    if (hit) {
      const tot = hit.segs.reduce((s, g) => s + g.val, 0);
      tooltip.innerHTML = `
        <div style="font-weight:700;font-size:0.85rem;border-bottom:1px solid rgba(255,255,255,0.25);margin-bottom:5px;padding-bottom:4px">
          ${ALIAS[hit.sch] || hit.sch} &mdash; ${hit.yr}년
        </div>
        ${hit.segs.map(g => `
          <div style="display:flex;align-items:center;gap:6px;margin:2px 0;font-size:0.8rem">
            <span style="width:10px;height:10px;border-radius:2px;background:${g.color};${g.hat ? 'outline:1px solid #555' : ''}"></span>
            <span>${g.lbl}</span>
            <span style="margin-left:auto;font-weight:600;font-variant-numeric:tabular-nums">${g.val.toLocaleString()}</span>
          </div>`).join('')}
        <div style="border-top:1px solid rgba(255,255,255,0.25);margin-top:5px;padding-top:4px;font-weight:700">
          합계: ${tot.toLocaleString()}
        </div>`;

      tooltip.style.display = 'block';
      const tx = e.clientX + 14;
      const ty = e.clientY - 20;
      tooltip.style.left = (tx + 220 > window.innerWidth ? e.clientX - 234 : tx) + 'px';
      tooltip.style.top = ty + 'px';
    } else {
      tooltip.style.display = 'none';
    }
  };

  const handleMouseLeave = () => {
    if (tooltipRef.current) {
      tooltipRef.current.style.display = 'none';
    }
  };

  const activeComps = compSchools();
  const allSchools = ['부산대학교', ...activeComps];
  const stacks = metric === 'grad' ? GRAD_ENROLL_STACKS : ENROLL_STACKS;

  return (
    <div style={{ padding: '20px', color: '#1a1a2e', fontFamily: '"Malgun Gothic", sans-serif' }}>
      {/* Scope Styles */}
      <style>{`
        .comp-container { background: #f0f2f5; border-radius: 12px; overflow: hidden; }
        .comp-header {
          background: linear-gradient(135deg, #001540, #003087, #1565C0);
          padding: 20px 24px; color: #fff;
        }
        .comp-header h1 { font-size: 1.35rem; font-weight: 700; margin: 0; }
        .comp-header p { font-size: 0.78rem; opacity: 0.8; margin: 4px 0 0 0; }

        .controls {
          background: #fff; padding: 14px 24px; display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-end;
          border-bottom: 1px solid #dde; box-shadow: 0 2px 6px rgba(0,0,0,0.04);
        }
        .control-group { display: flex; flex-direction: column; gap: 5px; }
        .control-group label {
          font-size: 0.7rem; font-weight: 700; color: #666; text-transform: uppercase; letter-spacing: 0.05em;
        }
        .btns-row { display: flex; gap: 4px; flex-wrap: wrap; }
        .btn-metric, .btn-group-sel {
          padding: 6px 14px; border: 1.5px solid #2E5FAC; border-radius: 6px; background: #fff;
          color: #2E5FAC; cursor: pointer; font-size: 0.82rem; font-weight: 600; transition: all 0.15s;
        }
        .btn-metric:hover, .btn-group-sel:hover { background: #EEF3FF; }
        .btn-metric.active, .btn-group-sel.active { background: #2E5FAC; color: #fff; }
        
        .school-select {
          padding: 6px 12px; border: 1.5px solid #2E5FAC; border-radius: 6px; font-size: 0.82rem;
          color: #2E5FAC; font-weight: 600; cursor: pointer; background: #fff; min-width: 140px; outline: none;
        }

        .chart-card {
          background: #fff; margin: 14px; border-radius: 8px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08); padding: 16px 20px;
        }
        .canvas-wrap { position: relative; width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
        
        .tooltip-card {
          position: fixed; display: none; background: rgba(20,20,40,0.92); color: #fff; padding: 10px 14px;
          border-radius: 7px; font-size: 0.8rem; pointer-events: none; z-index: 999; min-width: 170px;
          max-width: 240px; line-height: 1.6; box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        }
        
        .legend-row { padding: 10px 24px; display: flex; flex-direction: column; gap: 8px; background: #fff; border-bottom: 1px solid #eee; }
        .legend-sub { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .legend-title { font-size: 0.72rem; font-weight: 700; color: #555; text-transform: uppercase; }
        .legend-item { display: flex; align-items: center; gap: 4px; font-size: 0.78rem; }
        .legend-color { width: 13px; height: 13px; border-radius: 3px; }
        .legend-color.hatch {
          background-image: repeating-linear-gradient(45deg, #888 0, #888 1px, transparent 0, transparent 50%);
          background-size: 5px 5px;
        }

        .note-block {
          font-size: 0.75rem; color: #666; margin: 10px 14px; padding: 10px 14px;
          background: #fffbe6; border-left: 3px solid #faad14; border-radius: 4px; line-height: 1.5;
        }
      `}</style>

      <div className="comp-container" ref={wrapperRef}>
        {/* Header */}
        <div className="comp-header">
          <h1>주요 대학 대학원 재학생 현황 비교 (2016~2025)</h1>
          <p>대학알리미 공시자료 | 일반대학원 + 전문대학원 재적학생 기준 | ARISE PNU AI — 부산대학교 AI 거점대학</p>
        </div>

        {/* Controls */}
        <div className="controls">
          <div className="control-group">
            <label>📊 지표</label>
            <div className="btns-row">
              <button 
                className={`btn-metric ${metric === 'enroll' ? 'active' : ''}`}
                onClick={() => setMetric('enroll')}
              >
                전체 학생수 (학부+대학원)
              </button>
              <button 
                className={`btn-metric ${metric === 'grad' ? 'active' : ''}`}
                onClick={() => setMetric('grad')}
              >
                대학원생만 비교 (일반+전문)
              </button>
            </div>
          </div>

          <div className="control-group">
            <label>🏫 비교 대상</label>
            <div className="btns-row">
              <button 
                className={`btn-group-sel ${group === '거점국립대' ? 'active' : ''}`}
                onClick={() => setGroup('거점국립대')}
              >
                거점국립대
              </button>
              <button 
                className={`btn-group-sel ${group === '서울대+과학원' ? 'active' : ''}`}
                onClick={() => setGroup('서울대+과학원')}
              >
                서울대+과학원
              </button>
              <button 
                className={`btn-group-sel ${group === '주요 사립대' ? 'active' : ''}`}
                onClick={() => setGroup('주요 사립대')}
              >
                주요 사립대
              </button>
              <button 
                className={`btn-group-sel ${group === '개별대학' ? 'active' : ''}`}
                onClick={() => setGroup('개별대학')}
              >
                개별 대학 ▾
              </button>
            </div>
          </div>

          {group === '개별대학' && (
            <div className="control-group">
              <label>개별 대학 선택</label>
              <select 
                className="school-select"
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
              >
                {schoolsList.map(sch => (
                  <option key={sch} value={sch}>{ALIAS[sch] || sch}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Chart Wrap */}
        <div className="chart-card">
          <div className="canvas-wrap">
            <canvas 
              ref={canvasRef} 
              onMouseMove={handleMouseMove} 
              onMouseLeave={handleMouseLeave}
              style={{ display: 'block', width: '100%', cursor: 'crosshair' }}
            />
          </div>
        </div>

        {/* Tooltip */}
        <div ref={tooltipRef} className="tooltip-card"></div>

        {/* Legends */}
        <div className="legend-row">
          <div className="legend-sub">
            <span className="legend-title">학교 색상</span>
            {allSchools.map(s => {
              const color = (PAL[s] || ['#ccc', '#888', '#333'])[1];
              const isPNU = s === '부산대학교';
              return (
                <span key={s} className="legend-item" title={s}>
                  <span 
                    className="legend-color" 
                    style={{ 
                      background: color, 
                      outline: isPNU ? '2px solid #1a1a2e' : 'none', 
                      outlineOffset: isPNU ? '1px' : 'none' 
                    }}
                  />
                  <span style={{ fontWeight: isPNU ? 700 : 400, color: isPNU ? '#B71C1C' : 'inherit' }}>
                    {ALIAS[s] || s}
                  </span>
                </span>
              );
            })}
          </div>
          <div className="legend-sub" style={{ marginTop: '4px' }}>
            <span className="legend-title">구성 (음영)</span>
            {metric === 'grad' ? (
              <>
                <span className="legend-item">중간색 = 일반대학원</span>
                <span className="legend-item">진한색 = 전문대학원</span>
              </>
            ) : (
              <>
                <span className="legend-item">연한색 = 학부</span>
                <span className="legend-item">중간색 = 일반대학원</span>
                <span className="legend-item">진한색 = 전문대학원</span>
              </>
            )}
            <span className="legend-item" style={{ marginLeft: '10px' }}>
              <span className="legend-color hatch" style={{ background: '#888' }}></span>
              빗금 = 정원외
            </span>
          </div>
        </div>

        {/* Note */}
        <div className="note-block">
          ※ 비교(비교대상): {activeComps.map(s => ALIAS[s] || s).join(', ')} (전 캠퍼스 합산)
          {group === '거점국립대' && ' | 부산대 강조 테두리 제공'}
        </div>
      </div>
    </div>
  );
}

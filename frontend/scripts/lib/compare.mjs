import zlib from 'node:zlib';

export function normalizeText(s) {
  if (s == null) return '';
  return String(s).replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
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

export const DEFAULT_CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
];
export function resolveChromePath(env, candidates, existsFn) {
  const override = env.PUPPETEER_EXECUTABLE_PATH || env.CHROME_PATH;
  if (override && existsFn(override)) return override;
  for (const c of candidates) if (existsFn(c)) return c;
  throw new Error('Chrome not found. CHROME_PATH 또는 PUPPETEER_EXECUTABLE_PATH 환경변수로 chrome.exe 경로를 지정하세요.');
}

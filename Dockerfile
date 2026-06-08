# pnu-grad — 단일 WAS 이미지 (multi-stage)
# build 스테이지: frontend(React/Vite) 정적 빌드
# runtime 스테이지: backend(Express) + 빌드된 dist 서빙. DB는 PostgreSQL(pg).
# server.js는 __dirname(/app/backend/src) 기준 ../../frontend/dist 를 서빙하므로
# 이미지 안에서 /app/{backend,frontend/dist} 레이아웃을 유지한다.
# (s30 마케팅 사이트는 구조 개편으로 제거됨 — server.js는 s30/dist 부재를 graceful 처리)

# ---------- build ----------
FROM node:22-alpine AS build
WORKDIR /build

# frontend
COPY frontend/package.json frontend/package-lock.json* frontend/
RUN cd frontend && npm install
COPY frontend/ frontend/
RUN cd frontend && npm run build

# ---------- runtime ----------
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# backend 의존성 (prod만)
COPY backend/package.json backend/package-lock.json* ./backend/
RUN cd backend && npm install --omit=dev

# backend 소스 + 빌드된 정적 산출물
COPY backend/ ./backend/
COPY --from=build /build/frontend/dist ./frontend/dist

WORKDIR /app/backend
EXPOSE 3001

# 컨테이너 헬스체크 (server.js의 /health)
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]

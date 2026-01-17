# ============================================
# Dockerfile Cloud Run - Backend (monorepo)
# - Compila `backend/` e inclui `lib/ai` (usado pelas rotas /api/agents)
# - Não builda o frontend (frontend é servido via Firebase Hosting)
# ============================================

FROM node:22-alpine AS builder

WORKDIR /app

# Copiar manifests primeiro para maximizar cache
COPY package*.json ./
COPY backend/package*.json ./backend/

# Dependências (root + backend) necessárias para compilar TypeScript
RUN npm ci --legacy-peer-deps
RUN cd backend && npm ci --legacy-peer-deps

# Copiar apenas o necessário para o build do backend
COPY tsconfig.paths.json ./tsconfig.paths.json
COPY backend ./backend
COPY lib/ai ./lib/ai

# Build do backend (gera /app/backend/dist/** incluindo /app/backend/dist/lib/ai)
RUN cd backend && npm run build

# ============================================
# Stage de produção
# ============================================
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

# Dependências runtime:
# - root: deps usadas pelos flows (Genkit etc.)
# - backend: deps específicas do servidor Express (incluindo dotenv que é necessário em produção)
COPY package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps

COPY backend/package*.json ./backend/
# Não omitir dev pois dotenv é necessário em produção para ler .env
RUN cd backend && npm ci --legacy-peer-deps

# Código compilado do backend (inclui lib/ai compilado dentro de backend/dist)
COPY --from=builder /app/backend/dist ./backend/dist

# Cloud Run injeta PORT; o servidor lê PORT/BACKEND_PORT
EXPOSE 8080

CMD ["node", "backend/dist/backend/src/server.js"]

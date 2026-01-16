# ============================================
# Dockerfile para Cloud Run - Backend 24h
# ============================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependências
RUN npm ci --legacy-peer-deps

# Copiar código fonte
COPY . .

# Build TypeScript
RUN npm run build

# ============================================
# Stage de produção
# ============================================
FROM node:22-alpine

WORKDIR /app

# Copiar build compilado
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Instalar apenas dependências de produção
RUN npm ci --omit=dev --legacy-peer-deps

# Cloud Run injeta PORT automaticamente (padrão 8080)
ENV NODE_ENV=production
ENV PORT=8080

# Expor porta
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"

# Iniciar servidor
CMD ["node", "dist/backend/src/server.js"]

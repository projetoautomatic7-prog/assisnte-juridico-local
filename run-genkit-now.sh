#!/bin/bash
export GEMINI_API_KEY=AIzaSyAqoXGdqPaWGvkW5mnl4DAiYETg8Ls8mNA
export GOOGLE_API_KEY=AIzaSyAqoXGdqPaWGvkW5mnl4DAiYETg8Ls8mNA
echo "🚀 Iniciando Genkit Dev UI..."
echo "API Key: ${GEMINI_API_KEY:0:20}..."
npm exec genkit -- start -- npx tsx --watch lib/ai/genkit-all-flows.ts

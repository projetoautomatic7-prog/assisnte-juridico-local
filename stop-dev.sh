#!/bin/bash
echo "🛑 Parando servidores..."
lsof -ti:5000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
echo "✅ Servidores parados!"

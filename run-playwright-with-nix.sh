#!/bin/bash

# Configurar LD_LIBRARY_PATH com libs do Nix
export LD_LIBRARY_PATH="/nix/store/$(ls /nix/store | grep '^[a-z0-9]*-glib-' | head -1)/lib:$LD_LIBRARY_PATH"
export LD_LIBRARY_PATH="/nix/store/$(ls /nix/store | grep '^[a-z0-9]*-nss-' | head -1)/lib:$LD_LIBRARY_PATH"
export LD_LIBRARY_PATH="/nix/store/$(ls /nix/store | grep '^[a-z0-9]*-nspr-' | head -1)/lib:$LD_LIBRARY_PATH"
export LD_LIBRARY_PATH="/nix/store/$(ls /nix/store | grep '^[a-z0-9]*-gtk3-' | head -1)/lib:$LD_LIBRARY_PATH"
export LD_LIBRARY_PATH="/nix/store/$(ls /nix/store | grep '^[a-z0-9]*-cairo-' | head -1)/lib:$LD_LIBRARY_PATH"
export LD_LIBRARY_PATH="/nix/store/$(ls /nix/store | grep '^[a-z0-9]*-pango-' | head -1)/lib:$LD_LIBRARY_PATH"
export LD_LIBRARY_PATH="/nix/store/$(ls /nix/store | grep '^[a-z0-9]*-alsa-lib-' | head -1)/lib:$LD_LIBRARY_PATH"

echo "🔧 Configurando bibliotecas Nix para Playwright..."
echo "LD_LIBRARY_PATH: $LD_LIBRARY_PATH"

npx playwright test "$@"

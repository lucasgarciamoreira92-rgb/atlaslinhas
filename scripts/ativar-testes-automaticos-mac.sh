#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
if ! command -v node >/dev/null 2>&1; then
  echo 'Abra o Terminal onde você já executa o Atlas Linhas: o Node.js precisa estar disponível.'
  exit 1
fi
exec node scripts/configurar-executor-mac.mjs "${1:-instalar}"

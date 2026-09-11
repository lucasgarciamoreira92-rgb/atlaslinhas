#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo 'Instale o Node.js 24 LTS em https://nodejs.org e abra novamente o Terminal.'
  exit 1
fi
node -e 'if(Number(process.versions.node.split(".")[0])<24){console.error("Use Node.js 24 ou superior para a versão local.");process.exit(1)}'
echo 'Instalando as dependências do Atlas Linhas...'
npx --yes pnpm@11.19.0 install --frozen-lockfile
node scripts/build-local.mjs
echo 'Instalação concluída. Para iniciar: bash scripts/iniciar-mac.sh'

#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [ "$(uname -s)" != 'Darwin' ]; then
  echo 'Este instalador é para o Mac. Em outros sistemas, veja docs/AUTOMACAO.md.'
  exit 1
fi
bash scripts/instalar-mac.sh
node node_modules/@playwright/test/cli.js install chromium
if command -v codex >/dev/null 2>&1; then
  echo 'Codex CLI já está instalado:'
  codex --version
else
  echo 'Instalando Codex CLI pelo instalador oficial do OpenAI...'
  atlas_codex_installer="$(mktemp -t atlas-codex-installer)"
  trap 'rm -f "$atlas_codex_installer"' EXIT
  curl --fail --silent --show-error --location https://chatgpt.com/codex/install.sh -o "$atlas_codex_installer"
  sh "$atlas_codex_installer"
fi
echo ''
echo 'Preparação concluída. Abra um novo Terminal e execute:'
echo 'cd ~/atlaslinhas'
echo 'codex login'
echo 'codex'
echo 'Pedido sugerido: Leia AGENTS.md e execute os testes do bloco 6 com o navegador visível.'

#!/bin/bash
set -euo pipefail
project_root="$(cd "$(dirname "$0")/.." && pwd -P)"
cd "$project_root"

# Instalações anteriores guardavam os dados ao lado do projeto. Preserve esse
# banco quando ele existir; instalações novas continuam usando a pasta padrão.
if [ -z "${ATLAS_DATA_DIR:-}" ]; then
 if [ -f "$project_root/dados/atlas-linhas.sqlite" ]; then
  export ATLAS_DATA_DIR="$project_root/dados"
 else
  export ATLAS_DATA_DIR="$HOME/AtlasLinhas/dados"
 fi
fi
echo "Dados do Atlas: $ATLAS_DATA_DIR"
if ! command -v node >/dev/null 2>&1; then
 echo 'Instale o Node.js 24 LTS e execute bash scripts/instalar-mac.sh.'
 exit 1
fi
node -e 'if(Number(process.versions.node.split(".")[0])<24){console.error("Use Node.js 24 ou superior.");process.exit(1)}'
if [ ! -f local-dist/server.mjs ]; then
 echo 'Execute primeiro: bash scripts/instalar-mac.sh'
 exit 1
fi
exec node local-dist/server.mjs

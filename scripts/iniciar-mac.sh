#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
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

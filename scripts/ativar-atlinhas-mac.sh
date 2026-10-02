#!/bin/bash
set -euo pipefail
project_root="$(cd "$(dirname "$0")/.." && pwd -P)"
if [ -z "${ATLAS_DATA_DIR:-}" ]; then
 if [ -f "$project_root/dados/atlas-linhas.sqlite" ]; then
  ATLAS_DATA_DIR="$project_root/dados"
 else
  ATLAS_DATA_DIR="$HOME/AtlasLinhas/dados"
 fi
fi
mkdir -p "$ATLAS_DATA_DIR"
touch "$ATLAS_DATA_DIR/atlinhas.enabled"
chmod 600 "$ATLAS_DATA_DIR/atlinhas.enabled"
echo 'Atlinhas ativado. Reinicie o Atlas Linhas para exibir o assistente.'

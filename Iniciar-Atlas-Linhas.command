#!/bin/bash
cd "$(dirname "$0")"
bash scripts/iniciar-mac.sh
if [ $? -ne 0 ]; then
 read -r -p 'Pressione Enter para fechar.'
fi

# Atlas Linhas — validação automática no Mac

Repositório privado exclusivo para solicitar testes no Mac de Lucas. O código da aplicação está em lucasgarciamoreira92-rgb/atlaslinhas. Nunca registrar o executor no repositório público.

Cada alteração de `requests/atual.json` na main solicita uma execução. O pedido aceita somente id, bloco (6, 7, regressao ou todos), sourceSha completo e createdAt em ISO UTC. O commit deve pertencer à main do código da aplicação. Não há campos de comando, caminho, URL ou senha.

O workflow confere o pedido em um executor hospedado pelo GitHub. Depois, o Mac identificado por `atlas-linhas-mac` baixa o código exato em seu workspace separado, compila e abre Chromium. Os testes utilizam bancos temporários. O resultado técnico e as evidências ficam em Actions por 14 dias.

Uma execução acontece por vez. Aguarde o término antes de enviar outra solicitação: o GitHub mantém no máximo uma solicitação pendente nesse grupo e pode substituir a pendente por uma mais recente. Um Mac desconectado não executa; pedidos na fila do GitHub podem expirar.

O executor precisa estar online e a sessão gráfica do Mac deve estar aberta. Ele roda com as permissões do usuário do Mac; a pasta de testes separada não é uma sandbox do sistema. Apenas os responsáveis pelo projeto devem ter permissão de escrita neste repositório. Não habilitar workflows de pull requests.

Blocos 1–5 aprovados pelo usuário. Retomar pelo bloco 6; depois 7 e aceite final do bloco 8. Uma execução técnica não substitui o aceite humano de visual/usabilidade.

Os arquivos de controle inicialmente vêm de `automation/mac-control/` no projeto principal. Atualizações posteriores devem preservar pedidos e mudanças existentes neste repositório.

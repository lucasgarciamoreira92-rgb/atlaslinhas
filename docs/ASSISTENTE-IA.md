# Assistente Atlas — integração em construção

## Preparação de propostas — 14/09/2026

`POST /api/assistant/proposals` prepara criação/edição de linhas (incluindo chip/eSIM via slot) e aparelhos. Piloto administrativo, sem chamada à IA. Recebe kind (`line`/`device`), action (`create`/`edit`), settingsVersion e fields parciais; edição exige targetId explícito e expectedVersion. Para aparelhos, a versão é a das configurações.

Retorna perguntas para campos obrigatórios omitidos, erro de validação, ausência de mudanças ou resumo antes/depois com alterações e linhas afetadas pelo aparelho. Reaproveita as regras existentes de cadastro, slots e duplicidade. Segredos e observações são excluídos dos campos aceitos e do resumo. Nada é salvo: `canSave:false` é sempre retornado; `ready_for_review` significa somente pronto para revisão, não autorização de escrita.

A preparação é sem estado: o consumidor deve reenviar os campos acumulados a cada correção. Ainda falta persistir rascunhos por sessão, apresentar as propostas na conversa e implementar a confirmação vinculada à proposta exata com nova verificação de concorrência. Não usar a resposta atual como token de aprovação. Integração com contas/Verificações/Cofre permanece para etapas posteriores.

TypeScript, compilação e testes direcionados HTTP/SQLite passaram neste ambiente: campos faltantes, antes/depois, edição sem mudança, números duplicados, slots ocupados, versões antigas, aparelhos vinculados e ausência de gravação. Consulta e configuração do assistente revalidadas por relação direta. Sem suíte integral, navegador ou teste no Mac nesta etapa. Publicação com `[skip ci]` mantém a política de testes direcionados enquanto o workflow seletivo continua pendente.

## Consulta local — etapa de 14/09/2026

Implementado `GET /api/assistant/catalog`, inicialmente restrito ao administrador como o piloto. Aceita `kind=lines|devices`, `query`, `offset` e `limit` (máximo 20). Retorna campos permitidos explicitamente, versões, vínculos atuais de aparelho/slot, quantidade total, próxima página e indicação de múltiplos resultados. Não consulta Cofre, chaves, histórico ou observações. Chips/eSIMs são representados pelos vínculos linha/slot do cadastro existente, não por um inventário independente.

Esta entrega é uma base de servidor: não foi ligada ao chat nem ao modelo. Nenhuma operação de gravação foi adicionada. Integração real OpenAI adiada para o final por decisão do usuário.

Validação direcionada neste ambiente de desenvolvimento: TypeScript, compilação e `node scripts/test-assistant-config.mjs`, com HTTP/SQLite temporários. Cobertura: autorização, busca sem acentos e por número formatado, ambiguidade, paginação, vínculos, resultado vazio, ausência de observações e preservação das linhas. Configuração privada também revalidada. Nenhuma chamada externa, teste de navegador ou suíte completa nesta etapa; não equivale a teste no Mac. Publicação documental/técnica usa `[skip ci]` para não disparar a suíte integral ainda configurada no workflow. Seleção automática de testes no CI e acionamento específico do assistente no Mac continuam pendentes.

Provedor aprovado: OpenAI. Experiência aprovada: conversa sequencial, histórico visível e resumo de aprovação no chat. Escopo: consultas, criação e edição de linhas, chips/eSIMs, aparelhos, verificações e contas do Cofre. Segredos passam exclusivamente pelo painel protegido; não são contexto do modelo.

## Entrega técnica inicial

`local/server/openai-connection.ts` prepara o transporte servidor → Responses API, sem acesso ao banco e sem ferramentas de gravação. Configuração por variáveis exclusivamente do servidor: `OPENAI_API_KEY` e `ATLAS_OPENAI_MODEL`. Nenhuma chave foi configurada neste trabalho. O modelo exato ainda precisa ser escolhido e validado na conta da API.

Limites: 30 mensagens, 4 mil caracteres por mensagem, 20 mil por solicitação, 1.500 tokens de saída e tempo de espera de 25 segundos. Não há repetição automática de chamadas pagas. Erros do provedor são convertidos em mensagens locais sem expor o corpo original. `store:false` é enviado; isso não representa garantia de retenção zero pelo provedor.

O transporte está ligado à rota autenticada `/api/assistant` e a um painel de conversa disponível para administradores. O piloto não consulta nem grava cadastros; essas capacidades serão adicionadas com rascunhos e aprovação. Há limite de dez solicitações por minuto por administrador e uma em andamento. A conversa fica na memória da tela, encerrando com a saída da aplicação; não é salva no banco. Não constitui entrega do assistente completo. Teste real depende de chave configurada privadamente no Mac. Não enviar chave por chat, comitar arquivos de configuração ou reutilizar credenciais de outras ferramentas.

## Próximas entregas

1. Configuração administrativa implementada no painel: exige senha atual do Atlas. Salva `openai-config.json` na pasta de dados selecionada, com permissão 0600 e substituição atômica. O arquivo contém a chave em texto, protegido pelas permissões locais (não é criptografia contra o administrador do Mac). Está excluído do Git, mas entra em cópias completas da pasta: proteger esses backups. Se existir, tem prioridade sobre as variáveis de ambiente. Teste real com exemplo fictício e validação específica de interface ainda pendentes. Nenhuma chave foi fornecida ou chamada paga executada.
2. Chat autenticado, limitação por usuário e rascunhos isolados por sessão.
3. Consultas com seleção explícita de campos e permissões verificadas no servidor; nunca enviar segredos do Cofre.
4. Propostas estruturadas, validação de campos/vínculos e resumo antes/depois.
5. Aprovação vinculada à versão exata da proposta, verificação de concorrência e gravação pelas regras existentes.
6. Campo protegido do Cofre e desbloqueio, sem segredos no histórico da conversa.
7. Testes automáticos dos fluxos reais, instalação e revisão de uso no Mac.

Referência: https://developers.openai.com/api/docs/guides/structured-outputs

## Publicação e validação — 14/09/2026 UTC

- Piloto publicado pelo PR #2, merge `31b67fbb1c40b00c00be3a78823cb2339928515e`.
- macOS do GitHub: run 34798907820 aprovado; TypeScript, automação, HTTP/SQLite, Cofre/migração, configuração privada e 18 cenários de interface.
- Mac de Lucas: run 34799157222, mesmo merge, 18 aprovados, zero falhas, instáveis ou ignorados. Interface executada de 02:26:13 a 02:28:19 UTC (13/09, 23:26–23:28 em Brasília). Configuração privada da IA incluída com chave fictícia, sem chamada externa.
- A pendência de interface da configuração mencionada acima está concluída. Continua pendente testar uma conversa real após configuração privada de chave/modelo; consultas, propostas e gravações aprovadas ainda não foram implementadas.
- Os testes usam cópia isolada e banco temporário. Não atualizam a instalação diária nem usam seus cadastros reais.
- Decisão do usuário: prévias aqui servem à avaliação visual; validações de navegador ocorrem após publicação, pelo fluxo macOS/Mac configurado.
- Resultado: https://github.com/lucasgarciamoreira92-rgb/atlaslinhas-validacao-mac/actions/runs/34799157222

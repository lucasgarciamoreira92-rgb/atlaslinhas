# Assistente Atlas — integração em construção

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

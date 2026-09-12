# Atlas Linhas — instruções para agentes

## Continuidade aprovada pelo usuário (11/09/2026)

- Aplicação local no Mac em ~/Projetos/atlaslinhas; repositório lucasgarciamoreira92-rgb/atlaslinhas.
- Blocos operacionais 1, 2, 3, 4 e 5 aprovados pelo usuário.
- Em 12/09/2026, blocos 1–7 revalidados no Mac do usuário: 9 cenários aprovados, sem falhas ou ignorados. Run 34688123499. Bloco 8 automatizado aprovado em 12/09/2026: cinco cenários, zero falhas, run 34688556772. Ver docs/VALIDACAO-LOCAL.md; não pedir repetição manual dos critérios já automatizados. Retorno do executor após reiniciar o Mac e entrar no usuário validado no run 34710270685, com 14 cenários aprovados.
- Bloco 6: acessos/operador. Bloco 7: CSV/backups/recuperação. Bloco 8: aceite final.
- O resultado automatizado deve identificar ambiente, commit, testes executados, falhas e limitações. Não marcar validação no Mac do usuário como feita por uma execução em CI/Linux.
- A conversa do ChatGPT não é compartilhada automaticamente com a sessão CLI. Leia este arquivo e docs/AUTOMACAO.md ao iniciar.
- Nova direção aprovada: acionar testes no Mac pelo repositório privado `lucasgarciamoreira92-rgb/atlaslinhas-validacao-mac`. Leia docs/EXECUTOR-MAC.md. A instalação inicial deve ser feita no Mac; não afirmar conexão ou aprovação local antes de confirmar o executor e o resultado real.
- O instalador publica o controle privado e solicita o bloco 6 uma única vez. Depois, pedidos são commits em `requests/atual.json` do controle privado. O usuário não deve precisar abrir Codex nem copiar instruções a cada validação.

## Execução e testes

- Node >=24, pnpm 11.19.0 e pnpm-lock.yaml. Preserve dependências existentes.
- npm run test:bloco6 -- --headed: bloco 6 com navegador visível.
- npm run test:bloco7 -- --headed: bloco 7 com navegador visível.
- npm run test:regressao: fluxos essenciais dos blocos já aprovados e verificações visuais objetivas.
- npm run test:interface: toda a interface; compila primeiro.
- npm run local:test: integração HTTP/SQLite (requer compilação).
- npm run test:relatorio: relatório HTML da última execução de interface.
- npm run test:interface -- --ui: modo interativo para investigar os passos.
- As fixtures criam um servidor, uma porta e uma pasta temporária por teste, sempre com dados fictícios. Não reutilizam a aplicação do usuário.
- Os testes de interface começam com administrador criado pela própria tela. Os outros usuários, linhas e backups também são fictícios. Não substitua esses fluxos por mocks para fazer o teste passar.
- Ao investigar falhas, diferencie problema no teste, ambiente e defeito no aplicativo. Preserve as expectativas de negócio; nunca remova uma asserção válida para esconder um defeito.

## Dados e escopo

- Dados reais em ~/AtlasLinhas/dados. Nunca usar essa pasta em testes, copiar seus conteúdos para o projeto, enviá-los ao GitHub, resetar suas credenciais ou restaurar backups nela por iniciativa do agente.
- Preserve migrações aplicadas, assinatura dos backups, histórico, validação de slots e conflitos de versão.
- Primeiro eSIM persiste como "eSIM" e é exibido como "eSIM 1". Os adicionais persistem como "eSIM 2", etc.
- Senha mínima de 8 caracteres, permitindo somente números, conforme decisão do usuário.
- Preserve design Atlas, telas e funções fora da alteração solicitada. Não publicar o Site antigo.
- GitHub já autorizado para o trabalho do projeto; preserve alterações locais de outras pessoas, não force push e nunca comite relatórios com dados reais, sessões, senhas do usuário ou bancos.
- Integração final no servidor Atlas será feita por outro programador. Não montar servidor dedicado.

## Verificações e Cofre — versão de 12/09/2026

- Escopo aprovado: organizador conectado, vários métodos e destinos por conta, consulta rápida, Cofre, perfis e exceções por credencial, pendências e histórico. Recebimento/geração de códigos e integração ao Atlas principal continuam adiados.
- Não publicar o Site antigo. A implementação nova existe somente no servidor local.
- Migração adicional `local/server/migrations/0002-access-vault.sql`; não editar depois de aplicada. Instalação existente recebe checkpoint antes da migração, na pasta de dados.
- Ponto anterior preservado: branch `rollback/pre-verificacoes-cofre-20260912`, commit `b363c3902307bb36515198eb4d0098c19f2a6339`.
- Senhas/códigos de recuperação nunca entram em contas, histórico, logs ou CSV. `vault.key` fica fora do banco e do backup JSON. Não regenerar chave perdida.
- Desbloqueios são vinculados à sessão, conta, versão, finalidade, local de abertura e prazo. Verificar autorização novamente no servidor para leitura e escrita.
- Não restaurar permissões mais amplas de um backup antigo. Preservar os acessos atuais ou reduzi-los, invalidando desbloqueios.
- `npm run test:access` cobre o servidor e migração; `tests/e2e/verificacoes-cofre.spec.ts` cobre os novos fluxos no navegador e entra no bloco `todos`.
- Documentação e retorno: `docs/VERIFICACOES-COFRE.md`.

- Entrega do módulo na main pelo PR #1: merge `e7db968cf32236c9fecb3440c38f2545becd0afc`. CI macOS run 34719023851 aprovou 17 cenários de interface e as verificações de servidor/Cofre/migração. A rodada no Mac do usuário foi solicitada no run 34719284402 e aguardava o executor; conferir antes de afirmar aprovação local. Ver registro em `docs/VERIFICACOES-COFRE.md`.

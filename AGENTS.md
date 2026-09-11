# Atlas Linhas — instruções para agentes

## Continuidade aprovada pelo usuário (11/09/2026)

- Aplicação local no Mac em ~/atlaslinhas; repositório lucasgarciamoreira92-rgb/atlaslinhas.
- Blocos operacionais 1, 2, 3, 4 e 5 aprovados pelo usuário.
- Validações pausadas após o bloco 5. **Retomar pelo bloco 6 usando a automação de interface**.
- Bloco 6: acessos/operador. Bloco 7: CSV/backups/recuperação. Bloco 8: aceite final.
- O resultado automatizado deve identificar ambiente, commit, testes executados, falhas e limitações. Não marcar validação no Mac do usuário como feita por uma execução em CI/Linux.
- A conversa do ChatGPT não é compartilhada automaticamente com a sessão CLI. Leia este arquivo e docs/AUTOMACAO.md ao iniciar.

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

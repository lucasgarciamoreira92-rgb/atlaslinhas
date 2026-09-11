# Executor automático no Mac — Atlas Linhas

## Estado e objetivo

Blocos 1–5 aprovados. Retomada pelo bloco 6, depois 7 e aceite final 8. A nova configuração elimina a abertura do Codex e a colagem de instruções para cada rodada. Playwright continua sendo o motor dos testes.

O repositório público do produto é `lucasgarciamoreira92-rgb/atlaslinhas`. O executor fica ligado somente ao repositório privado `lucasgarciamoreira92-rgb/atlaslinhas-validacao-mac`. Não mudar a visibilidade do produto. A pasta `automation/mac-control/` é o modelo inicial do controle privado; não é um workflow ativo no repositório público.

## Instalação inicial

No Terminal normal do Mac, fora do prompt interativo do Codex:

```bash
cd ~/atlaslinhas && git pull --ff-only && bash scripts/ativar-testes-automaticos-mac.sh
```

É necessário Node 24 ou superior, Git, internet e login no GitHub com a conta `lucasgarciamoreira92-rgb`. O instalador identifica Apple Silicon ou Intel; baixa GitHub CLI 2.100.0 e GitHub Actions Runner 2.337.0 das distribuições oficiais, verificando SHA-256 antes de extrair. O executor preserva a atualização automática oficial.

O login inicial usa a tela oficial do GitHub no navegador. O GitHub CLI pede as permissões repo/workflow para criar o repositório privado, publicar o workflow e registrar o executor. Uma autenticação existente pode precisar autorizar o escopo workflow. O código temporário mostrado pelo GitHub CLI é digitado no GitHub, não enviado ao chat. O token de registro do executor é obtido automaticamente e passado em memória pela variável oficial ACTIONS_RUNNER_INPUT_TOKEN; não aparece nos comandos nem é salvo em arquivos do projeto.

O instalador:

1. Cria o repositório privado se ainda não existir; recusa um repositório público ou de outra conta.
2. Publica o workflow e os scripts de controle. Uma reinstalação preserva o controle já configurado.
3. Registra `atlas-linhas-mac-lucas` com o rótulo `atlas-linhas-mac`.
4. Instala o serviço oficial do runner na sessão do usuário, sem sudo, e confere que aparece online.
5. Cria o primeiro pedido do bloco 6, caso ainda não haja pedido, e abre a página de resultados do GitHub. O navegador de testes abre automaticamente após download e compilação da cópia de testes.

Depois é possível fechar o Terminal. Para testes visíveis, mantenha o Mac acordado, conectado e com a sessão gráfica aberta. Suspensão/desligamento interrompe a disponibilidade do executor. Se uma instalação falhar, executar o mesmo comando novamente permite retomar sem sobrescrever o controle nem duplicar o primeiro pedido.

Se a conexão GitHub do ChatGPT permite apenas repositórios selecionados, inclua o novo repositório privado na conexão. O teste inicial pode rodar antes disso, mas a leitura dos resultados e os próximos acionamentos por esta conversa exigem esse acesso. Nunca tornar o controle público para resolver uma restrição da conexão.

## Pastas e funcionamento

- Serviço e binários: `~/Library/Application Support/AtlasLinhasAutomacao/`.
- Cópia da aplicação para cada execução: workspace `_work` do executor, subpasta `application`.
- `~/atlaslinhas` e `~/AtlasLinhas/dados` não são usados como workspace ou banco dos testes.
- Os cenários já existentes criam seu próprio banco e porta temporários; não se conectam à aplicação real em 4310.
- A separação de pastas protege contra confusão de dados; não é uma sandbox do sistema operacional. O runner executa com as permissões do usuário. Somente responsáveis pelo projeto devem ter escrita no controle privado; não habilitar execução de PRs nesse controle.

O workflow só é acionado por alteração de `requests/atual.json` na main ou por workflow_dispatch. A preparação roda no GitHub, verifica o repositório privado, o formato do pedido e se o SHA da aplicação pertence à main. Somente depois agenda o Mac. Não aceita comandos, caminhos, senhas ou URLs no pedido.

## Acionar por esta conversa

1. Consultar o controle privado e conferir runner online e ausência de outra execução em andamento/pendente.
2. Obter o SHA completo da versão da aplicação aprovada na main.
3. Ler `requests/atual.json` e atualizar usando o SHA do blob atual. Conteúdo exato:

```json
{
  "id": "bloco6-20260911-210000",
  "bloco": "6",
  "sourceSha": "SHA_COMPLETO_DE_40_CARACTERES_DA_MAIN",
  "createdAt": "2026-09-11T21:00:00.000Z"
}
```

O exemplo contém um marcador no SHA, que deve ser substituído pelo SHA real. Usar id único e data atual. Blocos aceitos: `6`, `7`, `regressao`, `todos`. Uma solicitação deve corresponder à validação autorizada; não avançar o roadmap automaticamente.

4. Acompanhar o workflow do commit de controle criado. O GitHub permite uma execução ativa e uma pendente nesse grupo; uma solicitação mais recente pode substituir a pendente. Não enviar várias solicitações ao mesmo tempo. Pedidos esperando um Mac offline podem expirar.
5. Ler o log da etapa Produzir resumo da validação e, se necessário, baixar os artefatos. Não é necessário copiar o relatório manualmente do Mac.

## Relatórios e critério de conclusão

Os resultados vão somente para o repositório privado: resumo Markdown, JSON, relatório HTML e evidências de falha do navegador, retidos por 14 dias. Incluem pedido, bloco, SHA, sistema, Node, cenários aprovados/falhos/instáveis/ignorados e link da execução.

Uma preparação bem-sucedida seguida de Mac na fila não é teste concluído. Zero cenários, preparação interrompida, cenários ignorados ou falhas não são aprovação. Arquivos de relatórios anteriores não são usados se a etapa de testes não executar.

O teste de aceite desta automação consiste em confirmar executor online, observar o primeiro bloco 6, consultar seu resultado por esta conversa e acionar uma segunda execução por aqui sem abrir Codex ou colar comandos no Mac. Esse aceite exige o Mac do usuário; não pode ser substituído por uma execução hospedada no GitHub.

## Gerenciamento

Estes comandos são apenas para manutenção ocasional, não para iniciar cada teste:

```bash
bash scripts/ativar-testes-automaticos-mac.sh status
bash scripts/ativar-testes-automaticos-mac.sh parar
bash scripts/ativar-testes-automaticos-mac.sh iniciar
bash scripts/ativar-testes-automaticos-mac.sh desinstalar
```

`desinstalar` para o serviço e remove sua inicialização automática. Mantém arquivos e registro no GitHub para revisão/retomada; o registro pode ser removido em Settings → Actions → Runners do controle privado. Nenhum comando remove o inventário real.

## Referências

- https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/add-runners
- https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/configure-the-application
- https://cli.github.com/manual/gh_auth_login
- https://docs.github.com/en/rest/actions/self-hosted-runners

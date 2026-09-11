# Automação de testes — Atlas Linhas

## Ponto de retomada

Em 11/09/2026, o usuário confirmou os blocos operacionais 1 a 5 como funcionais. A validação foi pausada após o bloco 5. **A retomada é pelo bloco 6**, usando o navegador automatizado. O bloco 7 e o aceite final do bloco 8 vêm depois.

O Codex CLI recebe os pedidos e executa os comandos no Mac. O Playwright opera um navegador de teste e verifica resultados. Os testes também podem ser executados diretamente, sem uma sessão Codex. Esta conversa não conecta automaticamente ao Mac; AGENTS.md preserva o contexto necessário no repositório.

## Preparar o Mac uma vez

**Fluxo recomendado agora:** usar o [executor automático no Mac](EXECUTOR-MAC.md). Ele recebe pedidos pelo GitHub e executa sem abrir Codex ou colar instruções a cada rodada. A instalação e o primeiro acionamento estão descritos nesse documento. O fluxo com Codex abaixo continua disponível para investigação manual.

Na cópia existente:

```bash
cd ~/atlaslinhas
git pull --ff-only
bash scripts/preparar-automacao-mac.sh
```

Esse script instala as dependências fixadas no projeto, compila o Atlas, baixa o Chromium de teste e instala o Codex CLI pelo instalador oficial, se ele ainda não existir. Precisa de internet. Não altera configurações de uma instalação Codex existente. Se a instalação falhar, pare e examine a mensagem antes de prosseguir.

Abra um novo Terminal para carregar o caminho do Codex e execute:

```bash
cd ~/atlaslinhas
codex --version
codex login
codex
```

Conclua o login com sua conta ChatGPT no navegador. O acesso depende da disponibilidade e dos limites da sua conta. É o login da ferramenta de desenvolvimento; o acesso do Atlas Linhas continua sendo o cadastro local.

No Codex, peça:

> Leia AGENTS.md e docs/AUTOMACAO.md. Retomamos pelo bloco 6. Execute npm run test:bloco6 -- --headed, analise o relatório e informe o que passou, falhou ou não foi executado. Use somente o ambiente temporário dos testes.

O Codex pode solicitar permissões necessárias para os comandos e processos locais conforme a configuração instalada. Use as permissões normais do projeto; não é necessário desativar proteções da máquina ou compartilhar sua senha por chat.

## Comandos disponíveis

| Objetivo | Comando |
|---|---|
| Retomar bloco 6 vendo o navegador | `npm run test:bloco6 -- --headed` |
| Bloco 7 vendo o navegador | `npm run test:bloco7 -- --headed` |
| Regressão dos principais fluxos | `npm run test:regressao` |
| Toda a interface | `npm run test:interface` |
| Investigar os passos interativamente | `npm run test:interface -- --ui` |
| Abrir relatório da última execução | `npm run test:relatorio` |
| Integração HTTP e SQLite | `npm run local:build` e depois `npm run local:test` |

Os comandos de interface compilam antes de iniciar. Cada execução substitui o relatório anterior. A opção `--headed` mostra os cliques; a opção `--ui` permite inspecionar o roteiro. O relatório é servido somente em 127.0.0.1. Control+C encerra o visualizador de relatório.

## Cobertura inicial

| Grupo | Fluxos verificados |
|---|---|
| Bloco 6 | Administrador cria operador; login; edição e autoria no histórico; controles exclusivos do administrador; recusa no servidor; bloqueio revoga a sessão; login bloqueado; reativação |
| Bloco 6 — senhas | Senhas numéricas de 8 caracteres; confirmação diferente; troca de senha própria; revogação das outras sessões; senha anterior recusada; redefinição pelo administrador; dono sem botão de bloqueio |
| Bloco 7 | CSV com pacote de dados; criar e baixar backup; analisar sem mudar inventário; confirmar recuperação; histórico preservado; baixar cópia anterior e desfazer; reiniciar e revalidar backup |
| Bloco 7 — integridade | Arquivo modificado fora da aplicação recusado; inventário preservado |
| Regressão | Inventário inicial vazio; ausência de demonstração; iPhone com eSIM 1 e 2; GB automático e decimal; atualização do aparelho no histórico; gravação sem mudança não gera evento; persistência após reinício |
| Filtros e apresentação | Busca e operadora; totais globais durante filtro; pendência aparece e desaparece ao completar cadastro; escala 1,025 nos cards e indicadores; cor preservada; redução de movimento; largura de 390 px sem rolagem horizontal |
| Conflitos | Número duplicado bloqueado e duas abas editando a mesma linha sem sobrescrever a versão recente |

Esses cenários complementam `local:test`, que cobre também proteção de origem, arquivos privados, slots ocupados, remoção de slot vinculado, token de recuperação vencido por alteração, assinatura, limitação de tentativas e integridade SQLite. A automação inicial não é uma cobertura exaustiva de todas as telas ou navegadores.

## Isolamento e evidências

- Cada teste de interface cria uma pasta `atlas-e2e-*` na área temporária do sistema e um processo Atlas em uma porta livre.
- ATLAS_DATA_DIR e ATLAS_PORT são definidos pela fixture; não se aceita endereço externo para apontar testes ao inventário real.
- A fixture espera a confirmação de início do seu próprio processo. Se houver conflito de porta, falha; não usa um servidor existente.
- Nenhum teste acessa `~/AtlasLinhas/dados`. Usuários de teste usam endereços `example.invalid` e credenciais fictícias; eles não são criados na instalação real.
- Os dados temporários são removidos no encerramento normal, inclusive após falha de asserção. Se o processo inteiro for encerrado à força ou a energia cair, pode sobrar uma pasta temporária; ela não será reutilizada.
- Relatório HTML: `playwright-report/`. Resultado JSON, capturas, vídeos e trajetórias das falhas: `test-results/`. Tudo fica fora do Git.
- Falhas de interface incluem evidências; o contexto separado do operador também guarda uma trajetória quando falha.
- Após qualquer falha, diferenciar defeito do produto, seletor incorreto no teste e problema do ambiente. Não diminuir a exigência do teste para obter resultado verde.

## GitHub e continuidade

O workflow existente no macOS passa a executar a integração HTTP/SQLite e a interface Chromium. Em falha, mantém o relatório e evidências como artefato por 14 dias. Uma execução no GitHub confirma aquele ambiente e aquele commit; não significa que o teste já rodou no Mac de Lucas.

Os blocos 6 e 7 só devem ser registrados como validados no Mac após a execução local e conferência dos resultados. Para o bloco 8, a avaliação humana do visual e da usabilidade continua necessária.

## Referências das ferramentas

- [Codex CLI — instalação e comandos](https://learn.chatgpt.com/docs/codex/cli)
- [Autenticação do Codex](https://learn.chatgpt.com/docs/auth)
- [Playwright — execução e relatórios](https://playwright.dev/docs/running-tests)

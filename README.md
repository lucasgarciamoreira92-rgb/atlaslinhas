# Atlas Linhas — execução local no Mac

Controle de números, chips, aparelhos, localização, responsáveis, mensalidades e histórico da ON NET. Interface Atlas com cartões compactos. Esta versão executa no Mac sem login no ChatGPT, Docker, conta Cloudflare ou servidor dedicado.

## Instalação

Pré-requisitos: **Node.js 24 LTS ou superior**, npm (acompanha o Node) e Git. A instalação inicial precisa de internet para baixar as dependências. O uso normal depois da instalação é local.

```bash
git clone https://github.com/lucasgarciamoreira92-rgb/atlaslinhas.git
cd atlaslinhas
bash scripts/instalar-mac.sh
bash scripts/iniciar-mac.sh
```

Abra **http://localhost:4310** no navegador. Na primeira abertura, crie seu nome, e-mail e senha de administrador (mínimo 8 caracteres, podendo usar somente números). Não existe senha padrão. O e-mail identifica sua conta local; não exige conta do ChatGPT e não envia mensagens.

Para iniciar nos próximos dias:

```bash
cd ~/Projetos/atlaslinhas
bash scripts/iniciar-mac.sh
```

O caminho acima pressupõe que o repositório foi clonado na sua pasta pessoal. Também é possível abrir `Iniciar-Atlas-Linhas.command` na pasta do projeto. O terminal precisa continuar aberto; `Control+C` encerra o aplicativo. Manter o Mac desligado não perde os cadastros, mas interrompe o acesso.

## Primeiro acesso e validação

- Após criar seu acesso, a aplicação abre diretamente seus cadastros. Antes da primeira linha, o inventário fica vazio, sem demonstração ou troca de modo.
- Em **Configurações → Equipe e acessos**, o administrador cria operadores com senha própria, redefine a senha deles, bloqueia e reativa contas. O operador pode mudar sua senha em **Minha senha**.
- Operadores cadastram/editam linhas e aparelhos, consultam histórico e exportam CSV. Somente o administrador gerencia equipe, cria backups e recupera arquivos.
- **Sair** encerra a sessão desta aplicação. A sessão dura até 8 horas e é revogada ao bloquear a conta ou redefinir a senha.
- Continue pelo [roteiro de validação](docs/VALIDACAO-LOCAL.md), **retomando pelo bloco 6**: os blocos 1 a 5 já foram aprovados pelo usuário.

## Onde ficam os dados

Pasta padrão: **`~/AtlasLinhas/dados/`**, separada do código e excluída do Git.

| Item | Conteúdo |
|---|---|
| `atlas-linhas.sqlite` | Linhas, configurações, histórico, equipe, hashes de senha e sessões |
| `atlas-linhas.sqlite-wal` / `-shm` | Arquivos auxiliares enquanto o banco está aberto |
| `backups/` | Cópias manuais e automáticas anteriores às recuperações |
| `backup.key` | Chave local que valida a assinatura dos backups; deve ser preservada |

A pasta é criada no primeiro início. Atualizar ou apagar uma cópia do código não altera essa pasta. Para mudar sua localização, defina `ATLAS_DATA_DIR` antes de iniciar; use o mesmo caminho nos próximos inícios. `ATLAS_PORT` altera a porta (padrão 4310). Não coloque o banco ativo dentro de pasta de sincronização em nuvem.

O backup JSON da tela contém linhas, aparelhos, configurações e histórico, **sem os logins da equipe do Atlas** (contas de serviços e credenciais criptografadas são incluídas na versão nova). Para uma cópia completa de toda a instalação, pare o aplicativo e copie a pasta `dados` inteira, incluindo `backup.key`. Uma cópia na mesma máquina não protege contra a perda do Mac: guarde a cópia completa também em outro local de sua escolha.

Os dados do site antigo não são importados automaticamente. Backups assinados por outra instalação exigem tratamento da chave original pelo programador; não remova a validação de assinatura.

## Atualização

Pare o aplicativo com `Control+C` e execute, dentro da pasta do projeto:

```bash
git pull --ff-only
bash scripts/instalar-mac.sh
bash scripts/iniciar-mac.sh
```

As migrações são aplicadas uma vez e seus checksums são verificados. Não edite migrações já aplicadas. Se esquecer a senha do administrador, pare o aplicativo e execute `npm run local:reset-password` no Terminal; informe e-mail e nova senha quando solicitado. A senha não aparece na tela nem no histórico do terminal.

## Desenvolvimento e entrega ao programador

```bash
npm run local:build
npm run local:start
npm run local:test
```

Os testes usam uma pasta temporária e não alteram seus dados. A implementação local usa Node, SQLite nativo e arquivos de backup no disco; as regras e o visual são compartilhados com a versão anterior.

Leia [INTEGRACAO-ATLAS.md](docs/INTEGRACAO-ATLAS.md) para adaptar a identidade, armazenamento e rotas ao Atlas já existente. A instalação em servidor e a integração final ficam com o programador responsável. Este repositório não exige que o usuário prepare um servidor.

O servidor local escuta somente em `127.0.0.1`. O teste de um operador pode ser feito em janela anônima no mesmo Mac. Acesso por outros aparelhos e login unificado com o Atlas devem ser validados após a integração pelo programador.

A implementação anterior hospedada foi preservada em `app/`, `lib/` e na configuração de Sites como referência. Os scripts `sites:*` pertencem à versão anterior; **para usar no Mac, siga os comandos locais acima**. [ATLAS.md](ATLAS.md) registra o histórico das etapas; [LEGADO-SITES.md](docs/LEGADO-SITES.md) descreve a infraestrutura anterior.

O workflow `local-mac.yml` também executa a instalação, a compilação e os testes em um runner macOS do GitHub Actions a cada atualização da branch main. O resultado está na aba Actions do repositório.

## Testes automáticos no Mac, acionados pelo GitHub

Para receber solicitações de teste automaticamente, com navegador visível e retorno dos resultados ao GitHub, prepare o executor uma vez:

```bash
bash scripts/ativar-testes-automaticos-mac.sh
```

O instalador pede login no GitHub, cria o controle privado, registra o executor e solicita o primeiro bloco 6. Consulte [EXECUTOR-MAC.md](docs/EXECUTOR-MAC.md) para acompanhar, autorizar o acesso do ChatGPT ao novo repositório e gerenciar o serviço. Os testes usam uma cópia separada e dados fictícios.

## Investigação manual com Codex CLI

A automação usa Playwright com dados fictícios e um banco temporário por teste. Consulte [AUTOMACAO.md](docs/AUTOMACAO.md) para instalar o Codex no Mac e retomar pelo bloco 6.

```bash
bash scripts/preparar-automacao-mac.sh
# Depois da instalação, em um novo Terminal:
codex login
codex
```

Também é possível executar diretamente `npm run test:bloco6 -- --headed`. Abra as evidências com `npm run test:relatorio`.

## Verificações, autenticações e Cofre

A nova área organiza contas e seus destinos de confirmação, com vários métodos e aparelhos por conta, responsáveis, pendências e consulta pelas próprias linhas e aparelhos. O Cofre armazena senhas e códigos de recuperação criptografados, com permissões por credencial e desbloqueio usando a senha de acesso ao Atlas.

O backup JSON da versão nova inclui o organizador e o Cofre criptografado. A chave `vault.key`, a assinatura `backup.key` e os usuários locais permanecem na pasta de dados; uma cópia completa dessa pasta, com a aplicação parada, é necessária para recuperação em outro computador. Não envie esses arquivos ao GitHub ou por chat.

Leia [VERIFICACOES-COFRE.md](docs/VERIFICACOES-COFRE.md) antes da primeira atualização. A versão anterior está preservada e a migração cria um checkpoint local automaticamente para instalações existentes.

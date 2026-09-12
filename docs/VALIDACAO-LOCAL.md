# Validações operacionais — versão Mac

Registro dos blocos anteriores em 12/09/2026: blocos 1–7 revalidados automaticamente no Mac de Lucas, com dados fictícios isolados. Nove cenários aprovados, zero falhas, instáveis ou ignorados. [Execução e evidências](https://github.com/lucasgarciamoreira92-rgb/atlaslinhas-validacao-mac/actions/runs/34688123499). Bloco 8 automatizado aprovado também: cinco cenários, sem falhas ou ignorados, na execução abaixo.

A rodada cobre os fluxos abaixo por cenários combinados, incluindo Android, iPhone, múltiplos eSIMs, API/reserva, histórico de campos, filtros, conflitos, acessos e backups. Não representa cobertura exaustiva nem teste dos cadastros reais. A instalação foi executada na cópia isolada; reinício do servidor foi testado, mas o retorno do executor após reinício físico do Mac foi validado posteriormente no run 34710270685 (14 cenários aprovados).

## Bloco 1 — instalação, acesso e inventário real

1. Seguir a instalação do README e abrir http://localhost:4310.
2. Confirmar que aparece a criação do administrador, sem login no ChatGPT. Criar nome, e-mail e senha própria.
3. Conferir nome e perfil Administrador no menu. O inventário deve abrir diretamente nos cadastros reais.
4. Antes do primeiro cadastro real, conferir o inventário vazio e o botão Cadastrar linha, sem opções de demonstração.
5. Abrir Visão geral, Minhas linhas, Chips em reserva e Configurações.
6. Recarregar a página, sair e entrar novamente. Fechar o servidor com Control+C e iniciar novamente; o administrador não deve precisar ser recriado.

Aceite: acesso independente, perfil correto e telas funcionando. Recarregar ou entrar novamente mantém o inventário real, mesmo vazio; cadastros existentes são preservados.

## Demais blocos

| Bloco | Procedimento | Aceite |
|---|---|---|
| 2 — Cadastro | Pequena amostra real: Android, iPhone, linha API, chip reserva, locais e custos; reiniciar | Todos os dados persistem e localização física não se confunde com uso virtual |
| 3 — Dashboard | Busca, operadoras, situações, reservas, pendências e total de custos | Resultados conferem com a amostra |
| 4 — Histórico | Alterar nome, responsável, aparelho, slot, local, observação e custo | Antes/depois, autor e horário em cada mudança |
| 5 — Validações | Duplicar número, ocupar slot, dados inválidos e duas abas editando a mesma linha | Bloqueios claros, sem sobrescrever alterações recentes |
| 6 — Operador | Criar operador e entrar em janela anônima no mesmo Mac; editar, tentar backups/administração, bloquear e reativar | Permissões corretas; bloqueio revoga sessões; senha própria funciona |
| 7 — Arquivos | Abrir CSV, criar/baixar backup e realizar recuperação acompanhada, com cópia anterior preservada | Conteúdo correto e possibilidade de desfazer |
| 8 — Aceite | Repetir falhas corrigidas e verificar legibilidade reduzindo a janela | Sem falhas que comprometam dados ou uso essencial |

Usar uma janela anônima permite testar um operador simultaneamente sem acesso ao Mac de outra pessoa. A versão local fica ligada somente ao próprio Mac: celular na rede e sessão unificada do Atlas serão validados após a integração pelo programador, não bloqueiam o aceite local.

Em cada bloco, registrar data, aprovado/ajuste/bloqueado, passos executados e resultado. Não executar recuperação de um inventário importante sem conferir a prévia e preservar a cópia atual. Nenhum dado real foi incluído nos testes de desenvolvimento.


## Bloco 8 — resultado automático em 12/09/2026

[Execução no Mac de Lucas](https://github.com/lucasgarciamoreira92-rgb/atlaslinhas-validacao-mac/actions/runs/34688556772). Código testado: `3f5d3477e38c8fba5af81b7780dc3e3cbfd55d9e`. macOS/darwin 25.6.0, Node 24.21.0, Chromium visível. Cinco cenários aprovados, zero falhas, instáveis ou ignorados, em 41,6 segundos.

- Menu recolhido com dois destinos, expansão com três submenus e acesso às telas.
- Abertura/fechamento de formulário de aparelho; edição de linha descartada sem salvar.
- Número e aparelho em destaque; eSIM 1, GB, mensalidade e vencimento no card.
- Hover 1,025 em cards e indicadores, retorno ao normal, cores preservadas e respeito à redução de movimento.
- Larguras 1280, 768 e 390: ausência de rolagem horizontal da página/formulário, salvar acessível, edição persistida no histórico, fechamento e navegação. Nenhum erro JavaScript não tratado nesses cenários.

Capturas de dashboard e histórico foram anexadas ao relatório privado. Os dados são fictícios e isolados. Este resultado verifica critérios objetivos de interface; não equivale a uma avaliação estética humana nem prova ausência de todo tipo de sobreposição. O retorno do executor após reinício físico do Mac foi validado posteriormente no run 34710270685 (14 cenários aprovados).


## Nova versão — Verificações e Cofre

Em 12/09/2026, a suíte foi ampliada de 14 para 17 cenários. O macOS do GitHub aprovou todos no run 34719023851, incluindo as três larguras e os novos fluxos. Isso não equivale à execução no Mac do usuário. O pedido local run 34719284402 foi preparado e aguardava o executor no registro da entrega; confira o resultado atual antes de considerá-lo aprovado. Detalhes: [VERIFICACOES-COFRE.md](VERIFICACOES-COFRE.md).

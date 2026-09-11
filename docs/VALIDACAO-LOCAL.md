# Validações operacionais — versão Mac

Status inicial: adaptação local implementada e testada em ambiente de desenvolvimento Linux com Node 24. A instalação e o uso no Mac do usuário serão conferidos neste roteiro. Não marcar um bloco operacional como aprovado apenas pelo teste automatizado.

## Bloco 1 — instalação, acesso e separação dos exemplos

1. Seguir a instalação do README e abrir http://localhost:4310.
2. Confirmar que aparece a criação do administrador, sem login no ChatGPT. Criar nome, e-mail e senha própria.
3. Conferir nome e perfil Administrador no menu. Se o inventário está vazio, a demonstração deve estar identificada.
4. Clicar em Usar com meus dados. Antes do primeiro cadastro real, essa área deve estar vazia.
5. Abrir Visão geral, Minhas linhas, Chips em reserva e Configurações.
6. Recarregar a página, sair e entrar novamente. Fechar o servidor com Control+C e iniciar novamente; o administrador não deve precisar ser recriado.

Aceite: acesso independente, perfil correto, telas funcionando e exemplos separados. O inventário vazio pode reabrir na demonstração; isso não significa perda de dados reais.

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

# Versão local para Mac

A versão de uso atual é a local: siga o README e docs/VALIDACAO-LOCAL.md. As descrições abaixo registram as etapas da versão hospedada anterior; autenticação ChatGPT/D1/R2 foram substituídas por login próprio, SQLite e arquivos no build local. A integração final ao Atlas será realizada pelo programador responsável.

# Atlas Linhas

Aplicação privada para controlar números, aparelhos e chips da ON NET.

## Funcionamento
- Dashboard compacto com busca, filtros e resumo dos custos informados.
- Linhas e aparelhos separados: cada aparelho pode ter linhas em slots distintos.
- Chip guardado: localização e observação próprias, independentes do uso virtual.
- Dados persistentes em D1. Alterações de linha registradas em histórico.
- Exemplos isolados na memória, identificados como demonstração; nunca inseridos automaticamente no banco.
- Acesso inicial privado ao proprietário. Compartilhamento e autenticação própria da equipe não foram configurados.

## Verificações
- TypeScript e build concluídos.
- Migração e regras SQL verificadas: duplicidade de número, ocupação de slot, edição por versão, histórico e múltiplas reservas sem aparelho.
- Não foi realizado teste de interface em navegador nesta entrega.
- WebMCP de consulta incluído; validação em contexto WebMCP indisponível nesta execução.

## Interface ACS Pilot
- Menu lateral, cabeçalho, fonte e cores reaproveitados do ACS Pilot original.
- Atalhos para visão geral, linhas, reservas e configurações.
- Inventário em faixas compactas, com localização em destaque, aparelho e observação das reservas.
- Seleção de iPhone/Android e modelos mantida nos cadastros.
- Estrutura de persistência e histórico preservada.

## Referência visual Atlas (setembro de 2026)
- Design atualizado conforme captura fornecida: navegação grafite flutuante, cantos amplos, oliva, terracota, botões em cápsula e títulos fortes.
- Linhas mantidas em faixas compactas, com ícones maiores de celular e localização dos chips.

## Visão geral em cartões
- Grade de cartões por linha, seguindo a organização da referência enviada.
- Celular/chip, identificação, número, situação cadastrada, operadora, responsável, mensalidade, localização e uso virtual.
- Reservas exibem local e observação. Clique abre o mesmo cadastro lateral.
- Busca e filtros aplicados à grade; demais telas preservadas.

## Etapa 1 — definições fechadas
- Administrador: proprietário; equipe com login individual e permissão de cadastro/edição (implementação na etapa 4).
- Histórico completo de valores anteriores/novos, autor e horário, inclusive alterações indiretas de aparelhos, previsto na etapa 4.
- Etapa 3: ajustar cartões menores e mais quadrados, preservando identidade Atlas.

## Etapa 2 — cadastros e validações
- Normalização de celular brasileiro, incluindo colagem com +55; exige DDD e número iniciado por 9. Não verifica existência/ativação na operadora.
- iPhone/Android, modelo personalizado, nome, local e responsável do aparelho. Slots explicitamente configuráveis, com seleção apenas dos slots livres no vínculo da linha.
- Compatibilidade: aparelhos antigos sem `slots` mantêm as três opções anteriores até revisão; novos iniciam com Slot 1 e permitem ajuste pelo usuário.
- Reserva pode permanecer em aparelho de contingência. Cancelamento libera o slot e conserva a localização final e o cadastro; reativação usa o mesmo registro. Suspensão mantém o vínculo.
- Mensalidade em centavos, aceita valores brasileiros, distingue vazio/zero; vencimento de 1 a 31.
- Local/responsável ausentes não bloqueiam salvar, mas aparecem como pendência no formulário.
- Validações compartilhadas entre demonstração e operação real. Demonstração continua isolada e temporária.
- Unicidade de número e slot no banco; versão de configuração conferida na escrita da linha; remoção de aparelho/slot ocupado bloqueada atomicamente.
- Salvamento sem alteração não cria uma nova revisão de linha. Histórico existente de snapshots mantido, ainda sem autoria e comparação por campo.
- Verificação: scripts/test-registration.cjs; scripts/test-registration-sql.py; TypeScript; build. Não foi realizado teste de navegador.
- Não houve mudança de esquema: os novos slots ficam nos dados JSON existentes. Migrações anteriores preservadas.

## Etapa 3 — dashboard compacto
- Cartões com espaçamento reduzido, cantos de 20px e grade automática com largura mínima de 17rem; mais colunas conforme espaço real disponível, inclusive ao recolher o menu.
- Indicadores menores, mantendo totais gerais e aviso de custo parcial. Clicar nos indicadores filtra a própria visão geral.
- Busca inclui sistema/uso virtual, aparelho, local, responsável e número formatado com +55.
- Filtros combináveis de uso, situação e operadora, contagem de resultados e limpeza da busca/filtros. A aba Reservas mantém seu escopo ao filtrar.
- Pendências incluem falta de responsável ou de localização, excluindo linhas canceladas.
- Observações longas resumidas em duas linhas nos cartões; texto completo disponível no cadastro. Localização permanece legível sem altura fixa.
- Verificação: TypeScript e build. Conferência visual em navegador não realizada nesta etapa.

## Etapa 4 — equipe e trajetória das linhas
- Autenticação pelo login ChatGPT do Sites, com identificação estável por usuário e validação em todas as APIs.
- Administrador inicial estabelecido somente pelo e-mail verificado do proprietário, configurado no segredo `ATLAS_OWNER_EMAIL`. Após o primeiro acesso, identidade vinculada ao ID estável do usuário no Site.
- Operadores pré-autorizados por e-mail, vinculados ao ID no primeiro acesso; bloqueio verificado em toda requisição. Administrador protegido contra bloqueio pela tela/API de equipe.
- Configurações → Equipe permite autorizar e bloquear operadores. O compartilhamento externo do Site continua sendo uma segunda autorização da plataforma; nenhuma mensagem/convite é enviada pelo aplicativo.
- Site mantido privado ao proprietário nesta entrega, sem autorizar terceiros desconhecidos. A equipe deve receber acesso de visitante, não edição de código, no compartilhamento do Sites.
- Botão de relógio em cada cartão/lista abre o painel Trajetória do número. Também disponível na aba Histórico do cadastro.
- Eventos agrupam todos os campos de um salvamento, valores anteriores/novos, autor autenticado e horário do servidor. Sem alteração real, não se cria evento de linha.
- Alterações de aparelho registram evento nas linhas vinculadas no instante da transação, incluindo nome, modelo, sistema, slots, responsável e localização. Valores históricos preservados em snapshots.
- Alteração e evento na mesma transação D1; erro na auditoria reverte a gravação. Sem rotas de edição/exclusão de histórico.
- Paginação de 30 eventos, sem limite total; ordenação por data e sequência da inserção. Dados anteriores preservados com autor não registrado e aviso sobre informações antigas de aparelhos ausentes.
- Demonstração permite testar eventos de cadastro e aparelho na memória da sessão, identificados como fictícios; não grava exemplos no banco.
- Migração 0001 acrescenta membros, detalhe opcional e índice do histórico; migração 0000 preservada.
- Testes: regras de cadastro, SQL/rollback, autorização das APIs, bloqueio de operador, proteção do administrador, autoria não controlável pelo cliente, movimentação em múltiplas linhas, histórico legado e paginação com 106 eventos. Login real da equipe e interação em navegador ainda dependem da conferência de uso.

## Etapa 5 — exportação, backup e recuperação
- Configurações → Exportação e backups. CSV UTF-8 para planilha com linhas, aparelhos, locais, responsáveis, custos e observações; células protegidas contra interpretação como fórmulas. Operadores também podem exportar CSV.
- Backup manual criado em R2 e baixado em JSON: configurações, linhas e todo o histórico. Inclui cópias automáticas anteriores às recuperações. Listagem paginada, sem apagar cópias antigas automaticamente.
- Backup de dados não inclui membros, credenciais ou segredos; a restauração mantém as permissões atuais para evitar reativar acessos bloqueados ou remover o administrador.
- Arquivos assinados com HMAC pelo segredo persistente `ATLAS_BACKUP_KEY`. Aceita somente backups originais desta aplicação; preservar a chave de produção para manter a capacidade de recuperação. A assinatura verifica integridade, não criptografa o conteúdo do arquivo baixado.
- Limite de 8 MB por arquivo. Demonstração exporta somente CSV fictício, sem backups reais.
- Restauração somente pelo administrador, com análise prévia de contagens, alterações, adições/remoções e confirmação explícita. Conferência vinculada ao usuário/arquivo/revisão e válida por 10 minutos.
- Cópia do estado atual salva antes de toda recuperação. Restauração em uma transação D1; erro desfaz todas as alterações. Controle de revisão por triggers impede sobrescrever edições que ocorreram após a análise.
- Linhas/configurações são substituídas pelas do arquivo com versões novas. Histórico atual preservado, eventos ausentes recuperados e eventos de recuperação acrescentados. Linhas ausentes no arquivo saem do inventário; seu histórico permanece guardado e incluído nos próximos backups.
- A cópia automática pode ser baixada e restaurada pelo mesmo fluxo para desfazer a recuperação anterior. Armazenamento indisponível bloqueia a operação antes de alterar o cadastro.
- Migração 0002: metadados de backups, contador de revisão e triggers de revisão para linhas/configurações/histórico. Migrações 0000 e 0001 preservadas.
- Testes locais com SQLite e armazenamento simulado: ida e volta do backup, proteção contra arquivo alterado, permissões, conferência expirada por edição, concorrência na transação, falha de armazenamento, rollback, preservação de histórico/equipe e recuperação da cópia automática, incluindo backup vazio. TypeScript e build verificados; não houve teste de interface em navegador nem restauração dos dados reais.
- Backups são manuais e automáticos antes de recuperação; agendamento periódico não configurado. Importação da planilha original permanece opcional, caso seja fornecida.

## Etapa 6 — revisão técnica e preparação do piloto
- Reexecutados os testes de cadastro, SQLite, autorização, histórico, exportação e recuperação das etapas anteriores: aprovados, incluindo conflitos, concorrência, rollback e falha de armazenamento simulado.
- Revisão em navegador da demonstração isolada: dashboard desktop, busca por número, edição de nome/observação e histórico com valores anteriores/novos e horário. Conferência responsiva em quadro de 390 × 844: painel, menu, navegação para reservas e formulário lateral com rolagem.
- Corrigida geração de identificadores no navegador em prévias HTTP, onde `crypto.randomUUID` não está disponível; alternativa usa `crypto.getRandomValues`. Autenticação e assinaturas continuam no servidor. Rótulos acessíveis de menu/fechar traduzidos e contagem singular ajustada.
- As rotas temporárias de revisão e a identidade fictícia foram removidas antes da publicação. Nenhum cadastro real foi alterado pela revisão.
- Limites: prévia local não fornece o login ChatGPT do ambiente publicado. A revisão de navegador usou dados em memória; permissões, CSV, backup e restauração foram exercitados por testes de API com SQLite e armazenamento simulado. Login real de colaboradores, downloads em produção e restauração em armazenamento real ficam para o piloto acompanhado.

### Piloto com dados reais — próxima atividade
1. Entrar com a conta proprietária e cadastrar uma pequena amostra: linha em aparelho, número usado em API e chip reserva com local/observação.
2. Reabrir a aplicação e confirmar persistência, busca, filtros, custo total e localização física.
3. Alterar identificação, responsável, aparelho/slot e local; conferir cada antes/depois, autoria e data no botão de histórico.
4. Se houver colaboração, autorizar uma conta de operador tanto no compartilhamento do site quanto em Equipe; confirmar cadastro/edição e impedimento de administração/recuperação.
5. Exportar CSV, criar e baixar backup; conferir os dados. A recuperação substitui o inventário: executá-la apenas em ensaio acompanhado, após conferir a prévia e garantir a cópia de segurança do estado atual.
6. Repetir os fluxos essenciais no celular utilizado pela equipe. Registrar ajustes e só então ampliar o cadastro para todas as linhas.

Critério de aceite operacional: os cadastros persistem, cada número é localizável, alterações têm histórico correto, permissões são respeitadas e uma cópia de segurança pode ser baixada e recuperada no ensaio acompanhado.

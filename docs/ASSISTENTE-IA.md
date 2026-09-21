# Assistente Atlas — integração em construção

## Etapa 7 — Cofre protegido no assistente (14/09/2026)

Implementado na main em `7f1459ff48b8c8226b154bbc95214b83128a21ec`. O modo **Cofre protegido** permite buscar/selecionar uma conta já aprovada e cadastrar/alterar senha e códigos de recuperação após desbloqueio. Usa o mesmo componente e serviço do Cofre, com escopo próprio `assistant`. A gravação ocorre somente ao clicar em **Salvar credencial**; campos vazios preservam o valor existente. O piloto do assistente continua administrativo.

Credenciais com consulta rápida desativada não podem ser reveladas/copiadas pelo assistente; a edição exige a permissão própria. Desbloqueios são vinculados à sessão, conta, versões, finalidade, escopo e expiração. O servidor revalida permissões em cada ação. Fechar o painel, trocar de modo, selecionar outra conta ou sair da janela limpa os campos/desbloqueio locais. Uma gravação já enviada pode concluir mesmo que o painel seja fechado.

Campos protegidos seguem exclusivamente para /api/vault, fora das mensagens e do contexto OpenAI; o histórico registra a operação e o escopo, nunca o conteúdo. Não houve migração ou mudança da pasta de dados. A integração em linguagem livre continua para a etapa 8.

Validação direcionada de desenvolvimento aprovada: TypeScript, compilação, testes HTTP/SQLite do assistente e serviço Cofre/migração. Cobertura nova: bloqueio do operador, escopo incompatível, token invalidado após escrita, preservação dos códigos em edição parcial e ausência de segredos nos catálogos/histórico. A suíte integral não foi executada.

**Interface pendente:** run [34844187032](https://github.com/lucasgarciamoreira92-rgb/atlaslinhas-validacao-mac/actions/runs/34844187032), fonte exata acima. Preparação aprovada; tarefa do Mac em fila na última consulta. Seis cenários do bloco assistente previstos, incluindo cadastro/edição no Cofre, ausência de gravação antes do clique, limpeza ao fechar/trocar de modo/perder foco e larguras 1280/768/390. Conferir esse pedido antes de criar outro; não marcar etapa 7 integralmente validada enquanto estiver em fila.

A automação usa cópia isolada e dados fictícios; não atualiza a instalação diária.

## Verificações no assistente — 14/09/2026

Novo modo Verificações no painel guiado: consulta de contas, criação/edição de metadados, responsável existente, situação 2FA, múltiplos métodos/destinos, finalidade, etapa, preferência, situação e responsável de cada destino. SMS/ligação reutilizam linhas; autenticador/aprovação reutilizam aparelhos; e-mail seleciona outra caixa cadastrada. Chaves físicas, recuperação e outros registram apenas localização/identificação, nunca o código. Pessoas novas continuam sendo cadastradas na área existente. Métodos não ativam 2FA automaticamente.

`/api/assistant/accounts` é administrativo, seleciona somente dados/identificadores/versões e nunca carrega colunas de credenciais ou políticas na resposta. Propostas rejeitam segredos e políticas no payload, validam vínculos e duplicidade, usam aprovação de sessão e revisão global conferida dentro da transação de gravação. Históricos seguem o serviço existente. Edições preservam permissões e credenciais; contas novas começam visíveis somente a administradores, com consulta rápida desativada, explicitado no resumo. Compartilhamento é ajustado pelo cadastro existente.

O fluxo continua guiado, sem IA real. Inputs livres não são detector automático de segredos: não digitar senhas/códigos em instruções ou descrições. Cofre protegido no painel permanece como próxima etapa. Não há recebimento automático de códigos. Após salvar, atualizar a área Verificações para carregar os registros.

TypeScript, compilação, testes do assistente e do serviço de Verificações/Cofre passaram em ambiente isolado. Cobertura relacionada de permissões/Cofre foi repetida porque a gravação de contas é compartilhada. Suíte integral da aplicação não executada. Validação de interface segue somente bloco assistente no Mac após publicação.

## Aprovação e gravação — 14/09/2026

Validação seletiva no Mac: run 34840412677, quatro cenários aprovados, zero falhas/instáveis/ignorados. Os cenários de rascunho agora também criam e editam linha e aparelho pela interface, conferindo que o banco só muda após Aprovar e salvar. A pendência anterior de seleção/edição no navegador foi coberta nesta rodada. Nenhuma chamada à OpenAI ou uso dos dados reais.

O resumo revisado agora permite `Aprovar e salvar` para linhas/chips e aparelhos. `POST /api/assistant/approve` aceita somente approvalToken e confirmed=true: não aceita dados do cadastro. O servidor mantém a proposta exata por dez minutos, vinculada à sessão. Novo pedido de preparação invalida o anterior, inclusive se incompleto/inválido; reiniciar o servidor invalida revisões. Tokens são consumidos antes da gravação para impedir cliques duplicados. Falhas exigem uma nova proposta; ainda não há recuperação idempotente de uma resposta perdida após gravar.

Gravações reutilizam validações e histórico dos cadastros existentes, preservando observações fora da conversa. Linhas conferem versão da linha e configurações; aparelhos conferem a versão das configurações e o conjunto de linhas/versões na mesma escrita SQL, para que os impactos não mudem entre revisão e confirmação. O histórico existente de aparelhos registra mudanças nas linhas vinculadas; aparelhos sem linhas ainda não têm histórico independente.

Após salvar, o painel confirma o resultado; a visão geral deve ser atualizada para carregar os dados. A IA permanece desconectada do fluxo guiado. A atualização anterior que dizia que o botão estava indisponível descreve a etapa histórica, agora substituída por esta.

Testes direcionados de servidor aprovados: uso único, isolamento de sessão, resumo substituído, confirmação obrigatória, rejeição de campos adulterados, criação/edição, preservação de observações e conflitos de linha/configurações/vínculos. Não executar suíte completa nesta etapa; validar somente o bloco assistente no Mac após publicação.

## Painel de preparação guiada — 14/09/2026

Validação seletiva no Mac concluída no run 34839602375: quatro cenários aprovados, zero falhas/instáveis/ignorados. Cobre configuração, layout em três larguras, rascunho de linha com correção/reabertura e ausência de gravação, aparelho novo e busca vazia. A primeira rodada 34839360980 identificou nomes acessíveis inconsistentes quando a resposta mudava de input para select; corrigidos antes da aprovação. A edição de registro existente tem cobertura de servidor, mas seu fluxo completo de seleção/edição no navegador ainda precisa de cenário próprio. A instalação diária não é atualizada pelo executor.

O modo inicial do assistente agora prepara linhas/chips e aparelhos sem chave OpenAI. É explicitamente guiado: perguntas por campo, opções válidas, busca paginada e seleção explícita para editar, histórico das respostas, correções e resumo antes/depois. Não interpreta linguagem livre como IA. Conversa OpenAI e configuração permanecem em modos separados; dados do rascunho não são enviados ao provedor.

Rascunho em memória do componente: preservado ao fechar/reabrir e trocar de modo; descartado ao recarregar ou sair. Novo rascunho exige confirmação de descarte. Propostas não são salvas; aprovação/gravação continua indisponível. Conflitos mantêm o rascunho e pedem nova consulta, sem atualizar silenciosamente a versão. Próximos passos: confirmação vinculada à proposta e integração real ao final.

Acionamento seletivo `assistente` adicionado ao executor privado e ao comando `node scripts/test-interface.mjs assistente --headed`; seleciona apenas `assistant-*.spec.ts`. Proteções de main, repositório privado e cópia temporária permanecem. CI integral automático ainda requer seleção futura; publicar esta etapa com `[skip ci]` e acionar o bloco específico no Mac.

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

Validação de interface pendente: pedido corrigido no run 34841417082, fonte 0a1b61201f8c3704c19e1d016f4c33412d74a3c3. O run anterior 34841223115 aguardava o Mac antes dele, com a versão anterior das perguntas. Não considerar a interface validada. Ao retomar, conferir ambos os runs antes de solicitar novamente; não criar pedidos duplicados. Cinco cenários previstos no bloco assistente, incluindo o novo cenário de contas/múltiplos destinos. Mac deve estar acordado, conectado e com sessão aberta.

## Encerramento da etapa 6 — validação conferida

O pedido corrigido 34841417082 foi concluído com sucesso no Mac de Lucas: fonte `0a1b61201f8c3704c19e1d016f4c33412d74a3c3`, cinco testes do bloco assistente aprovados, zero falhas, instáveis ou ignorados. Resultado em 14/09/2026 às 12:07 UTC (09:07 em Brasília). Cenário de contas, múltiplos destinos, resumo corrigido e edição aprovada executado com dados fictícios. A rodada anterior 34841223115 falhou; o resultado válido é o da versão corrigida. A pendência de interface da etapa 6 está encerrada; não acionar novamente apenas por existir o registro histórico de fila acima. Próxima etapa: campo protegido do Cofre no painel, sem segredos na conversa. Integração real da IA permanece para o final. Instalação diária não é atualizada pela automação.

Resultado: https://github.com/lucasgarciamoreira92-rgb/atlaslinhas-validacao-mac/actions/runs/34841417082


## Etapa 7 validada no Mac — 14/09/2026

Resultado definitivo: run [34858660998](https://github.com/lucasgarciamoreira92-rgb/atlaslinhas-validacao-mac/actions/runs/34858660998), fonte `f2a4a75a4e20d2f59b8ef311f0a01e4f56515c41`. Seis cenários do bloco assistente aprovados, zero falhas, instáveis ou ignorados, no MacBook-Air-de-Lucas (darwin 25.6.0, Node v24.21.0). Interface concluída às 14:55:31 UTC (11:55:31 em Brasília), em 14,9 segundos.

Cofre: criação/edição após desbloqueio e clique de salvar, preservação de códigos em edição parcial, consulta externa restrita, limpeza ao fechar/trocar modo/perder foco, campos fora do chat e requisições do assistente, layout 1280/768/390. Os demais cenários relacionados do assistente também passaram. Dados fictícios e temporários; nenhuma chamada OpenAI e nenhuma atualização da instalação diária.

O pedido anterior 34844187032 foi interrompido ao baixar o código, antes dos testes. A rodada 34858174864 revelou nome acessível ambíguo no seletor de conta, corrigido com aria-label explícito. A rodada 34858431174 passou pelos salvamentos e layout, mas revelou falta de Origin na conferência HTTP do teste; corrigida sem alterar a proteção do servidor. O resultado definitivo acima encerra as pendências da etapa 7. Não repetir a suíte por registros históricos de fila/falha. Próxima etapa: integração real da IA ao fluxo com propostas e confirmação.


## Etapa 8 — conversa integrada, validação real do provedor pendente (14/09/2026)

Fonte publicada: `7d0c7fdf4327ae4fbe769147ffd494dca1245058`. A aba Conversa OpenAI agora usa /api/assistant/conversation com histórico do servidor por sessão (30 minutos, memória, máximo de 60 mil caracteres enviados ao provedor), mensagem de até 4 mil caracteres, dez mensagens/minuto por administrador e uma solicitação por vez. Até quatro chamadas sequenciais ao provedor por mensagem, sem retry automático, cada uma com timeout de 25 segundos. A integração usa Responses API, function calling estrito, store:false e reasoning.encrypted_content para continuidade; isso não constitui garantia de retenção zero pelo provedor.

Ferramentas permitidas: consultar linhas/aparelhos, consultar contas/referências, preparar proposta de linha/aparelho, preparar proposta de conta e orientar abertura do Cofre. Não há ferramenta de gravação, aprovação, shell, SQL, navegação ou leitura de segredos. Preparações usam os validadores existentes. Tokens ficam no servidor/painel, fora do contexto do modelo. Mensagem nova invalida a revisão anterior; reset invalida a revisão. O botão Aprovar e salvar chama o endpoint existente com token e confirmação; texto "sim" não grava. A identificação do registro, alterações antes/depois e referências legíveis aparecem no resumo canônico. Digitar uma correção desabilita o botão até enviar/revisar.

O contexto de conversa usa consultas com campos permitidos e metadados de contas, sem colunas do Cofre. As instruções orientam perguntar em caso de ambiguidade, não inventar referências e redirecionar assuntos externos; a qualidade desse comportamento depende do modelo e exige avaliação real. Campos livres não são detector de segredos: o usuário não deve colar credenciais no chat. Segredos digitados no painel protegido seguem exclusivamente para /api/vault. Não houve uso de dados reais ou chave do usuário.

Limites de experiência: chat sem streaming, mostra estado de espera; trocar o modo desmonta a conversa da tela, reabrir começa outra conversa. Após gravação confirmada, o próximo pedido inicia contexto novo no servidor; a tela mantém as mensagens exibidas. A lista principal exige atualização para carregar cadastros novos. Mensagem que falha permanece no campo para correção/reenvio. Piloto administrativo. A instalação diária não é atualizada pelo executor.

Testes de desenvolvimento: TypeScript, build, scripts/test-assistant-conversation.mjs (protocolo mais HTTP/SQLite real) e scripts/test-assistant-config.mjs aprovados. Cobertura de isolamento de sessão, operador bloqueado, ferramenta não permitida, propostas simultâneas recusadas, resumo substituído, descarte, uso único, limite de consultas e erro do provedor. Transporte simulado por preload explícito em tests/e2e/support/openai-stub.mjs; não existe chave de ativação/rota de simulação em produção. Nenhuma simulação das regras de cadastro, banco ou autorização. Fixtures limpam variáveis OpenAI do ambiente para impedir uso acidental de credenciais reais.

Mac de Lucas: [run 34860083632](https://github.com/lucasgarciamoreira92-rgb/atlaslinhas-validacao-mac/actions/runs/34860083632), sete cenários do bloco assistente aprovados, zero falhas/instáveis/ignorados. Final da interface em 14/09/2026 às 15:08:42 UTC (12:08:42 Brasília), 15,6 segundos, darwin 25.6.0 / Node v24.21.0. Novo cenário cria/edita aparelho pelo chat, corrige resumo, exige aprovação e abre Cofre; respostas OpenAI simuladas, sem chamada paga. Fluxos guiados de linhas, contas e Cofre revalidados por relação direta. O primeiro pedido 34859939729 falhou na consulta da main (HTTP 403 GitHub), antes do Mac; repetição passou.

**Pendência da etapa 8:** atualizar a instalação diária, configurar chave/modelo privadamente no painel existente e validar linguagem natural com o provedor real, incluindo ambiguidades, campos faltantes, linhas/chips, contas/métodos com múltiplos destinos, correções e assuntos externos. Não marcar a IA real como validada com o resultado do simulador. Etapa 9: suíte completa somente ao concluir a aplicação.

Referência de implementação: https://developers.openai.com/api/docs/guides/function-calling

## Interface de conversa minimalista — 20/09/2026

Após a primeira configuração, o Atlinhas abre diretamente na conversa. Os atalhos que antes ocupavam o topo foram movidos para o ícone de configurações; Cofre, verificações e cadastro manual continuam acessíveis nessa área. A caixa de mensagem envia com Enter e preserva Shift + Enter para quebra de linha. Nova conversa também virou uma ação compacta no cabeçalho. Antes da primeira configuração, o tutorial continua sendo a tela inicial.

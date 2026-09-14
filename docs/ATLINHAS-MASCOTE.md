# Atlinhas — assistente animado

A prévia visual foi aprovada em 14/09/2026, incluindo a correção do rabinho dos dois balões para a lateral da cabeça, sem sobrepor o rosto.

## Comportamento integrado

- O mascote substitui o botão `+ Assistente`; a área de clique fica estável durante a animação.
- Alterna a pose original e a frontal, gestos pequenos, pausas e acenos ocasionais. Ao passar o mouse ou focar pelo teclado, olha de frente, acena e mostra “Como posso te ajudar?”.
- Clique ou Enter abre o painel real. Escape e o botão de fechar retornam o foco ao mascote.
- O balão termina fora da silhueta da cabeça e permanece abaixo do mascote na ordem das camadas. Sua ponta acompanha a posição atual da cabeça.
- Usa imagens locais e animação de interface; nenhuma chamada à IA é feita para animar o personagem. Temporizadores e observadores são descartados ao desmontar; a sequência pausa quando a aba fica oculta e respeita redução de movimento.
- Quando a IA está configurada, o painel inicia na conversa. Sem configuração, inicia na preparação guiada existente. Os modos de cadastro, verificações, Cofre e configuração permanecem acessíveis.
- O conteúdo demonstrativo da prévia não foi copiado para os fluxos reais. Permissões, revisão/confirmacão, rascunhos e limpeza do Cofre continuam nos componentes existentes.

## Validação e instalação

Preparados dois cenários novos em `tests/e2e/assistant-mascot.spec.ts`: alternância/aceno e curva fora do rosto; teclado, 1280/768/390 px, janela baixa e redução de movimento. Os seletores de abertura dos sete cenários existentes foram atualizados para o nome acessível do mascote.

Executar somente o bloco `assistente` no Mac, após publicar o código com `[skip ci]`, conforme AGENTS.md. Dados temporários; respostas OpenAI simuladas no teste já existente. A suíte completa e chamadas pagas ao provedor não fazem parte desta rodada.

A automação valida uma cópia temporária e não atualiza a instalação diária em `~/Projetos/atlaslinhas`. Nenhum banco, chave de Cofre ou arquivo de configuração privada é alterado por esta entrega visual.

## Retorno

Versão anterior na main: `30950d653ae6befaeb3d218fd68f325536a17614`. A mudança é de interface e não adiciona migração; pode ser revertida por commit e nova compilação, mantendo a pasta de dados.

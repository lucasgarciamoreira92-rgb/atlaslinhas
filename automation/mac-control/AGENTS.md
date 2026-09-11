# Acionar uma validação

1. Verificar que este repositório continua privado e que não há validação em andamento ou pendente. Conferir o executor `atlas-linhas-mac` online.
2. Obter o SHA completo da main de lucasgarciamoreira92-rgb/atlaslinhas a ser validado; não usar branch ou SHA de pull request não aprovado.
3. Ler `requests/atual.json` e atualizar pelo Contents API usando o blob SHA atual. Usar um id novo, bloco solicitado e data UTC atual. Esse commit aciona o workflow; não precisa abrir Codex no Mac.
4. Acompanhar o run do commit que acabou de ser criado. Consultar logs e artefatos `atlas-resumo-*` e `atlas-interface-*`.
5. Informar ambiente, SHA, testes executados, aprovados, falhas e não executados. Não afirmar que rodou no Mac se estiver em fila ou se apenas o job de preparação passou.

Bloco atual: 6. Blocos 1–5 aprovados. Não avançar automaticamente para 7 ou 8. Não escrever sobre falhas na aplicação sem examiná-las; não enfraquecer asserções. Nunca enviar dados reais, credenciais ou o diretório pessoal do Mac a este repositório.

Se o conector do ChatGPT não acessar este repositório privado novo, pedir ao usuário que o habilite nas permissões da conexão GitHub. Não mudar sua visibilidade. Não é necessário compartilhar tokens pelo chat.

# Configuração guiada da IA — Atlas Linhas

Implementação em 14/09/2026. A configuração antiga exigia três campos sem explicar como obter os dados. Agora `Atlinhas → Configurar OpenAI` apresenta um tutorial de primeira vez.

## Fluxo

1. **Conta:** explica a cobrança da API, leva à página de chaves da OpenAI e orienta a criação de uma chave para o Atlas Linhas.
2. **Conectar:** chave protegida, modelo sugerido editável (`gpt-5.4-mini`) e confirmação pela senha do administrador no Atlas. A sugestão não substitui o modelo de uma configuração existente. Uma chave em branco mantém a chave já salva; na primeira configuração ela é obrigatória.
3. **Testar:** configuração salva e conexão testada são estados separados. O botão `Testar conexão` informa antes do clique que pode gerar cobrança. Uma mensagem fixa é enviada ao modelo, sem cadastros, histórico do chat, ferramentas ou Cofre. O teste confirma uma resposta textual básica; a qualidade dos cadastros conversacionais deve ser avaliada em uso.

Após o teste, `Começar a conversar` abre a conversa existente. Também é possível seguir sem testar. `Ver tutorial` reabre as instruções. Nenhuma chamada externa acontece ao abrir, salvar ou reabrir a configuração. O resultado do teste é transitório, referente àquela abertura do painel, não um monitoramento contínuo da OpenAI.

## Proteções e manutenção

- Configuração e teste exclusivos de administrador, com verificação no servidor.
- Senha do Atlas exigida novamente ao alterar chave/modelo; controle de tentativas preservado.
- Chave salva no arquivo privado já existente, com permissões 0600; sem devolvê-la ao navegador, chat ou Git.
- Fechar o painel ou mudar de seção desmonta a configuração e limpa os campos sensíveis ainda preenchidos.
- Teste exige `confirmed: true`; rejeita texto livre e parâmetros extras. Reutiliza limite de frequência e verificação de sessão do transporte existente.
- Mensagens locais para chave recusada, falta de permissão, modelo indisponível, saldo/cota insuficiente e limitação temporária. A resposta bruta do provedor não é exibida.
- Nenhuma migração de banco, alteração de caminho de dados ou alteração nas regras do Cofre.

## Validação

- TypeScript e compilação local aprovados.
- `node scripts/test-assistant-setup.mjs`: teste do servidor com base temporária e transporte simulado, sem chamadas à OpenAI. Confirma autorização, confirmação explícita, manutenção da chave, erros sanitizados e preservação de linhas/aparelhos/contas.
- `tests/e2e/assistant-config.spec.ts`: tutorial, campos em 1280/768/390 px, salvamento sem chamada externa, teste explícito, erros, reabertura e limpeza dos campos. Validar após publicar, no bloco `assistente` do Mac.
- Ativação com uma chave real e avaliação do modelo na conta do usuário dependem do preenchimento local. Os testes automatizados não configuram a instalação de uso diário.

## Referências oficiais consultadas

- [Primeira chamada e criação de chave](https://developers.openai.com/api/docs/quickstart)
- [GPT-5.4 mini: capacidades e preço](https://developers.openai.com/api/docs/models/gpt-5.4-mini)
- [Operação, chaves e cobrança](https://developers.openai.com/api/docs/guides/production-best-practices)

## Atualização no Mac

Encerrar a aplicação de uso diário com Control+C no Terminal em que ela está rodando. Depois:

```bash
cd ~/Projetos/atlaslinhas &&
git pull --ff-only &&
bash scripts/instalar-mac.sh &&
bash scripts/iniciar-mac.sh
```

Abrir http://localhost:4310 e recarregar a página. O inicializador mantém a base existente em `~/Projetos/atlaslinhas/dados`. Não criar novo banco nem redefinir login.

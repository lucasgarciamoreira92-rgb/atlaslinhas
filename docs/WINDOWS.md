# Atlas Linhas no Windows

O pacote Windows x64 mantém o banco fora do programa, em `%LOCALAPPDATA%\AtlasLinhas\dados`. Atualizar o executável não substitui essa pasta.

## Segurança dos dados

- O workflow do GitHub gera somente `AtlasLinhas.exe` sem dados pessoais.
- O banco real, `backup.key` e `vault.key` nunca devem ser enviados ao GitHub.
- No Mac, `scripts/preparar-windows-com-dados.mjs` cria uma cópia consistente do SQLite, remove a configuração da OpenAI e incorpora os dados criptografados a uma cópia do executável.
- O executável privado pede a senha de migração somente na primeira execução e importa os dados se ainda não houver banco no Windows.
- Depois da importação, o executável privado deve ser guardado em local seguro ou eliminado. Atualizações podem usar o executável genérico.

## Gerar o executável privado no Mac

Baixe o artefato genérico produzido pelo workflow e, com o Node 24, execute:

```bash
node scripts/preparar-windows-com-dados.mjs \
  /caminho/AtlasLinhas.exe \
  "$HOME/Projetos/atlaslinhas/dados" \
  "$HOME/Downloads/AtlasLinhas-privado.exe"
```

O comando solicita uma senha com pelo menos dez caracteres. Não use a senha do Atlas. Transfira o arquivo privado ao computador Windows por um meio confiável e informe a senha separadamente.

## Uso no Windows

1. Execute `AtlasLinhas-privado.exe` e informe a senha da migração.
2. O navegador abre `http://localhost:4310` automaticamente.
3. Enquanto o Atlas estiver ativo, haverá um ícone ao lado do relógio do Windows. Use esse ícone para abrir ou encerrar o sistema.
4. O Atlinhas permanece oculto, salvo se o marcador de ativação for criado posteriormente.

O primeiro executável ainda não possui assinatura comercial e o Windows SmartScreen pode pedir confirmação.

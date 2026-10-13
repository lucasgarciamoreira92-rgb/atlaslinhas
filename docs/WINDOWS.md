# Atlas Linhas no Windows

O instalador Windows x64 copia o programa para `%LOCALAPPDATA%\AtlasLinhas`, cria atalhos no menu Iniciar e na Área de Trabalho e mantém o banco em `%LOCALAPPDATA%\AtlasLinhas\dados`. Atualizar o programa não substitui essa pasta.

## Segurança dos dados

- O workflow do GitHub gera somente o executável-base `AtlasLinhas.exe`, sem dados pessoais.
- O banco real, `backup.key` e `vault.key` nunca devem ser enviados ao GitHub.
- No Mac, `scripts/preparar-windows-com-dados.mjs` cria uma cópia consistente do SQLite, remove a configuração da OpenAI e incorpora os dados criptografados a uma cópia do executável.
- O `AtlasLinhas-Setup-Privado.exe` pede a senha de migração somente na primeira instalação e transforma a cópia do banco atual do Mac na base inicial do sistema no Windows.
- Depois da importação, os novos cadastros passam a ser gravados no banco do Windows. Reexecutar ou atualizar o programa nunca substitui um banco já existente.
- Depois da importação, o executável privado deve ser guardado em local seguro ou eliminado. Atualizações podem usar o executável genérico.

## Gerar o executável privado no Mac

Baixe o artefato genérico produzido pelo workflow e, com o Node 24, execute:

```bash
node scripts/preparar-windows-com-dados.mjs \
  /caminho/AtlasLinhas.exe \
  "$HOME/Projetos/atlaslinhas/dados" \
  "$HOME/Downloads/AtlasLinhas-Setup-Privado.exe"
```

O comando solicita uma senha com pelo menos dez caracteres. Não use a senha do Atlas. Transfira o arquivo privado ao computador Windows por um meio confiável e informe a senha separadamente.

## Uso no Windows

1. Execute `AtlasLinhas-Setup-Privado.exe` e informe a senha da migração.
2. O programa é instalado para o usuário atual e cria atalhos no menu Iniciar e na Área de Trabalho.
3. O navegador abre `http://localhost:4310` automaticamente.
4. Enquanto o Atlas estiver ativo, haverá um ícone ao lado do relógio do Windows. Use esse ícone para abrir ou encerrar o sistema.
5. O Atlinhas permanece oculto, salvo se o marcador de ativação for criado posteriormente.

O primeiro executável ainda não possui assinatura comercial e o Windows SmartScreen pode pedir confirmação.

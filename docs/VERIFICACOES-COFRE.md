# Verificações, autenticações e Cofre

Versão inicial para uso e refinamento. Não recebe SMS/e-mails, não gera TOTP e não aprova solicitações em aparelhos. O Atlas mostra os destinos cadastrados e guarda credenciais quando autorizadas.

## Atualizar no Mac

Projeto: `~/Projetos/atlaslinhas`. Dados: `~/AtlasLinhas/dados`, salvo configuração explícita de `ATLAS_DATA_DIR`.

Pare a aplicação no Terminal com Control+C antes de atualizar. Dentro do projeto:

```bash
git pull --ff-only
bash scripts/instalar-mac.sh
bash scripts/iniciar-mac.sh
```

Abra http://localhost:4310. As seções novas são Verificações e autenticações e Cofre. O inventário existente e a identidade visual continuam disponíveis. Nenhum cadastro fictício é inserido na instalação.

## Consulta diária

1. Busque a conta pelo serviço, nome, login, pessoa ou aparelho.
2. Consulte o método preferencial, seus destinos e quem recebe/aprova.
3. Expanda as alternativas ou a recuperação, se necessário.
4. Abra Ver credencial; contas restritas indicam a necessidade de ir ao Cofre.
5. Informe um problema para registrar uma pendência ao responsável. Nenhuma mensagem externa é enviada.

No cadastro de uma linha ou aparelho, Contas vinculadas abre os acessos associados sem sair do cadastro. Ao precisar abrir o Cofre principal, o rascunho do cadastro anterior é preservado e há um botão para voltar.

## Cadastros e vínculos

- Conta = serviço + login, com apelido, setor, responsável e situação do 2FA. Um mesmo e-mail pode ser login de serviços diferentes; a caixa de e-mail tem cadastro próprio.
- Responsável é uma pessoa cadastrada ou um usuário existente. Pessoa sem usuário não recebe login nem permissão ao ser cadastrada.
- Vários métodos por conta; vários destinos por método. Métodos na mesma etapa são alternativas. Etapas diferentes são necessárias em sequência.
- SMS/ligação apontam para a linha. O aparelho atual acompanha o vínculo da linha.
- Autenticador e aprovação apontam diretamente para o aparelho. Mover o chip não transfere esses métodos.
- E-mail aponta para outra conta marcada como caixa de e-mail. Autorrecuperação é recusada; ciclos de recuperação geram pendência.
- Passkey, chave física, recuperação e outros métodos admitem identificação/localização. Chaves TOTP não são armazenadas nem geradas nesta versão.
- Conta pode ser salva sem métodos. O cadastro ficará incompleto, sem afirmar que 2FA está desativado.
- O responsável confere manualmente o cadastro. Alterações no cadastro exigem nova conferência. Relatos não alteram automaticamente a disponibilidade dos destinos.
- Arquivar mantém o histórico e os vínculos. Excluir um aparelho referenciado por autenticação é bloqueado até ajustar o destino.

## Acessos

O administrador gerencia cadastros e políticas. Operadores consultam os metadados permitidos e registram problemas. Em cada credencial, o administrador pode selecionar usuários para consultar, revelar/copiar e editar. Editar não concede automaticamente direito de revelar a senha existente. Administradores desta aplicação local têm administração total do Cofre; não há isolamento de segredos contra administradores do próprio aplicativo ou do Mac.

A visibilidade pode abranger a equipe ou somente pessoas selecionadas. A lista de contas, buscas, atalhos e histórico respeitam a visibilidade. Não conhecer o cadastro não impede consulta de outros destinos autorizados.

Revelar/copiar e editar exigem desbloqueio com a senha do próprio Atlas. O token dura até 60 segundos e está vinculado à sessão, conta, versão, finalidade e escopo. Alterar a conta/credencial revoga os tokens dela. Bloqueio de usuário, saída e troca/redefinição de senha revogam as sessões correspondentes. O servidor confere novamente a autorização em cada uso.

“Somente no Cofre” restringe o fluxo rápido: o endpoint rejeita escopo rápido para essas contas. Abrir a tela do Cofre não aumenta direitos; o mesmo usuário precisa de permissão e de reautenticação. Não se trata de confiar em um parâmetro de tela para conceder acesso.

O conteúdo revelado fica somente em memória e volta a ficar oculto ao fechar, trocar de janela ou expirar. Uma cópia solicitada pelo usuário vai para a área de transferência do sistema e pode permanecer nela. O log registra solicitação de cópia; não afirma que o sistema operacional concluiu a cópia.

## Proteção e backups

- AES-256-GCM, nonce aleatório por gravação e AAD vinculada ao ID da conta e versão da credencial.
- `vault.key`: chave aleatória de 32 bytes, arquivo local com permissão 0600, fora do banco e fora do código. Gerada apenas quando necessário. Estado persistido impede gerar outra chave para um Cofre existente.
- O arquivo assinado de backup contém os metadados e as credenciais criptografadas. Não contém senhas dos usuários do Atlas nem `vault.key`/`backup.key`.
- Recuperar o Cofre exige a chave original. Falta, troca ou corrupção da chave bloqueia a leitura; não limpa o banco nem cria substituta.
- Recuperar um backup novo inclui as contas; preservar uma cópia anterior continua automático. Permissões são intersectadas com as atuais: o backup nunca reabre um acesso revogado. Pode ser necessário autorizar usuários novamente.
- Backups antigos sem módulo de acessos preservam as contas e o Cofre atuais, desde que linhas/aparelhos de destino ainda existam no inventário restaurado.
- Segredos não são emitidos na busca, listagem, CSV ou histórico. O histórico registra atos e alterações de metadados; não registra o conteúdo das credenciais.
- Uma cópia completa da pasta de dados, com a aplicação parada, preserva banco, logins, chaves e arquivos de backup. Uma cópia apenas no mesmo Mac não cobre perda do equipamento.

## Ponto de retorno

Antes desta implementação: `b363c3902307bb36515198eb4d0098c19f2a6339`, branch `rollback/pre-verificacoes-cofre-20260912`.

A migração é adicional; as quatro migrações anteriores não foram modificadas. Se já existir login local, antes de aplicar a migração nova o sistema cria `dados/checkpoints/pre-access-<instante>/`, com snapshot consistente do SQLite, chaves existentes e arquivos de backup. A criação precisa terminar antes de aplicar a migração. Novas instalações vazias não precisam desse checkpoint.

Para uma restauração completa, pare o aplicativo, preserve a pasta de dados atual em outro local, selecione a versão anterior do código e recupere o checkpoint na localização de dados. Não use um arquivo SQLite antigo junto com WAL/SHM posteriores. Verifique login, inventário e integridade antes de retomar. A restauração ao checkpoint não inclui cadastros criados depois dele; mantenha a cópia posterior para recuperar esses dados se necessário.

Voltar apenas o código é diferente de restaurar o banco. Não apague chaves nem edite migrações para forçar a inicialização. Não executar scripts de downgrade automaticamente.

## Verificação desta versão

- `npm run local:build` e `node node_modules/typescript/bin/tsc --noEmit`.
- `npm run local:test`: regressão HTTP/SQLite existente.
- `npm run test:access`: múltiplos destinos, vínculos, conflitos, autorização, tokens por sessão, revogação, expiração, criptografia, backup/restauração, chave ausente e migração de instalação existente.
- `tests/e2e/verificacoes-cofre.spec.ts`: três cenários de interface, usando cadastros feitos pela própria tela; inclui múltiplos aparelhos, problemas/conferência, Cofre/operador/revogação, consulta pela linha e larguras 1280/768/390.
- A suíte completa mantém os blocos anteriores. A expectativa do menu foi atualizada para os dois destinos novos, preservando os três submenus de Configurações.

Execuções em Linux/CI não constituem validação no Mac do usuário. Registrar o ambiente e o commit de cada rodada. Testes nunca utilizam o inventário real.

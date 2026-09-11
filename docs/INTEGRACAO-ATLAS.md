# Entrega para integração ao Atlas

## Objetivo

O usuário validará o módulo localmente no Mac. Depois, o programador responsável integrará este código à instalação Atlas que já existe. Não está prevista a criação de um servidor separado pelo usuário.

Preservar a interface aprovada, o histórico de cada número desde o cadastro, as regras de duplicidade, o controle de slots, a separação entre localização física e uso virtual e os acessos por colaborador.

## Pontos de integração

| Camada | Arquivos | Contrato a preservar |
|---|---|---|
| Interface | `app/atlas-app.tsx`, `app/atlas.css`, `app/atlas-shell.css` | Componente React `AtlasApp`; propriedade `localMode` para acesso local e `onLogout` para encerramento |
| Regras | `lib/atlas.ts`, `lib/registration.ts` | Tipos e validações compartilhados entre cliente e servidor |
| Identidade | `lib/access.ts`, `local/server/identity.ts`, `local/server/auth.ts` | Usuário autenticado com ID estável, nome, e-mail e perfil admin/operator; autorização em toda API |
| HTTP local | `local/server/server.ts` | Rotas `/api/*`, limites de corpo, origem, sessão e servidor ligado somente ao loopback |
| Persistência | `lib/storage.ts`, `local/server/database.ts` | Operações SQL parametrizadas e batches atômicos; D1 é adaptado ao SQLite local |
| Backups | `lib/backup.ts`, `local/server/environment.ts` | Assinatura HMAC, chave persistente, gravação anterior à recuperação, bloqueio por revisão |
| Auditoria | `lib/audit.ts`, `app/api/history/route.ts` | Autor definido no servidor, antes/depois legíveis, paginação e eventos preservados |
| Migrações | `drizzle/*.sql`, `local/server/schema.sql` | Migrações incrementais, checksums e transação; nunca modificar uma aplicada |

O build local substitui `cloudflare:workers` pelo ambiente local e `@/app/chatgpt-auth` pelo adaptador de contexto autenticado. Isso é feito em `local/vite.server.config.ts`, somente no bundle do servidor. O cliente usa `local/vite.client.config.ts`. A aplicação local não lê headers de identidade fornecidos pelo navegador.

## APIs existentes

- `GET /api/me`: usuário e perfil atuais.
- `GET/POST /api/lines`: listagem e criação/edição, versão otimista e histórico atômico.
- `GET/POST /api/settings`: operadoras, locais e aparelhos, com validação dos vínculos existentes.
- `GET /api/history?id=...&cursor=...`: histórico paginado, cursor opaco devolvido pela API.
- `GET/POST /api/team`: equipe, criação/bloqueio/reativação; no modo local, senha inicial e redefinição opcional.
- `GET /api/export`: CSV protegido contra fórmulas.
- `GET/POST /api/backups`: lista/criação; `GET ?id=...` baixa uma cópia.
- `POST /api/restore`: `mode=preview` fornece conferência e token; `mode=restore` exige o mesmo arquivo e token válido.
- `GET /api/auth/status`: informa configuração inicial e presença de sessão.
- `POST /api/auth/setup`, `/login`, `/logout`, `/password`: autenticação própria da versão local.

Os detalhes exatos dos campos estão nos schemas Zod e handlers. Número e custo são normalizados; custos usam centavos, `null` significa valor não informado. Não confundir responsável pela linha com autor autenticado de uma mudança.

## Banco e transações

As migrações 0000–0002 são as originais do módulo. O esquema local acrescenta credenciais, sessões e limitação de tentativas. `local_migrations` guarda os checksums; os arquivos são aplicados ao iniciar o processo. Os testes locais verificam que reiniciar não duplica as migrações nem muda a chave.

Cada cadastro, atualização de aparelho e recuperação conserva a atomicidade entre estado e auditoria. As queries usam SQLite JSON1, `changes()`, `rowid`, triggers e índices únicos; portar para outro banco exige tradução explícita e repetição dos testes de conflito/rollback. Não trocar somente a conexão.

A restauração preserva a equipe e os eventos históricos existentes, mescla eventos ausentes e acrescenta eventos de recuperação. Uma mudança ocorrida depois da análise invalida a confirmação. A cópia de segurança anterior permite desfazer a operação.

## Autenticação no Atlas existente

É possível substituir o login local pela sessão já usada no Atlas. O adaptador deverá obter a identidade confiável no servidor e produzir o contrato de usuário, mantendo a consulta de autorização e os IDs históricos. Não confiar em nome, e-mail, perfil ou ID enviados livremente pelo cliente.

Os endpoints locais de configuração inicial e senhas devem ser desativados quando a identidade passar ao Atlas. As contas locais do piloto não são automaticamente contas do Atlas: estabelecer o mapeamento dos usuários antes de migrar autoria ou permissões.

A versão local tem cookies HttpOnly/SameSite=Strict e exige origem exata para mutações. Ela não fica exposta na rede. Na integração com HTTPS, adaptar hostname, prefixo de rotas, cookie Secure, encerramento de sessão, origem, proxy confiável e política de conteúdo ao ambiente Atlas. Nenhuma dessas mudanças está pré-liberada para produção pelo servidor local.

## Dados para a entrega

Para transferir o piloto completo, parar o aplicativo e copiar `~/AtlasLinhas/dados/` por canal privado. A cópia inclui banco, `backup.key` e backups; **não colocar esses arquivos no GitHub**. O backup JSON da interface não inclui usuários/senhas nem a chave. Guardar a chave original para manter a validação dos backups; assinaturas verificam integridade, não criptografam dados.

O site anterior continua sendo outra instalação. Não há sincronização automática entre site, Mac e Atlas. Se existirem dados reais no site, combinar uma migração separada que preserve a origem e a assinatura.

## Validação antes de integrar

`npm run local:test` executa o servidor real com SQLite e arquivos temporários. Confere autenticação, bloqueio de origem, rotas, cadastro, unicidade, slots, histórico, equipe, exportação, backup/restauração/desfazer, reinício, sessões e limitação de tentativas. Os testes históricos de etapas 4 e 5 cobrem também rollback e falhas de armazenamento simuladas.

Antes do aceite da integração, repetir o roteiro operacional, incluir login real do Atlas, permissões de colaboradores, navegação com prefixo de módulo, uso no celular pela rede e recuperação de uma cópia do piloto. Publicação, compartilhamento e alterações do servidor existente são responsabilidade do programador integrador.

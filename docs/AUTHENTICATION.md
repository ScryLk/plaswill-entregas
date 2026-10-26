# Autenticação GED Nextcloud

## O que foi implementado e o que ainda precisa validação

O usuário informou OAuth2 nativo do Nextcloud (app oauth2 2.0.0), provisioning_api 2.0.0 e grupos existentes. A aplicação agora implementa Authorization Code com cliente confidencial e consulta de identidade OCS via Bearer. Não é OIDC: não há descoberta/JWKS/ID token nem senha corporativa capturada pelo Entregas. O uso da sessão já existente no GED depende do comportamento do Nextcloud; não equivale a implementar logout federado.

O código foi validado com PHP real, provedor OAuth/OCS sintético sobre HTTPS e navegador Chromium, sem acessar a VPS ou o GED real. Credenciais, identificação exata do cliente, callbacks cadastrados e comportamento da versão instalada permanecem pendentes de ensaio administrativo em staging.

## Endpoints

| Finalidade | Endpoint |
|---|---|
| Início local | GET /api/auth_login.php |
| Callback local | GET /api/auth_callback.php |
| Sessão/CSRF | GET /api/auth_session.php |
| Logout local | POST /api/auth_logout.php |
| Autorizar no GED | https://ged.plaswill.tech/apps/oauth2/authorize |
| Trocar código | https://ged.plaswill.tech/apps/oauth2/api/v1/token |
| Identidade | https://ged.plaswill.tech/ocs/v1.php/cloud/user?format=json |
| Grupos do próprio usuário | https://ged.plaswill.tech/ocs/v1.php/cloud/users/{id-URL-encoded}/groups?format=json |

Não presumir que /cloud/user inclua grupos confiáveis. A segunda chamada consulta os grupos do ID autenticado; o ID também deve corresponder ao user_id da resposta de token. As chamadas OCS exigem HTTP 200 e envelope ocs.meta com status ok e statuscode 100/200. Arrays malformados, ID divergente e token inválido não concedem acesso. Somente dados mínimos de identidade são usados; telefone/endereço/perfil retornados pelo GED não são armazenados.

Referências oficiais consultadas no código Nextcloud stable32 (referência de contrato, não evidência da versão instalada):
- https://github.com/nextcloud/server/blob/stable32/apps/oauth2/lib/Controller/OauthApiController.php
- https://github.com/nextcloud/server/blob/stable32/apps/provisioning_api/lib/Controller/UsersController.php
- https://github.com/nextcloud/server/blob/stable32/apps/provisioning_api/appinfo/routes.php

## Configuração e preparação humana

Usar as variáveis do processo ou api/.env ignorado e bloqueado pelo web server, conforme api/.env.example. Variáveis do processo têm precedência. O parser .env não executa shell nem expande variáveis.

- GED_AUTH_TYPE=oauth2 seleciona exclusivamente o fluxo nativo. Não há fallback para gateway ou acesso anônimo quando o provedor falha.
- GED_BASE_URL=https://ged.plaswill.tech, GED_REDIRECT_URI=https://entregas.plaswill.tech/api/auth_callback.php e ENTREGAS_PUBLIC_ORIGIN=https://entregas.plaswill.tech seguem os valores informados.
- GED_CLIENT_ID deve ser o **identificador real atribuído ao cliente OAuth no Nextcloud**, que pode diferir do nome de exibição plaswill-entregas. O valor informado foi salvo apenas como sugestão.
- GED_CLIENT_SECRET deve ser fornecido em mecanismo seguro. Nunca versionar, enviar em chat, logs ou frontend. Nenhum valor real foi recebido ou criado nesta tarefa. O placeholder do pedido não é aceito como segredo válido.
- Conferir o cadastro exato do redirect URI no GED, sem wildcards. Não registrar ou alterar clientes do servidor de produção automaticamente. Para ensaio cloud/staging, o administrador deve autorizar cliente/callback HTTPS próprios; o callback de produção não aponta para este workspace.
- GED_INTERNAL_URL=http://nextcloud não é utilizado: tokens/identidade/grupos só trafegam por HTTPS, com hostname e cadeia de certificados verificados. Não há downgrade se o endereço externo falhar. GED_CA_BUNDLE é uma opção de trust store administrativa para uma CA válida; não desabilita validação. Os testes a usam apenas para a CA temporária do fixture.
- Liberar ged.plaswill.tech na política de saída. O rascunho cloud contém essa adição e o requisito GED_CLIENT_SECRET, sem valor. Salvar/publicar ambiente é diferente de implantar a aplicação e não foi executado pelo agente.

O modo gateway anterior permanece disponível apenas quando selecionado por configuração (default quando GED_AUTH_TYPE está ausente); só confia em REMOTE_USER/REMOTE_GROUPS internos ao web server. Em modo oauth2, esses campos e todos os headers de pseudoidentidade são ignorados. Não usar gateway para contornar falhas do OAuth.

## Permissões efetivas

ENTREGAS_ROLE_GROUPS é configurável e validado; em OAuth o default corresponde à matriz fornecida:

| Perfil | Grupos | Permissões implementadas |
|---|---|---|
| Expedição | Logistica, Producao, admin | Cadastro/busca, DANFE, geocodificação, otimização, despacho, leitura, status, encerramento e gestão do link da rota |
| Supervisão | Comercial, Diretoria, Financeiro | Leitura de rotas e histórico, sem catálogo ou operações de escrita |
| Administração | admin, Diretoria | Todas as permissões existentes; reserva de permissão admin para funcionalidades administrativas futuras |

Papéis são cumulativos: Diretoria e admin têm administração mesmo aparecendo em outros perfis. Comercial e Financeiro isoladamente são somente leitura. A autorização ocorre no backend. Não foram inventados endpoints de limpeza forçada de rotas ou reconfiguração corporativa de bases; esses recursos administrativos ainda não existem e exigem implementação própria. O editor de origem já existente continua sendo uma preferência local do navegador, não um endpoint de configuração corporativa.

O motorista continua usando somente sua capacidade de rota, sem sessão corporativa, sem chamada ao GED e sem acesso ao catálogo ou histórico. Um token Bearer fornecido é validado como capacidade da rota; não pode autorizar outras operações. Leitura e escrita de sessão corporativa são separadas por permissão.

## Sessões e controles

- state aleatório de 256 bits, ligado à sessão, validade de 5 minutos e uso único, inclusive em erro/cancelamento. Sem return_to arbitrário; retorno após login é a raiz HTTPS configurada.
- Rotação do ID de sessão no início do fluxo e após autenticação. PHP strict mode, somente cookies, sem IDs em URL.
- Cookie __Host-plaswill_session: Secure, HttpOnly, SameSite=Lax, Path=/ e sem Domain. Browser real precisa HTTPS; não remover Secure para facilitar desenvolvimento.
- Access token somente no armazenamento de sessão do servidor (ENTREGAS_DATA_DIR/sessions, diretório 0700 fora do document root recomendado), nunca em localStorage ou JSON público. Refresh token descartado. A remoção da sessão não apaga a outbox do motorista nem os rascunhos locais.
- Sessão expira no vencimento do token, por 30 minutos de inatividade ou após 8 horas, o que ocorrer primeiro. O OAuth nativo observado retorna expires_in=3600; nesse caso o teto é 1 hora. Renovação requer novo fluxo de autorização, sem refresh silencioso infinito.
- Identidade e grupos revalidados no GED a cada requisição corporativa; sem cache de privilégios entre requisições. Revogação do token retorna 401, remoção do grupo necessário retorna 403. Falha/timeout/redirecionamento inesperado do provedor retorna 503 sem liberar dados. Isso implica duas chamadas OCS por requisição e dependência de disponibilidade/latência do GED.
- POST corporativo exige Origin exato e nonce X-CSRF-Token vinculado à sessão. O frontend usa session.js; chamadas same-origin ao endpoint de sessão obtêm o nonce. Gateway legado mantém proteção de Origin; capacidades Bearer de motorista não dependem de cookie/CSRF.
- Logout destrói a sessão local e expira cookie; funciona sem chamar o GED, inclusive durante indisponibilidade. Se a página for reaberta durante uma falha, auth_session retorna 503 com um nonce que autoriza somente o logout da sessão local existente, sem retornar usuário/papéis ou liberar APIs. Não é logout global do Nextcloud nem revogação OAuth remota. Revogação pelo administrador no GED continua necessária quando apropriado.

## Limitações antes de produção

O OAuth2 nativo consultado não demonstrou suporte PKCE/scopes granulares: cliente confidencial, segredo protegido, redirect URI exato e state são necessários. Os tokens Nextcloud podem conceder poderes mais amplos que os endpoints Entregas; revisar esse risco na autorização do cliente, restringir o armazenamento e considerar IdP OIDC com escopos adequados futuramente. Não tratar token opaco como JWT.

Aplicar proteção contra brute force/rate limit no ingresso; remover query strings de logs dos endpoints de login/callback, não registrar Authorization, Cookie, Set-Cookie nem corpos de token. O Python local já omite query strings; o servidor PHP embutido não oferece política de log de produção e não deve ser exposto. Configurar web server/FPM para negar acesso direto a auth.php/settings.php e demais arquivos privados. Sem trilha de auditoria central ou garantia de logout federado nesta etapa.

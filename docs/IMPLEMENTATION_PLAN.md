# Estado e continuidade

Implementado localmente: validação central, JSON atômico com lock estável, teste de colisão e concorrência, finalização autoritativa/idempotente, histórico derivado, autorização fail-closed por OAuth2/OCS ou gateway explícito e capacidade de rota, revogação/rotação, outbox persistente com recibos/versões/rebase explícito, shell PWA estático, API PHP compartilhada pelo Python, origem default centralizada e rejeição de posições fabricadas.

Antes de produção:

1. O usuário confirmou OAuth2 nativo e grupos oficiais; Authorization Code + OCS, sessões/CSRF e permissões separadas foram implementados e testados com provider TLS sintético. Administrador deve validar client ID real, segredo, callback HTTPS e versão instalada; ensaiar no GED real. Não há OIDC/JWKS nem logout federado. Ver AUTHENTICATION.md.
2. Matriz de roles fornecida foi aplicada com privilégios cumulativos de Diretoria/admin. Validar duração de tokens e política para legado; reemitir links ativos. Nenhuma liberação anônima por flag de emergência.
3. Validar deny rules do servidor real, limites multipart e rate limits. Avaliar privacidade do repositório e exposições antigas.
4. Ensaiar em staging PHP-FPM com OAuth2 e integrações externas reais autorizadas. O painel já passou regressão Chromium com Leaflet local verificado e DANFE mock: inserção manual, otimização, QR, links, preparação de impressão e histórico. Ainda faltam comparação visual, A4 físico, chamadas externas reais e todas as combinações após despacho; sem teste de produção.
5. Implementar auditoria corporativa, observabilidade e limites de uso Gemini; revisar output IA e cliente legado.
6. Coordenar múltiplas abas com IndexedDB/Web Locks e política de retenção local. Reconciliar eventos de rota encerrada com operador; não apagá-los automaticamente.
7. Resolver duplicação potencial de criação em timeout com chave idempotente e recuperação segura do link; atualmente recibos cobrem atualizações e encerramento.
8. Confirmar ponto físico de saída antes de mudar origem. Auditar coordenadas genéricas legadas; não migrar SQLite sem evidência e plano aprovado.

Não houve deploy, commit, push, PR, acesso à VPS, alteração de credenciais ou dados corporativos. Mudanças estão sujeitas à revisão local e não representam conclusão de todas as fases solicitadas.

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

A implementação local não realizou deploy, acesso à VPS ou alteração de credenciais/dados corporativos. Publicação e revisão de código são etapas separadas da implantação; as pendências listadas continuam aplicáveis.

## Evolução local: gestão de rotinas

Implementado módulo com listagem, criação de rascunhos persistentes, catálogo paginado sem Gemini, seleção múltipla, snapshots de entregas, edição/ordenação/otimização no planner, versões/conflitos, despacho idempotente, progresso/finalização e cancelamento com revogação. Documentação em ROUTINES.md; regressão completa em TEST_PLAN.md. Criação e despacho do novo módulo têm idempotência; a pendência de idempotência da criação avulsa no endpoint save_route.php legado continua distinta.

Próxima etapa externa: revisão e homologação da branch publicada com configuração real do GED, seguidas de autorização específica para eventual ativação em produção. Atualizar allowlist do web server para os dois endpoints públicos e bloquear módulos/dados privados antes de produção. Não há variável nova ou migração obrigatória do legado.

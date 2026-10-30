# Persistência e recuperação

## Fontes e confirmações

| Informação | Fonte autoritativa | Cópia auxiliar / limite |
|---|---|---|
| Clientes disponíveis | Catálogo JSON configurado no backend | Sem integração ERP comprovada; snapshots não atualizam o cadastro |
| Planejamento RUT | ENTREGAS_DATA_DIR/routines/RUT-*.json | plaswill_routine_edit_<RUT> preserva mudanças não confirmadas |
| Execução ROT | ENTREGAS_DATA_DIR/routes/ROT-*.json | Cache local do motorista serve offline; não substitui o servidor |
| Histórico novo | Rotas finalizadas consultadas pela API | Índice legado é lido e deduplicado; não migrado artificialmente |
| Planejamento avulso | Somente este navegador até despacho | plaswill_deliveries_v1 não é salvamento corporativo |
| Envio avulso sem confirmação | Recibo privado no ROT após escrita; chave local antes do envio | plaswill_pending_dispatch_v1 mantém corpo e operation_id para retry |
| Operações offline | Outbox durável por rota até recibo exato | Nunca limpar para resolver conflito |
| Identidade | Sessão OAuth2/OCS ou gateway explícito | Tokens do motorista são capacidades separadas por ROT |

A interface só confirma “Salva no servidor” após resposta válida de rotina, ID esperado e versão compatível. Falha preserva a cópia local e apresenta erro explícito. HTTP 200 sozinho não é confirmação. Quota local e cache ilegível recebem orientação própria, sem substituir dados antigos por [] ou seed.

## Protocolo JSON

storeLock mantém flock sobre arquivo estável .store.lock. Leitura-modificação-escrita usa o mesmo lock. atomicDocument grava temporário no mesmo diretório, valida escrita, fflush/fsync e rename. Erros não sobrescrevem o último documento válido; JSON corrompido gera falha, não “nova lista vazia”.

O diretório pai não recebe fsync explícito: perda elétrica e garantias do storage não foram ensaiadas. Não prometer durabilidade total por passar em teste de reinício. Não executar writers antigos fora do protocolo nem limpar locks de uma aplicação ativa.

ENTREGAS_DATA_DIR é variável efetiva do processo PHP, fora do document root e da release. Não basta gravá-la em api/.env: dataDir a lê via getenv. Volumes/mounts e usuário PHP precisam ser conferidos na VPS. Runtime Python/PHP embutido é apenas desenvolvimento.

## Recuperação segura

1. Falha de save: manter página/cópia, restabelecer sessão ou serviço e repetir; não apagar localStorage.
2. Conflito 409: baixar cópia, carregar servidor e reaplicar somente após conferir/confirmar. Rotina despachada não aceita edição estrutural.
3. Cache ilegível: baixar conteúdo original para revisão restrita; não excluir nem “corrigir” automaticamente.
4. Quota: alterações podem existir só em memória; baixar cópia antes de sair. Não interpretar isso como confirmação do servidor.
5. Envio avulso sem resposta: repetir o mesmo payload/operação. Replay devolve o mesmo ROT sem token bruto; Compartilhar reemite mediante confirmação e revoga o anterior.
6. Corpo diferente de um envio pendente: não gerar outra operação silenciosamente; preservar ambas as cópias para reconciliação e recuperar o envio original.
7. Fila offline 401/403/409 ou rota encerrada: conservar eventos e aparelho; reconciliar com expedição. Nenhuma entrega local deve ser declarada sincronizada sem recibo.
8. Rotina/rota corrompida no servidor: pausar writers, preservar bytes e backup, diagnosticar em cópia isolada e restaurar somente com autorização operacional.

O novo cliente gera operation_id persistente no despacho avulso. Clientes antigos sem o campo continuam compatíveis, mas não recebem garantia de idempotência de criação; atualizar todos os writers. O recibo privado não armazena token bruto. Mudança de usuário/aparelho exige revisar rascunhos pendentes; não reutilizar armazenamento em dispositivo compartilhado sem procedimento.

## Abas e atualização PWA

Motorista usa Web Locks por rota para um único writer. Outras abas e navegadores sem suporte ficam explicitamente somente leitura; HTTPS e navegador compatível são requisitos operacionais. A fila mantém a chave v1, os assets novos usam cache v3, motorista.js?v=5 e outbox.js?v=2. Não há skipWaiting, ativação forçada ou limpeza de outbox. Código antigo não respeita o lock: rollout exige fechar/reabrir abas antigas coordenadamente e conferir as filas sem apagá-las.

## Ensaio executado e adequação

StorageLifecycle testa rotina sintética após reiniciar todos os workers, trocar o diretório de código mantendo o diretório de dados e restaurar backup para outro diretório após corrupção da origem sintética. O documento restaurado é comparado byte a byte; o original corrompido permanece como evidência. Chromium testa reload, fechamento/reabertura e outro navegador autorizado sem cache compartilhado.

Sem evidência de necessidade de migrar armazenamento nesta auditoria. Medir volume, latência p95/p99, tempo de lock, número/tamanho de documentos, escrita concorrente e custo de histórico. Se carga/consultas/auditoria exigirem banco, comparar JSON+índices, SQLite e serviço relacional com migração reversível aprovada. Não migrar por preferência.

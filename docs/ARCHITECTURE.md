# Arquitetura e decisões

## Baseline e compatibilidade

Inspeção em 26/10/2026, HEAD `109c29bedb7f03eee97490c6fad3e3f1d9e00c70`, branch inicial `work`, sem alterações locais. Trabalho em `hardening/seguranca-integridade`; sem commits ou operações remotas. Frontend vanilla, PHP, JSON e Python auxiliar; não havia testes, manifests de dependências ou build. Python 3.12.14 e Node 24.19.0 disponíveis; PHP 8.4.24 instalado separadamente no workspace, com pacotes Debian verificados pelo APT.

Operador: inclusão manual/catálogo/DANFE → geocodificação → nearest neighbor Haversine → despacho → confirmação de status → encerramento → histórico. Motorista: link → cache local → navegação externa → confirmação/desfazer → outbox → servidor → encerramento. Estados `pending` e `delivered`, campos das paradas, arquivos JSON e códigos `ROT-XXXX` preservados. Interface visual, impressão, QR e navegação existentes preservadas; feedback de sincronização acrescentado.

## Persistência

`api/runtime.php` centraliza validação e persistência. Todas as operações compartilham `data/.store.lock` estável, independente do inode substituído. Lock exclusivo cobre leitura, comparação de versão e escrita. Temporário no mesmo diretório, conferência da escrita, fflush/fsync e rename; falhas não geram sucesso. Não usar writers antigos em paralelo. Colisões são verificadas dentro desse lock, com repetição limitada; teste força colisão.

Finalização modifica um único documento autoritativo, a rota. `get_history` combina o índice histórico legado com rotas finalizadas, deduplicando por ID e conservando as últimas 100. Não há segundo write que possa falhar entre rota e índice. O índice legado deixa de receber gravações novas; consumidores externos precisam usar a API. Temporários interrompidos não são lidos; não existe recuperação automática de JSON previamente corrompido. Limite de garantia: fsync do conteúdo não garante durabilidade do rename após perda de energia em todos os filesystems. Usar disco local com flock/rename confiáveis, não NFS sem validação.

Cada parada possui versão. Eventos com operation_id exigem expected_version e guardam recibos na rota (máximo 10.000, sem descartar recibos antigos). Repetição exata recebe o mesmo recibo; payload diferente com mesmo ID recebe 409. Clients legados sem operation_id continuam aceitos, sem garantia de detecção de evento atrasado. Encerramento repetido é idempotente e recusa novas mutações. Criação ainda não é idempotente em caso de resposta perdida: conferir rotas antes de repetir despacho; não alegar exactly-once.

## Servidor local e autenticação

PHP é a implementação única de APIs. Python mantém a entrada local e arquivos estáticos, encaminhando APIs para PHP em loopback. Isso elimina a duplicação insegura (Python antes usava distância euclidiana e não tinha histórico/finalização). `router.php` é necessário no servidor embutido; não substitui regras do Caddy/Apache de produção. PHP 8.2+ com curl é agora dependência local; Python não utiliza mais cgi removido no Python 3.13. Ambos servidores embutidos são exclusivos de desenvolvimento.

A integração OAuth2 nativa posterior usa sessões PHP e consulta OCS HTTPS por requisição; ver [AUTHENTICATION.md](AUTHENTICATION.md). O modo OAuth não confia em REMOTE_USER e separa supervisão somente leitura. Sem credenciais reais, a integração GED continua sem validação externa.

## Offline

Outbox em localStorage, preservando cache existente, para incremento pequeno sem migração IndexedDB. Falha de quota impede alteração otimista; eventos são mantidos até recibo validado. Fila ordenada, reabertura, online/visibility/atualização/timer e backoff limitado a 60s. AbortSignal.timeout limita espera. Conflitos e recusa de acesso suspendem envio; rebase exige confirmação explícita e usa novos IDs/versões. Rota encerrada mantém eventos para revisão humana. Sem merge automático delivered-sobre-pending. Limitação: localStorage não oferece transação entre abas; múltiplas abas do mesmo dispositivo não estão coordenadas. IndexedDB/Web Locks é próxima etapa antes de suportar esse uso.

Service Worker armazena apenas shell do motorista e recursos locais listados. Nada de APIs/tokens no CacheStorage. Atualiza após fechamento das abas, sem skipWaiting e sem apagar outbox. Cache de rotas/tokens localStorage exige política de retenção e limpeza em aparelhos compartilhados. Fontes externas têm fallback; Waze/Maps e mapas externos exigem conectividade.

## Origem e otimização

`origin.json` é fonte do default para frontend e PHP, preservando `-28.2745, -53.5182`. Origem salva no navegador e em cada rota continua válida. As coordenadas alternativas do pedido não foram confirmadas; saída física dos veículos depende de validação operacional. Haversine/nearest neighbor preservado, empate pela ordem original. Endereços duplicados mantêm dispersão apenas na visualização. Coordenadas fora de limites são rejeitadas; frontend deixa de inventar posições aleatórias quando geocodificação falha. DANFE aproximada exige revisão manual. Flags conhecidas de posição aproximada são rejeitadas na otimização; cadastros legados ainda precisam auditoria de qualidade. Não houve mudança para roteamento viário.

## JSON versus SQLite

JSON preserva portabilidade e backup simples, mas lock global serializa writers, histórico escaneia rotas e recibos crescem. SQLite WAL oferece transações multi-recurso, índices e melhores leituras concorrentes, exigindo importação validada, backup consistente de WAL e plano de restauração. Não migrado. Medir latência/volume antes de decidir; migração futura precisa importar IDs e recibos, conferir contagens/hashes e ensaiar rollback dos dados.


## Rotinas persistentes

A gestão separa RUT-<128 bits> (planejamento) de ROT-XXXX (execução/capacidade). Snapshots JSON em data/routines reutilizam storeLock/atomicDocument, com versão otimista e recibos. Despacho/cancelamento recuperam gravações interrompidas usando a rota autoritativa associada; não há migração de banco ou conversão de legado. routines.js conecta o novo catálogo/listagem ao planner existente. Modelo e transições em [ROUTINES.md](ROUTINES.md).

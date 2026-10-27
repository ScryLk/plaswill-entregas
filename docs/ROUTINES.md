# Gestão de Rotinas de Entregas

## Fluxo e interface

A entrada do painel passa a ser **Rotinas de Entregas**, com tabela, pesquisa, período, situação, ordenação e páginas de 20 itens. **Nova Rotina** salva imediatamente um registro vazio no servidor. Nome e data não são chaves: várias rotinas da mesma data são permitidas. A navegação Planejamento mantém o Leaflet e a tabela anteriores; Histórico continua mostrando as rotas finalizadas, inclusive legadas.

1. Nova Rotina → nome, data, origem, motorista/veículo opcionais e observações.
2. Selecionar endereços → pesquisar na base, filtrar município/bairro/coordenadas, marcar clientes em diferentes pesquisas/páginas e conferir selecionados.
3. Conferir → corrigir o snapshot de endereço, geocodificar sob demanda ou informar coordenadas manualmente. Coordenadas não confirmadas não aparecem no mapa e impedem despacho. A base cadastral não é alterada.
4. Adicionar à rotina → gera uma entrega por seleção e salva no servidor. Selecionar novamente um cadastro que já possui entrega sem NF pede confirmação; não se deduplica por latitude/longitude. Duas notas para o mesmo destino são entregas distintas.
5. Planejamento → editar entregas/NFs/volumes/observações, remover, mover para cima/baixo, incluir manualmente ou por DANFE, otimizar, salvar rascunho ou marcar planejada.
6. Despachar Rotina → conferência de data, origem, motorista, veículo, sequência, entregas/destinos e pendências. Só confirma com entregas e endereços/coordenadas válidos.
7. Compartilhar → utiliza apresentação existente de QR/WhatsApp e romaneio A4. Cada rotina mantém sua rota e seu link, sem reutilizar o ID de outra seleção no navegador.
8. Progresso → leitura dos dados persistidos da rota, atualização moderada a cada 30 segundos com página visível e sem edição local pendente. Finalizar reutiliza finish_route.php; cancelamento registra motivo/autor/data sem excluir os documentos.

Selecionados do catálogo vivem em Map por rotina durante a sessão da página, inclusive ao fechar/reabrir o seletor. Confirme a inclusão para persistir entregas no servidor; seleções ainda não confirmadas não sobrevivem a fechar o navegador. Rascunhos confirmados e salvos estão disponíveis em outro computador autorizado. Cache local de edição usa uma chave própria por rotina e não substitui a persistência do servidor.

## Modelo

JSON em `${ENTREGAS_DATA_DIR}/routines/RUT-<32 hex>.json`, com diretório criado sob demanda. ENTREGAS_DATA_DIR continua sendo variável do processo, sem configuração nova. Dados de rotina estão ignorados pelo Git e devem ficar fora do document root em produção.

Campos principais:
- routine_id: 128 bits aleatórios, separado de ROT-XXXX.
- name, scheduled_date (YYYY-MM-DD), origin (snapshot), motorista, veiculo e notes.
- status, version (inteiro), route_id inicialmente null.
- created_by/created_at, updated_by/updated_at, dispatched_by/dispatched_at e metadados de cancelamento/finalização quando aplicáveis.
- stops: ID de entrega único, client_id e address_id opcionais, destinatário, snapshot plano do endereço, NF, resumo, volumes inteiros opcionais, observações, coordenadas e geocoded_by.
- Recibos privados de operações de criação/edição, omitidos das respostas públicas.

O snapshot usa os mesmos campos planos já consumidos pelo mapa/motorista. Não é um ponteiro vivo para companies_db.json: alterações futuras no cadastro não modificam entregas existentes. Destinos distintos são contados pelo endereço normalizado, incluindo número/complemento; entregas são contadas pelos IDs, não pelas coordenadas. Limite de 500 entregas por rotina. Rascunhos podem ter coordenadas null ou não confirmadas; despacho não pode.

## Estados

| Origem | Destino | Condição |
|---|---|---|
| criação | draft | Operador/admin; pode estar vazia |
| draft/planned | draft | Edição de planejamento; alterações locais voltam a rascunho |
| draft/planned | planned | Pelo menos uma entrega, origem/endereço/coordenadas revisados |
| draft/planned | dispatched | Confirmação explícita e validação completa; uma única rota associada |
| dispatched | in_progress | Derivado do primeiro update operacional persistido da rota |
| dispatched/in_progress | finished | finish_route.php; métricas calculadas da rota |
| draft/planned/dispatched/in_progress | cancelled | Motivo obrigatório e confirmação; revoga token se houver rota |
| finished/cancelled | — | Terminal; não permite edição estrutural |

`pending`/`delivered` continuam sendo estados da entrega. No planejamento, as entregas permanecem pending; confirmação de entrega só ocorre após despacho. Progresso é derivado da rota autoritativa. Estados finais são reconciliados com a rotina na leitura, sem duplicar histórico. Não se introduziu um novo estado de entrega.

## APIs

| Endpoint | Método | Permissão |
|---|---|---|
| routine_read.php | GET | Expedição, supervisão e administração |
| routine_write.php | POST | Expedição/admin, com Origin e CSRF conforme autenticação existente |
| search_company.php?mode=catalog | GET | Catálogo: expedição/admin |

Motorista com Bearer da rota não recebe acesso a esses endpoints. O contexto continua sendo a organização corporativa única da aplicação; não foi inventada segregação multiempresa. Os operadores autorizados podem colaborar nas mesmas rotinas, com controle de versão.

GET routine_read.php sem id lista. Parâmetros: q (nome/ID/data ISO ou dd/mm/aaaa), status, from/to ISO, order=asc|desc, page, per_page (máximo 50). Retorna success, results sem stops, total, page e pages. Com id=RUT-... retorna success e routine completa, incluindo progresso, destinos e editable.

POST routine_write.php consolida ações:
- create: operation_id único, name, scheduled_date, origin opcional (default origin.json), motorista/veiculo/notes opcionais. Retorna routine draft, sem rota/token.
- update: routine_id, expected_version, operation_id, metadados completos, stops e status draft|planned. Adicionar/remover/editar/reordenar consiste em enviar o snapshot completo somente enquanto editável.
- dispatch: routine_id e expected_version. Retorna routine, route_id, share_url no primeiro sucesso e replayed.
- cancel: routine_id, expected_version e reason entre 3 e 2000 bytes. Retorna a rotina cancelada com entregas preservadas. Repetição não altera a justificativa original.

Edição obsoleta retorna 409 com code=routine_version_conflict e versão atual. Não é feita sobrescrita silenciosa. Campos inválidos retornam 400; sem autenticação 401; sem permissão 403; ausente 404; método errado 405; persistência corrompida/falha retorna 500 sem detalhes internos. Alterações em rotinas despachadas/finais retornam 409.

Catálogo: mode=catalog, q, city, district, geocoded=yes|no, page, per_page<=50. Retorna results, total, page/pages e facets de municípios/bairros. Pesquisa razão/fantasia/código/rua/bairro/município/CEP. Retorno só contém dados necessários de endereço/referência, sem CNPJ/telefone. Coordenadas genéricas do centro ficam não confirmadas. Esse modo termina antes do código de fallback Gemini: digitação/paginação não consome IA. Busca individual legada continua disponível separadamente.

## Integridade, idempotência e conflitos

Todas as operações usam o mesmo storeLock/atomicDocument do restante da aplicação. Não executar writers antigos sem esse protocolo sobre os mesmos dados.

Criação usa operation_id associado ao ator e fingerprint dos metadados; repetição idêntica retorna a rotina original. Edição usa expected_version e recibo/fingerprint de operation_id. Conflitos preservam o snapshot local: é possível carregar a versão do servidor sem apagar a cópia, reaplicar após confirmação explícita de substituição ou baixar uma cópia para revisão. Reaplicar não é permitido se outra pessoa já tiver despachado/encerrado a rotina. Navegação aguarda também alterações feitas durante um salvamento em andamento.

Despacho mantém o lock durante geração/associação. A rota recebe a referência routine_id antes da escrita atômica, permitindo recuperar o caso de a rota ser salva e a gravação seguinte da rotina falhar. Nova tentativa identifica essa rota e repara a associação, em vez de gerar outra. A busca usa índice de referências construído uma vez por requisição. Rotas com duas associações conflitantes não são escolhidas silenciosamente.

O token bruto não é salvo na rotina. Após perda da primeira resposta/reabertura, um replay confirma a mesma route_id mas pode retornar share_url=null. Nesse caso, Compartilhar oferece reemissão explícita via issue_route_access.php, avisando que o token anterior será revogado. Não se cria outra rota nem se inventa um link sem token.

Cancelamento de rotina despachada grava primeiro status/auditoria/revogação na rota autoritativa e depois na rotina. Se a segunda escrita falhar, a leitura repara o registro a partir da rota. Entregas já concluídas e pendentes não são apagadas. Tokens revogados e novas mutações de rota cancelada são recusados. Não há exclusão física ou liberação anônima de contingência.

## Compatibilidade e implantação

Rotas legadas permanecem consultáveis e aparecem no histórico existente, sem conversão artificial para RUT. Planejamento avulso anterior continua acessível em Planejamento quando nenhuma rotina está selecionada. Inclusão manual, DANFE, busca individual, Leaflet/markers sobrepostos, otimizador, QR, links, A4 e outbox reutilizam os componentes existentes.

Abrir uma rota pelo histórico só troca o contexto após confirmação e resposta válida do servidor; cancelamento ou erro preservam a rotina selecionada. Uma troca concluída limpa o link, WhatsApp e QR Codes anteriores e atualiza a URL da página. A exportação confere origem, caminho e identificador da rota antes de reutilizar um link em memória; um link de outra rota é descartado e a emissão segue as regras do backend, inclusive o bloqueio para rotas encerradas.

Volume é um campo inteiro opcional, aceito no snapshot de rota e exibido no painel/motorista/romaneio quando não existe resumo textual. O shell do motorista passou ao cache v2 e motorista.js?v=4, sem apagar outbox/localStorage nem forçar ativação em abas abertas.

Em produção, adicionar routine_read.php e routine_write.php à allowlist do web server e permitir routines.js/routines.css. Negar catalog.php, routines.php e todo data/routines/. router.php implementa isso apenas no servidor de desenvolvimento. Incluir routines/ e sessões/rotas no plano de backup protegido. Não mover dados operacionais ou aplicar configurações de VPS automaticamente.

Não há dependência nova nem variável obrigatória nova. Permanecem as pendências anteriores de validação GED real, segredos/callbacks, rate limiting/auditoria central, coordenação de abas da outbox e ensaio de produção. O código está publicado na branch de revisão; a implantação em produção não foi realizada nesta implementação.

## Validação manual

1. Execute os testes sintéticos sem internet e sem cadastro real conforme TEST_PLAN.md.
2. Para shell local: ENTREGAS_PHP_BIN=php python3 server.py, ou php -S 127.0.0.1:8085 router.php. APIs exigem autenticação válida; não crie bypass para explorar a interface.
3. Em homologação HTTPS com conta autorizada, abra Rotinas → Nova Rotina. Salve nome/data/origem e selecione clientes em pesquisas e páginas distintas.
4. Confira um endereço sem coordenadas; inclua, edite NF/volumes, duplique conscientemente um destino, remova/reordene, otimize e salve. Reabra em outro navegador autorizado.
5. Edite simultaneamente em dois navegadores e confirme 409 com alterações locais preservadas.
6. Despache, repita a solicitação e confirme a mesma rota. Compartilhe o link autorizado e confira motorista/progresso/finalização.
7. Cancele outra rotina com motivo e confirme revogação, preservação das entregas e ausência de exclusões no histórico.

A implementação e os testes foram realizados localmente. A publicação do código em branch para revisão/homologação não autoriza implantação na VPS; ativação em produção continua sujeita à aprovação específica.


## Arquivos desta evolução

- Backend: `api/auth.php`, `api/catalog.php`, `api/config.php`, `api/finish_route.php`, `api/issue_route_access.php`, `api/routine_read.php`, `api/routine_write.php`, `api/routines.php`, `api/runtime.php`, `api/search_company.php`, `api/update_route_status.php`.
- Interface e runtime: `DEPLOY.md`, `README.md`, `app.js`, `index.html`, `motorista.html`, `motorista.js`, `router.php`, `routines.css`, `routines.js`, `server.py`, `sw.js`.
- Testes: `tests/browser.cjs`, `tests/history-browser.cjs`, `tests/routines-browser.cjs`, `tests/test_api.py`, `tests/test_oauth.py`, `tests/test_routines.py`.
- Documentação e proteção de arquivos: `.gitignore`, `docs/API_CONTRACTS.md`, `docs/ARCHITECTURE.md`, `docs/IMPLEMENTATION_PLAN.md`, `docs/ROUTINES.md`, `docs/SECURITY_REVIEW.md`, `docs/TEST_PLAN.md`.

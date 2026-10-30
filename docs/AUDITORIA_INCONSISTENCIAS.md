# Auditoria de inconsistências — Plaswill Entregas

Data: 30/10/2026. Base: main `c745e436d806742cd886d52aa55a7a8dfa0b8f9e`.
Branch: `fix/auditoria-estabilizacao-entregas`.

## Escopo e evidência

Inspeção do frontend, API PHP, adaptador Python, documentos, PWA, autenticação, persistência, roteamento, testes e histórico disponível no Git. Baseline executado: 26 testes de integração aprovados, incluindo Chromium, antes de adicionar os casos desta auditoria. Isso não detectava os defeitos abaixo.

Somente dados fictícios, diretórios temporários e identidade simulada em routers de teste foram usados. Nenhuma credencial corporativa, cadastro real ou VPS foi utilizada. Seeds foram removidos do código, sem limpar registros existentes. Não houve migração de armazenamento, mudança de visibilidade, reescrita de histórico ou deploy.

O remoto main foi conferido via Git. Consulta HTTP ao domínio e chamadas da API GitHub retornaram bloqueio de rede 403 nesta sessão. A versão efetivamente servida, visibilidade do repositório, mounts, permissões e integrações reais não estão comprovados. Relatórios antigos fornecidos pelo usuário não foram tratados como observação atual.

## Inventário

| ID | Inconsistência | Prioridade | Classificação atual |
|---|---|---|---|
| ENT-001 | Inicialização cria entregas demonstrativas | P0 | Resolvido |
| ENT-002 | Romaneio com identidade e conteúdo não autoritativos | P0 | Resolvido |
| ENT-003 | Consulta e PDF dependiam de emissão de token | P1 | Resolvido |
| ENT-004 | Falha ao carregar rota mostra paradas locais de outra operação | P1 | Resolvido |
| ENT-005 | Cache local corrompido seria substituído pelo seed | P0 | Resolvido |
| ENT-006 | Recibo de rotina inválido removia recuperação | P0 | Resolvido |
| ENT-007 | Falha de planejamento mantinha texto de sucesso | P1 | Resolvido |
| ENT-008 | Emissão assíncrona de link atravessa seleção de rotina | P1 | Resolvido |
| ENT-009 | Repetição de despacho avulso duplica rota | P0 | Resolvido |
| ENT-010 | Finalização com confirmação incompleta limpa a tela | P0 | Resolvido |
| ENT-011 | Quota local falha sem orientação operacional | P1 | Resolvido |
| ENT-012 | DANFE inventa coordenadas e reutiliza endereço por nome | P0 | Resolvido |
| ENT-013 | Edição de endereço mantém coordenadas anteriores | P1 | Resolvido |
| ENT-014 | Submissão manual duplicada e formulário apagado em rejeição | P1 | Resolvido |
| ENT-015 | Pesquisa mistura fontes e pode usar resposta antiga | P2 | Resolvido |
| ENT-016 | Abas concorrentes sobrescrevem outbox | P0 | Resolvido |
| ENT-017 | Recibo de outbox aceita versão impossível | P1 | Resolvido |
| ENT-018 | Fila local inválida e acesso revogado permanecem operacionais | P1 | Resolvido |
| ENT-019 | Persistência desaparece após reinício ou troca de código | P0 | Não reproduzido |
| ENT-020 | Volumes, permissões e versão ativa da VPS desconhecidos | P0 | Dependente do ambiente |
| ENT-021 | Catálogo corporativo permanece versionado | P1 | Confirmado |
| ENT-022 | GED, Gemini e geocodificação reais | P1 | Dependente do ambiente |
| ENT-023 | Durabilidade após queda de energia e capacidade do JSON | P1 | Dependente do ambiente |
| ENT-024 | Auditoria central, rate limit e retenção em aparelhos | P2 | Confirmado |
| ENT-025 | Abas antigas não respeitam exclusão da nova PWA | P1 | Dependente do ambiente |
| ENT-026 | Recibo completo com versão antiga descarta alterações | P0 | Resolvido |
| ENT-027 | Operações avulsas atravessam contexto | P1 | Resolvido |
| ENT-028 | Otimização atrasada substitui outro planejamento | P0 | Resolvido |
| ENT-029 | Histórico atrasado substitui rotina recém-aberta | P1 | Resolvido |
| ENT-030 | Rota avulsa presume motorista e veículo | P1 | Resolvido |

“Resolvido” significa causa confirmada e correção validada em isolamento. Não equivale a produção homologada. “Não reproduzido” não descarta o sintoma observado pelo usuário. Itens dependentes da VPS permanecem bloqueados por dependência externa.

## Registros detalhados

### ENT-001 — Inicialização cria entregas demonstrativas

- **Módulo / arquivo e função:** app.js: init/checkFirstRunSeed.
- **Prioridade / impacto:** P0 — Dados inventados poderiam ser despachados como reais.
- **Classificação / situação:** Resolvido / Corrigido e validado localmente.
- **Passos de reprodução:** Abrir navegador vazio e aguardar planner.ready.
- **Sintoma / resultado encontrado antes:** A lista recebia duas entregas de exemplo e gravava-as no armazenamento local.
- **Resultado esperado / estratégia:** Remoção do seed do fluxo e do código distribuído; nenhum registro já existente foi excluído.
- **Causa-raiz / evidência:** Arquivo de teste novo falhou antes; passou depois.
- **Teste de regressão / verificação:** test_initialization.py: empty.
- **Resultado atual:** Regressão aprovada com dados sintéticos.

### ENT-002 — Romaneio com identidade e conteúdo não autoritativos

- **Módulo / arquivo e função:** app.js: printRomaneio/printDocument; index.html; style.css.
- **Prioridade / impacto:** P0 — Documento operacional incorreto.
- **Classificação / situação:** Resolvido / Corrigido e validado localmente.
- **Passos de reprodução:** Imprimir planejamento local sem rota; ou adulterar deliveries após despacho.
- **Sintoma / resultado encontrado antes:** ROT-0001/data atual/volumes presumidos e paradas locais eram impressos sem leitura do servidor.
- **Resultado esperado / estratégia:** Leitura autorizada de RUT/ROT, validação da associação, data operacional, campos ausentes explícitos e bloqueio de impressão local/não salva.
- **Causa-raiz / evidência:** Antes printCount=1 em vez de 0; depois documentos comparados ao servidor e PDF A4 inspecionado.
- **Teste de regressão / verificação:** test_reports.py / reports-browser.cjs.
- **Resultado atual:** Regressão aprovada com dados sintéticos.

### ENT-003 — Consulta e PDF dependiam de emissão de token

- **Módulo / arquivo e função:** app.js: printReport; index.html: document-actions.
- **Prioridade / impacto:** P1 — Impossibilidade de consultar documentos históricos sem alterar acesso.
- **Classificação / situação:** Resolvido / Corrigido e validado localmente.
- **Passos de reprodução:** Tentar consultar/imprimir uma rotina encerrada pelo modal de compartilhamento.
- **Sintoma / resultado encontrado antes:** A emissão de token era bloqueada e não havia caminho independente para o documento.
- **Resultado esperado / estratégia:** Ações separadas para despacho/compartilhar, romaneio e relatório/PDF; recuperação local claramente nomeada. Impressos não contêm credenciais.
- **Causa-raiz / evidência:** Finalizadas, canceladas, rascunhos e supervisão cobertos; nenhuma emissão de token na impressão.
- **Teste de regressão / verificação:** test_reports.py.
- **Resultado atual:** Regressão aprovada com dados sintéticos.

### ENT-004 — Falha ao carregar rota mostra paradas locais de outra operação

- **Módulo / arquivo e função:** app.js: checkUrlParams.
- **Prioridade / impacto:** P1 — Associação e decisão operacional incorretas.
- **Classificação / situação:** Resolvido / Corrigido e validado localmente.
- **Passos de reprodução:** Ter rascunho local e abrir ?r=ROT-2345 com API 503.
- **Sintoma / resultado encontrado antes:** O identificador era atribuído antes da resposta e as paradas locais permaneciam na tela.
- **Resultado esperado / estratégia:** Validar HTTP/ID/stops antes de aplicar; falha bloqueia contexto e preserva o cache sem apresentá-lo como rota solicitada.
- **Causa-raiz / evidência:** Falhou antes; passou depois com cache byte-preservado.
- **Teste de regressão / verificação:** test_initialization.py: failed-route.
- **Resultado atual:** Regressão aprovada com dados sintéticos.

### ENT-005 — Cache local corrompido seria substituído pelo seed

- **Módulo / arquivo e função:** app.js: loadDeliveries/saveDeliveries/downloadLocalRecovery.
- **Prioridade / impacto:** P0 — Perda da única cópia de alterações locais.
- **Classificação / situação:** Resolvido / Corrigido e validado localmente.
- **Passos de reprodução:** Gravar JSON inválido no rascunho local e abrir painel.
- **Sintoma / resultado encontrado antes:** loadDeliveries retornava [] e o seed sobrescrevia o conteúdo original.
- **Resultado esperado / estratégia:** Não sobrescrever cache ilegível; aviso e cópia local para revisão. Nenhuma limpeza automática.
- **Causa-raiz / evidência:** Falhou antes; passou depois mantendo o conteúdo original.
- **Teste de regressão / verificação:** test_initialization.py: corrupt.
- **Resultado atual:** Regressão aprovada com dados sintéticos.

### ENT-006 — Recibo de rotina inválido removia recuperação

- **Módulo / arquivo e função:** routines.js: api/save/confirmedRoutine.
- **Prioridade / impacto:** P0 — Falsa confirmação e perda de alterações.
- **Classificação / situação:** Resolvido / Corrigido e validado localmente.
- **Passos de reprodução:** Editar rotina e interceptar HTTP 200 com success=true sem routine.
- **Sintoma / resultado encontrado antes:** save removia o cache antes de validar a resposta e depois falhava.
- **Resultado esperado / estratégia:** Confirmação explícita, identidade/esquema/versão antes de aplicar ou remover recuperação.
- **Causa-raiz / evidência:** Antes cache-preservado=false; depois true.
- **Teste de regressão / verificação:** test_persistence_audit.py / persistence-browser.cjs.
- **Resultado atual:** Regressão aprovada com dados sintéticos.

### ENT-007 — Falha de planejamento mantinha texto de sucesso

- **Módulo / arquivo e função:** routines.js: save/bar.
- **Prioridade / impacto:** P1 — Operador interpreta edição malsucedida como confirmada.
- **Classificação / situação:** Resolvido / Corrigido e validado localmente.
- **Passos de reprodução:** Solicitar planned em rotina sem dirty e simular falha de API.
- **Sintoma / resultado encontrado antes:** A barra continuava mostrando Salva no servidor.
- **Resultado esperado / estratégia:** Estado explícito de erro, cópia local preservada e polling suspenso enquanto existe recuperação.
- **Causa-raiz / evidência:** Regressão verifica a mensagem Não foi possível salvar.
- **Teste de regressão / verificação:** test_persistence_audit.py.
- **Resultado atual:** Regressão aprovada com dados sintéticos.

### ENT-008 — Emissão assíncrona de link atravessa seleção de rotina

- **Módulo / arquivo e função:** routines.js: share/ensureSaved/dispatch/finish/cancel.
- **Prioridade / impacto:** P1 — Link de outra rota associado à seleção.
- **Classificação / situação:** Resolvido / Corrigido e validado localmente.
- **Passos de reprodução:** Atrasar issue_route_access de A e tentar abrir B.
- **Sintoma / resultado encontrado antes:** A emissão podia concluir com this.current apontando para outra rotina.
- **Resultado esperado / estratégia:** Captura do contexto, bloqueio de navegação durante operação e validação do URL/token da rota.
- **Causa-raiz / evidência:** Baseline permitia navegação (true em vez de false); corrigido aguarda a operação.
- **Teste de regressão / verificação:** test_persistence_audit.py.
- **Resultado atual:** Regressão aprovada com dados sintéticos.

### ENT-009 — Repetição de despacho avulso duplica rota

- **Módulo / arquivo e função:** api/save_route.php; api/runtime.php: createRoute; app.js: saveLegacyRoute.
- **Prioridade / impacto:** P0 — Duplicação logística.
- **Classificação / situação:** Resolvido / Corrigido e validado localmente.
- **Passos de reprodução:** Repetir save_route com mesmo operation_id após perda de resposta; inclusive após reload.
- **Sintoma / resultado encontrado antes:** Três pedidos simultâneos criavam três ROT.
- **Resultado esperado / estratégia:** Recibo privado atômico por ator/operação; conflito se payload divergir; chave persistida no navegador antes de enviar. Replay não inventa token.
- **Causa-raiz / evidência:** Antes 3 IDs; depois 1, inclusive resposta perdida/reabertura.
- **Teste de regressão / verificação:** test_legacy_idempotency.py; test_initialization.py: legacy-retry.
- **Resultado atual:** Regressão aprovada com dados sintéticos.

### ENT-010 — Finalização com confirmação incompleta limpa a tela

- **Módulo / arquivo e função:** app.js: confirmFinishRotina.
- **Prioridade / impacto:** P0 — Perda local e falsa confirmação de encerramento.
- **Classificação / situação:** Resolvido / Corrigido e validado localmente.
- **Passos de reprodução:** Responder finish_route com apenas success=true.
- **Sintoma / resultado encontrado antes:** O cliente limpava paradas e identificador sem conferir recibo.
- **Resultado esperado / estratégia:** Exigir identidade da rota e contagens coerentes antes de limpar; impedir reentrada.
- **Causa-raiz / evidência:** App baseline servido em fixture isolado falhou; versão corrigida preserva dados.
- **Teste de regressão / verificação:** test_initialization.py: finish-ack.
- **Resultado atual:** Regressão aprovada com dados sintéticos.

### ENT-011 — Quota local falha sem orientação operacional

- **Módulo / arquivo e função:** app.js: saveDeliveries/showLocalStorageState.
- **Prioridade / impacto:** P1 — Alterações perdidas ao fechar sem perceber.
- **Classificação / situação:** Resolvido / Corrigido e validado localmente.
- **Passos de reprodução:** Simular QuotaExceededError ao salvar uma entrega.
- **Sintoma / resultado encontrado antes:** Falha aparecia somente no console.
- **Resultado esperado / estratégia:** Aviso persistente de conteúdo apenas em memória, opção de cópia e proteção de saída.
- **Causa-raiz / evidência:** Baseline sem indicador falhou; versão corrigida conserva memória e cache anterior.
- **Teste de regressão / verificação:** test_initialization.py: quota.
- **Resultado atual:** Regressão aprovada com dados sintéticos.

### ENT-012 — DANFE inventa coordenadas e reutiliza endereço por nome

- **Módulo / arquivo e função:** api/process_danfe.php; api/danfe_delivery.php; api/geocode.php.
- **Prioridade / impacto:** P0 — Entrega direcionada a localização inventada.
- **Classificação / situação:** Resolvido / Corrigido e validado localmente.
- **Passos de reprodução:** Geocodificação falha ou nome semelhante aparece em endereço diferente.
- **Sintoma / resultado encontrado antes:** Jitter do centro da cidade e matching parcial produziam localização indevida; cidade/UF podiam ser presumidas.
- **Resultado esperado / estratégia:** Coordenadas null em falha, matching nome+endereço, validação dos campos e proveniência danfe_ai/needs_review.
- **Causa-raiz / evidência:** Cinco testes iniciais produziram sete falhas; seis casos finais passam.
- **Teste de regressão / verificação:** test_danfe_suggestions.py.
- **Resultado atual:** Regressão aprovada com dados sintéticos.

### ENT-013 — Edição de endereço mantém coordenadas anteriores

- **Módulo / arquivo e função:** app.js: manual/DANFE/edit; index.html.
- **Prioridade / impacto:** P1 — Destino incorreto apesar de texto corrigido.
- **Classificação / situação:** Resolvido / Corrigido e validado localmente.
- **Passos de reprodução:** Selecionar cadastro/DANFE, editar rua e confirmar.
- **Sintoma / resultado encontrado antes:** Coordenadas do endereço antigo permaneciam.
- **Resultado esperado / estratégia:** Invalidar localização quando o endereço muda e exigir nova geocodificação/conferência.
- **Causa-raiz / evidência:** Regressões falharam antes e passaram depois.
- **Teste de regressão / verificação:** catalog-flows.test.js; test_catalog_audit.py.
- **Resultado atual:** Regressão aprovada com dados sintéticos.

### ENT-014 — Submissão manual duplicada e formulário apagado em rejeição

- **Módulo / arquivo e função:** app.js: submitManualDelivery/addDelivery/confirmDanfeImport.
- **Prioridade / impacto:** P1 — Duplicação ou retrabalho com perda de preenchimento.
- **Classificação / situação:** Resolvido / Corrigido e validado localmente.
- **Passos de reprodução:** Duplo envio durante geocodificação; tentar incluir numa rota bloqueada.
- **Sintoma / resultado encontrado antes:** Podiam surgir duas entregas; formulário era limpo mesmo quando addDelivery rejeitava.
- **Resultado esperado / estratégia:** Exclusão do envio em andamento e retorno booleano de inclusão; preservar campos em rejeição.
- **Causa-raiz / evidência:** Casos antes falhos agora aprovados.
- **Teste de regressão / verificação:** catalog-flows.test.js; test_catalog_audit.py.
- **Resultado atual:** Regressão aprovada com dados sintéticos.

### ENT-015 — Pesquisa mistura fontes e pode usar resposta antiga

- **Módulo / arquivo e função:** app.js: handleSearchInput/searchCompanies; api/search_company.php/catalog.php.
- **Prioridade / impacto:** P2 — Cliente ou endereço selecionado incorretamente.
- **Classificação / situação:** Resolvido / Corrigido e validado localmente.
- **Passos de reprodução:** Digitar pesquisas sucessivas; selecionar sugestão de IA.
- **Sintoma / resultado encontrado antes:** Sem descarte de respostas antigas; sugestão e catálogo eram apresentados de forma equivalente.
- **Resultado esperado / estratégia:** Cancelamento/sequência, catálogo como padrão, IA somente por ai=1, proveniência e conferência. Sem alegar CRUD/integracão ERP inexistente.
- **Causa-raiz / evidência:** Navegador e testes de fluxo aprovados; nenhum endpoint ERP foi inventado.
- **Teste de regressão / verificação:** catalog-flows.test.js; test_catalog_audit.py.
- **Resultado atual:** Regressão aprovada com dados sintéticos.

### ENT-016 — Abas concorrentes sobrescrevem outbox

- **Módulo / arquivo e função:** motorista.js: claimOutbox/releaseOutbox; outbox.js.
- **Prioridade / impacto:** P0 — Perda de comprovações de entrega offline.
- **Classificação / situação:** Resolvido / Corrigido e validado localmente.
- **Passos de reprodução:** Abrir duas abas da mesma rota offline; enfileirar A em uma e B na outra.
- **Sintoma / resultado encontrado antes:** A fila durável guardava somente B.
- **Resultado esperado / estratégia:** Um writer por rota via Web Locks; abas secundárias somente leitura; handoff preserva fila. Sem suporte a locks, somente leitura explícita.
- **Causa-raiz / evidência:** Baseline durable=[B], esperado [A]; novo teste preserva A/B e ciclo de página.
- **Teste de regressão / verificação:** test_pwa.py / pwa-browser.cjs.
- **Resultado atual:** Regressão aprovada com dados sintéticos.

### ENT-017 — Recibo de outbox aceita versão impossível

- **Módulo / arquivo e função:** outbox.js: flush.
- **Prioridade / impacto:** P1 — Confirmação de sincronização indevida.
- **Classificação / situação:** Resolvido / Corrigido e validado localmente.
- **Passos de reprodução:** Responder uma operação com ID correto e versão -1,0 ou arbitrária.
- **Sintoma / resultado encontrado antes:** Qualquer inteiro era aceito e o evento removido.
- **Resultado esperado / estratégia:** Conferir versão exata da transição esperada antes de remover o evento.
- **Causa-raiz / evidência:** Dois novos casos falharam no baseline; suíte agora inclui 13 casos.
- **Teste de regressão / verificação:** outbox.test.js.
- **Resultado atual:** Regressão aprovada com dados sintéticos.

### ENT-018 — Fila local inválida e acesso revogado permanecem operacionais

- **Módulo / arquivo e função:** outbox.js: reload; motorista.js: loadRoute/showError.
- **Prioridade / impacto:** P1 — Operação indevida e confusão de acesso.
- **Classificação / situação:** Resolvido / Corrigido e validado localmente.
- **Passos de reprodução:** Abrir fila inválida; revogar token e recarregar/abrir offline.
- **Sintoma / resultado encontrado antes:** Fila malformada sem orientação; após 403 cards ainda apareciam.
- **Resultado esperado / estratégia:** Validar fila sem apagá-la, ocultar operação após recusa conhecida e preservar eventos para reconciliação.
- **Causa-raiz / evidência:** Baseline tinha um card após revogação; corrigido zero, inclusive reabertura offline.
- **Teste de regressão / verificação:** test_pwa.py; outbox.test.js.
- **Resultado atual:** Regressão aprovada com dados sintéticos.

### ENT-019 — Persistência desaparece após reinício ou troca de código

- **Módulo / arquivo e função:** api/runtime.php; tests/test_persistence_audit.py.
- **Prioridade / impacto:** P0 — Sintoma de produção pode depender do ambiente.
- **Classificação / situação:** Não reproduzido / Revisão ou acompanhamento necessário.
- **Passos de reprodução:** Criar/salvar, reiniciar workers e executar outro diretório de código mantendo ENTREGAS_DATA_DIR.
- **Sintoma / resultado encontrado antes:** O teste local recuperou o documento íntegro; não reproduziu perda pelo protocolo JSON.
- **Resultado esperado / estratégia:** Preservar JSON/flock/atomicidade. Validar configuração da VPS separadamente.
- **Causa-raiz / evidência:** Reinício, código em outro diretório e backup/restauração sintéticos passaram.
- **Teste de regressão / verificação:** StorageLifecycle.
- **Resultado atual:** Reinício, código em outro diretório e backup/restauração sintéticos passaram.

### ENT-020 — Volumes, permissões e versão ativa da VPS desconhecidos

- **Módulo / arquivo e função:** DEPLOY.md; server.py; docs/PLANO_HOMOLOGACAO.md.
- **Prioridade / impacto:** P0 — Dados podem estar dentro de release/volume efêmero.
- **Classificação / situação:** Dependente do ambiente / Bloqueado por dependência externa.
- **Passos de reprodução:** Conferir checkout, pasta servida, SetEnv, mounts e conta PHP na VPS autorizada.
- **Sintoma / resultado encontrado antes:** Domínio público e API GitHub bloquearam acesso de rede nesta sessão; VPS não foi acessada.
- **Resultado esperado / estratégia:** Homologação externa com inventário seguro, backup restaurável e writers controlados.
- **Causa-raiz / evidência:** Relatórios anteriores do usuário são contexto, não comprovação atual.
- **Teste de regressão / verificação:** Checklist externo.
- **Resultado atual:** Relatórios anteriores do usuário são contexto, não comprovação atual.

### ENT-021 — Catálogo corporativo permanece versionado

- **Módulo / arquivo e função:** api/companies_db.json; api/street_coords_cache.json; SECURITY_REVIEW.md.
- **Prioridade / impacto:** P1 — Possível divulgação por repositório/cópias; HTTP deny não protege Git.
- **Classificação / situação:** Confirmado / Revisão ou acompanhamento necessário.
- **Passos de reprodução:** git ls-files api/companies_db.json api/street_coords_cache.json.
- **Sintoma / resultado encontrado antes:** Arquivos continuam rastreados pelo Git; visibilidade pública atual não pôde ser consultada.
- **Resultado esperado / estratégia:** Revisão de privacidade/segregação sob aprovação. Não apagar nem reescrever histórico nesta auditoria.
- **Causa-raiz / evidência:** Nenhum registro real foi copiado para fixtures; bloqueio local de JSON continua testado.
- **Teste de regressão / verificação:** Teste de HTTP privado e whitelist.
- **Resultado atual:** Nenhum registro real foi copiado para fixtures; bloqueio local de JSON continua testado.

### ENT-022 — GED, Gemini e geocodificação reais

- **Módulo / arquivo e função:** api/auth.php; docs/AUTHENTICATION.md.
- **Prioridade / impacto:** P1 — Disponibilidade e compatibilidade operacional.
- **Classificação / situação:** Dependente do ambiente / Bloqueado por dependência externa.
- **Passos de reprodução:** Ensaiar login/callback/grupos/revogação e provedores em staging autorizado.
- **Sintoma / resultado encontrado antes:** Suítes usam provider HTTPS e dados sintéticos; não há validação real nesta sessão.
- **Resultado esperado / estratégia:** Segredos fora do código, callback próprio de staging, contas autorizadas e testes externos documentados.
- **Causa-raiz / evidência:** Regressões OAuth existentes preservadas; não equivalem a homologação do GED.
- **Teste de regressão / verificação:** test_oauth.py e plano externo.
- **Resultado atual:** Regressões OAuth existentes preservadas; não equivalem a homologação do GED.

### ENT-023 — Durabilidade após queda de energia e capacidade do JSON

- **Módulo / arquivo e função:** api/runtime.php: atomicDocument/storeLock.
- **Prioridade / impacto:** P1 — Janela de durabilidade e serialização global dependem do storage/carga.
- **Classificação / situação:** Dependente do ambiente / Bloqueado por dependência externa.
- **Passos de reprodução:** Avaliar filesystem, volume, fsync e carga concorrente.
- **Sintoma / resultado encontrado antes:** Arquivo temporário usa fsync+rename; diretório pai não recebe fsync explícito. Carga real e power-loss não foram ensaiados.
- **Resultado esperado / estratégia:** Manter protocolo; medir lock/latência/tamanho, testar storage/backup. Sem justificativa para migração automática.
- **Causa-raiz / evidência:** Falha de escrita preserva original; não comprova durabilidade contra queda elétrica.
- **Teste de regressão / verificação:** test_api.py e StorageLifecycle.
- **Resultado atual:** Falha de escrita preserva original; não comprova durabilidade contra queda elétrica.

### ENT-024 — Auditoria central, rate limit e retenção em aparelhos

- **Módulo / arquivo e função:** docs/SECURITY_REVIEW.md; api/auth.php; outbox.js.
- **Prioridade / impacto:** P2 — Consumo externo, rastreabilidade e privacidade.
- **Classificação / situação:** Confirmado / Revisão ou acompanhamento necessário.
- **Passos de reprodução:** Revisão dos controles existentes e documentação de segurança.
- **Sintoma / resultado encontrado antes:** Não há trilha append-only, quotas globais no app ou política técnica automática de retenção.
- **Resultado esperado / estratégia:** Definir gateway/quota/logs mínimos sem tokens, destino/retenção e processo para dispositivos compartilhados.
- **Causa-raiz / evidência:** Não foram adicionados controles fictícios nem apagados caches.
- **Teste de regressão / verificação:** Plano de homologação.
- **Resultado atual:** Não foram adicionados controles fictícios nem apagados caches.

### ENT-025 — Abas antigas não respeitam exclusão da nova PWA

- **Módulo / arquivo e função:** sw.js; motorista.html; docs/PLANO_HOMOLOGACAO.md.
- **Prioridade / impacto:** P1 — Mistura de versões pode reintroduzir concorrência.
- **Classificação / situação:** Dependente do ambiente / Bloqueado por dependência externa.
- **Passos de reprodução:** Manter código antigo aberto durante atualização.
- **Sintoma / resultado encontrado antes:** Web Locks não impede writers antigos que não o utilizam.
- **Resultado esperado / estratégia:** Encerrar/reabrir todas as abas antigas coordenadamente, preservar/reconciliar filas e validar versão nova; sem skipWaiting ou limpeza de armazenamento.
- **Causa-raiz / evidência:** Shell atualizado ao cache v3; migração operacional exige validação externa.
- **Teste de regressão / verificação:** test_pwa.py e checklist externo.
- **Resultado atual:** Shell atualizado ao cache v3; migração operacional exige validação externa.

### ENT-026 — Recibo completo com versão antiga descarta alterações

- **Módulo / arquivo e função:** routines.js: api/save.
- **Prioridade / impacto:** P0 — Perda de alterações e falsa confirmação.
- **Classificação / situação:** Resolvido / Corrigido e validado localmente.
- **Passos de reprodução:** Editar rotina e devolver HTTP 200 com snapshot anterior completo e mesma versão.
- **Sintoma / resultado encontrado antes:** Snapshot antigo era aceito e a recuperação removida.
- **Resultado esperado / estratégia:** Exigir versão maior que expected_version antes de aplicar ou remover a cópia.
- **Causa-raiz / evidência:** Regressão falhou antes e passou depois.
- **Teste de regressão / verificação:** persistence-browser.cjs.
- **Resultado atual:** Regressão aprovada com dados sintéticos.

### ENT-027 — Operações avulsas atravessam contexto

- **Módulo / arquivo e função:** routines.js: ensureSaved; app.js: operações legadas.
- **Prioridade / impacto:** P1 — Link ou confirmação associados à seleção incorreta.
- **Classificação / situação:** Resolvido / Corrigido e validado localmente.
- **Passos de reprodução:** Atrasar save_route, issue_route_access ou finish_route e abrir outra rotina.
- **Sintoma / resultado encontrado antes:** Operações legadas não bloqueavam navegação de rotinas.
- **Resultado esperado / estratégia:** Bloquear navegação/edição até concluir a operação legada.
- **Causa-raiz / evidência:** Antes navegação=true, esperado false; três endpoints agora cobertos.
- **Teste de regressão / verificação:** test_initialization.py: legacy-context.
- **Resultado atual:** Regressão aprovada com dados sintéticos.

### ENT-028 — Otimização atrasada substitui outro planejamento

- **Módulo / arquivo e função:** app.js: optimizeSequence/planningContext.
- **Prioridade / impacto:** P0 — Mistura de entregas e possível sobrescrita.
- **Classificação / situação:** Resolvido / Corrigido e validado localmente.
- **Passos de reprodução:** Otimizar A e abrir B ou editar A durante a espera; responder sucesso/falha.
- **Sintoma / resultado encontrado antes:** Resposta ou fallback usava contexto corrente e podia substituir B.
- **Resultado esperado / estratégia:** Capturar contexto/snapshot, descartar resultado/fallback obsoleto e bloquear sobreposição.
- **Causa-raiz / evidência:** Antes paradas de A substituíam B; depois troca/edição/fallback preservados.
- **Teste de regressão / verificação:** test_initialization.py: optimizer-context.
- **Resultado atual:** Regressão aprovada com dados sintéticos.

### ENT-029 — Histórico atrasado substitui rotina recém-aberta

- **Módulo / arquivo e função:** app.js: loadArchivedRoute/planningContext.
- **Prioridade / impacto:** P1 — Navegação e contexto incoerentes.
- **Classificação / situação:** Resolvido / Corrigido e validado localmente.
- **Passos de reprodução:** Consultar histórico A, abrir B e responder A.
- **Sintoma / resultado encontrado antes:** beforeApply limpava a seleção nova sem validar contexto.
- **Resultado esperado / estratégia:** Validar snapshot e sequência antes de aplicar.
- **Causa-raiz / evidência:** Antes manager.current era limpo após B aberta; depois resposta antiga descartada.
- **Teste de regressão / verificação:** test_initialization.py: archive-context.
- **Resultado atual:** Regressão aprovada com dados sintéticos.

### ENT-030 — Rota avulsa presume motorista e veículo

- **Módulo / arquivo e função:** api/runtime.php: createRoute.
- **Prioridade / impacto:** P1 — Metadados presumidos no relatório.
- **Classificação / situação:** Resolvido / Corrigido e validado localmente.
- **Passos de reprodução:** Criar save_route sem motorista/veiculo e ler o documento.
- **Sintoma / resultado encontrado antes:** Backend atribuía motorista genérico e tipo de veículo.
- **Resultado esperado / estratégia:** Campos vazios quando ausentes; documento apresenta Não informado.
- **Causa-raiz / evidência:** Antes valor genérico; depois ausência preservada.
- **Teste de regressão / verificação:** test_legacy_idempotency.py: absent_driver_and_vehicle.
- **Resultado atual:** Regressão aprovada com dados sintéticos.


## Armazenamento e cadastros

Não foi demonstrada necessidade de substituir JSON por preferência arquitetural. O lock estável e a escrita atômica existentes foram preservados. Consultas de rotinas/histórico fazem varreduras e o lock é global: medir p95/p99, duração do lock, bytes/documento, cardinalidade e taxa de escrita antes de decidir sobre índices ou banco. Não houve benchmark de produção. Critérios e limites em PERSISTENCIA_E_RECUPERACAO.md.

O catálogo local é a fonte disponível no código; não foi localizada integração cadastral real com SGE/GED. OAuth/OCS fornece identidade e grupos, não CRUD de clientes. Editar uma entrega altera seu snapshot, não o cadastro corporativo. Não se inventaram endpoints ou tabelas.

## Dados antigos possivelmente demonstrativos

Não excluir por nome, coordenada ou aparência. Em ambiente autorizado, inventariar apenas contagens e referências dos IDs de seed conhecidos, com acesso restrito, preservando documentos originais e histórico. IDs suspeitos são indícios, não autorização de exclusão. Revisar origem e evidências com expedição; eventual marcação/quarentena deve ser aprovada e reversível. Nenhum inventário de produção ou limpeza foi realizado nesta tarefa.

## Documentos, evidências e continuidade

- [Matriz de regressão](MATRIZ_REGRESSAO.md).
- [Persistência e recuperação](PERSISTENCIA_E_RECUPERACAO.md).
- [Plano de homologação, publicação e rollback](PLANO_HOMOLOGACAO.md).
- Evidências visuais em evidencias/: somente dados sintéticos, sem tokens.
- A integração desta branch depende da revisão do PR; não realizar merge automático.

## Arquivos da entrega

- `DEPLOY.md`
- `README.md`
- `api/catalog.php`
- `api/danfe_delivery.php`
- `api/geocode.php`
- `api/process_danfe.php`
- `api/routines.php`
- `api/runtime.php`
- `api/save_route.php`
- `api/search_company.php`
- `app.js`
- `docs/API_CONTRACTS.md`
- `docs/AUDITORIA_INCONSISTENCIAS.md`
- `docs/MATRIZ_REGRESSAO.md`
- `docs/PERSISTENCIA_E_RECUPERACAO.md`
- `docs/PLANO_HOMOLOGACAO.md`
- `docs/ROUTINES.md`
- `docs/SECURITY_REVIEW.md`
- `docs/TEST_PLAN.md`
- `docs/evidencias/catalogo.png`
- `docs/evidencias/persistencia.png`
- `docs/evidencias/relatorio-a4.png`
- `docs/evidencias/relatorio-sintetico.pdf`
- `index.html`
- `motorista.html`
- `motorista.js`
- `outbox.js`
- `routines.js`
- `style.css`
- `sw.js`
- `tests/browser.cjs`
- `tests/catalog-browser.cjs`
- `tests/catalog-flows.test.js`
- `tests/initialization-browser.cjs`
- `tests/outbox.test.js`
- `tests/persistence-browser.cjs`
- `tests/pwa-browser.cjs`
- `tests/reports-browser.cjs`
- `tests/test_catalog_audit.py`
- `tests/test_danfe_suggestions.py`
- `tests/test_initialization.py`
- `tests/test_legacy_idempotency.py`
- `tests/test_persistence_audit.py`
- `tests/test_pwa.py`
- `tests/test_reports.py`

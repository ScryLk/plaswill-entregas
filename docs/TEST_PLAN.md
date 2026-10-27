# Testes e evidências

Requer PHP 8.2+ (curl para integração IA), Python e Node. Nenhum teste usa cadastro real, credenciais ou VPS. Gateway simulado existe somente em router temporário dos testes; operações usam diretório temporário. Sem pip/npm install para suites de backend/outbox.

```sh
ENTREGAS_PHP_BIN=php python3 -m unittest discover -s tests -v
node --test tests/outbox.test.js
ENTREGAS_BROWSER_TEST=1 ENTREGAS_PHP_BIN=php python3 -m unittest discover -s tests -v
```

Browser opt-in requer Playwright e Chromium em /usr/bin/chromium. No ambiente cloud, PHP está em `/workspace/.tools/bin/php`; definir ENTREGAS_PHP_BIN para esse caminho. O código do teste simula identidade via header apenas em router temporário, nunca no produto.

Backend cobre criação/leitura/status, concorrência real com 4 workers PHP, repetição, conflito, desfazer, finalização com payload adulterado, histórico deduplicado, finalização inexistente, rota encerrada, métodos/JSON/coordenadas/status/IDs inválidos, autorização por endpoint, origem hostil, token expirado/revogado/rotacionado, proteção de arquivos internos, colisão determinística, JSON corrompido e falha de escrita sem alterar original. Node cobre 11 casos: três operações offline, reabertura, undo, backoff, recibo inválido, timeout/JSON inválido, HTTP 500/401/403/409, perda de resposta com mesmo ID, quota e exclusão mútua do flush.

Browser real testa shell e Service Worker, reabertura offline, outbox após fechar página, reconexão, desfazer offline, conflito entre dispositivos, rebase confirmado e encerramento remoto enquanto existem eventos pendentes. Fontes externas bloqueadas no teste; nada é enviado a serviços externos.

Checks adicionais: `php -l` em api/*.php e router.php; `python3 -m py_compile server.py`; `node --check` em app.js, motorista.js, outbox.js e sw.js; `git diff --check`.

Não verificados: GED/SSO real, Gemini válido, geocodificação e tiles externos, validação visual/A4 física e execução externa de WhatsApp/Waze/Maps, concorrência entre abas com localStorage, produção PHP-FPM/Caddy, restauração de backup em VPS. Falta de execução não equivale a aprovação. Consultar o relatório da entrega para resultados efetivamente executados.


Execução cloud anterior à integração OAuth: 7 testes de integração (incluindo um cenário Chromium composto), 11 testes Node, sintaxe PHP/Python/JS e diff-check aprovados. O browser do painel também exercitou inclusão manual, importação DANFE com resposta mock, Leaflet real servido de fixtures locais verificadas pelo SHA-256/SRI original, otimização, geração do canvas QR, links de WhatsApp/Waze/Maps, preparação do romaneio e histórico. O print foi interceptado, sem impressão física; mapa não baixou tiles reais. Não houve leitura de clientes reais no teste: search_company usa ENTREGAS_COMPANIES_FILE apontando para catálogo sintético.

Para repetir o painel, preparar fora do checkout leaflet.js e leaflet.css da versão 1.9.4 e verificar SHA-256 base64 contra SRI em index.html (não desabilitar verificação). Definir TEST_LEAFLET_DIR para essa pasta, além de ENTREGAS_BROWSER_TEST=1. Sem fixtures, o cenário do motorista ainda executa e o painel é omitido explicitamente pela condição do teste.


## Regressão OAuth2 adicionada

`tests/test_oauth.py` usa PHP com sessões reais e `tests/mock_ged.py` como provedor HTTPS local. Certificado efêmero com SAN correto é gerado por openssl e confiado explicitamente por CA no cliente Python/PHP; Chromium confia somente no SPKI do certificado do fixture. Verificação TLS não é desligada para acessar serviços reais.

Cobre state/cookie binding/uso único/cancelamento, troca de código, rotação de sessão e flags de cookie, CSRF/Origin, identificação por OCS + endpoint de grupos, supervisão somente leitura, papéis cumulativos de Diretoria, revogação/expiração, mudança de grupos, outage/redirect/falha OCS/ID divergente/grupos malformados, rejeição de pseudoheaders e logout local durante indisponibilidade, inclusive após reabrir a página. O navegador executa login, fetch com nonce e logout para expedição e supervisão.

Última execução completa nesta evolução:

```sh
TEST_LEAFLET_DIR=/workspace/.tools ENTREGAS_BROWSER_TEST=1 ENTREGAS_PHP_BIN=/workspace/.tools/bin/php python3 -m unittest discover -s tests -v
node --test tests/outbox.test.js
```

Resultado: **15 testes de integração aprovados, sem skips nessa execução, e 11 testes Node aprovados**. Também passaram php -l em todos os PHP, node --check incluindo session.js, py_compile e git diff --check. O diretório de fixtures Leaflet fica fora do checkout, com integridade verificada conforme seção anterior. GED/Nextcloud real e callback registrado ainda não foram validados; os testes não conectam a serviços corporativos.

## Gestão de rotinas — execução local

A evolução em feat/gestao-rotinas acrescenta tests/test_routines.py, tests/routines-browser.cjs e tests/history-browser.cjs. Última regressão completa: **26 testes de integração aprovados, sem skips, e 11 testes Node da outbox aprovados**.

Comando executado:

```sh
TEST_LEAFLET_DIR=/workspace/.tools ENTREGAS_BROWSER_TEST=1 ENTREGAS_PHP_BIN=/workspace/.tools/bin/php python3 -m unittest discover -s tests -v
node --test tests/outbox.test.js
```

O módulo cobre rascunho vazio, idempotência da criação, metadados persistidos e várias rotinas da mesma data, snapshots/duplicidade de endereço, edição/remoção/reordenação/otimização, versões e edições concorrentes, despacho concorrente sem duplicação, recuperação de falha entre gravações de rota e rotina, progresso do motorista, finalização/histórico, cancelamento e revogação preservando entregas realizadas, cancelamento interrompido e JSON corrompido, permissões, filtros/paginação e exclusão de CNPJ/telefone no catálogo.

No Chromium: navegação/listagem, seleção entre pesquisas/filtros/páginas, revisão/geocodificação simulada de endereço sem coordenadas, confirmação de entrega duplicada, edição de NF/volumes, remoção/reordenação/otimização, backend independente do localStorage de outro cliente, persistência de mudanças feitas durante save em andamento, conflito/recarga/reaplicação com cópia preservada, associação de links de duas rotinas, cancelamento, responsividade e consulta quando Leaflet está indisponível. Capturas visuais inspecionadas com dados sintéticos, sem tiles ou cadastros reais.

PHP lint em todos api/*.php/router.php, node --check nos JS incluindo routines.js, py_compile e git diff --check aprovados. Smoke no adaptador Python reiniciado: shell/JS/CSS novos 200; API de rotinas sem identidade 401; módulos privados e caminho de dados 404. Catálogo corporativo/cache de coordenadas sem alterações.

Não executados: chamadas reais ao GED/Gemini/Nominatim/tiles, operação em VPS, impressão física, validação no PHP-FPM/Caddy de produção e teste com dados operacionais reais. Esta validação não envolveu deploy nem dados operacionais de produção.

Isolamento em staging configurado: os workers temporários dos testes de API/rotinas selecionam explicitamente o gateway sintético do fixture e definem GEMINI_API_KEY vazia, sem herdar o modo OAuth ou uma chave Gemini do processo hospedeiro. Os testes OAuth selecionam seu próprio provedor HTTPS simulado. Isso não altera o modo de autenticação nem as configurações da aplicação em execução. A suíte completa também foi executada com GED_AUTH_TYPE=oauth2 e uma chave Gemini fictícia no processo pai para verificar esse isolamento.

Regressão de troca para o histórico: tests/history-browser.cjs usa diretório temporário próprio e verifica cancelamento e falha de consulta preservando o contexto da rotina; troca confirmada limpando URL de compartilhamento, WhatsApp e QR Codes; rejeição de link em memória pertencente a outra rota; impossibilidade de contornar o bloqueio de reemissão para rotas finalizadas; emissão correta para a rota ativa selecionada, sem revogar o token de outra rotina. O cenário falhou antes da correção e passou após ela. A regressão completa acima foi repetida com esse caso incluído; 37 verificações de sintaxe PHP/JS/Python e git diff --check também passaram. Nenhum dado operacional ou serviço corporativo real foi utilizado.

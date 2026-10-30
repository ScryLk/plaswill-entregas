# Matriz de regressão

Base: main c745e43. Execução em PHP local com workers, Chromium/Playwright, Leaflet 1.9.4 com integridade verificada, provider OAuth HTTPS sintético e armazenamento temporário.

## Fluxos operacionais

| Cenário | Critério objetivo | Evidência automatizada | Limite |
|---|---|---|---|
| A — primeira utilização | Lista vazia, nenhum seed ou escrita automática | test_initialization.py empty/corrupt | Não inventaria navegadores existentes |
| B — nova rotina | RUT único e persistido sem token | test_routines.py; persistence-browser.cjs | GED simulado |
| C — seleção | Seleções entre pesquisa/filtro/página, sem duplicação por envio | routines-browser.cjs; catalog-flows.test.js | Catálogo fictício |
| D — endereço | Mudança invalida coordenadas, revisão obrigatória | catalog-browser.cjs; test_danfe_suggestions.py | Nominatim/Gemini não consultados |
| E — persistência | Reload, novo contexto, reinício, outro diretório de código, restore | test_persistence_audit.py | Não testa VPS nem queda elétrica |
| F — despacho | Repetição/concor­rência retorna uma rota; retry após perda de resposta | test_routines.py; test_legacy_idempotency.py; initialization-browser.cjs | Clientes antigos sem operation_id permanecem legados |
| G — documentos | Identidade/data/paradas/NFs/volumes correspondem ao servidor | reports-browser.cjs | PDF A4 gerado; sem impressora física |
| H — compartilhamento | Link com token da rota selecionada; sem mistura com histórico | history-browser.cjs; persistence-browser.cjs | WhatsApp externo não enviado |
| I — motorista | Recibo correto, fila preservada, locks por rota/abas | browser.cjs; pwa-browser.cjs; outbox.test.js | Novos writers precisam Web Locks |
| J — finalização | Contagens autoritativas, idempotência, pendentes identificáveis | test_api.py; test_routines.py; reports-browser.cjs | Sem dados operacionais |
| K — concorrência | Uma edição aceita e outra 409; recuperação preservada | test_routines.py; persistence-browser.cjs | Workers locais, não carga real |
| L — falhas | 401/403/409/500, JSON/ack inválido, quota, corrupção e falha de escrita não apagam originais | test_api.py; test_oauth.py; test_initialization.py; outbox.test.js | Não comprova disponibilidade externa |

## Reprodução e execução

Resultado final desta auditoria em 30/10/2026: **50 testes de integração aprovados, zero skips; 17 testes Node aprovados; 45 verificações de sintaxe/consistência aprovadas**. A execução inclui todos os cenários Chromium listados. Baseline original: 26 testes aprovados antes das novas regressões. Os novos casos comprovaram defeitos que a suíte anterior não identificava.

Antes: testes novos falharam contra os métodos originais; detalhes por ENT em AUDITORIA_INCONSISTENCIAS.md. Para as duas verificações adicionais de quota/finalização, o app.js original do commit base foi servido exclusivamente pelo router do navegador de teste. Esse recurso não existe no produto.

```sh
TEST_LEAFLET_DIR=/workspace/.tools ENTREGAS_BROWSER_TEST=1 ENTREGAS_PHP_BIN=/workspace/.tools/bin/php python3 -m unittest discover -s tests -v
node --test tests/*.test.js
```

Adapte os caminhos do PHP e das fixtures ao ambiente. Playwright/Chromium e Leaflet verificado são requisitos para os cenários de browser; não omitir silenciosamente. Sem ENTREGAS_BROWSER_TEST=1 os cenários opt-in são skips, não validações executadas.

Os testes não devem apontar para dados de produção. Diretório, catálogo e provider são configurados pelos fixtures, sem bypass no código do produto. Nenhum seed operacional foi transferido para fixture.

## Evidências visuais sintéticas

- [Relatório A4](evidencias/relatorio-a4.png).
- [PDF gerado pelo Chromium](evidencias/relatorio-sintetico.pdf).
- [Conferência de cadastro](evidencias/catalogo.png).
- [Recuperação de planejamento](evidencias/persistencia.png).

## Fora da comprovação local

GED real/callback/grupos, API Gemini real, Nominatim/tiles, impressão física, abertura externa de WhatsApp/Waze/Maps, mount/permissões Apache/Caddy da VPS, restauração do backup corporativo, desempenho e queda de energia. Seguir PLANO_HOMOLOGACAO.md.

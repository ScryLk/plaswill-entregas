# Contratos HTTP

Base same-origin `/api/`. JSON objeto obrigatório nos POST, no-store, mensagens genéricas em falhas internas. Códigos: 400 input inválido, 401 sem identidade/token, 403 sem permissão/token expirado/revogado/origem divergente, 404 rota/parada ausente, 405 método errado, 409 conflito/finalizada, 413 excesso, 500 persistência/JSON corrompido, 503 configuração indisponível. Grupos e origem são configurações do servidor, nunca parâmetros públicos.

| Endpoint | Método | Contrato |
|---|---|---|
| save_route.php | POST | stops 1..500, IDs únicos seguros até 100 caracteres, lat/lon finitos nos limites; origin opcional válido; motorista/veiculo até 300 bytes. Retorna route_id, share_url relativo com token em fragmento, total e data. |
| get_route.php | GET | r ou id `ROT-[A-Z0-9]{4}`; retorna success/route sem hash/recibos internos. |
| update_route_status.php | POST | route_id (ou r), stop_id, status pending/delivered; operation_id de 16..100 caracteres seguros exige expected_version inteiro. Retorno confirma operation_id, route_id, stop_id, status, version e contagens. |
| finish_route.php | POST | route_id obrigatório de rota existente; observacoes até 2000 bytes. Dados stops/métricas do cliente são ignorados. Repetir retorna resultado já persistido. |
| get_history.php | GET | success, total, history até 100, deduplicado incluindo índice legado. |
| issue_route_access.php | POST | route_id ativo; rotaciona acesso e retorna share_url, invalidando token anterior. |
| revoke_route.php | POST | route_id; revoga token imediatamente. |
| optimize_sequence.php | POST | stops e origin válidos, rejeita flags conhecidas de coordenadas aproximadas; nearest neighbor Haversine e ordem de empate preservados. |
| search_company.php | GET | q textual até 300 bytes; consulta catálogo protegido. Gemini opcional se configurado; sem coordenadas inventadas no fallback de IA. |
| geocode.php | GET | q até 300, cidade até 100, uf até 2; success:false no fallback, não significa localização confirmada. |
| process_danfe.php | POST | multipart file ou image_base64, imagem JPEG/PNG/WebP validada, até 5MiB decodificados e 40MP. Falta de chave → 503, upstream → 502, extração inválida → 422. |

Mudança de contrato: rotina ainda não despachada é salva antes de encerrada, pelo frontend atualizado. `finish_route` sem ID retorna 409 save_before_finish. A expedição mantém ID em localStorage entre tentativas. Não enviar paradas para substituir rota despachada: atualização é por parada. Links de motorista agora precisam token; antigos exigem reemissão pelo operador. Sem compatibilidade anônima insegura. Índice histórico legado continua legível, mas a API é a fonte de novas entradas.


## Sessão OAuth2

GET auth_login.php redireciona ao authorize configurado; GET auth_callback.php consome state/código e redireciona somente à origem fixa. GET auth_session.php informa authenticated, login_available, mode, user (id/roles) e csrf_token apenas da própria sessão. Durante falha do GED, pode retornar 503 com logout_available e nonce para encerrar a sessão local, sem retornar identidade ou permitir leitura/escrita. POST auth_logout.php exige Origin e X-CSRF-Token, destrói a sessão local e retorna success. Não há endpoint de logout global do GED. Ver AUTHENTICATION.md.

Com cookie OAuth, todos os POST corporativos exigem X-CSRF-Token. Os papéis são revalidados por OCS: supervisão só acessa get_route/get_history, expedição/admin acessam as operações existentes. Capacidade Bearer permanece restrita à própria rota e não substitui autorização corporativa em catálogo, IA ou histórico. Novos auth.php/settings.php são módulos privados, não endpoints.


## Rotinas e catálogo paginado

`routine_read.php` (GET: lista, detalhe e progresso), `routine_write.php` (POST: create/update/dispatch/cancel) e `search_company.php?mode=catalog` reutilizam a autorização atual. Supervisão só lê rotinas; motorista não recebe acesso corporativo pelo token. Contratos completos, expected_version/operation_id, filtros e respostas de replay estão em [ROUTINES.md](ROUTINES.md). `pending`/`delivered` são preservados; cancelamento de rotina revoga capacidade e impede novas alterações/finalização da rota cancelada.

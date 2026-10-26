# Revisão de segurança

## Dados e exposição

Catálogo: 1.604 registros com razão social, fantasia, CNPJ, telefone, endereço, coordenadas e código interno. Nomes/telefones/endereços podem identificar pessoas; código SGE e vínculo comercial são informação corporativa. Necessários à seleção e entrega, mas não ao download público em massa. Nenhum registro real foi usado nos testes. Recomenda-se tornar o repositório privado e revisar histórico Git, forks e cópias; não houve alteração de visibilidade nem reescrita do histórico.

Bloqueios diretos de `/api/*.json`, `/data`, dotfiles, configuração e source no router de desenvolvimento. Busca continua via API autorizada. Produção requer regras equivalentes no web server e, preferencialmente, dados fora do document root. Código não consegue impedir um servidor de arquivos mal configurado de servir o catálogo. Não publicar antes dessa validação.

## Autenticação e matriz de acesso

A autenticação OAuth2 nativa com consulta OCS, sessões de servidor e CSRF foi implementada após a informação do usuário sobre o GED. A matriz exata e os controles estão em [AUTHENTICATION.md](AUTHENTICATION.md). Supervisão não pode executar writes nem consumir DANFE; Diretoria/admin recebem permissões administrativas cumulativas. Tokens de motorista continuam isolados por rota. Nenhum endpoint confia em CORS como autenticação.

A integração real ainda não foi validada: não há credencial real configurada, client ID/callback verificados ou ensaio na versão instalada do GED. Testes usam provider TLS sintético e gateway em routers temporários. Em OAuth, nenhuma falha permite fallback a REMOTE_USER ou acesso público. O gateway anterior continua sendo um modo explícito de integração com identidade já verificada pelo web server.

Token do motorista: 32 bytes aleatórios, hash SHA-256 no servidor, escopo de uma rota, expiração de 7 dias, rotação e revogação autorizadas. Retenção da duração depende de validação da logística. Fragmento do link é removido após carga; Authorization Bearer em chamadas locais. Referrer-Policy no-referrer, links externos com noopener/noreferrer. Cache-Control no-store nas APIs. Links antigos sem token deixam de autorizar; reemitir com issue_route_access. Sem fallback público. Tokens não impedem que quem recebeu o link o compartilhe; revogar e reemitir em caso de vazamento.

## Riscos e trabalho restante

- Integração OAuth implementada localmente, mas sem ensaio no GED real: não implantar sem configurar cliente/segredo/callback HTTPS e validar grupos/expiração/revogação.
- Sem trilha de auditoria append-only: timestamps/versões/recibos de operações não substituem auditoria de identidade, emissão, leitura e revogação. Definir destino e retenção sem dados de clientes ou credenciais.
- Sem rate limit/quota global Gemini no app; exigir limites por usuário/rota no gateway e orçamento do provedor antes de expor.
- Sem limpeza automática de dados locais/tokens no aparelho. Risco em dispositivos compartilhados e por XSS.
- Uploads: JSON limitado a 8 MiB, imagem decodificada até 5 MiB, MIME detectado e até 40MP. Servidor deve aplicar limites multipart/post_max_size antes do PHP. Sem antivírus e sem teste de carga de decodificação.
- Texto/JSON/IDs/status/coordenadas/paradas validados. Não há auditoria exaustiva de todo output da IA nem de todas as superfícies XSS legadas. Handlers dinâmicos de IDs do motorista, tabela e histórico foram substituídos por listeners.
- APIs legadas sem versão não garantem resolução de eventos fora de ordem; restringir após migração.
- Sem observabilidade e alertas corporativos configurados. Erros externos da IA não retornam mais payload bruto/segredos ao cliente.

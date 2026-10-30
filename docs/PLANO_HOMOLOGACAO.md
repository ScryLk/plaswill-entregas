# Plano de homologação, publicação e rollback

Esta auditoria autoriza branch/PR, não merge ou deploy. Nenhuma ação nesta lista foi executada na VPS.

## Pré-condições e inventário

1. Confirmar versão Git e hashes dos arquivos efetivamente servidos; checkout de staging e docroot podem ser diferentes.
2. Confirmar topologia real de containers/Apache/Caddy, usuário PHP, permissões, variáveis efetivas e bind mounts. Não imprimir segredos nem dados de clientes.
3. ENTREGAS_DATA_DIR deve sobreviver à troca de código e reinício, fora do docroot. Confirmar rotina/rota/histórico/sessões e backup; não usar diretório temporário ou dentro da release.
4. Preservar client ID real, segredo, callback e Origin. Staging precisa dados e configuração OAuth próprios; nunca compartilhar sessões/dados de produção com fixtures.
5. Verificar visibilidade do repositório e decidir segregação do catálogo, histórico/forks/cópias sob aprovação. HTTP deny não protege o Git.

## Backup e ensaio externo

Pausar writers na janela aprovada, inclusive integrações antigas. Fazer backup consistente de dados completos, código e configuração privada com permissões/hashes; guardar restritamente. Restaurar em destino isolado, validar JSON, contagens, referências RUT/ROT, histórico e pendências sem expor registros. Não considerar backup aprovado sem restauração.

O ensaio automático local já exercita reinício, código em outro diretório e restauração sintética; isso não valida mounts, filesystem ou backup da VPS.

## Servidor e homologação

- Manter a allowlist pública de router.php equivalente no servidor real.
- Negar api/danfe_delivery.php (novo helper), catalog.php, routines.php, runtime.php, auth.php, settings.php, config.php e quaisquer dados/.env/docs/testes/.git.
- Endpoints de relatório reutilizam routine_read.php e get_route.php; nenhum endpoint novo.
- Manter proteção dos JSON corporativos; imagens/fixtures de evidência não devem entrar no document root servido.
- Rever timeout, upload_limit, post_max_size, request_body e quotas/rate limits antes de expor processamento IA.
- Executar a matriz A–L com contas e dados de homologação autorizados.
- GED: authorization code/callback/cookie/CSRF, expedição, supervisão somente leitura, admin, expiração, mudança de grupos/revogação e indisponibilidade sem fallback.
- Gemini/Nominatim: falha/timeouts/retornos incompletos; nenhum endereço estimado deve ser confirmado automaticamente.
- PDF/romaneio: comparar ao servidor em estados draft/dispatched/in_progress/finished/cancelled; conferir 1/muitas entregas, mesmo endereço e NFs distintas, opcionais, troca de rotina, outro navegador e A4 físico.
- PWA: confirmar fila, versão de assets, token válido/expirado/revogado, offline/reconexão/conflito e abas. Sem suporte a Web Locks, modo somente leitura explícito.
- Privacidade: política para aparelhos compartilhados, retenção de cópias locais, logs sem tokens/payloads e canais de reconciliação.

## Atualização coordenada proposta

Somente após aprovação específica: identificar o commit revisado, pausar writes, preservar estado, atualizar código e configuração como conjunto, confirmar as deny rules e reabrir após smoke. Não copiar .env.example sobre segredos, não sincronizar apagando dados e não usar reset/clean sobre arquivos operacionais.

Encerrar todas as abas antigas de motoristas após verificar e preservar suas pendências. Reabrir a versão nova sem apagar localStorage/outbox; evitar mistura de writers antigos. Não forçar skipWaiting. Clientes antigos sem operation_id não têm a garantia nova de criação avulsa idempotente.

Critérios de bloqueio: P0 local aberto; backup sem restauração; versão servida desconhecida; dados em release efêmera; auth/deny rules não validadas; filas sem reconciliação; writers antigos concorrentes. Testes locais não removem esses bloqueios.

## Rollback

Pausar writers e guardar o estado novo completo antes de reverter. Restaurar código/configuração/dados de um conjunto ensaiado, preservando cópia das operações posteriores e aparelhos. Reconciliar novas entregas/recibos com expedição; não apagar eventos nem reativar tokens/sessões revogados. Não reabrir writers antigos sobre dados novos sem avaliar compatibilidade. Código anterior contém os defeitos corrigidos nesta branch; manutenção é preferível a reintroduzir perda/seed/falsa confirmação.

Mudanças desta branch não exigem migração de dados. Se somente o código for revertido, arquivos privados de recibo/operações e filas devem ser conservados. Nenhuma limpeza deve ser usada como rollback.

## Relatório de homologação obrigatório

Versão efetivamente servida, armazenamento/mount/permissões, teste/resultado/evidência, skips e motivo, identidades/papéis verificados sem segredos, integrações reais e limites, contagens antes/depois, backup/restauração, pendências offline, riscos e autorização necessária para produção.

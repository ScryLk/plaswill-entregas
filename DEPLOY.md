# Implantação para revisão humana — não executada

A configuração legada abaixo não é suficiente para esta versão. Não realizar rollout antes de validar identidade, deny rules e migração de links. Os servidores embutidos PHP/Python são somente de desenvolvimento; remover a antiga opção de produção via Python/systemd.

## Checklist sequencial e rollback

1. **Backup verificado:** congelar writers legados durante a janela; copiar checkout, configuração fora do repo, data/ completo e índice histórico com permissões, timestamps e hashes. Guardar de forma protegida. Restaurar em diretório isolado e validar JSON, contagens, códigos, histórico e rotas conhecidas com dados autorizados. Backup sem ensaio não basta.
2. **Staging:** executar testes em diretório isolado, PHP-FPM real e web server configurado; nunca apontar testes a dados/VPS reais. Validar grupos e sessões OAuth2 conforme docs/AUTHENTICATION.md. Negar acesso direto ao FPM e spoof de identidade. Se o modo alternativo gateway for escolhido explicitamente, configurar REMOTE_USER/REMOTE_GROUPS somente a partir de identidade verificada; não mapear headers públicos diretamente. Configurar ENTREGAS_ROLE_GROUPS, ENTREGAS_PUBLIC_ORIGIN exata HTTPS e ENTREGAS_DATA_DIR fora do document root. GEMINI_API_KEY no gerenciador de segredos, sem arquivos publicados.
3. **Servidor web:** permitir somente endpoints PHP explicitamente listados em router.php; bloquear outros PHP, .env, .git, docs, testes, scripts, api/*.json e todo data/. Recomenda-se allowlist dos estáticos. Impedir execução direta de runtime/config. Não confiar em .htaccess com Caddy. Aplicar limites multipart (post_max_size/upload_max_filesize e request_body), timeout e rate limits/quotas por usuário antes das chamadas de IA. Testar GET/POST/HEAD e variantes codificadas: 404/403 sem dados.
4. **Atualização coordenada:** pausar writes, remover processos antigos, instalar backend e frontend juntos antes de reabrir. Não misturar workers antigos sem lock com novos. JSON permanece compatível; novos campos privados, versões e recibos precisam ser conservados nos backups. Novo histórico é derivado da rota: consumidores que leem routes_history.json diretamente precisam migrar para API.
5. **Autenticação:** OAuth2 Authorization Code nativo com OCS, sessões e CSRF está implementado; ver docs/AUTHENTICATION.md. Validar cliente real, segredo, callback HTTPS exato, grupos, cookies, expiração, revogação e falha do provedor em staging antes de ativar. Não aplicar regras OIDC/JWT a tokens opacos. Não há logout federado; saída local não revoga o grant no GED. Bloquear auth.php/settings.php; permitir somente auth_login/callback/session/logout.php. O gateway legado é alternativa explícita, nunca fallback de falhas OAuth. Sem flag de acesso anônimo emergencial.
6. **Links:** emitir tokens para rotas ativas via issue_route_access.php por operador autorizado. Enviar novos links pelo canal aprovado manualmente; esta tarefa não envia mensagens. Links antigos recebem 401. Validar expiração de 7 dias com logística. Rotacionar/revogar se houver vazamento; não registrar fragmentos/Authorization nem payloads de clientes em logs. Rotação de chave Gemini feita pelo administrador sem expor valores.
7. **PWA:** backend deve manter o contrato das outboxes em circulação; não excluir campos/recibos de versões antigas. Service Worker não força ativação; novas versões de cache entram após fechar abas. Não limpar localStorage para atualizar. Exportação/reconciliação operacional de conflitos encerrados ainda precisa procedimento humano seguro.
8. **Pós-rollout:** testes com dados sintéticos aprovados de login/403, token correto e de outra rota, criação/leitura/status/undo, 409, finalização/repetição/histórico, negação de arquivos privados, offline/reabertura/reconexão e QR/WhatsApp/A4. Conferir contagens sem divulgar registros. Monitorar taxas de 401/403/409/5xx, duração do lock, tamanho de JSON/outbox e consumo Gemini. Monitoramento central ainda precisa configuração.
9. **Rollback:** fechar writes e guardar cópia completa do estado novo antes de qualquer reversão. Restaurar código, configuração/gateway e dados de backup ensaiado como conjunto; reconciliar entregas novas manualmente a partir da cópia, recibos e aparelhos. Rollback para writers antigos perde versões/tokens e não deve reabrir APIs públicas: manter acesso fechado no gateway até corrigir. Não apagar eventos offline, invalidar tokens revogados nem reativar sessões antigas. Se não for possível reconciliar, manter manutenção; git revert não restaura dados/sessões. Não houve migração SQLite, mas mover ENTREGAS_DATA_DIR exige restaurar paths/permissões também.

Limites: auditoria append-only, rate limiting de app, retenção em aparelhos, múltiplas abas e validação da integração no GED real permanecem pendentes. Requer aprovação explícita para qualquer deploy.

---

## Referência legada (não usar sem as alterações acima)

# Deploy — Plaswill Entregas (`entregas.plaswill.tech`)

Mini-aplicação web responsiva (PWA) de planejamento e visualização de paradas de entrega para motoristas da Plaswill e Lótus.

---

## 1. Topologia de Publicação na VPS (`179.199.151.3`)

A pasta `/opt/plaswill/indicators/entregas` contém todo o frontend PWA e backend de processamento.

### Opção A: Servir via Caddy + PHP-FPM (Recomendado)
Adicione o bloco abaixo ao arquivo `/etc/caddy/Caddyfile` na VPS:

```caddy
entregas.plaswill.tech {
    root * /opt/plaswill/indicators/entregas
    php_fastcgi unix//run/php/php8.2-fpm.sock
    file_server
    encode gzip zstd

    # Suporte a fotos de alta resolução do DANFE
    request_body {
        max_size 20MB
    }

    log {
        output file /var/log/caddy/entregas.access.log
    }
}
```

Em seguida, recarregue o Caddy:
```bash
caddy reload --config /etc/caddy/Caddyfile
```

---

### Opção B legada: não suportada em produção
Caso prefira rodar o serviço autônomo sem depender do PHP-FPM:

1. Crie o arquivo `/etc/systemd/system/plaswill-entregas.service`:
```ini
[Unit]
Description=Plaswill Entregas API & PWA Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/plaswill/indicators/entregas
ExecStart=/usr/bin/python3 /opt/plaswill/indicators/entregas/server.py
Restart=always
RestartSec=5
Environment=PORT=8085

[Install]
WantedBy=multi-user.target
```

2. Ative e inicie o serviço:
```bash
systemctl daemon-reload
systemctl enable --now plaswill-entregas
```

3. No Caddyfile:
```caddy
entregas.plaswill.tech {
    reverse_proxy 127.0.0.1:8085
    encode gzip zstd
}
```

---

## 2. Apontamento DNS
No painel de DNS do domínio `plaswill.tech`:
* **Tipo:** `A`
* **Nome / Host:** `entregas`
* **Destino / IP:** `179.199.151.3`
* **TTL:** Automático ou 300s

O Caddy gerará o certificado SSL Let's Encrypt automaticamente assim que o DNS propagar.

---

## 3. Como Rodar e Testar Localmente (Mac / Linux)

Para testar ou demonstrar no computador local:

```bash
cd /Users/lucas/Documents/sge/entregas
python3 server.py
```
Acesse no navegador:
👉 `http://localhost:8085`

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

### Opção B: Servir via Python Systemd Service (Porta 8085)
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

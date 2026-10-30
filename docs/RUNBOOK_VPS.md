# Runbook — verificação de persistência e paridade na VPS

Objetivo: comprovar (ou refutar) os itens ENT-019, ENT-020, ENT-022, ENT-023 e ENT-025,
que dependem do ambiente real e não podem ser validados apenas pelo repositório.

Regras:
- Primeiro em **staging**, com dados sintéticos. Produção só com aprovação escrita.
- Nenhum comando destrutivo sem backup verificado no passo 4.
- Não copiar dados reais para fora da VPS (nem para fixtures, nem para chats).

## 1. Paridade de código e cache (read-only)

No servidor que serve `entregas.plaswill.tech`:

```bash
# versão em execução
git -C /caminho/do/app log -1 --format='%h %ad %s' --date=short
# hashes servidos vs checkout (roda do servidor ou da máquina de deploy)
scripts/verify-deploy.sh https://entregas.plaswill.tech /caminho/do/app
```

Esperado: `RESULTADO: produção idêntica ao checkout verificado` e commit igual ao da `main` aprovada.
Se divergir, pare aqui: deploy ainda não aconteceu.

## 2. Onde os dados realmente moram

```bash
systemctl show -p Environment <servico>        # ou docker inspect <container> | grep -i env
php -r 'var_dump(getenv("ENTREGAS_DATA_DIR"));'
ls -la <ENTREGAS_DATA_DIR>/ <ENTREGAS_DATA_DIR>/routes <ENTREGAS_DATA_DIR>/routines
stat -c '%U:%G %a %n' <ENTREGAS_DATA_DIR>
```

Conferir: o usuário do PHP-FPM é o dono e tem escrita; o caminho **não** fica dentro do
diretório do código (que é substituído em deploy) e está fora de `/tmp` sem persistência.

## 3. Persistência entre reinício (ENT-019)

Em staging, com dados sintéticos:

1. Criar rotina, salvar, despachar; anotar `routine_id` e `route_id`.
2. `systemctl restart php8.1-fpm` (ou `docker compose restart app`).
3. Reabrir a rotina; confirmar stops, versão e status.
4. Repetir com deploy de nova versão do código (mesmo caminho de dados).
5. Repetir com reboot do servidor, se autorizado.

Esperado: registro idêntico em todos os casos; nenhum `write-*.tmp` órfão em `routes/`.

## 4. Backup e restauração ensaiada (ENT-023)

```bash
mkdir -p /var/backups/entregas
tar cz --numeric-owner -f /var/backups/entregas/data-$(date +%F-%H%M).tgz -C <ENTREGAS_DATA_DIR> .
mkdir -p /tmp/restore-test && tar xz -f /var/backups/entregas/data-*.tgz -C /tmp/restore-test
# apontar uma instância de staging para /tmp/restore-test via ENTREGAS_DATA_DIR e abrir uma rotina
```

Esperado: rotina e histórico abrem na instância restaurada; contagem de arquivos confere.

## 5. Queda de energia / corrupção parcial

`runtime.php` grava com arquivo temporário + `fsync` + `rename`, portanto um arquivo final
deve estar sempre completo. Verificação:

```bash
python3 - <<'PY'
import json, glob, sys
bad = [p for p in glob.glob('<ENTREGAS_DATA_DIR>/routes/*.json') + glob.glob('<ENTREGAS_DATA_DIR>/routines/*.json')
       if not isinstance(json.load(open(p)), dict)]
print('corrompidos:', bad or 'nenhum')
sys.exit(1 if bad else 0)
PY
```

## 6. Integrações reais (ENT-022)

Com credenciais de teste autorizadas: um DANFE sintético pelo Gemini, uma geocodificação
que responda fora da área e um login GED que expire. Registrar status HTTP e mensagem de
erro exibida ao operador. Sem credenciais, manter o item como dependente do ambiente.

## 7. Rollback

- Código: voltar ao commit anterior (`git checkout <commit-aprovado>`) e repetir o passo 1.
- Dados: nunca "desfazer" por cima da produção; restaurar do backup do passo 4 em staging e,
  em caso de perda confirmada, seguir procedimento aprovado de restauração.
- Cache: publicar novamente com `?v=` novo; operadores com aba aberta precisam recarregar.

## 8. Registro do resultado

Preencher em `docs/MATRIZ_REGRESSAO.md`: data, ambiente, commit, execução de cada passo e
evidência (saída dos comandos). Item só muda para "Validado" com essa evidência anexada.

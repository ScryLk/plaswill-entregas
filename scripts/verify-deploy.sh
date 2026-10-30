#!/usr/bin/env bash
# Compara o hash de cada asset publicado com o do checkout local.
# Somente leitura: não altera produção, não envia nada.
#
# Uso:
#   scripts/verify-deploy.sh [origem] [checkout]
#   scripts/verify-deploy.sh                              # https://entregas.plaswill.tech, diretório atual
#   scripts/verify-deploy.sh https://staging.exemplo.com  # antes de liberar staging
#
# Saída: tabela "igual/divergente" por arquivo e código de saída 1 se algo divergir.
# Divergência = deploy parcial, cache/CDN servindo versão antiga ou arquivo esquecido.

set -euo pipefail

ORIGIN="${1:-https://entregas.plaswill.tech}"
ROOT="${2:-$(cd "$(dirname "$0")/.." && pwd)}"

# Assets servidos ao painel e ao motorista. Acrescente novos arquivos aqui.
FILES=(
  index.html
  motorista.html
  app.js session.js routines.js routines.css style.css
  motorista.js outbox.js motorista.css sw.js
)

fail=0
printf '%-22s %-10s %-10s %s\n' "arquivo" "local" "servido" "situação"
for f in "${FILES[@]}"; do
  local_path="$ROOT/$f"
  if [ ! -f "$local_path" ]; then
    printf '%-22s %-10s %-10s %s\n' "$f" "-" "-" "AUSENTE NO CHECKOUT"; fail=1; continue
  fi
  local_sha=$(sha256sum "$local_path" | cut -c1-10)
  # O parâmetro extra evita CDN/proxy cacheando a comparação.
  if ! served=$(curl -fsSL --max-time 20 "$ORIGIN/$f?verify=$(date +%s)" 2>/dev/null); then
    printf '%-22s %-10s %-10s %s\n' "$f" "$local_sha" "-" "ERRO AO BAIXAR"; fail=1; continue
  fi
  served_sha=$(printf '%s' "$served" | sha256sum | cut -c1-10)
  if [ "$local_sha" = "$served_sha" ]; then state="igual"; else state="DIVERGENTE"; fail=1; fi
  printf '%-22s %-10s %-10s %s\n' "$f" "$local_sha" "$served_sha" "$state"
done

echo
if [ "$fail" -ne 0 ]; then
  echo "RESULTADO: há divergências. Não libere operadores até o deploy e o cache estarem corretos."
  echo "Checklist: bump de ?v= nos assets alterados, CACHE novo no sw.js, publicar e repetir este script."
  exit 1
fi
echo "RESULTADO: produção idêntica ao checkout verificado."

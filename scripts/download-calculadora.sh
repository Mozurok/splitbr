#!/usr/bin/env bash
# Fetch the official Calculadora de Tributos (RTC) local component.
#
# The artifacts are NOT bundled in this repository: the distribution states no
# license, so redistribution is not assumed (decision D-2, 2026-07-20). This
# script points you at the official source and verifies what you downloaded
# against the pinned hashes in vendor/MANIFEST.md.
#
# The official page is a JS SPA without stable direct-file URLs, so the
# download itself is a browser step.
set -euo pipefail

PAGE="https://consumo.tributos.gov.br/servico/calcular-tributos-consumo/calculadora/calculadora-offline"
DEST="$(cd "$(dirname "$0")/.." && pwd)/vendor/calculadora"

cat <<EOF
Calculadora de Tributos (RTC) -- official download helper

1. Open:  $PAGE
2. Download the offline component packages (JAR + database, Docker/WSL
   package, backend source, Python examples).
3. Place the files under:  $DEST
4. Re-run this script to verify hashes against vendor/MANIFEST.md.

EOF

if command -v open >/dev/null 2>&1; then
  open "$PAGE"
fi

MANIFEST="$(dirname "$DEST")/MANIFEST.md"
if [ -d "$DEST" ] && [ -f "$MANIFEST" ]; then
  echo "Verifying existing files under vendor/calculadora/ against MANIFEST.md..."
  fail=0
  while IFS=$'\t' read -r path sha; do
    f="$(dirname "$DEST")/$path"
    if [ -f "$f" ]; then
      actual=$(shasum -a 256 "$f" | awk '{print $1}')
      if [ "$actual" = "$sha" ]; then
        echo "  OK   $path"
      else
        echo "  FAIL $path (hash mismatch)"; fail=1
      fi
    else
      echo "  MISS $path (not downloaded yet)"
    fi
  done < <(awk -F'\\| *' '/^\| calculadora\// {gsub(/ +$/,"",$2); gsub(/ +$/,"",$6); print $2 "\t" $6}' "$MANIFEST" | sed 's/ *\t/\t/;s/^ *//')
  exit $fail
fi

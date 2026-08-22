#!/usr/bin/env bash
# Run ON the droplet as a user with sudo (e.g. deploy).
# Adds location /sca/ so /var/www/ota/sca/{live,apk} is public.
#   https://cdn-studiophoenix.net/sca/live/latest.json
#   https://cdn-studiophoenix.net/sca/apk/actionpitch_X.Y.Z.apk
set -euo pipefail

SITE="${1:-/etc/nginx/sites-available/cdn-studiophoenix.net}"

if [[ ! -f "$SITE" ]]; then
  echo "missing site config: $SITE" >&2
  exit 1
fi

if grep -qE 'location[[:space:]]+/sca/' "$SITE"; then
  echo "location /sca/ already present in $SITE"
  sudo nginx -t
  sudo systemctl reload nginx
  echo "nginx reloaded"
  exit 0
fi

TMP="$(mktemp)"
python3 - "$SITE" "$TMP" <<'PY'
import sys
src, dst = sys.argv[1], sys.argv[2]
text = open(src, encoding="utf-8").read()
if "location /sca/" in text:
    open(dst, "w", encoding="utf-8").write(text)
    sys.exit(0)

snippet = """
    # ActionPitch OTA: /var/www/ota/sca/{live,apk} → https://…/sca/…
    location /sca/ {
        try_files $uri =404;
        types {
            application/json json;
            application/zip  zip;
            application/vnd.android.package-archive apk;
        }
        default_type application/octet-stream;
        add_header Cache-Control "no-cache" always;
        add_header Access-Control-Allow-Origin "*" always;
        sendfile on;
        tcp_nopush on;
    }
"""

out = []
i = 0
lines = text.splitlines(keepends=True)
inserted = False
while i < len(lines):
    out.append(lines[i])
    if (not inserted) and "location /apk/" in lines[i] and "{" in lines[i]:
        depth = lines[i].count("{") - lines[i].count("}")
        i += 1
        while i < len(lines) and depth > 0:
            out.append(lines[i])
            depth += lines[i].count("{") - lines[i].count("}")
            i += 1
        out.append(snippet)
        if not snippet.endswith("\n"):
            out.append("\n")
        inserted = True
        continue
    i += 1

if not inserted:
    text2 = "".join(out)
    marker = "location / {"
    if marker in text2:
        text2 = text2.replace(marker, snippet + "\n    " + marker, 1)
        open(dst, "w", encoding="utf-8").write(text2)
        sys.exit(0)
    sys.stderr.write("could not find insertion point for /sca/\n")
    sys.exit(1)

open(dst, "w", encoding="utf-8").write("".join(out))
PY

sudo cp "$SITE" "${SITE}.bak.$(date +%Y%m%d%H%M%S)"
sudo tee "$SITE" <"$TMP" >/dev/null
rm -f "$TMP"

sudo nginx -t
sudo systemctl reload nginx
echo "✓ enabled location /sca/ in $SITE and reloaded nginx"
echo "try: curl -sSI https://cdn-studiophoenix.net/sca/live/latest.json | head -5"

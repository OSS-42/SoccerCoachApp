#!/usr/bin/env bash
# Run ON the droplet with sudo so /sca/privacy.html is served as a web page.
#   sudo bash scripts/ota-nginx-enable-privacy.sh
set -euo pipefail

SITE="${1:-/etc/nginx/sites-available/cdn-studiophoenix.net}"

if [[ ! -f "$SITE" ]]; then
  echo "missing site config: $SITE" >&2
  exit 1
fi

if grep -qE 'location[[:space:]]+=[[:space:]]+/sca/privacy.html' "$SITE"; then
  echo "privacy location already present in $SITE"
  sudo nginx -t
  sudo systemctl reload nginx
  echo "nginx reloaded"
  exit 0
fi

sudo cp "$SITE" "${SITE}.bak.$(date +%Y%m%d%H%M%S)"

sudo python3 - "$SITE" <<'PY'
from pathlib import Path
import sys
path = Path(sys.argv[1])
text = path.read_text(encoding="utf-8")
needle = "    location /sca/ {"
snippet = """    location = /sca/privacy.html {
        try_files $uri =404;
        default_type text/html;
        charset utf-8;
        add_header Cache-Control "no-cache" always;
    }

"""
if "location = /sca/privacy.html" in text:
    sys.exit(0)
if needle not in text:
    sys.stderr.write("could not find location /sca/ in nginx site file\n")
    sys.exit(1)
path.write_text(text.replace(needle, snippet + needle, 1), encoding="utf-8")
PY

sudo nginx -t
sudo systemctl reload nginx
echo "✓ /sca/privacy.html is now served as HTML"
echo "try: curl -sSI https://cdn-studiophoenix.net/sca/privacy.html | head -15"

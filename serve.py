#!/usr/bin/env python3
"""Legacy helper. Prefer: npm run dev  (or npm run build && npm run preview)."""
import http.server
import os
import socketserver
import sys

directory = "dist" if len(sys.argv) > 1 and sys.argv[1] == "dist" else "dist"
port = 5000
print("Prefer `npm run dev` for the Vite app.")
print(f"Serving '{directory}' on port {port}")
if not os.path.isdir(directory):
    print("No dist/ yet. Run: npm run build")
    sys.exit(1)
os.chdir(directory)
with socketserver.TCPServer(("0.0.0.0", port), http.server.SimpleHTTPRequestHandler) as httpd:
    print(f"http://0.0.0.0:{port}")
    httpd.serve_forever()

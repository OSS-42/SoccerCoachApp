#!/usr/bin/env python3
import http.server
import socketserver
import os
import sys

# Default to serving from the main directory unless specified
directory = "dist" if len(sys.argv) > 1 and sys.argv[1] == "dist" else "."
port = 5000

print(f"Serving from '{directory}' directory on port {port}")
os.chdir(directory)

handler = http.server.SimpleHTTPRequestHandler
with socketserver.TCPServer(("0.0.0.0", port), handler) as httpd:
    print(f"Server started at http://0.0.0.0:{port}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("Server stopped by user")
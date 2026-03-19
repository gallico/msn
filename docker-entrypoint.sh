#!/bin/sh
set -e

CERT_DIR="${DATA_DIR:-/app/backend}"

if [ ! -f "$CERT_DIR/server.key" ] || [ ! -f "$CERT_DIR/server.crt" ]; then
    echo "Generating self-signed TLS certificate..."
    openssl req -x509 -newkey rsa:2048 \
        -keyout "$CERT_DIR/server.key" \
        -out    "$CERT_DIR/server.crt" \
        -days 3650 -nodes \
        -subj "/CN=msn-gallery"
    echo "Certificate generated (valid 10 years)."
fi

exec node backend/server.js

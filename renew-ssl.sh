#!/bin/bash
certbot renew --quiet
cp /etc/letsencrypt/live/luminafi.xyz/fullchain.pem /opt/lumina/nginx/ssl/self-signed.crt
cp /etc/letsencrypt/live/luminafi.xyz/privkey.pem /opt/lumina/nginx/ssl/self-signed.key
chmod 600 /opt/lumina/nginx/ssl/self-signed.key
docker restart lumina_nginx

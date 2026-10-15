#!/bin/bash
# Loads KEY=VALUE lines from an env file into the environment.
# Unlike `source .env`, it accepts unquoted values with spaces
# (e.g. ADMIN_NAME=Diego De la Hoz), as docker compose does.
load_env() {
  local file="$1" key value
  while IFS='=' read -r key value || [ -n "$key" ]; do
    key="${key%$'\r'}"; value="${value%$'\r'}"
    [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
    if [[ "$value" =~ ^\"(.*)\"$ || "$value" =~ ^\'(.*)\'$ ]]; then
      value="${BASH_REMATCH[1]}"
    fi
    export "$key=$value"
  done < "$file"
}

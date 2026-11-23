#!/usr/bin/env bash
# Actualiza el backend de SendaBC en la máquina virtual (spec 012, plan D8).
# Se corre como el usuario `sendabc`:
#   sudo -u sendabc /opt/sendabc/backend/deploy/actualizar.sh
#   sudo -u sendabc env SIN_MIGRAR=1 /opt/sendabc/backend/deploy/actualizar.sh   # sin migraciones
# Ese usuario solo puede reiniciar el servicio con sudo. En /etc/sudoers.d/sendabc:
#   sendabc ALL=(root) NOPASSWD: /usr/bin/systemctl restart sendabc-api
set -euo pipefail

# Todo va dentro de main: bash lee el script mientras corre, y `git pull` puede cambiarlo.
main() {
  local repo="${SENDABC_REPO:-/opt/sendabc}"
  local env_file="${SENDABC_ENV:-/etc/sendabc/api.env}"

  # Las mismas variables que usa el servicio. `prisma generate` (en el postinstall) y
  # `prisma migrate deploy` necesitan DIRECT_URL.
  set -a
  # shellcheck source=/dev/null
  . "$env_file"
  set +a

  cd "$repo"
  git pull --ff-only

  cd backend
  # Con NODE_ENV=production, npm ci omite las devDependencies, y ahí están Nest CLI y Prisma.
  npm ci --include=dev
  npm run build
  # SIN_MIGRAR=1 compila y reinicia sin tocar la base. Se usa en el primer despliegue (spec 012, T15):
  # la migración que borra las actividades cortas (T4) se aplica solo en T17, después del respaldo.
  if [[ "${SIN_MIGRAR:-}" == 1 ]]; then
    echo "SIN_MIGRAR=1: no se aplican migraciones. Pendientes:"
    npx prisma migrate status || true
  else
    npx prisma migrate deploy
  fi

  sudo systemctl restart sendabc-api

  # Espera a que responda antes de dar por terminada la actualización.
  local puerto="${PORT:-3000}"
  for _ in $(seq 1 30); do
    if curl -fsS -o /dev/null "http://localhost:${puerto}/"; then
      echo "sendabc-api responde en el puerto ${puerto}."
      return 0
    fi
    sleep 1
  done

  echo "sendabc-api no respondió en 30 s. Revisa: journalctl -u sendabc-api -n 50" >&2
  return 1
}

main "$@"

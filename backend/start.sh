#!/bin/sh
set -e

python manage.py migrate --noinput
python manage.py ensure_superuser \
  --email "${SUPERUSER_EMAIL:-admin@gmail.com}" \
  --password "${SUPERUSER_PASSWORD:-123456}" \
  --first-name "${SUPERUSER_FIRST_NAME:-Admin}" \
  --last-name "${SUPERUSER_LAST_NAME:-Portal}" \
  --matricule "${SUPERUSER_MATRICULE:-ADM-ROOT-001}" \
  --force
python manage.py collectstatic --noinput

if [ "${SEED_DEMO_DATA:-true}" = "true" ]; then
    python manage.py seed_demo_portal --production
fi

if [ "$#" -eq 0 ]; then
    set -- gunicorn lycee.wsgi:application --bind "0.0.0.0:${PORT:-10000}" --log-file -
fi

exec "$@"

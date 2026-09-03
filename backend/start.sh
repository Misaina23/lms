#!/bin/sh
set -e

python manage.py migrate --noinput
python manage.py collectstatic --noinput

if [ "$#" -eq 0 ]; then
    set -- gunicorn lycee.wsgi:application --bind "0.0.0.0:${PORT:-10000}" --log-file -
fi

exec "$@"

#!/bin/sh
# Inject runtime environment variables into compiled Next.js output.
# NEXT_PUBLIC_* vars are baked at build time as __PLACEHOLDER__ strings;
# this script replaces them with actual runtime values on container start.

VARS="NEXT_PUBLIC_API_URL"

for varname in $VARS; do
    eval varvalue=\$$varname
    if [ -n "$varvalue" ]; then
        find /app/.next -type f \( -name '*.js' -o -name '*.html' -o -name '*.json' \) \
            -exec sed -i "s|__${varname}_PLACEHOLDER__|${varvalue}|g" {} +
        find /app -maxdepth 2 -type f \( -name '*.js' -o -name '*.html' -o -name '*.json' \) \
            -exec sed -i "s|__${varname}_PLACEHOLDER__|${varvalue}|g" {} +
    fi
done

exec "$@"

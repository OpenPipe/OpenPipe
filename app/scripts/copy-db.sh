#!/bin/bash
set -e

report_progress() {
    echo "--------------------------------------------"
    echo "$1"
    echo "--------------------------------------------"
}

export CACHE_DIR=~/.cache/openpipe/prod-db
export TEMP_DB_NAME="openpipe_temp"

parse_connection_string() {
    TEMP_URL=${PROD_DATABASE_URL#postgres://}
    DB_USERNAME=$(echo $TEMP_URL | cut -d':' -f1)
    PASSWORD=$(echo $TEMP_URL | cut -d':' -f2 | cut -d'@' -f1)
    HOST=$(echo $TEMP_URL | cut -d'@' -f2 | cut -d'/' -f1)
    DB_NAME=$(echo $TEMP_URL | cut -d'/' -f2 | cut -d'?' -f1)
}

should_dump_prod_db() {
    [ "$FORCE_DUMP" = "true" ]
}

dump_prod_db() {
    report_progress "Dumping production database..."
    rm -rf "$CACHE_DIR"
    mkdir -p "$CACHE_DIR"
    export PGPASSWORD="$PASSWORD"
    
    pg_dump \
      -v \
      -Fd \
      -f "$CACHE_DIR" \
      --exclude-table-data '"LoggedCallModelResponse"' \
      --exclude-table-data '"LoggedCall"' \
      --exclude-table-data '"LoggedCallTag"' \
      --exclude-table-data 'graphile_worker.jobs' \
      --jobs=8 \
      --strict-names \
      -h "$HOST" \
      -U "$DB_USERNAME" \
      -d "$DB_NAME"
    
    # Unset the password environment variable
    unset PGPASSWORD
}

terminate_connections() {
    report_progress "Terminating existing connections to $1 database..."
    psql -a -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '$1' AND pid <> pg_backend_pid();"
}

drop_db() {
    report_progress "Dropping $1 database..."
    dropdb -e $1
}

create_db() {
    report_progress "Creating $1 database..."
    createdb -e $1
}

run_update_sql_on_temp_db() {
    report_progress "Running SQL update on temporary database..."
    psql -d "$TEMP_DB_NAME" -c 'update "DatasetEntry" set "loggedCallId" = null;'
}

if [[ "$@" == *"--force-dump"* ]]; then
    FORCE_DUMP="true"
else
    FORCE_DUMP="false"
fi

source .env
parse_connection_string

if should_dump_prod_db; then
    dump_prod_db
else
    report_progress "Skipping production database dump."
fi

terminate_connections "$TEMP_DB_NAME"
drop_db "$TEMP_DB_NAME"
create_db "$TEMP_DB_NAME"

report_progress "Restoring dump to $TEMP_DB_NAME database..."
pg_restore -v --no-owner --no-privileges -d $TEMP_DB_NAME --format=d --jobs=8 "$CACHE_DIR" || true
run_update_sql_on_temp_db

terminate_connections "openpipe-dev"
drop_db "openpipe-dev"
create_db "openpipe-dev"

report_progress "Restoring schema to dev database..."
# Restore just schema to dev db
pg_restore -v --no-owner --no-privileges -d openpipe-dev --format=d --jobs=8 --schema-only "$CACHE_DIR"

report_progress "Restoring data to dev database..."
# Restore data from temp db to dev db
pg_restore -v --no-owner --no-privileges -d openpipe-dev --format=d --jobs=8 --data-only --disable-triggers "$CACHE_DIR"

report_progress "Database copy complete."
```
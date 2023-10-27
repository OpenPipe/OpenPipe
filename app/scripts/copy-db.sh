#!/bin/bash
set -e

# Function to display a message with a separator
report_progress() {
    echo "--------------------------------------------"
    echo "$1"
    echo "--------------------------------------------"
}

export CACHE_DIR=~/.cache/openpipe/prod-db

# Function to parse the connection string and set variables
parse_connection_string() {
    TEMP_URL=${PROD_DATABASE_URL#postgres://}
    DB_USERNAME=$(echo $TEMP_URL | cut -d':' -f1)
    PASSWORD=$(echo $TEMP_URL | cut -d':' -f2 | cut -d'@' -f1)
    HOST=$(echo $TEMP_URL | cut -d'@' -f2 | cut -d'/' -f1)
    DB_NAME=$(echo $TEMP_URL | cut -d'/' -f2 | cut -d'?' -f1)
}

# Function to check whether to dump the prod DB
should_dump_prod_db() {
    if [ "$FORCE_DUMP" = "true" ]; then
        return 0  # Should dump the prod DB
    else
        return 1  # Should not dump the prod DB
    fi
}

# Function to dump the production database
dump_prod_db() {
    report_progress "Dumping production database..."
    
    rm -rf "$CACHE_DIR"
    mkdir -p "$CACHE_DIR"

    # Set the password as an environment variable
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

# Function to terminate connections to the dev database
terminate_dev_connections() {
    report_progress "Terminating existing connections to dev database..."
    psql -a -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = 'openpipe-dev' AND pid <> pg_backend_pid();"
}

# Function to drop the dev database
drop_dev_db() {
    report_progress "Dropping dev database..."
    dropdb -e openpipe-dev
}

# Function to create the dev database
create_dev_db() {
    report_progress "Creating dev database..."
    createdb -e openpipe-dev
}

# Function to restore the dump to the dev database
restore_to_dev_db() {
    report_progress "Restoring dump to dev database..."
    pg_restore -v --no-owner --no-privileges -d openpipe-dev --format=d --jobs=8 "$CACHE_DIR"
    # pg_restore -v --no-owner --no-privileges -d openpipe-dev --jobs=8 "$PROD_DUMP_FILE"
}

# Main execution

# Check for --force-dump flag
if [[ "$@" == *"--force-dump"* ]]; then
    FORCE_DUMP="true"
else
    FORCE_DUMP="false"
fi

source .env
parse_connection_string

# Conditional check for dumping the prod DB
if should_dump_prod_db; then
    dump_prod_db
else
    report_progress "Skipping production database dump."
fi

terminate_dev_connections
drop_dev_db
create_dev_db
restore_to_dev_db

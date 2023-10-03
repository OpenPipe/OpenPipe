#!/bin/bash
set -e

# Function to display a message with a separator
report_progress() {
    echo "--------------------------------------------"
    echo "$1"
    echo "--------------------------------------------"
}

# Function to parse the connection string and set variables
parse_connection_string() {
    TEMP_URL=${PROD_DATABASE_URL#postgres://}
    USERNAME=$(echo $TEMP_URL | cut -d':' -f1)
    PASSWORD=$(echo $TEMP_URL | cut -d':' -f2 | cut -d'@' -f1)
    HOST=$(echo $TEMP_URL | cut -d'@' -f2 | cut -d'/' -f1)
    DB_NAME=$(echo $TEMP_URL | cut -d'/' -f2 | cut -d'?' -f1)
}

# Function to check whether to dump the prod DB
should_dump_prod_db() {
    if [ ! -f "/tmp/openpipe-prod.db" ] || [ "$FORCE_DUMP" = "true" ]; then
        return 0  # Should dump the prod DB
    else
        return 1  # Should not dump the prod DB
    fi
}

# Function to dump the production database
dump_prod_db() {
    report_progress "Dumping production database..."
    
    # Set the password as an environment variable
    export PGPASSWORD="$PASSWORD"
    
    pg_dump -v -Fc -h "$HOST" -U "$USERNAME" -d "$DB_NAME" > /tmp/openpipe-prod.dump
    
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
    pg_restore -v --no-owner --no-privileges -d openpipe-dev /tmp/openpipe-prod.dump
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

#!/bin/bash
set -e

# Function to display a message with a separator
report_progress() {
    echo "--------------------------------------------"
    echo "$1"
    echo "--------------------------------------------"
}

# Function to dump the production database
dump_prod_db() {
    report_progress "Dumping production database..."
    pg_dump -v -Fc "${PROD_DATABASE_URL}" > /tmp/openpipe-prod.dump
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

# Function to clean up the dump file
cleanup() {
    report_progress "Cleaning up dump file..."
    rm -f /tmp/openpipe-prod.dump
}

# Trap to ensure cleanup happens on exit
trap cleanup EXIT

# Main execution
source .env
dump_prod_db
terminate_dev_connections
drop_dev_db
create_dev_db
restore_to_dev_db

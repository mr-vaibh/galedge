#!/bin/bash
# Runs nightly — fetches latest EOD prices locally, pushes to server
# Schedule with: crontab -e
# Add: 0 22 * * 1-5 /Users/vaibhav.shukla/Developer/galedge/scripts/nightly_ingest.sh

set -e
LOG="/tmp/galedge_ingest_$(date +%Y%m%d).log"
VENV="/Users/vaibhav.shukla/Developer/galedge/.venv/bin/python3"
SCRIPT="/Users/vaibhav.shukla/Developer/galedge/scripts/fetch_prices.py"
SERVER="root@165.232.179.90"
REMOTE_DB="/opt/galedge/backend/galedge_alpha.db"

echo "[$(date)] Starting nightly ingestion..." | tee -a "$LOG"

# Fetch latest prices locally
$VENV "$SCRIPT" >> "$LOG" 2>&1

# Upload CSV and import into server DB
scp /tmp/prices_export.csv "$SERVER":/tmp/prices_export.csv >> "$LOG" 2>&1
ssh "$SERVER" "cd /opt/galedge/backend && /opt/galedge/.venv/bin/python /tmp/import_prices.py >> /tmp/import.log 2>&1" >> "$LOG" 2>&1

echo "[$(date)] Done." | tee -a "$LOG"

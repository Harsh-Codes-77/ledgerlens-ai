#!/usr/bin/env bash
cd /home/harsh/Documents/ledgerLensAI/apps/api || exit 1
PYTHONPATH=/home/harsh/Documents/ledgerLensAI:. exec uvicorn app.main:app --port 8000

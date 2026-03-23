#!/bin/bash
# 備份當前數據庫，準備切換到演示數據
DB_PATH="$(dirname "$0")/../data/tasks.db"
BACKUP_PATH="$(dirname "$0")/../data/tasks.db.real-backup"

if [ ! -f "$DB_PATH" ]; then
  echo "❌ 找不到數據庫：$DB_PATH"
  exit 1
fi

cp "$DB_PATH" "$BACKUP_PATH"
echo "✅ 已備份到 data/tasks.db.real-backup"
echo "   準備好後執行 scripts/demo-seed.js 載入演示數據"

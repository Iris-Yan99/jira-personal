#!/bin/bash
# 演示結束後，還原真實數據庫
DB_PATH="$(dirname "$0")/../data/tasks.db"
BACKUP_PATH="$(dirname "$0")/../data/tasks.db.real-backup"

if [ ! -f "$BACKUP_PATH" ]; then
  echo "❌ 找不到備份文件：$BACKUP_PATH"
  echo "   請確認已執行過 demo-backup.sh"
  exit 1
fi

cp "$BACKUP_PATH" "$DB_PATH"
echo "✅ 已還原真實數據庫"
echo "   重新啟動服務器後生效"

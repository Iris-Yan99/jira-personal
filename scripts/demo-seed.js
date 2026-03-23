/**
 * 演示數據種子腳本
 * 用法：
 *   1. 先執行 bash scripts/demo-backup.sh  （備份真實數據）
 *   2. node scripts/demo-seed.js            （載入演示數據）
 *   3. 錄完視頻後：bash scripts/demo-restore.sh + 重啟服務器
 */

const Database = require('better-sqlite3')
const bcrypt = require('bcrypt')
const path = require('path')

const db = new Database(path.join(__dirname, '../data/tasks.db'))
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = OFF')

// ── 清空現有數據 ─────────────────────────────────────────────────────────────
db.exec(`
  DELETE FROM task_dependencies;
  DELETE FROM task_logs;
  DELETE FROM daily_logs;
  DELETE FROM tasks;
  DELETE FROM members;
  DELETE FROM users;
`)
// 重置自增 ID
db.exec(`
  DELETE FROM sqlite_sequence WHERE name IN ('tasks','users','members','task_logs','daily_logs');
`)

// ── 創建演示用戶（密碼統一 demo123）────────────────────────────────────────────
const hash = bcrypt.hashSync('demo123', 10)
const createUser = db.prepare(`INSERT INTO users (username, display_name, password_hash, role) VALUES (?, ?, ?, ?)`)
const syncMember = db.prepare(`INSERT OR IGNORE INTO members (name) VALUES (?)`)

createUser.run('iris',     'Iris', hash, 'pm')
createUser.run('mingming', '小明', hash, 'member')
createUser.run('fangfang', '小芳', hash, 'member')
createUser.run('huahua',   '小華', hash, 'member')

syncMember.run('Iris')
syncMember.run('小明')
syncMember.run('小芳')
syncMember.run('小華')

// ── 插入演示任務 ──────────────────────────────────────────────────────────────
const ins = db.prepare(`
  INSERT INTO tasks
    (title, status, priority_level, assignee, estimated_hours, deadline, parent_id, progress_percent, completed_at)
  VALUES
    (?, ?, ?, ?, ?, ?, ?, ?, ?)
`)

const done = new Date()
done.setDate(done.getDate() - 5)
const doneStr = done.toISOString().slice(0, 10)

const t = (title, status, priority, assignee, hours, deadline, parentId, progress) => {
  const completedAt = status === 'done' ? doneStr : null
  return ins.run(title, status, priority, assignee || '', hours, deadline || null, parentId || null, progress, completedAt).lastInsertRowid
}

// ── 根任務 ───────────────────────────────────────────────────────────────────
const app     = t('TravelBuddy App 開發',  'in_progress', 'P1', '',     0,  '2026-04-30', null, 55)
const mkt     = t('Q2 行銷推廣計劃',       'in_progress', 'P2', '',     0,  '2026-04-15', null, 35)

// 獨立任務
t('用戶訪談報告',   'todo', 'P3', '小芳', 5,  '2026-04-10', null, 0)
t('競品分析報告',   'todo', 'P3', '小明', 4,  '2026-04-05', null, 0)

// ── TravelBuddy 子任務 ────────────────────────────────────────────────────────
const ui = t('UI/UX 設計',     'done',        'P1', '小芳', 20, '2026-03-20', app, 100)
t('用戶旅程圖',         'done', 'P1', '小芳', 6,  '2026-03-15', ui,  100)
t('主要頁面原型設計',   'done', 'P1', '小芳', 10, '2026-03-18', ui,  100)
t('設計系統建立',       'done', 'P2', '小芳', 4,  '2026-03-20', ui,  100)

const fe = t('前端開發',      'in_progress', 'P1', '小明', 40, '2026-04-25', app, 25)
t('首頁與搜索功能', 'done',        'P1', '小明', 8,  '2026-03-28', fe,  100)
t('行程規劃功能',   'in_progress', 'P1', '小明', 12, '2026-04-10', fe,  50)
t('地圖集成',       'todo',        'P2', '小明', 10, '2026-04-18', fe,  0)
t('用戶個人中心',   'todo',        'P2', '小明', 8,  '2026-04-22', fe,  0)

const be = t('後端開發',      'in_progress', 'P1', '小華', 36, '2026-04-20', app, 30)
t('用戶認證系統',   'done',        'P1', '小華', 8,  '2026-03-25', be,  100)
t('行程數據 API',   'in_progress', 'P1', '小華', 12, '2026-04-08', be,  40)
t('推薦算法開發',   'todo',        'P2', '小華', 16, '2026-04-18', be,  0)

const qa = t('測試與上架',    'todo',        'P2', '',     20, '2026-04-28', app, 0)
t('Beta 測試',            'todo', 'P2', '小明', 8,  '2026-04-24', qa, 0)
t('App Store 審核準備',   'todo', 'P2', '小芳', 6,  '2026-04-26', qa, 0)
t('上線監控方案',         'todo', 'P3', '小華', 4,  '2026-04-28', qa, 0)

// ── 行銷子任務 ────────────────────────────────────────────────────────────────
t('品牌視覺更新',       'done',        'P2', '小芳', 8,  '2026-03-15', mkt, 100)
t('社交媒體矩陣規劃',   'in_progress', 'P3', '小芳', 10, '2026-04-05', mkt, 30)
t('發布會策劃',         'todo',        'P2', '',     15, '2026-04-25', mkt, 0)

db.pragma('foreign_keys = ON')

console.log('✅ 演示數據載入完成！')
console.log('')
console.log('  帳號（密碼統一 demo123）：')
console.log('  ┌─ PM     ─ 帳號: iris      顯示名: Iris')
console.log('  ├─ 成員   ─ 帳號: mingming  顯示名: 小明')
console.log('  ├─ 成員   ─ 帳號: fangfang  顯示名: 小芳')
console.log('  └─ 成員   ─ 帳號: huahua    顯示名: 小華')
console.log('')
console.log('  工作量預覽（折算後）：')
console.log('  小明：約 50h ⚠️ 超載（適合演示重新分配功能）')
console.log('  小華：約 39h ⚠️ 接近上限')
console.log('  小芳：約 25h ✓ 有餘量')
console.log('')
console.log('  演示結束後：bash scripts/demo-restore.sh')

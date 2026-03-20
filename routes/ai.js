const express = require('express');
const router = express.Router();

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const OLLAMA_URL = `${OLLAMA_HOST}/api/chat`;
const MODEL = process.env.OLLAMA_MODEL || 'qwen3-vl:8b-instruct';

async function callOllama(messages, systemPrompt) {
  const msgs = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages;

  const response = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, messages: msgs, stream: false }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ollama error ${response.status}: ${text}`);
  }
  const data = await response.json();
  let text = data.message?.content || '';
  // Strip Qwen3 chain-of-thought thinking blocks
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  return text;
}

// Chat for task input
router.post('/chat', async (req, res) => {
  const { messages } = req.body;
  const today = new Date().toISOString().split('T')[0];

  const systemPrompt = `你是一个专业的任务管理助手，帮助用户记录和管理工作任务。

你的职责：从用户描述中一次性提取所有任务字段，立即输出 TASK_READY，不要逐一追问。

字段提取规则：
- title（必填）：提取任务标题，不超过 30 字
- deadline（必填）：
  - 若描述含明确日期 → 转为 YYYY-MM-DD
  - 若含相对时间："明天"→+1天，"后天"→+2天，"下周"→+7天，"本周五"→本周五日期，"月底"→本月最后一天
  - 若完全无时间信息 → 输出 null
- estimated_hours（选填）：从描述提取小时数，如"半天"→4，"一小时"→1，"两小时"→2；无则默认 2
- importance（选填）：
  - 含"重要/紧急/关键/优先/必须/很重要" → high
  - 含"随便/不急/低优/无所谓/不重要" → low
  - 其他 → mid
- description（选填）：用户原话补充，可为空字符串
- tags（选填）：数组，默认 []

今天日期：${today}

输出规则：
- 先输出一句简短确认（不超过 20 字），然后在末尾单独一行输出 TASK_READY
- deadline 为 null 时也必须输出该字段，不要省略
- 始终用中文回复，语气专业友好
- TASK_READY 格式（末尾单独一行）：
TASK_READY:{"title":"任务标题","description":"描述（可为空字符串）","deadline":"YYYY-MM-DD或null","estimated_hours":数字,"importance":"high/mid/low","tags":[]}`;

  try {
    const content = await callOllama(messages, systemPrompt);
    res.json({ content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Single-shot task extraction for quick create
router.post('/extract-task', async (req, res) => {
  const { description } = req.body;
  if (!description?.trim()) {
    return res.status(400).json({ error: '描述不能为空' });
  }
  const today = new Date().toISOString().split('T')[0];

  const prompt = `从以下描述中提取任务字段，今天日期：${today}

描述：${description}

提取规则：
- title：任务标题，不超过 30 字
- deadline：含日期/相对时间→转 YYYY-MM-DD；"明天"→+1天，"后天"→+2天，"下周"→+7天，"本周五"→本周五日期，"月底"→本月最后一天；无时间信息→null
- estimated_hours：提取小时数，无则默认 2
- importance：含"重要/紧急/关键/优先/必须/很重要"→high；含"随便/不急/低优/无所谓/不重要"→low；其他→mid
- description：补充说明，可为空字符串
- tags：数组，默认 []

只输出 JSON，不要其他任何内容：
{"title":"...","description":"...","deadline":"YYYY-MM-DD或null","estimated_hours":数字,"importance":"high/mid/low","tags":[]}`;

  try {
    const content = await callOllama([{ role: 'user', content: prompt }]);
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI 返回格式错误');
    const task = JSON.parse(jsonMatch[0]);
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Prioritize tasks
router.post('/prioritize', async (req, res) => {
  const { tasks } = req.body;
  const today = new Date().toISOString().split('T')[0];

  const systemPrompt = `你是任务优先级专家。今天日期：${today}

优先级规则：
- P1: 紧急且重要（截止在3天内 且 importance=high）
- P2: 重要不紧急（importance=high 且 截止3天以上）或（截止在7天内 且 importance=mid）
- P3: 紧急不重要（截止在3天内 且 importance!=high）
- P4: 其他情况

priority_score（0-100）计算：
- 截止紧迫度（0-40分）：今天=40, 明天=35, 2天=30, 3天=25, 7天=18, 14天=10, 更远=5, 无截止=0
- 重要程度（0-40分）：high=40, mid=25, low=10
- 工时效率（0-20分）：≤1h=20, ≤2h=16, ≤4h=12, ≤8h=8, >8h=4

只返回JSON数组，不要其他任何内容：
[{"id":任务id,"priority_score":分数,"priority_level":"P1/P2/P3/P4"}]`;

  try {
    const taskList = tasks
      .map(t => `ID:${t.id} 标题:${t.title} 截止:${t.deadline || '无'} 重要程度:${t.importance} 预估工时:${t.estimated_hours}h`)
      .join('\n');

    const content = await callOllama(
      [{ role: 'user', content: `请为以下任务计算优先级：\n${taskList}` }],
      systemPrompt
    );

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('AI 返回格式错误，未找到 JSON 数组');
    const priorities = JSON.parse(jsonMatch[0]);
    res.json({ priorities });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Morning briefing
router.post('/morning', async (req, res) => {
  const { tasks, date } = req.body;

  const systemPrompt = `你是高效工作助手，生成今日工作计划早报。

输出要求：纯文本，结构化，用数字编号和缩进，禁止使用任何 Markdown 符号（##、**、-、| 等）。

按以下格式输出：

今日工作计划  ${date}

一、今日必处理任务（截止今天或已逾期，或进行中）
   1. [任务名]  截止：[日期]  预估：[xh]  优先级：[Px]
   2. ...

二、本周需推进任务（截止本周内，P1/P2）
   1. [任务名]  截止：[日期]  预估：[xh]
   2. ...

三、远期任务（仅提示，暂不安排）
   [任务名]（截止：[日期]）；[任务名]（截止：[日期]）

四、今日工作建议
   1. [具体建议，结合任务紧迫度]
   2. [时间分配建议]
   3. [风险提示]

今日预估总工时：[仅统计一、二中的任务总工时] 小时

语气积极专业，用中文。若某分类无任务则写"无"。`;

  try {
    const taskList = tasks
      .map(t => `[${t.priority_level || 'P4'}] ${t.title} | 截止:${t.deadline || '无'} | ${t.estimated_hours}h | 重要度:${t.importance}`)
      .join('\n');

    const content = await callOllama(
      [{ role: 'user', content: `今日待完成任务：\n${taskList || '暂无任务'}\n\n请生成今日工作早报。` }],
      systemPrompt
    );
    res.json({ content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper: format task_logs into a readable context block
function formatTaskLogContext(taskLogs, tasks) {
  if (!taskLogs || taskLogs.length === 0) return '';
  const typeLabel = { manual: '手动记录', evening_review: '晚间复盘', status_change: '状态变更' };
  const byTask = {};
  taskLogs.forEach(l => {
    const task = tasks.find(t => t.id === l.task_id);
    const key = task?.title || `任务${l.task_id}`;
    if (!byTask[key]) byTask[key] = [];
    byTask[key].push(`   ${l.date} [${typeLabel[l.type] || l.type}] ${l.content}`);
  });
  return '\n\n各任务近期日志记录：\n' +
    Object.entries(byTask)
      .map(([title, entries]) => `${title}：\n${entries.join('\n')}`)
      .join('\n\n');
}

// Daily report
router.post('/daily-report', async (req, res) => {
  const { logs, tasks, date, taskLogs } = req.body;

  const systemPrompt = `你是专业工作汇报助手，生成适合汇报给领导的日报。

输出要求：纯文本，结构化，用数字编号和缩进，禁止使用任何 Markdown 符号（##、**、-）。各任务进展必须用表格形式，列之间用 | 分隔。

按以下格式严格输出：

日报  ${date}

一、今日工作总结
   [两到三句话概述今日整体完成情况和进度]

二、各任务进展
   任务名称 | 完成度 | 进展说明 | 状态
   -------- | ------ | -------- | ----
   [任务1]  | [xx%]  | [说明]   | [进行中/已完成]
   [任务2]  | [xx%]  | [说明]   | [进行中/已完成]

三、遇到的问题
   [具体描述，或写：暂无]

四、明日计划
   1. [任务名]
   2. [任务名]

用正式中文，适合职场汇报。`;

  try {
    const logInfo = logs
      .map(l => {
        const task = tasks.find(t => t.id === l.task_id);
        return `任务:${task?.title || '未知'} 完成度:${l.progress_percent}% 备注:${l.note || '无'}`;
      })
      .join('\n');

    const pendingTasks = tasks.filter(t => t.status !== 'done').map(t => t.title).join('、');
    const logContext = formatTaskLogContext(taskLogs, tasks);

    const content = await callOllama(
      [{ role: 'user', content: `今日工作记录：\n${logInfo || '无记录'}\n\n未完成任务：${pendingTasks || '无'}${logContext}\n\n请生成日报。` }],
      systemPrompt
    );
    res.json({ content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Weekly report
router.post('/weekly-report', async (req, res) => {
  const { tasks, taskLogs, startDate, endDate } = req.body;

  const systemPrompt = `你是专业工作汇报助手，生成周报。

输出要求：纯文本，结构化，用数字编号和缩进，禁止使用任何 Markdown 符号（##、**、-、| 等）。

按以下格式严格输出：

周报  ${startDate} 至 ${endDate}

一、本周工作总结
   [三到五句话概述本周整体工作情况与主要成果]

二、已完成事项
   1. [任务名]
   2. [任务名]

三、进行中事项
   1. [任务名]（当前进度：xx%，说明：xxx）
   2. [任务名]（当前进度：xx%，说明：xxx）

四、下周工作计划
   1. [任务名]（截止：[日期]，优先级：[Px]）
   2. [任务名]（截止：[日期]，优先级：[Px]）

五、总结与建议
   [工作反思、经验总结、改进建议]

用正式中文，适合职场汇报。若某分类无内容则写"无"。`;

  try {
    const taskSummary = tasks
      .map(t => `${t.title} | 状态:${t.status} | 优先级:${t.priority_level} | 截止:${t.deadline || '无'}`)
      .join('\n');

    const logContext = formatTaskLogContext(taskLogs, tasks);
    const content = await callOllama(
      [{ role: 'user', content: `本周任务情况：\n${taskSummary || '暂无任务'}${logContext}\n\n请生成周报。` }],
      systemPrompt
    );
    res.json({ content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Monthly report
router.post('/monthly-report', async (req, res) => {
  const { tasks, taskLogs, month } = req.body;

  const systemPrompt = `你是专业工作汇报助手，生成月报。

输出要求：纯文本，结构化，用数字编号和缩进，禁止使用任何 Markdown 符号（##、**、-、| 等）。

按以下格式严格输出：

月报  ${month}

一、本月工作总结
   [三到五句话概述本月整体工作情况与核心成果]

二、重点成果
   1. [成果描述]
   2. [成果描述]

三、任务完成统计
   总任务数：[x] 个
   已完成：[x] 个（完成率 xx%）
   进行中：[x] 个
   P1/P2 高优先级完成情况：[描述]

四、未完成事项
   1. [任务名]（原因：[说明]）
   2. [任务名]（原因：[说明]）

五、下月工作计划
   1. [任务名]（截止：[日期]，优先级：[Px]）
   2. [任务名]（截止：[日期]，优先级：[Px]）

六、总结与反思
   [工作亮点、存在的问题、改进方向]

用正式中文，适合职场汇报。若某分类无内容则写"无"。`;

  try {
    const taskSummary = tasks
      .map(t => `${t.title} | 状态:${t.status} | 优先级:${t.priority_level} | 截止:${t.deadline || '无'}`)
      .join('\n');

    const logContext = formatTaskLogContext(taskLogs, tasks);
    const content = await callOllama(
      [{ role: 'user', content: `本月任务情况：\n${taskSummary || '暂无任务'}${logContext}\n\n请生成月报。` }],
      systemPrompt
    );
    res.json({ content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Conflict resolution suggestion
router.post('/conflict-suggest', async (req, res) => {
  const { task, conflicts, allTasks } = req.body;
  const today = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  try {
    const takenDates = [
      ...new Set(
        (allTasks || [])
          .filter((t) => t.deadline && t.status !== 'done')
          .map((t) => t.deadline)
      ),
    ]
      .sort()
      .join('、') || '无';

    const prompt = `任务：${task.title}，截止：${task.deadline}，预估：${task.estimated_hours}h，优先级：${task.priority_level || 'P4'}

冲突：
${(conflicts || []).map((c, i) => `${i + 1}. ${c}`).join('\n')}

其他任务已占用的截止日期：${takenDates}
今天：${todayStr}

请推荐一个调整方案，严格按以下格式输出两行（不要其他内容）：
建议日期：YYYY-MM-DD
建议说明：[一句话说明原因]`;

    const content = await callOllama([{ role: 'user', content: prompt }]);
    const dateMatch = content.match(/建议日期[：:]\s*(\d{4}-\d{2}-\d{2})/);
    const suggestedDate = dateMatch ? dateMatch[1] : null;
    res.json({ suggestion: content, suggestedDate });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// AI project breakdown: generate milestone + task plan from project goal
router.post('/breakdown-project', async (req, res) => {
  const { title, description, deadline, background } = req.body;
  if (!title || !deadline) return res.status(400).json({ error: 'title and deadline are required' });

  const todayStr = new Date().toISOString().slice(0, 10);
  const prompt = `你是一個專業的項目管理顧問。根據以下項目信息，生成詳細的項目計劃，包含里程碑和任務分解。

項目名稱：${title}
項目目標：${description || '（未提供）'}
截止日期：${deadline}
背景信息：${background || '（未提供）'}
今天日期：${todayStr}

請嚴格按以下 JSON 格式輸出（只輸出 JSON，不要任何說明、標記或前綴）：
{"milestones":[{"title":"里程碑名稱","deadline":"YYYY-MM-DD","description":"里程碑說明","tasks":[{"title":"任務名稱","estimated_hours":4,"importance":"high","description":"任務說明"}]}]}

要求：
- 生成 3-5 個里程碑，按時間順序排列
- 每個里程碑 3-6 個任務
- 最後里程碑截止日期 ≤ 項目截止日期 ${deadline}
- estimated_hours 範圍 1-16
- importance 只能是 high/mid/low`;

  try {
    const content = await callOllama([{ role: 'user', content: prompt }]);
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(422).json({ error: 'AI 未返回有效 JSON，請重試', raw: content });
    const plan = JSON.parse(jsonMatch[0]);
    res.json(plan);
  } catch (error) {
    if (error instanceof SyntaxError) return res.status(422).json({ error: 'AI 返回的 JSON 格式無效，請重試' });
    res.status(500).json({ error: error.message });
  }
});

// AI estimate hours for a task based on historical work logs
router.post('/estimate-hours', async (req, res) => {
  const { title, description, tags, importance } = req.body;
  const db = require('../db');

  // Fetch completed tasks with actual hours logged
  const history = db.prepare(`
    SELECT t.title, t.description, t.tags, t.importance, t.estimated_hours,
      COALESCE((SELECT SUM(l.hours_logged) FROM daily_logs l WHERE l.task_id = t.id), 0) AS actual_hours
    FROM tasks t
    WHERE t.status = 'done'
      AND (SELECT SUM(l.hours_logged) FROM daily_logs l WHERE l.task_id = t.id) > 0
    ORDER BY t.updated_at DESC
    LIMIT 20
  `).all();

  if (history.length === 0) {
    return res.json({ estimated: null, reasoning: '暫無歷史工時數據，無法預估。請先完成一些任務並記錄工時。' });
  }

  const historyText = history.map(t => {
    const tagsArr = JSON.parse(t.tags || '[]');
    return `- 任務：${t.title}（重要度：${t.importance}，標籤：${tagsArr.join('/')||'無'}）\n  預估 ${t.estimated_hours}h，實際 ${t.actual_hours.toFixed(1)}h`;
  }).join('\n');

  const newTagsArr = Array.isArray(tags) ? tags : [];
  const prompt = `你是一個工時預估專家。根據以下歷史任務工時數據，為新任務預估所需工時。

歷史已完成任務工時記錄：
${historyText}

新任務信息：
- 標題：${title}
- 描述：${description || '（無）'}
- 重要度：${importance || 'mid'}
- 標籤：${newTagsArr.join('/') || '無'}

請分析歷史數據中相似任務的實際工時，給出預估。嚴格按以下格式輸出兩行（不要其他內容）：
預估工時：X.X
預估說明：[一句話說明參考依據]`;

  try {
    const content = await callOllama([{ role: 'user', content: prompt }]);
    const hoursMatch = content.match(/預估工時[：:]\s*([\d.]+)/);
    const estimated = hoursMatch ? parseFloat(hoursMatch[1]) : null;
    res.json({ estimated, reasoning: content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Extract project metadata from document text
router.post('/extract-project-meta', async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: '文字內容不能為空' });

  const todayStr = new Date().toISOString().slice(0, 10);
  const prompt = `你是一個項目管理顧問。從以下項目文件文字中提取項目基本信息。
今天日期：${todayStr}

文件內容：
${text.slice(0, 8000)}

嚴格按以下 JSON 格式輸出（只輸出 JSON，不要任何說明）：
{
  "title": "項目名稱，30字以內，提取不到則null",
  "deadline": "截止日期，轉為YYYY-MM-DD，提取不到則null",
  "description": "項目目標或描述，200字以內，提取不到則空字符串",
  "background": "背景信息、團隊、資源等，200字以內，提取不到則空字符串",
  "missing": ["title或deadline中提取不到的字段名"],
  "confidence": {
    "title": "high或low",
    "deadline": "high或low",
    "description": "high或low",
    "background": "high或low"
  }
}

規則：
- deadline 若文件有明確日期（如「2026年6月30日」「Q2末」「6月底」）→ 轉 YYYY-MM-DD，confidence=high
- deadline 若只有模糊描述（如「盡快」「近期」）→ 猜一個合理日期，confidence=low
- deadline 若完全沒有提及 → null，放入 missing
- title 若提取不到 → null，放入 missing`;

  try {
    const content = await callOllama([{ role: 'user', content: prompt }]);
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(422).json({ error: 'AI 未返回有效 JSON，請重試', raw: content });
    const meta = JSON.parse(jsonMatch[0]);
    res.json(meta);
  } catch (err) {
    if (err instanceof SyntaxError) return res.status(422).json({ error: 'AI 返回格式無效，請重試' });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

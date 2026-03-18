# 安装指南

## 系统要求

- Claude Code CLI（最新版本）
- Git（可选，用于版本控制）

## 安装方式

### 方式 1：直接复制

```bash
# 克隆或下载此技能包
git clone <repo-url> skills-pack

# 复制到你的项目
cp -r skills-pack/.claude/ /path/to/your/project/.claude/
```

### 方式 2：作为子模块

```bash
# 在你的项目中添加子模块
cd /path/to/your/project
git submodule add <repo-url> .claude-pack

# 创建符号链接
ln -s .claude-pack/.claude .claude
```

### 方式 3：选择性复制

```bash
# 只复制核心层
cp -r skills-pack/.claude/skills/core/ /path/to/your/project/.claude/skills/

# 只复制测试层
cp -r skills-pack/.claude/skills/testing/ /path/to/your/project/.claude/skills/

# 复制技能索引
cp skills-pack/.claude/skills/SKILL-CATALOG.md /path/to/your/project/.claude/skills/
```

## 验证安装

在 Claude Code 中输入：

```
/onboard
```

如果看到项目检测和技能推荐，说明安装成功。

## 更新

```bash
# 如果是直接复制，重新复制即可
cp -r skills-pack/.claude/ /path/to/your/project/.claude/

# 如果是子模块
cd /path/to/your/project
git submodule update --remote .claude-pack
```

## 卸载

```bash
rm -rf /path/to/your/project/.claude/
```

## 常见问题

### Q: 技能没有被识别？

检查文件结构：
```bash
ls -la /path/to/your/project/.claude/skills/
```

应该看到 `core/`、`workflow/` 等目录。

### Q: Router 不工作？

确保 `SKILL-CATALOG.md` 存在：
```bash
ls /path/to/your/project/.claude/skills/SKILL-CATALOG.md
```

### Q: 想只使用部分技能？

参考"自定义"章节，删除不需要的目录。
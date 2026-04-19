# Draft: Oh-My-OpenAgent Agent Name 显示问题修复

## 问题确认

### 官方 Issue 信息
- **主要 Issue**: [#22019](https://github.com/anomalyco/opencode/issues/22019) - Agent name 不再完整显示
- **根本原因**: 零宽空格字符 (`\u200b`) 污染 + TUI 宽度计算问题
- **状态**: Open，活跃 bug

### 本地代码分析 (Agent: explore)
**发现问题**: 配置文件本身干净（无零宽空格），但发现另一个显示不一致问题：

#### 不一致的显示名称
- `oracle` → 显示 "oracle"（小写） ❌
- `librarian` → 显示 "librarian"（小写） ❌
- `explore` → 显示 "explore"（小写） ❌
- `sisyphus` → 显示 "Sisyphus - Ultraworker" ✓
- `prometheus` → 显示 "Prometheus - Plan Builder" ✓

#### 问题位置
1. `/Users/ludwig/.bun/install/cache/oh-my-openagent@3.17.4@@@1/dist/shared/agent-display-names.d.ts`
   - `AGENT_DISPLAY_NAMES` 映射中这三个 agent 的显示名称为小写

2. `/Users/ludwig/.bun/install/cache/oh-my-openagent@3.17.4@@@1/dist/cli/index.js` (约第 76232 行)
   - 直接使用 `agent.name` 而不是 `getAgentDisplayName(agent.name)`

## 用户问题确认

**需要用户回答**:
1. 当前 opencode 版本？ (`opencode --version`)
2. 具体看到的问题表现：
   - 是完全不显示 agent name？
   - 还是显示被截断？
   - 还是显示为小写/乱码？
3. 期望的修复方式：
   - 更新 opencode 版本
   - 修改配置文件
   - 修复代码本身

## 可能的修复方案

### 方案 1：更新 opencode 和插件
```bash
opencode update
# 或
npm install -g opencode-ai@latest
```

### 方案 2：配置 agent_display_names（绕过问题）
在 `oh-my-openagent.jsonc` 中添加：
```jsonc
{
  "agent_display_names": {
    "oracle": "Oracle",
    "librarian": "Librarian",
    "explore": "Explore"
  }
}
```

### 方案 3：修复缓存中的映射（临时）
修改 `/Users/ludwig/.bun/install/cache/oh-my-openagent@3.17.4@@@1/dist/shared/agent-display-names.js`

## 下一步
等待用户确认具体问题和期望方案后，生成正式 work plan。

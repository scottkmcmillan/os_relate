# Hive Mind Architecture Fix Report

**Date**: 2025-12-26
**Issue**: Claude Code takes over Queen role instead of delegating
**Status**: Fix implemented locally, upstream patch recommended

---

## Problem Statement

When running `npx claude-flow hive-mind spawn "objective"`, the system injects a prompt into Claude Code that says:

```
You are the Queen coordinator of a Hive Mind swarm...
```

This causes Claude Code to **become** the Queen and do all the work directly, rather than spawning a Queen agent who then coordinates workers.

### Observed Behavior

```
npx hive-mind spawn → Claude Code receives Queen prompt →
Claude Code acts as Queen → Claude Code does work directly (using Bash, Read, Write, etc.)
```

### Expected Behavior

```
npx hive-mind spawn → Claude Code spawns Queen agent →
Queen agent spawns workers → Workers do the actual work →
Queen aggregates results → Claude Code receives final output
```

---

## Root Cause Analysis

**File**: `node_modules/claude-flow/src/cli/simple-commands/hive-mind.js`
**Function**: `generateHiveMindPrompt()` (line ~2392)

The prompt generation function creates instructions that make Claude Code the Queen:

```javascript
return `🧠 HIVE MIND COLLECTIVE INTELLIGENCE SYSTEM
═══════════════════════════════════════════════

You are the Queen coordinator of a Hive Mind swarm...  // ❌ PROBLEM
```

The prompt tells Claude Code to use `Task()` to spawn workers, but Claude Code often bypasses this and does the work directly because:

1. It's more efficient in the moment
2. There's no enforcement mechanism
3. The "Queen role" is ambiguous - Claude Code thinks IT is the Queen

---

## Solution

### Architectural Change

The prompt should NOT make Claude Code the Queen. Instead, it should instruct Claude Code to **spawn** a Queen agent:

**Before (broken)**:
```
"You are the Queen coordinator..." → Claude Code becomes Queen
```

**After (fixed)**:
```
"You are the Hive Mind Launcher. Spawn a Queen Coordinator agent..." → Queen is a separate agent
```

### Local Fix Implemented

Created `/home/scott/projects/QB-AI/agentic_labs/ranger/.claude/commands/hive-mind-launch.md`

This new command enforces proper delegation:

```markdown
When this command is invoked, you MUST:
1. DO NOT become the Queen yourself
2. DO NOT use Read, Write, Edit, Bash, Grep, Glob tools directly
3. ONLY use the Task tool to spawn agents
```

### Recommended Upstream Fix

Modify `generateHiveMindPrompt()` in `hive-mind.js`:

```javascript
function generateHiveMindPrompt(swarmId, swarmName, objective, workers, workerGroups, flags) {
  return `🧠 HIVE MIND LAUNCHER
═══════════════════════════════════════════════

You are Claude Code. Your role is to LAUNCH the Hive Mind, NOT to BE the Hive Mind.

CRITICAL: You must IMMEDIATELY spawn a Queen Coordinator agent. Do NOT do the work yourself.

SWARM CONFIGURATION:
📌 Swarm ID: ${swarmId}
📌 Objective: ${objective}
👑 Queen Type: ${flags.queenType || 'strategic'}
🐝 Workers: ${Object.keys(workerGroups).join(', ')}

EXECUTE THIS NOW (Single Message):

Task("Queen Coordinator", \`
You are the Queen Coordinator for Hive Mind ${swarmId}.

OBJECTIVE: ${objective}

YOUR RESPONSIBILITIES:
1. Spawn worker agents using Task() tool
2. Coordinate their work via mcp__claude-flow__memory_store
3. Monitor progress and adjust strategy
4. Aggregate results and report completion

SPAWN THESE WORKERS (in a single message):
${Object.keys(workerGroups).map(type =>
  `Task("${type} Agent", "Execute ${type} tasks for: ${objective}", "${type}")`
).join('\n')}

BEGIN IMMEDIATELY.
\`, "queen-coordinator")

AFTER SPAWNING THE QUEEN:
- Monitor progress using mcp__claude-flow__swarm_status
- Wait for completion
- Report final results to the user

RESTRICTIONS:
❌ DO NOT use Read, Write, Edit, Bash directly for the objective
❌ DO NOT act as the Queen - you are the LAUNCHER
❌ DO NOT bypass the agent hierarchy
`;
}
```

---

## Implementation Details

### Tool Restrictions for Launcher Role

The Claude Code launcher should only use:
- ✅ `Task` (to spawn Queen and monitor)
- ✅ `TodoWrite` (to track progress)
- ✅ `AskUserQuestion` (for clarification)
- ✅ MCP coordination tools (`swarm_status`, `memory_usage`)

The launcher should NOT use:
- ❌ `Bash` (workers do this)
- ❌ `Read/Write/Edit` (workers do this)
- ❌ `Grep/Glob` (workers do this)
- ❌ `WebFetch/WebSearch` (workers do this)

### Enforcement Options

1. **Prompt-based** (current fix): Clear instructions in the prompt
2. **Hook-based**: Pre-tool hooks that reject restricted tools during hive-mind mode
3. **Skill-based**: A skill that overrides the default hive-mind behavior

---

## Files Changed

| File | Change |
|------|--------|
| `.claude/commands/hive-mind-launch.md` | NEW - Proper launcher command |
| `docs/HIVE_MIND_ARCHITECTURE_FIX.md` | NEW - This documentation |

## Recommended Upstream Changes

| File | Change |
|------|--------|
| `src/cli/simple-commands/hive-mind.js` | Modify `generateHiveMindPrompt()` to create launcher prompt |
| `.claude/commands/hive-mind/hive-mind-spawn.md` | Update documentation |

---

## Testing the Fix

### Before (broken)
```bash
npx claude-flow hive-mind spawn "test database ingestion"
# Result: Claude Code does all the work directly
```

### After (fixed)
```bash
# Use the new launcher command
/hive-mind-launch "test database ingestion"
# Result: Claude Code spawns Queen → Queen spawns workers → Workers execute
```

---

## Summary

The core issue is that the hive-mind system makes Claude Code "become" the Queen instead of spawning a Queen agent. This violates the multi-agent architecture principle and causes single-agent execution.

The fix is straightforward: change the prompt from "You ARE the Queen" to "Spawn a Queen agent." This ensures proper delegation and true multi-agent coordination.

---

**Report Generated By**: Hive Mind Analysis System
**Version**: 1.0.0

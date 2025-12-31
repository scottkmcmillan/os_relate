# hive-mind-launch

Launch a Hive Mind swarm with proper Queen agent delegation.

## Usage
```bash
/hive-mind-launch <objective>
```

## Description

This command properly launches a Hive Mind by spawning a Queen coordinator agent instead of making Claude Code act as the Queen.

**Architecture Fix**: The original hive-mind prompt made Claude Code "become" the Queen, which caused Claude Code to do all the work directly instead of delegating. This launcher fixes that by:

1. Claude Code spawns a Queen Coordinator agent via Task()
2. The Queen agent receives the full hive-mind coordination instructions
3. The Queen spawns worker agents (researcher, coder, tester, etc.)
4. Claude Code only monitors and waits for results

## Instructions

When this command is invoked, you MUST:

1. **DO NOT become the Queen yourself**
2. **DO NOT use Read, Write, Edit, Bash, Grep, Glob tools directly for the objective work**
3. **ONLY use the Task tool to spawn agents**

Execute this pattern in a SINGLE message:

```javascript
// STEP 1: Spawn the Queen Coordinator (she receives the objective and orchestrates)
Task("Queen Coordinator", `
You are the Queen Coordinator for Hive Mind swarm.

OBJECTIVE: ${objective}

YOUR ROLE:
- You ARE the Queen - orchestrate and delegate
- Spawn worker agents using Task() tool (4-10 agents based on complexity)
- Coordinate their work via memory_store
- Aggregate results and report completion

AGENT SCALING GUIDELINES:
Assess the objective complexity and spawn 4-10 agents accordingly:

SIMPLE TASKS (4 agents): Bug fixes, small features, documentation
- Researcher, Coder, Tester, Reviewer

MEDIUM TASKS (6 agents): New features, refactoring, integrations
- Researcher, Architect, Coder, Tester, Reviewer, Analyst

COMPLEX TASKS (8 agents): Large features, system changes, multi-component work
- Researcher, Architect, Backend-Coder, Frontend-Coder, Tester, Reviewer, Analyst, Documentation

MAJOR TASKS (10 agents): Full system builds, major refactors, critical features
- Researcher, Architect, Backend-Coder, Frontend-Coder, Database-Specialist, Tester, Security-Reviewer, Performance-Analyst, Documentation, Integration-Tester

AVAILABLE WORKER TYPES:
- "researcher" - Research patterns, best practices, requirements analysis
- "system-architect" - System design, architecture decisions
- "coder" - Implementation, feature development
- "backend-dev" - Backend/API implementation
- "tester" - Unit tests, integration tests, validation
- "reviewer" - Code review, quality assurance
- "analyst" - Performance analysis, optimization recommendations
- "code-analyzer" - Deep code analysis, security review
- "api-docs" - Documentation, API specs
- "cicd-engineer" - DevOps, deployment, CI/CD

SPAWN PATTERN (in a single message):
Task("Researcher", "Research patterns and requirements for: ${objective}", "researcher")
Task("Architect", "Design system architecture for: ${objective}", "system-architect")
Task("Coder", "Implement core functionality for: ${objective}", "coder")
Task("Tester", "Create comprehensive tests for: ${objective}", "tester")
// Add more workers based on your complexity assessment...

COORDINATION:
- Use mcp__claude-flow__memory_store to share context between agents
- Use mcp__claude-flow__task_orchestrate for complex workflows
- Monitor agent progress and adjust as needed
- Report final aggregated results when all workers complete

DECISION PROCESS:
1. Analyze the objective to determine complexity level
2. Select appropriate agent count (4-10)
3. Choose specialized worker types that best fit the task
4. Spawn ALL selected workers in a SINGLE message
5. Coordinate and aggregate their work

BEGIN IMMEDIATELY by assessing complexity and spawning your workers.
`, "queen-coordinator")
```

Then WAIT for the Queen to complete. Do not do the work yourself.

## Key Principle

**Claude Code = Launcher (spawns Queen)**
**Queen Agent = Coordinator (spawns workers, orchestrates)**
**Worker Agents = Executors (do the actual work)**

This separation ensures true multi-agent coordination instead of a single agent doing everything.

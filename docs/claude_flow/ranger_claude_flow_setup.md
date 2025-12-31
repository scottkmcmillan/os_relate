# Ranger Claude Flow Setup

This document summarizes the Claude Flow configuration and improvements for the Ranger project.

## General setup
 ### Step 1: INSTALL the package (you did this already)
  npm install claude-flow@alpha

  ### Step 2: RUN the package
  npx claude-flow sparc modes

  Think of it like:
  - npm install = Download and save the tool to your toolbox
  - npx = Pick up the tool and use it

  Your workflow:
  ### Install once (already done ✅)
  npm install claude-flow@alpha

  ### Run anytime
  Either in 1. Claude code - use hive-mind-launch "task" --claude
  2. 
  nxp claude-flow hive-mind spawn "" --sparc --claude
  npx claude-flow sparc modes
  npx claude-flow init
  npx claude-flow --version

  The only way to skip npx is to install globally:
  npm install -g claude-flow@alpha
  claude-flow sparc modes  # now works without npx

  But for project work, npx is preferred - it uses the exact version in your package.json.


## Hive Mind Launch Improvements

### Dynamic Agent Scaling (4-10 Agents)

The `/hive-mind-launch` command now supports dynamic agent scaling based on task complexity. The Queen Coordinator intelligently assesses objectives and spawns the appropriate number of worker agents.

#### Complexity Tiers

| Tier | Agent Count | Use Cases |
|------|-------------|-----------|
| Simple | 4 | Bug fixes, small features, documentation updates |
| Medium | 6 | New features, refactoring, integrations |
| Complex | 8 | Large features, system changes, multi-component work |
| Major | 10 | Full system builds, major refactors, critical features |

#### Agent Configurations by Tier

**Simple (4 agents):**
- Researcher, Coder, Tester, Reviewer

**Medium (6 agents):**
- Researcher, Architect, Coder, Tester, Reviewer, Analyst

**Complex (8 agents):**
- Researcher, Architect, Backend-Coder, Frontend-Coder, Tester, Reviewer, Analyst, Documentation

**Major (10 agents):**
- Researcher, Architect, Backend-Coder, Frontend-Coder, Database-Specialist, Tester, Security-Reviewer, Performance-Analyst, Documentation, Integration-Tester

### Available Worker Types

| Worker Type | Agent ID | Responsibilities |
|-------------|----------|------------------|
| Researcher | `researcher` | Research patterns, best practices, requirements analysis |
| Architect | `system-architect` | System design, architecture decisions |
| Coder | `coder` | Implementation, feature development |
| Backend Dev | `backend-dev` | Backend/API implementation |
| Tester | `tester` | Unit tests, integration tests, validation |
| Reviewer | `reviewer` | Code review, quality assurance |
| Analyst | `analyst` | Performance analysis, optimization recommendations |
| Code Analyzer | `code-analyzer` | Deep code analysis, security review |
| Documentation | `api-docs` | Documentation, API specs |
| DevOps | `cicd-engineer` | DevOps, deployment, CI/CD |

## Architecture

### Separation of Concerns

The Hive Mind follows a strict separation pattern:

```
Claude Code = Launcher (spawns Queen)
     |
     v
Queen Agent = Coordinator (spawns workers, orchestrates)
     |
     v
Worker Agents = Executors (do the actual work)
```

This prevents Claude Code from doing all work directly and ensures true multi-agent coordination.

### Queen Decision Process

1. Analyze objective to determine complexity level
2. Select appropriate agent count (4-10)
3. Choose specialized worker types that best fit the task
4. Spawn ALL selected workers in a SINGLE message
5. Coordinate and aggregate their work

### Memory Coordination

Agents coordinate via Claude Flow's memory system:

```javascript
// Share context between agents
mcp__claude-flow__memory_store("swarm/shared/context", { ... })

// Orchestrate complex workflows
mcp__claude-flow__task_orchestrate({ task: "...", strategy: "parallel" })
```

## Usage

```bash
/hive-mind-launch "Build a REST API with authentication"
```

The Queen will:
1. Assess this as a "Medium" complexity task
2. Spawn 6 agents (Researcher, Architect, Coder, Tester, Reviewer, Analyst)
3. Coordinate their work via memory
4. Aggregate and report final results

## Configuration Files

| File | Purpose |
|------|---------|
| `.claude/commands/hive-mind-launch.md` | Main command definition |
| `.claude/agents/swarm/hierarchical-coordinator.md` | Queen coordinator agent |
| `.claude/skills/swarm-orchestration/SKILL.md` | Swarm orchestration skill |

## Swarm Limits

The hierarchical topology supports up to 10 agents:

```bash
mcp__claude-flow__swarm_init hierarchical --maxAgents=10 --strategy=adaptive
```

## Related Documentation

- [HIVE_MIND_ARCHITECTURE_FIX.md](../HIVE_MIND_ARCHITECTURE_FIX.md) - Architecture fix details
- [CLAUDE.md](../../CLAUDE.md) - Main Claude Code configuration

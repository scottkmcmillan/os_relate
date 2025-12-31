
!! Keep up to date with the same named file in windsurf workspace

# open VS Code from the project folder (e.g. .../ranger or the root scottmsi)
```bash
  code .
```
Opens VScode

# Now in VScode, Start Claude in a vscode terminal: 
```bash
claude --dangerously-skip-permissions 
```
(log in to it using either Claude Max (recommended) or Anthropic API keys)

# Now run claude-flow with claude code 
## Option 1: In claude code prompt (works)
upload still fails, search works so run hive-mind-launch "investigate the upload problem, fix it and test it" --claude --autospawn

## Option 2: In terminal
In a terminal (not in claude code) (verifying it works)

```bash
npx claude-flow hive-mind spawn "task" --claude --auto-spawn
```
Ask claude to show the agent outputs stating where they are at in their tasks

# SPARC Methodology 

Spec a new web application as described in /docs/v2_PKA/PKA-STAT_product_decription.md
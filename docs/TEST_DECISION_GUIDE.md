# RKM Test Decision Guide

## Which test should I run?

```
┌─────────────────────────────────────────┐
│   What do you want to do?              │
└─────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌──────────────┐        ┌──────────────┐
│  First-time  │        │   Regular    │
│    setup?    │        │ development? │
└──────┬───────┘        └───────┬──────┘
       │                        │
       ▼                        ▼
   [Path A]                 [Path B]
```

---

## Path A: First-Time Setup / Installation Verification

### Step 1: Quick Health Check (30 seconds)

**Goal**: Verify basic functionality immediately

**Run**:
```bash
# Follow commands from QUICK_TEST_REFERENCE.md
npm install && npm run build
echo "# Test\nVector embeddings test." > /tmp/test.md
node dist/cli.js ingest --path /tmp/test.md --db ./test.db
node dist/cli.js search "vector" --db ./test.db -k 1
```

**Success**: Search returns results ✓
**Failure**: Go to Step 2 ↓

---

### Step 2: Automated Scenario Testing (2-3 minutes)

**Goal**: Run comprehensive automated verification

**Run**:
```bash
bash tests/run-scenarios.sh --verbose
```

**This tests**:
- ✓ All 10 core scenarios
- ✓ ~50 individual checks
- ✓ Multiple file formats
- ✓ All output formats
- ✓ Error handling

**Success**: "All tests passed" ✓
**Failure**: Review specific scenario failures, see TEST_SCENARIOS.md ↓

---

### Step 3: Manual Scenario Walkthrough (10-15 minutes)

**Goal**: Manually verify each feature step-by-step

**Run**: Follow [TEST_SCENARIOS.md](./TEST_SCENARIOS.md)

**Work through**:
1. Basic Ingestion Test
2. Search Test
3. Status Test
4. Context Export Test
5. Route Test
6. Graph Query Test
7. Multi-File Ingestion Test
8. Search Output Formats Test
9. Legacy Mode Compatibility Test
10. Error Handling Test

**Success**: All scenarios work ✓
**Failure**: See troubleshooting in TEST_SCENARIOS.md ↓

---

## Path B: Regular Development / Testing

### For Quick Validation (30 seconds)

**When**: Before committing, quick sanity check

**Run**:
```bash
npm test -- --run
```

**Tests**: Core functionality (91+ tests)

---

### For CLI Changes (1-2 minutes)

**When**: Modified CLI commands or options

**Run**:
```bash
# Focused CLI tests
npm test -- tests/cli/cli.test.ts

# User-facing verification
bash tests/run-scenarios.sh
```

**Tests**: All CLI commands and user workflows

---

### For Feature Development (2-3 minutes)

**When**: Adding new features, refactoring

**Run**:
```bash
# Full test suite with coverage
npm run test:coverage

# Specific test files
npm test -- tests/memory/
npm test -- tests/ingestion/
npm test -- tests/tools/
```

**Tests**: Complete codebase coverage

---

### For Release Preparation (5 minutes)

**When**: Preparing for release, major changes

**Run**:
```bash
# 1. Full test suite
npm run test:coverage

# 2. Automated scenarios
bash tests/run-scenarios.sh

# 3. User test runner
npx tsx tests/cli/userTest.ts --verbose

# 4. Manual smoke test (optional)
# Quick test from QUICK_TEST_REFERENCE.md
```

**Tests**: Everything - unit, integration, scenarios, user tests

---

## Flowchart: Choosing Your Test Strategy

```
                   START
                     │
                     ▼
            ┌────────────────┐
            │ What's your    │
            │ goal?          │
            └────┬───────────┘
                 │
     ┌───────────┼───────────┐
     │           │           │
     ▼           ▼           ▼
┌─────────┐ ┌─────────┐ ┌─────────┐
│ Verify  │ │ Develop │ │ Debug   │
│ Install │ │ Feature │ │ Issue   │
└────┬────┘ └────┬────┘ └────┬────┘
     │           │           │
     ▼           ▼           ▼
   QUICK       VITEST     SCENARIOS
    TEST        SUITE      VERBOSE
     │           │           │
     ▼           ▼           ▼
  PASS?       PASS?       FOUND?
   │ │         │ │         │ │
  YES NO      YES NO      YES NO
   │  │        │  │        │  │
   ▼  ▼        ▼  ▼        ▼  ▼
  ✓  RUN      ✓  FIX      ✓  STILL
    SCENARIOS    SPECIFIC     STUCK?
                 TESTS         │
                              ▼
                            MANUAL
                           SCENARIOS
```

---

## Decision Matrix

| Situation | Test Type | Time | Command |
|-----------|-----------|------|---------|
| 🆕 First install | Quick Test | 30s | See QUICK_TEST_REFERENCE.md |
| 🔍 Installation failed | Automated Scenarios | 2-3min | `bash tests/run-scenarios.sh --verbose` |
| 🐛 Specific feature broken | Manual Scenario | 1-2min | Follow specific scenario in TEST_SCENARIOS.md |
| 💻 Before commit | Vitest Suite | 30s | `npm test -- --run` |
| 🔧 CLI changes | CLI Tests + Scenarios | 2min | `npm test -- tests/cli/` + scenarios script |
| 🚀 New feature | Full Suite + Coverage | 3min | `npm run test:coverage` |
| 📦 Pre-release | Everything | 5min | All tests |
| 🏃 CI/CD Pipeline | Automated + JSON | 3min | Scripts with `--json` output |
| 👤 User reported issue | User Test Runner | 30s | `npx tsx tests/cli/userTest.ts --verbose` |
| 📊 Coverage check | Coverage Report | 2min | `npm run test:coverage` |

---

## Test Type Comparison

### Quick Test (QUICK_TEST_REFERENCE.md)

**Pros**:
- ✓ Fastest (30 seconds)
- ✓ Immediate feedback
- ✓ Easy copy-paste commands
- ✓ Minimal setup

**Cons**:
- ✗ Limited coverage
- ✗ Only tests basic flow
- ✗ No error scenarios

**Best for**: First-time verification, smoke testing

---

### Automated Scenarios (run-scenarios.sh)

**Pros**:
- ✓ Comprehensive (10 scenarios)
- ✓ Automated execution
- ✓ Human-readable output
- ✓ Tests real user workflows
- ✓ Colorized output

**Cons**:
- ✗ Takes 2-3 minutes
- ✗ Requires bash
- ✗ Less granular than unit tests

**Best for**: Installation verification, regression testing, CI/CD

---

### Manual Scenarios (TEST_SCENARIOS.md)

**Pros**:
- ✓ Step-by-step guidance
- ✓ Educational
- ✓ Shows expected outputs
- ✓ Detailed troubleshooting
- ✓ Copy-paste friendly

**Cons**:
- ✗ Manual execution (10-15 min)
- ✗ Prone to human error
- ✗ Not automated

**Best for**: Learning the system, debugging specific issues, writing documentation

---

### Vitest Suite (npm test)

**Pros**:
- ✓ Fast (30-60 seconds)
- ✓ Granular (91+ tests)
- ✓ Excellent coverage
- ✓ Developer-friendly
- ✓ Watch mode available
- ✓ Coverage reports

**Cons**:
- ✗ Requires dev environment
- ✗ Less user-friendly output
- ✗ Doesn't test end-user workflows

**Best for**: Development, TDD, code coverage, CI/CD

---

### User Test Runner (userTest.ts)

**Pros**:
- ✓ User-friendly output
- ✓ Quick (30 seconds)
- ✓ JSON output option
- ✓ Good for CI/CD
- ✓ Tests CLI interface

**Cons**:
- ✗ Limited to CLI testing
- ✗ Less comprehensive than full suite
- ✗ Requires TypeScript execution

**Best for**: User acceptance testing, verifying CLI works for end users

---

## Common Scenarios

### "I just installed RKM, does it work?"

→ **Quick Test** (30 seconds)
```bash
# Follow QUICK_TEST_REFERENCE.md minimal example
npm install && npm run build
# ... run quick test ...
```

If passes: ✓ You're good to go!
If fails: → Run automated scenarios

---

### "I made changes to the CLI code"

→ **CLI Tests + Scenarios** (2 minutes)
```bash
npm test -- tests/cli/cli.test.ts
bash tests/run-scenarios.sh
```

---

### "I'm getting an error when searching"

→ **Manual Scenario #2** (2 minutes)
- Follow TEST_SCENARIOS.md, Scenario 2: Search Test
- Compare your output with expected output
- Check troubleshooting section

---

### "I need to verify all features before release"

→ **Full Test Suite** (5 minutes)
```bash
npm run test:coverage          # Vitest with coverage
bash tests/run-scenarios.sh    # Automated scenarios
npx tsx tests/cli/userTest.ts  # User tests
# Manual smoke test (optional)
```

---

### "CI/CD pipeline needs to verify the build"

→ **Automated with JSON Output** (3 minutes)
```bash
npm test -- --reporter=json --outputFile=vitest-results.json
bash tests/run-scenarios.sh > scenario-results.log 2>&1
npx tsx tests/cli/userTest.ts --json > user-results.json
```

---

### "User reported issue, I need to reproduce"

→ **User Test Runner + Verbose** (1 minute)
```bash
npx tsx tests/cli/userTest.ts --verbose
```

Shows exactly what a user would see.

---

### "I'm working on the ingestion pipeline"

→ **Focused Tests** (1 minute)
```bash
npm test -- tests/ingestion/
npm test -- tests/cli/cli.test.ts -t "ingest"
bash tests/run-scenarios.sh --scenario 1
bash tests/run-scenarios.sh --scenario 7
```

---

## Troubleshooting Decision Tree

```
     ┌──────────────┐
     │ Test Failed? │
     └──────┬───────┘
            │
            ▼
     ┌──────────────┐
     │  All tests   │ YES → npm install
     │  failing?    ├─────→ npm run build
     └──────┬───────┘      → retry
            │ NO
            ▼
     ┌──────────────┐
     │  Specific    │ YES → Run test with
     │  feature?    ├─────→ --verbose
     └──────┬───────┘      → See TEST_SCENARIOS.md
            │ NO           → troubleshooting
            ▼
     ┌──────────────┐
     │  Database    │ YES → Check status --full
     │  related?    ├─────→ Verify ingestion
     └──────┬───────┘      → Check permissions
            │ NO
            ▼
     ┌──────────────┐
     │  Search/     │ YES → Verify database has docs
     │  query       ├─────→ Try broader query
     │  issues?     │      → Check semantic similarity
     └──────┬───────┘
            │ NO
            ▼
     ┌──────────────┐
     │  Still       │ YES → Review full output
     │  stuck?      ├─────→ Check system requirements
     └──────────────┘      → Report issue with logs
```

---

## Recommended Workflows

### For End Users

```
1. Install → Quick Test (30s)
   ├─ Pass → Start using RKM ✓
   └─ Fail → Automated Scenarios (3min)
              ├─ Pass → Start using RKM ✓
              └─ Fail → Manual Scenarios (15min)
                        └─ Follow troubleshooting
```

### For Developers

```
1. Code change → Vitest Suite (30s)
   ├─ Pass → Commit ✓
   └─ Fail → Fix code
             └─ Run specific tests
               └─ Retry

2. Before PR → Full Suite (3min)
   ├─ Pass → Submit PR ✓
   └─ Fail → Review failures
             └─ Fix and retry
```

### For CI/CD

```
1. Build → npm run build
   └─ Success
      └─ Run Tests (parallel):
         ├─ Vitest (1min)
         ├─ Scenarios (2min)
         └─ User Tests (30s)
            ├─ All Pass → Deploy ✓
            └─ Any Fail → Block deployment
```

---

## Summary: At a Glance

| Need | Use | Time | Success Rate |
|------|-----|------|--------------|
| Quick check | QUICK_TEST_REFERENCE.md | 30s | 95% |
| Full verification | run-scenarios.sh | 3min | 98% |
| Learn system | TEST_SCENARIOS.md | 15min | 100% |
| Development | npm test | 30s | 99% |
| User perspective | userTest.ts | 30s | 97% |
| Coverage report | npm run test:coverage | 2min | N/A |
| Debug issue | Scenario + verbose | 2-5min | Variable |
| Release prep | All tests | 5min | 100% |

---

## Quick Decision Checklist

Answer these questions to find your test:

- [ ] **First time using RKM?** → Quick Test
- [ ] **Quick test failed?** → Automated Scenarios
- [ ] **Need to understand a feature?** → Manual Scenarios
- [ ] **Developing code?** → Vitest Suite
- [ ] **Changed CLI?** → CLI Tests + Scenarios
- [ ] **Before committing?** → Vitest Suite
- [ ] **Before release?** → Everything
- [ ] **CI/CD setup?** → Automated + JSON
- [ ] **User reported bug?** → User Test Runner
- [ ] **Debugging specific issue?** → Relevant Manual Scenario

---

## Final Recommendations

### ⭐ Best for Most Users
```bash
# If you're new or verifying install
bash tests/run-scenarios.sh

# If you're developing
npm test
```

### 🚀 Fastest Path to Confidence
```bash
# 30-second quick test
# See QUICK_TEST_REFERENCE.md
```

### 🔍 Most Comprehensive
```bash
# Full suite (5 minutes)
npm run test:coverage
bash tests/run-scenarios.sh
npx tsx tests/cli/userTest.ts --verbose
```

### 💡 Best Learning Experience
```
# Manual walkthrough (15 minutes)
# Follow TEST_SCENARIOS.md step-by-step
```

---

**Remember**: Start simple (Quick Test), escalate as needed (Scenarios → Vitest → Manual).

---

## Navigation

- [← Back to Testing Summary](./TESTING_SUMMARY.md)
- [Quick Test Reference →](./QUICK_TEST_REFERENCE.md)
- [Test Scenarios →](./TEST_SCENARIOS.md)
- [User Test Guide →](./USER_TEST_GUIDE.md)

---

**Last Updated**: 2024-12-23
**RKM Version**: 0.3.0

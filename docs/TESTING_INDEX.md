# RKM Testing Documentation Index

Complete guide to testing and verifying your Research Knowledge Manager installation.

## 📚 Documentation Overview

| Document | Purpose | Audience | Time |
|----------|---------|----------|------|
| **[Quick Test Reference](./QUICK_TEST_REFERENCE.md)** | Fast verification commands and cheat sheet | All users | 30s |
| **[Test Scenarios](./TEST_SCENARIOS.md)** | Detailed 10-scenario verification guide | End users, QA | 10-15min |
| **[Test Decision Guide](./TEST_DECISION_GUIDE.md)** | Choose the right test for your needs | All users | N/A |
| **[Testing Summary](./TESTING_SUMMARY.md)** | Complete testing overview and metrics | Technical users | N/A |
| **[User Test Guide](./USER_TEST_GUIDE.md)** | Automated test runner documentation | End users | N/A |

## 🚀 Quick Start

### New to RKM? Start Here!

```bash
# 1. Install and build
npm install
npm run build

# 2. Run quick test (30 seconds)
# See QUICK_TEST_REFERENCE.md for commands

# 3. If quick test passes - you're done! ✓
# If it fails - run automated scenarios:
bash tests/run-scenarios.sh
```

[→ Quick Test Reference](./QUICK_TEST_REFERENCE.md)

---

## 📖 Documentation Guide

### 1. Quick Test Reference
**File**: `QUICK_TEST_REFERENCE.md`

**What it contains**:
- 30-second quick test
- Essential command cheat sheet
- Quick verification checklist
- Common issues & quick fixes
- Output format examples
- Minimal working example

**When to use**:
- First-time installation
- Quick health check
- Before starting work
- As a command reference

**Format**: Copy-paste friendly commands

[→ Read Quick Test Reference](./QUICK_TEST_REFERENCE.md)

---

### 2. Test Scenarios
**File**: `TEST_SCENARIOS.md`

**What it contains**:
- 10 detailed test scenarios
- Step-by-step instructions
- Expected outputs for each test
- Success indicators
- Troubleshooting for each scenario
- Complete integration test workflow

**Scenarios covered**:
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

**When to use**:
- Learning the system
- Debugging specific features
- Writing bug reports
- QA testing
- Manual verification

**Format**: Detailed step-by-step procedures

[→ Read Test Scenarios](./TEST_SCENARIOS.md)

---

### 3. Test Decision Guide
**File**: `TEST_DECISION_GUIDE.md`

**What it contains**:
- Decision flowcharts
- Test type comparison matrix
- Common scenario solutions
- Troubleshooting decision tree
- Recommended workflows
- Quick decision checklist

**When to use**:
- Unsure which test to run
- Planning testing strategy
- Choosing between test types
- Debugging approach

**Format**: Visual guides and decision trees

[→ Read Test Decision Guide](./TEST_DECISION_GUIDE.md)

---

### 4. Testing Summary
**File**: `TESTING_SUMMARY.md`

**What it contains**:
- Complete testing overview
- Test coverage metrics
- Integration with workflows
- CI/CD guidance
- Performance benchmarks
- Version history

**When to use**:
- Understanding test infrastructure
- Setting up CI/CD
- Reviewing coverage
- Release planning

**Format**: Technical overview with metrics

[→ Read Testing Summary](./TESTING_SUMMARY.md)

---

### 5. User Test Guide
**File**: `USER_TEST_GUIDE.md`

**What it contains**:
- Automated test runner usage
- Understanding test results
- Troubleshooting guide
- CI/CD integration examples
- Manual CLI testing

**When to use**:
- Running automated tests
- CI/CD setup
- Understanding test output
- Reporting issues

**Format**: Tool documentation

[→ Read User Test Guide](./USER_TEST_GUIDE.md)

---

## 🛠️ Test Tools

### Automated Scenario Runner
**File**: `/workspaces/ranger/tests/run-scenarios.sh`

**What it does**:
- Runs all 10 test scenarios automatically
- Colorized, user-friendly output
- ~50 individual assertions
- Complete verification in 2-3 minutes

**Usage**:
```bash
# All scenarios
bash tests/run-scenarios.sh

# Verbose output
bash tests/run-scenarios.sh --verbose

# Specific scenario
bash tests/run-scenarios.sh --scenario 1
```

**Output**: Pass/fail with detailed messages

---

### Vitest Test Suite
**Files**: `/workspaces/ranger/tests/**/*.test.ts`

**What it does**:
- 91+ comprehensive unit/integration tests
- Fast execution (30-60 seconds)
- Coverage reporting
- Developer-friendly

**Usage**:
```bash
# All tests
npm test

# CLI tests only
npm test -- tests/cli/cli.test.ts

# With coverage
npm run test:coverage

# Watch mode
npm test -- --watch
```

**Output**: Test results with coverage metrics

---

### User Test Runner
**File**: `/workspaces/ranger/tests/cli/userTest.ts`

**What it does**:
- User-friendly test interface
- 15 CLI verification tests
- JSON output for CI/CD
- Quick validation (30 seconds)

**Usage**:
```bash
# Standard output
npx tsx tests/cli/userTest.ts

# Verbose
npx tsx tests/cli/userTest.ts --verbose

# JSON output
npx tsx tests/cli/userTest.ts --json
```

**Output**: Formatted test results

---

## 🎯 Use Cases

### "I just installed RKM"
1. [Quick Test Reference](./QUICK_TEST_REFERENCE.md) - 30 seconds
2. If failed → Run: `bash tests/run-scenarios.sh`
3. If still issues → Follow: [Test Scenarios](./TEST_SCENARIOS.md)

---

### "I'm developing a feature"
1. Make changes
2. Run: `npm test`
3. Run: `npm test -- tests/cli/cli.test.ts` (if CLI changes)
4. Before commit: `npm run test:coverage`

---

### "I need to debug an issue"
1. Identify affected feature
2. [Test Decision Guide](./TEST_DECISION_GUIDE.md) → Find relevant scenario
3. Follow specific scenario in [Test Scenarios](./TEST_SCENARIOS.md)
4. Use `--verbose` flags for detailed output

---

### "Setting up CI/CD"
1. Review: [Testing Summary](./TESTING_SUMMARY.md) - CI/CD section
2. Use: Automated tests with JSON output
3. Example pipeline:
```bash
npm ci
npm run build
npm test -- --reporter=json
bash tests/run-scenarios.sh
npx tsx tests/cli/userTest.ts --json
```

---

### "Preparing for release"
1. Run full test suite: `npm run test:coverage`
2. Run scenarios: `bash tests/run-scenarios.sh`
3. Run user tests: `npx tsx tests/cli/userTest.ts --verbose`
4. Manual verification: Follow key scenarios from [Test Scenarios](./TEST_SCENARIOS.md)

---

## 📊 Test Coverage

### Commands Tested
- ✓ status (12 tests)
- ✓ ingest (15 tests)
- ✓ query (10 tests)
- ✓ search (14 tests)
- ✓ graph (11 tests)
- ✓ route (9 tests)
- ✓ context (8 tests)
- ✓ learn (4 tests)

**Total**: 91+ automated tests + 10 manual scenarios

### Features Tested
- ✓ Vector ingestion
- ✓ Semantic search
- ✓ Hybrid search
- ✓ Graph queries
- ✓ Knowledge graph building
- ✓ Semantic routing
- ✓ Context export
- ✓ Multiple file formats
- ✓ Output formats (text, JSON, markdown)
- ✓ Legacy compatibility
- ✓ Error handling
- ✓ SONA learning
- ✓ GNN integration

**Coverage**: 90%+ of core functionality

---

## 🔍 Finding Information

### By Task
| Task | Document | Section |
|------|----------|---------|
| Quick verification | Quick Test Reference | Quick Start |
| Learn feature | Test Scenarios | Specific scenario |
| Choose test | Test Decision Guide | Decision Matrix |
| Setup CI/CD | Testing Summary | CI/CD Integration |
| Understand metrics | Testing Summary | Test Metrics |
| Debug failure | Test Scenarios | Troubleshooting |
| Automated tests | User Test Guide | Running Tests |

### By Role
| Role | Primary Documents | Secondary |
|------|------------------|-----------|
| End User | Quick Test Reference, Test Scenarios | User Test Guide |
| Developer | Testing Summary, Quick Test Reference | Test Scenarios |
| QA Tester | Test Scenarios, Test Decision Guide | Testing Summary |
| DevOps/SRE | Testing Summary, User Test Guide | Quick Test Reference |
| Technical Writer | Test Scenarios, Testing Summary | All |

### By Time Available
| Time | What to Do |
|------|-----------|
| 30 seconds | Quick Test Reference - minimal example |
| 1-2 minutes | Run specific scenario or automated test |
| 3 minutes | Run full automated scenarios |
| 5 minutes | Run complete test suite |
| 15 minutes | Manual walkthrough of all scenarios |

---

## 🗂️ File Locations

### Documentation
```
/workspaces/ranger/docs/
├── TESTING_INDEX.md          (this file)
├── QUICK_TEST_REFERENCE.md   (cheat sheet)
├── TEST_SCENARIOS.md         (detailed tests)
├── TEST_DECISION_GUIDE.md    (decision trees)
├── TESTING_SUMMARY.md        (overview)
└── USER_TEST_GUIDE.md        (test runner guide)
```

### Test Files
```
/workspaces/ranger/tests/
├── run-scenarios.sh          (automated scenario runner)
├── cli/
│   ├── cli.test.ts          (91+ CLI tests)
│   ├── userTest.ts          (user-friendly runner)
│   ├── cliTestRunner.ts     (test framework)
│   └── example-usage.ts     (examples)
├── integration/
│   └── fullLoop.test.ts     (end-to-end tests)
├── memory/
│   ├── cognitive.test.ts    (SONA tests)
│   ├── graphStore.test.ts   (graph tests)
│   └── vectorStore.test.ts  (vector tests)
├── ingestion/
│   ├── parser.test.ts       (parser tests)
│   └── reader.test.ts       (reader tests)
└── fixtures/
    ├── sample.md            (test data)
    ├── sample.txt
    └── sample.json
```

---

## 🚦 Getting Started Path

```
START HERE
    │
    ▼
┌─────────────────────────┐
│ Read this INDEX file    │
│ (you are here!)         │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ First-time user?        │
└───────────┬─────────────┘
            │
     ┌──────┴──────┐
     │             │
    YES           NO (developer/contributor)
     │             │
     ▼             ▼
┌─────────┐   ┌─────────┐
│ Quick   │   │ Testing │
│ Test    │   │ Summary │
│ Ref     │   │         │
└────┬────┘   └────┬────┘
     │             │
     ▼             ▼
  Success?      Run Tests
     │             │
  ┌──┴──┐         │
  │     │         ▼
 YES   NO      Review
  │     │      Results
  │     ▼         │
  │  Scenarios    ▼
  │     │      Decision
  │     │      Guide
  │     ▼         │
  │  Decision    │
  │  Guide       │
  │     │        │
  └─────┴────────┘
        │
        ▼
    START USING RKM ✓
```

---

## 📚 Additional Resources

### Project Documentation
- [Main README](../README.md) - Project overview and usage
- [Architecture](./ARCHITECTURE.md) - System design
- [Development Plan](./DEVELOPMENT_PLAN.md) - Roadmap
- [Research Findings](./RESEARCH_FINDINGS.md) - Technical background

### Test Infrastructure
- [CLI Test Framework](../tests/cli/cliTestRunner.ts) - Framework code
- [Example Usage](../tests/cli/example-usage.ts) - Code examples
- [Test Documentation](../tests/cli/README.md) - Test suite docs

---

## 🆘 Getting Help

### If Tests Fail
1. Check: [Test Decision Guide](./TEST_DECISION_GUIDE.md) - Troubleshooting section
2. Review: [Test Scenarios](./TEST_SCENARIOS.md) - Specific scenario troubleshooting
3. Run: Tests with `--verbose` flag
4. Check: Prerequisites (Node.js 18+, dependencies installed, project built)

### Reporting Issues
Include:
- Test output (with `--verbose`)
- Node.js version: `node --version`
- Platform: `uname -a` or system info
- RKM version: `node dist/cli.js --version`
- Which test failed
- Steps to reproduce

### Support Channels
- Review documentation in `/docs`
- Check existing issues
- Run diagnostic: `bash tests/run-scenarios.sh --verbose`

---

## ✅ Testing Checklist

Before reporting "tests pass":

- [ ] Quick test passes (30s)
- [ ] Automated scenarios pass (3min) OR
- [ ] Vitest suite passes (30s)
- [ ] No errors in output
- [ ] Database created successfully
- [ ] Search returns results
- [ ] Status shows correct counts

For release:

- [ ] All Vitest tests pass
- [ ] All scenarios pass
- [ ] User tests pass
- [ ] Coverage ≥90%
- [ ] Manual smoke test passes
- [ ] CI/CD pipeline green

---

## 🎓 Learning Path

### Beginner
1. [Quick Test Reference](./QUICK_TEST_REFERENCE.md) - Learn basic commands
2. [Test Scenarios #1-3](./TEST_SCENARIOS.md) - Core functionality
3. Try example from Quick Reference

### Intermediate
1. [Test Scenarios #4-7](./TEST_SCENARIOS.md) - Advanced features
2. [Test Decision Guide](./TEST_DECISION_GUIDE.md) - Testing strategy
3. Run automated scenarios

### Advanced
1. [Testing Summary](./TESTING_SUMMARY.md) - Full infrastructure
2. Review test code in `/tests`
3. Contribute new tests
4. Setup CI/CD integration

---

## 📈 Version History

### v0.3.0 (2024-12-23)
- Created comprehensive testing documentation
- 10 detailed manual test scenarios
- Automated scenario runner script
- Quick test reference card
- Decision guide with flowcharts
- Testing summary with metrics
- 91+ Vitest tests
- User-friendly test runner

---

## 🎯 Key Takeaways

1. **Start Simple**: Quick test first (30s)
2. **Escalate as Needed**: Quick → Scenarios → Manual
3. **Choose Right Tool**: See Decision Guide
4. **All Paths Covered**: Installation, development, debugging, CI/CD
5. **Multiple Formats**: Cheat sheets, detailed guides, automated tests
6. **User-Focused**: End-user verification as important as developer tests

---

**Welcome to RKM Testing!** Start with [Quick Test Reference](./QUICK_TEST_REFERENCE.md) →

---

**Last Updated**: 2024-12-23
**RKM Version**: 0.3.0
**Documentation Version**: 1.0

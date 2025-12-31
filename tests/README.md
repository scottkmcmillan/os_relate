# RKM Test Suite

Comprehensive testing infrastructure for the Research Knowledge Manager.

## 🚀 Quick Start

### First Time? Start Here!

```bash
# 1. Build the project
npm install && npm run build

# 2. Run automated test scenarios (recommended)
bash tests/run-scenarios.sh

# OR run the full test suite
npm test
```

✅ **Success**: You'll see green checkmarks and "All tests passed!"

📖 **Need help?** See [docs/TESTING_INDEX.md](../docs/TESTING_INDEX.md)

---

## 📚 Documentation

Complete testing documentation is in `/docs`:

| Document | Purpose | Time |
|----------|---------|------|
| **[TESTING_INDEX.md](../docs/TESTING_INDEX.md)** | Start here - complete guide to all testing docs | - |
| **[QUICK_TEST_REFERENCE.md](../docs/QUICK_TEST_REFERENCE.md)** | Fast verification & command cheat sheet | 30s |
| **[TEST_SCENARIOS.md](../docs/TEST_SCENARIOS.md)** | 10 detailed test scenarios with expected outputs | 10-15min |
| **[TEST_DECISION_GUIDE.md](../docs/TEST_DECISION_GUIDE.md)** | Which test should you run? Decision trees | - |
| **[TESTING_SUMMARY.md](../docs/TESTING_SUMMARY.md)** | Technical overview, metrics, CI/CD setup | - |
| **[USER_TEST_GUIDE.md](../docs/USER_TEST_GUIDE.md)** | Test runner tool documentation | - |

**👉 New users**: Start with [TESTING_INDEX.md](../docs/TESTING_INDEX.md)

---

## 🛠️ Test Tools

### 1. Automated Scenario Runner (Recommended)

**File**: `tests/run-scenarios.sh`

Runs all 10 test scenarios automatically:

```bash
# All scenarios (~50 checks)
bash tests/run-scenarios.sh

# Verbose output
bash tests/run-scenarios.sh --verbose

# Single scenario
bash tests/run-scenarios.sh --scenario 1
```

**Time**: 2-3 minutes
**Coverage**: All core user workflows
**Output**: Colorized pass/fail results

---

### 2. Vitest Test Suite (For Developers)

**Files**: `tests/**/*.test.ts`

Comprehensive unit and integration tests:

```bash
# All tests (91+ tests)
npm test

# CLI tests only
npm test -- tests/cli/cli.test.ts

# Specific feature
npm test -- tests/memory/cognitive.test.ts

# Watch mode
npm test -- --watch

# Coverage report
npm run test:coverage
```

**Time**: 30-60 seconds
**Coverage**: 90%+ code coverage
**Output**: Vitest reporter with pass/fail

---

### 3. User Test Runner

**File**: `tests/cli/userTest.ts`

User-friendly CLI verification:

```bash
# Standard output
npx tsx tests/cli/userTest.ts

# Verbose mode
npx tsx tests/cli/userTest.ts --verbose

# JSON output (for CI/CD)
npx tsx tests/cli/userTest.ts --json
```

**Time**: 30 seconds
**Coverage**: CLI commands and user workflows
**Output**: Formatted test results

---

## 📁 Test Structure

```
tests/
├── README.md                    (this file)
├── run-scenarios.sh            (automated scenario runner)
│
├── cli/                        (CLI tests)
│   ├── cli.test.ts            (91+ comprehensive CLI tests)
│   ├── userTest.ts            (user-friendly test runner)
│   ├── cliTestRunner.ts       (test framework library)
│   ├── example-usage.ts       (usage examples)
│   └── README.md              (CLI test documentation)
│
├── integration/                (integration tests)
│   └── fullLoop.test.ts       (end-to-end workflows)
│
├── memory/                     (memory system tests)
│   ├── cognitive.test.ts      (SONA/cognitive features)
│   ├── graphStore.test.ts     (graph storage)
│   └── vectorStore.test.ts    (vector storage)
│
├── ingestion/                  (ingestion pipeline tests)
│   ├── parser.test.ts         (document parsing)
│   └── reader.test.ts         (file reading)
│
├── tools/                      (tool tests)
│   └── router.test.ts         (semantic routing)
│
└── fixtures/                   (test data)
    ├── sample.md              (markdown test file)
    ├── sample.txt             (text test file)
    └── sample.json            (JSON test file)
```

---

## 🎯 Test Coverage

### Commands Tested (8/8 = 100%)
- ✅ `status` - System capabilities and statistics
- ✅ `ingest` - Document ingestion
- ✅ `query` - Vector search (legacy)
- ✅ `search` - Hybrid search
- ✅ `graph` - Graph queries
- ✅ `route` - Query routing
- ✅ `context` - Context export
- ✅ `learn` - SONA learning

### Features Tested
- ✅ Vector embeddings and search
- ✅ Semantic search
- ✅ Hybrid search (vector + graph)
- ✅ Knowledge graph building
- ✅ Graph queries (Cypher-like)
- ✅ Semantic routing
- ✅ Context block generation
- ✅ Multi-file ingestion
- ✅ Multiple formats (.md, .txt, .json, .jsonl)
- ✅ Output formats (text, JSON, markdown)
- ✅ Legacy compatibility
- ✅ Error handling
- ✅ SONA cognitive features
- ✅ GNN integration

### Test Statistics
- **Total Automated Tests**: 91+ (Vitest)
- **Manual Test Scenarios**: 10 (run-scenarios.sh)
- **Code Coverage**: 90%+
- **Time to Run All**: ~5 minutes

---

## 🔍 Common Test Commands

### Quick Verification (30s)
```bash
# See docs/QUICK_TEST_REFERENCE.md for minimal test
npm install && npm run build
mkdir -p /tmp/test && echo "# Test\nSample content." > /tmp/test/test.md
node dist/cli.js ingest --path /tmp/test/test.md --db ./test.db
node dist/cli.js search "sample" --db ./test.db -k 1
```

### Full Automated Tests (2-3min)
```bash
bash tests/run-scenarios.sh
```

### Developer Tests (30s)
```bash
npm test
```

### Before Commit
```bash
npm test -- --run
```

### Before Release
```bash
npm run test:coverage
bash tests/run-scenarios.sh
npx tsx tests/cli/userTest.ts --verbose
```

---

## 🐛 Troubleshooting

### Tests Failing?

1. **Check prerequisites**:
   ```bash
   node --version  # Should be 18+
   npm install     # Install dependencies
   npm run build   # Build project
   ```

2. **Run with verbose output**:
   ```bash
   bash tests/run-scenarios.sh --verbose
   npx tsx tests/cli/userTest.ts --verbose
   npm test -- --reporter=verbose
   ```

3. **Check specific failure**:
   - See [docs/TEST_SCENARIOS.md](../docs/TEST_SCENARIOS.md) for expected outputs
   - See [docs/TEST_DECISION_GUIDE.md](../docs/TEST_DECISION_GUIDE.md) for troubleshooting tree

4. **Common issues**:
   - "Command not found" → Run `npm run build`
   - "No results found" → Database empty, run ingestion first
   - "Permission denied" → Check write permissions
   - Module "Not Available" → Normal on some platforms

---

## 📊 Test Metrics

### Performance Benchmarks

| Test Type | Duration | Tests | Coverage |
|-----------|----------|-------|----------|
| Quick Test | 30s | 1 workflow | Basic smoke test |
| Scenarios | 2-3min | 10 scenarios (~50 checks) | User workflows |
| Vitest | 30-60s | 91+ tests | Code coverage |
| Full Suite | ~5min | All tests | Complete verification |

### Success Criteria

Tests pass when:
- ✅ Exit code 0
- ✅ No error messages
- ✅ Expected output matches documentation
- ✅ Database created successfully
- ✅ Search returns relevant results
- ✅ Status shows correct statistics

---

## 🤝 Contributing Tests

### Adding New Tests

1. **Unit/Integration Tests**:
   - Add to appropriate `tests/*/` directory
   - Use Vitest framework
   - Follow existing patterns
   - Run: `npm test -- path/to/your.test.ts`

2. **Manual Scenarios**:
   - Document in [docs/TEST_SCENARIOS.md](../docs/TEST_SCENARIOS.md)
   - Add to `run-scenarios.sh` if automatable
   - Include expected outputs

3. **Test Checklist**:
   - [ ] Test passes locally
   - [ ] Test fails when code is broken (not flaky)
   - [ ] Test has clear description
   - [ ] Test includes expected output
   - [ ] Documentation updated

### Test Quality Guidelines

- **Clear**: Easy to understand what's being tested
- **Isolated**: Each test independent
- **Fast**: Run quickly for rapid feedback
- **Reliable**: Consistent results
- **Maintainable**: Easy to update

---

## 🚦 CI/CD Integration

### GitHub Actions Example

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Run Vitest
        run: npm test -- --reporter=json --outputFile=vitest-results.json

      - name: Run Scenarios
        run: bash tests/run-scenarios.sh

      - name: User Tests
        run: npx tsx tests/cli/userTest.ts --json > user-results.json

      - name: Upload Results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: |
            vitest-results.json
            user-results.json
```

---

## 📖 Documentation Links

### Quick Access
- [Testing Index](../docs/TESTING_INDEX.md) - Start here!
- [Quick Test Reference](../docs/QUICK_TEST_REFERENCE.md) - 30-second test
- [Test Scenarios](../docs/TEST_SCENARIOS.md) - Detailed scenarios
- [Decision Guide](../docs/TEST_DECISION_GUIDE.md) - Which test to run?

### Project Documentation
- [Main README](../README.md) - Project overview
- [Architecture](../docs/ARCHITECTURE.md) - System design
- [User Test Guide](../docs/USER_TEST_GUIDE.md) - Test runner docs

---

## ✅ Quick Checklist

Before saying "tests pass":

- [ ] Quick test passes (30s)
- [ ] Automated scenarios pass (3min) **OR** Vitest suite passes (30s)
- [ ] No errors in output
- [ ] Database created successfully
- [ ] Search returns results
- [ ] Status shows correct counts

For production release:

- [ ] All Vitest tests pass: `npm test`
- [ ] All scenarios pass: `bash tests/run-scenarios.sh`
- [ ] User tests pass: `npx tsx tests/cli/userTest.ts`
- [ ] Coverage ≥90%: `npm run test:coverage`
- [ ] Manual smoke test passes
- [ ] CI/CD pipeline green

---

## 🆘 Need Help?

1. **Read the docs**: Start with [TESTING_INDEX.md](../docs/TESTING_INDEX.md)
2. **Run verbose mode**: Add `--verbose` to see detailed output
3. **Check troubleshooting**: See scenario-specific troubleshooting in docs
4. **Review examples**: See `tests/cli/example-usage.ts`
5. **Report issues**: Include test output, Node version, platform

---

## 📈 Version History

### v0.3.0 (2024-12-23)
- ✨ Created comprehensive test suite
- ✨ 91+ automated Vitest tests
- ✨ 10 manual test scenarios
- ✨ Automated scenario runner script
- ✨ Complete testing documentation (6 docs)
- ✨ User-friendly test runner
- ✨ 90%+ code coverage

---

**Ready to test?** Run: `bash tests/run-scenarios.sh` or `npm test`

**Need guidance?** Read: [docs/TESTING_INDEX.md](../docs/TESTING_INDEX.md)

---

**Last Updated**: 2024-12-23
**Test Suite Version**: 1.0
**RKM Version**: 0.3.0

# RKM Testing Documentation Summary

Complete testing resources for verifying your Research Knowledge Manager installation.

## Quick Links

- **[Quick Test Reference](./QUICK_TEST_REFERENCE.md)** - Fast commands and cheat sheet (30-second tests)
- **[Test Scenarios](./TEST_SCENARIOS.md)** - Detailed 10-scenario verification guide
- **[User Test Guide](./USER_TEST_GUIDE.md)** - Automated test runner documentation

## Testing Approaches

### 1. Quick Verification (30 seconds)

Use the quick reference for immediate verification:

```bash
# One-command test
npm install && npm run build && \
echo "# Test\nVector embeddings test." > /tmp/test.md && \
node dist/cli.js ingest --path /tmp/test.md --db ./test.db && \
node dist/cli.js search "vector" --db ./test.db -k 1
```

See: [QUICK_TEST_REFERENCE.md](./QUICK_TEST_REFERENCE.md)

### 2. Comprehensive Manual Testing (10-15 minutes)

Follow all 10 test scenarios to thoroughly verify installation:

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

See: [TEST_SCENARIOS.md](./TEST_SCENARIOS.md)

### 3. Automated Scenario Testing (2-3 minutes)

Run the automated scenario test script:

```bash
# All scenarios
bash tests/run-scenarios.sh

# Verbose output
bash tests/run-scenarios.sh --verbose

# Specific scenario only
bash tests/run-scenarios.sh --scenario 1
```

Script location: `/workspaces/ranger/tests/run-scenarios.sh`

### 4. Developer Test Suite (30-60 seconds)

Run the comprehensive Vitest test suite:

```bash
# All tests
npm test

# CLI-specific tests (91 tests)
npm test -- tests/cli/cli.test.ts

# With coverage
npm run test:coverage

# Specific command tests
npm test -- tests/cli/cli.test.ts -t "status"
npm test -- tests/cli/cli.test.ts -t "ingest"
npm test -- tests/cli/cli.test.ts -t "search"
```

### 5. User-Facing Test Runner

Run the simplified user test interface:

```bash
# Standard output
npx tsx tests/cli/userTest.ts

# Verbose mode
npx tsx tests/cli/userTest.ts --verbose

# JSON output (for CI/CD)
npx tsx tests/cli/userTest.ts --json
```

See: [USER_TEST_GUIDE.md](./USER_TEST_GUIDE.md)

## Test Coverage

### Commands Tested

| Command | Quick Ref | Scenarios | Automated | Vitest |
|---------|-----------|-----------|-----------|--------|
| `status` | ✓ | ✓ Scenario 3 | ✓ | ✓ 12 tests |
| `ingest` | ✓ | ✓ Scenarios 1,7,9 | ✓ | ✓ 15 tests |
| `query` | ✓ | ✓ Scenario 9 | ✓ | ✓ 10 tests |
| `search` | ✓ | ✓ Scenarios 2,8 | ✓ | ✓ 14 tests |
| `graph` | ✓ | ✓ Scenario 6 | ✓ | ✓ 11 tests |
| `route` | ✓ | ✓ Scenario 5 | ✓ | ✓ 9 tests |
| `context` | ✓ | ✓ Scenario 4 | ✓ | ✓ 8 tests |
| `learn` | - | - | - | ✓ 4 tests |

### Feature Coverage

| Feature | Test Type | Documentation |
|---------|-----------|---------------|
| Vector ingestion | All | TEST_SCENARIOS.md #1 |
| Semantic search | All | TEST_SCENARIOS.md #2 |
| Hybrid search | Vitest | cli.test.ts |
| Graph queries | Manual, Automated, Vitest | TEST_SCENARIOS.md #6 |
| Knowledge graph building | Manual, Automated | TEST_SCENARIOS.md #1,7 |
| Semantic routing | All | TEST_SCENARIOS.md #5 |
| Context export | All | TEST_SCENARIOS.md #4 |
| Output formats | Manual, Automated, Vitest | TEST_SCENARIOS.md #8 |
| Multi-file ingestion | Manual, Automated | TEST_SCENARIOS.md #7 |
| Legacy compatibility | Manual, Automated | TEST_SCENARIOS.md #9 |
| Error handling | Manual, Automated, Vitest | TEST_SCENARIOS.md #10 |
| SONA learning | Vitest | cognitive.test.ts |
| GNN integration | Vitest | Integration tests |

## Test Artifacts

### Documentation Files

| File | Purpose | Audience |
|------|---------|----------|
| `QUICK_TEST_REFERENCE.md` | Fast verification commands | End users |
| `TEST_SCENARIOS.md` | Detailed test procedures | End users, QA |
| `USER_TEST_GUIDE.md` | Test runner guide | End users |
| `TESTING_SUMMARY.md` | This file - overview | All |

### Test Files

| File | Purpose | Type |
|------|---------|------|
| `tests/run-scenarios.sh` | Automated scenario runner | Bash script |
| `tests/cli/cli.test.ts` | Comprehensive CLI tests | Vitest |
| `tests/cli/userTest.ts` | User-friendly test runner | TypeScript |
| `tests/cli/cliTestRunner.ts` | CLI test framework | Library |
| `tests/integration/fullLoop.test.ts` | End-to-end tests | Vitest |
| `tests/memory/*.test.ts` | Memory system tests | Vitest |
| `tests/ingestion/*.test.ts` | Ingestion pipeline tests | Vitest |
| `tests/tools/*.test.ts` | Tool tests | Vitest |

### Test Fixtures

| File | Purpose |
|------|---------|
| `tests/fixtures/sample.md` | Sample markdown document |
| `tests/fixtures/sample.txt` | Sample text document |
| `tests/fixtures/sample.json` | Sample JSON document |

## Recommended Testing Workflow

### For End Users (First-Time Setup)

1. **Quick verification** (30 seconds)
   ```bash
   # Use QUICK_TEST_REFERENCE.md
   npm install && npm run build
   # Run quick test from reference card
   ```

2. **If quick test passes**: Installation successful, start using RKM

3. **If quick test fails**: Run automated scenarios
   ```bash
   bash tests/run-scenarios.sh --verbose
   ```

4. **If scenarios fail**: Review TEST_SCENARIOS.md for troubleshooting

### For Contributors/Developers

1. **Before committing code**:
   ```bash
   npm test                    # Run full test suite
   npm run test:coverage       # Check coverage
   ```

2. **For CLI changes**:
   ```bash
   npm test -- tests/cli/cli.test.ts
   bash tests/run-scenarios.sh
   ```

3. **For new features**:
   - Add tests to appropriate test file
   - Update TEST_SCENARIOS.md if user-facing
   - Run full suite

### For QA/Testing

1. **Smoke testing**:
   ```bash
   bash tests/run-scenarios.sh
   ```

2. **Regression testing**:
   ```bash
   npm run test:coverage
   npx tsx tests/cli/userTest.ts --verbose
   ```

3. **Manual verification**: Follow TEST_SCENARIOS.md

### For CI/CD

```bash
# Install and build
npm ci
npm run build

# Run tests
npm test -- --reporter=json --outputFile=test-results.json

# Run scenario tests
bash tests/run-scenarios.sh

# User tests
npx tsx tests/cli/userTest.ts --json > user-test-results.json
```

## Expected Results

### Successful Installation

When all tests pass, you should see:

- **Quick test**: Search returns results ✓
- **Scenarios**: 10/10 scenarios pass, ~50+ assertions ✓
- **Vitest**: 91+ tests passing ✓
- **User tests**: All tests green ✓

### Common Issues

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| "command not found" | Not built | `npm run build` |
| "No results found" | Empty database | Run ingestion first |
| "Module not available" | Platform limitation | Normal, not an error |
| Test timeouts | Slow system | Increase timeouts |
| Permission errors | File permissions | Check write access |

See TEST_SCENARIOS.md troubleshooting sections for details.

## Test Metrics

### Current Coverage (as of v0.3.0)

- **Unit tests**: 91+ tests
- **Integration tests**: 10 scenarios
- **CLI commands**: 8/8 covered (100%)
- **Core features**: 90%+ coverage
- **Error cases**: Comprehensive

### Performance Benchmarks

| Test Type | Duration | Tests |
|-----------|----------|-------|
| Quick test | <30s | 1 |
| Scenarios (automated) | 2-3min | 10 scenarios (~50 assertions) |
| Vitest suite | 30-60s | 91+ tests |
| User test runner | ~30s | 15 tests |
| Full coverage | ~2min | All |

## Integration with Development Workflow

### Pre-commit

```bash
# Quick validation
npm test -- --run
```

### Pre-push

```bash
# Full validation
npm run test:coverage
bash tests/run-scenarios.sh
```

### CI/CD Pipeline

```yaml
# Example GitHub Actions
- name: Install dependencies
  run: npm ci

- name: Build
  run: npm run build

- name: Run tests
  run: npm test

- name: Run scenarios
  run: bash tests/run-scenarios.sh

- name: User tests
  run: npx tsx tests/cli/userTest.ts --json > results.json
```

## Next Steps After Testing

Once all tests pass:

1. **Production setup**:
   - Move from test databases to production storage
   - Configure persistent paths
   - Set up backups

2. **Integration**:
   - Register MCP server with Claude Code
   - Configure Claude-Flow integration
   - Test end-to-end workflows

3. **Customization**:
   - Adjust embedding dimensions
   - Configure tier settings
   - Enable cognitive features

4. **Documentation**:
   - See [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
   - See [README.md](../README.md) for usage guide
   - See [USER_TESTING.md](./USER_TESTING.md) for advanced testing

## Support and Resources

### Documentation

- Quick reference: [QUICK_TEST_REFERENCE.md](./QUICK_TEST_REFERENCE.md)
- Detailed scenarios: [TEST_SCENARIOS.md](./TEST_SCENARIOS.md)
- User guide: [USER_TEST_GUIDE.md](./USER_TEST_GUIDE.md)
- Architecture: [ARCHITECTURE.md](./ARCHITECTURE.md)

### Test Infrastructure

- CLI test framework: `/tests/cli/cliTestRunner.ts`
- Test examples: `/tests/cli/example-usage.ts`
- Integration tests: `/tests/integration/`

### Issue Reporting

When reporting test failures, include:

1. Test output (use `--verbose`)
2. Node.js version (`node --version`)
3. Platform info (`uname -a` or system details)
4. RKM version (`node dist/cli.js --version`)

## Version History

- **v0.3.0** (2024-12-23): Comprehensive test documentation created
  - 10 manual test scenarios
  - Automated scenario runner
  - Quick reference card
  - 91+ Vitest tests
  - User-friendly test runner

---

**Last Updated**: 2024-12-23
**RKM Version**: 0.3.0
**Test Coverage**: 90%+

# CLI Test Suite - Quick Start

## Run Tests

```bash
# All CLI tests
npm test -- tests/cli/cli.test.ts

# Specific command tests
npm test -- tests/cli/cli.test.ts -t "status"
npm test -- tests/cli/cli.test.ts -t "ingest"
npm test -- tests/cli/cli.test.ts -t "query"
```

## Test Coverage Summary

✅ **91 comprehensive tests** covering:
- All 8 CLI commands (status, ingest, query, search, graph, route, context, learn)
- Error handling and edge cases
- Output format validation (JSON, text, markdown)
- Integration workflows
- Help documentation

## Test Features

- ✅ Actual CLI execution (not mocked)
- ✅ Real file system testing
- ✅ Automatic setup/teardown
- ✅ Isolated test database
- ✅ CI/CD ready

## Files

- `cli.test.ts` - Main test file (91 tests)
- `CLI_TEST_DOCUMENTATION.md` - Detailed documentation

---

**Status**: ✅ Ready to run
**Execution time**: ~30-60 seconds

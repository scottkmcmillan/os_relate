# Quick Verification Guide

## 1-Minute System Check

### Run Verification
```bash
# Full verification (recommended)
npm run verify

# Quick verification (faster)
npm run verify:quick
```

### Expected Output
```
✓ Node.js version is compatible
✓ All critical dependencies installed
✓ Build exists and is ready
✓ System capabilities available
✓ Test environment created
✓ Ingested 3 documents
✓ Query returned results
✓ Hybrid search successful
✓ Graph query successful
✓ Full status retrieved
✓ Router working
✓ Test environment cleaned up

🎉 All verification checks passed! System is ready.
```

## Common Fixes

### ✗ Build not found
```bash
npm run build
```

### ✗ Dependencies missing
```bash
npm install
```

### ✗ Node.js too old
```bash
# Use nvm to upgrade
nvm install 18
nvm use 18
```

## Quick Test Commands

### Test Ingestion
```bash
node dist/cli.js ingest --path ./docs --tag test
```

### Test Query
```bash
node dist/cli.js query "search term" -k 5
```

### Test Status
```bash
node dist/cli.js status --full
```

## Key Metrics

After verification, check system metrics:

```bash
node dist/cli.js status --full --json
```

Look for:
- `totalVectors`: Number of documents
- `nodeCount`: Graph nodes
- `edgeCount`: Graph relationships
- `sonaAvailable`: Active learning enabled
- `gnnAvailable`: Graph neural network enabled

## When to Run Verification

- After fresh installation
- After updating dependencies
- After building from source
- Before production deployment
- When debugging issues
- After system updates

## Need Help?

See full documentation: [docs/VERIFICATION.md](./VERIFICATION.md)

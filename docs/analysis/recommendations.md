# Code Quality Recommendations
**Research Knowledge Manager - Action Plan**

## Immediate Actions (This Sprint)

### 1. Install Test Coverage Tooling (1 hour)
```bash
npm install --save-dev @vitest/coverage-v8
npm run test:coverage
```

**Goal:** Establish baseline test coverage metrics

### 2. Fix JWT Security Issue (2-3 hours)
**File:** `/home/scott/projects/QB-AI/agentic_labs/os_relate/src/api/middleware/auth.ts`

**Change:**
```typescript
function getJwtSecret(): string {
  const secret = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CRITICAL: JWT secret not configured. Set SUPABASE_JWT_SECRET or JWT_SECRET environment variable.');
    }
    console.warn('WARNING: Using development fallback secret. DO NOT USE IN PRODUCTION.');
    return 'development-secret-do-not-use-in-production';
  }
  return secret;
}
```

### 3. Create GitHub Issues for TODOs (1 hour)
Create 7 issues for incomplete implementations:
- [ ] Integrate actual vector distance calculation (alignment route)
- [ ] Implement team retrieval from storage
- [ ] Calculate alignment using PKAMemoryManager
- [ ] Retrieve project entities from PKAMemoryManager
- [ ] Calculate progress metrics from PKAMemoryManager
- [ ] Implement semantic similarity detection

### 4. Start Refactoring collections.ts (8-10 hours)
**Split into:**
- `src/memory/collections/manager.ts` - Core collection management
- `src/memory/collections/stats.ts` - Statistics computation
- `src/memory/collections/types.ts` - Type definitions
- `src/memory/collections/index.ts` - Public exports

---

## Short-Term Actions (Next Month)

### 1. Implement Structured Logging (4-6 hours)

**Install:**
```bash
npm install pino pino-pretty
npm install --save-dev @types/pino
```

**Create:** `src/utils/logger.ts`
```typescript
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname'
    }
  } : undefined
});
```

**Replace all console.* calls:**
```typescript
// Before
console.log('User authenticated:', userId);

// After
logger.info({ userId }, 'User authenticated');
```

**Priority files:**
1. `src/api/routes/documents.ts` (15 occurrences)
2. `src/tools/router.ts` (7 occurrences)
3. `src/api/server.ts` (7 occurrences)

### 2. Extract Service Layer (4-6 hours)

**Create:** `src/services/`
```
src/services/
├── teamService.ts
├── documentService.ts
├── alignmentService.ts
├── reportService.ts
└── index.ts
```

**Example - teamService.ts:**
```typescript
import { PKAMemoryManager } from '../pka/memory.js';

export class TeamService {
  constructor(private memory: PKAMemoryManager) {}

  async getTeam(teamId: string) {
    // Implementation from TODO
  }

  async calculateAlignment(teamId: string) {
    // Implementation from TODO
  }
}
```

**Update routes to use services:**
```typescript
// Before
router.get('/teams/:id', async (req, res) => {
  // TODO: Retrieve actual team from storage
});

// After
router.get('/teams/:id', async (req, res) => {
  const team = await teamService.getTeam(req.params.id);
  res.json(team);
});
```

### 3. Complete TODO Implementations (8-12 hours)

**Priority Order:**
1. **High Impact:** Team retrieval and alignment calculations
2. **Medium Impact:** Progress metrics calculation
3. **Low Impact:** Semantic similarity detection

**For each TODO:**
- [ ] Create unit tests for the functionality
- [ ] Implement the feature
- [ ] Update integration tests
- [ ] Remove TODO comment
- [ ] Update documentation

### 4. Refactor Additional Large Files (8-10 hours)

**Target files:**
- `src/memory/types.ts` (942 lines) → Split by domain
- `src/mcp/server.ts` (872 lines) → Extract tools to separate files
- `src/memory/index.ts` (748 lines) → Split into focused modules

---

## Long-Term Actions (Next Quarter)

### 1. Comprehensive Error Handling Strategy (6-8 hours)

**Create:** `src/errors/`
```
src/errors/
├── AppError.ts          # Base error class
├── ValidationError.ts   # Input validation errors
├── AuthError.ts         # Authentication errors
├── NotFoundError.ts     # Resource not found
└── index.ts
```

**Implement error middleware:**
```typescript
// src/api/middleware/errorHandler.ts
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  if (err instanceof ValidationError) {
    return res.status(400).json({ error: err.message });
  }
  // ... handle other error types
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
}
```

### 2. API Versioning (4-6 hours)

**Implement:**
```
src/api/
├── v1/
│   ├── routes/
│   └── index.ts
└── v2/
    ├── routes/
    └── index.ts
```

**Route structure:**
```typescript
app.use('/api/v1', v1Router);
app.use('/api/v2', v2Router);
```

### 3. Performance Optimization (8-12 hours)

**Add caching layer:**
```bash
npm install node-cache
```

**Implement:**
- Response caching for expensive queries
- Database query result caching
- Vector search result caching
- Cache invalidation strategy

**Add monitoring:**
```bash
npm install prom-client
```

**Metrics to track:**
- Request latency
- Database query performance
- Vector search performance
- Memory usage

### 4. Enhanced Testing (12-16 hours)

**Goals:**
- Achieve 80%+ test coverage
- Add property-based testing
- Implement snapshot testing
- Add load testing

**Install:**
```bash
npm install --save-dev fast-check autocannon
```

**Add tests:**
- Property-based tests for validation logic
- Snapshot tests for API responses
- Load tests for vector search endpoints
- Integration tests for complete workflows

### 5. Security Enhancements (6-8 hours)

**Install security packages:**
```bash
npm install helmet express-rate-limit express-validator
```

**Implement:**
- Rate limiting on all routes
- Input sanitization middleware
- Security headers (helmet)
- Audit logging for sensitive operations
- CSRF protection for state-changing operations

**Add security scanning:**
- npm audit in CI/CD
- SAST (Static Application Security Testing)
- Dependency vulnerability scanning
- Secret scanning

---

## Refactoring Guide: collections.ts

### Current Structure (1,090 lines)
```
collections.ts
├── Types & Interfaces (100 lines)
├── CollectionManager class (800 lines)
├── Statistics calculations (150 lines)
└── Helper functions (40 lines)
```

### Target Structure
```
src/memory/collections/
├── types.ts (150 lines)
│   ├── Collection interface
│   ├── CollectionStats interface
│   ├── CollectionMetric type
│   └── Related types
│
├── stats.ts (200 lines)
│   ├── CollectionStatsManager class
│   ├── Statistics computation logic
│   └── Metrics aggregation
│
├── manager.ts (400 lines)
│   ├── CollectionManager class
│   ├── CRUD operations
│   └── Collection lifecycle
│
├── validators.ts (150 lines)
│   ├── Collection validation
│   ├── Metadata validation
│   └── Schema validation
│
├── utils.ts (100 lines)
│   ├── Helper functions
│   ├── Namespace utilities
│   └── Migration helpers
│
└── index.ts (50 lines)
    └── Public exports
```

### Migration Steps

**Step 1: Extract types (2 hours)**
```bash
# Create new file structure
mkdir -p src/memory/collections
```

**Step 2: Create types.ts (1 hour)**
- Move all interfaces and types
- Add JSDoc comments
- Export everything

**Step 3: Create stats.ts (2-3 hours)**
- Extract statistics-related code
- Create CollectionStatsManager class
- Add unit tests

**Step 4: Create validators.ts (2 hours)**
- Extract validation logic
- Add schema validation with Zod
- Add unit tests

**Step 5: Refactor manager.ts (2-3 hours)**
- Update to use extracted modules
- Simplify by using composition
- Update imports
- Add unit tests

**Step 6: Update imports throughout codebase (1 hour)**
```typescript
// Before
import { Collection, CollectionManager } from './memory/collections.js';

// After
import { Collection, CollectionManager } from './memory/collections/index.js';
```

**Step 7: Test everything (1-2 hours)**
- Run full test suite
- Manual testing
- Check coverage
- Verify no regressions

---

## Code Quality Checklist

### Before Each PR
- [ ] All tests passing
- [ ] No console.log statements added
- [ ] No TODO comments without GitHub issue
- [ ] TypeScript strict mode compliance
- [ ] No new large files (>500 lines)
- [ ] Error handling implemented
- [ ] Logging uses structured logger
- [ ] Documentation updated

### Weekly
- [ ] Run test coverage and review
- [ ] Review open TODO items
- [ ] Check for security vulnerabilities
- [ ] Update dependencies
- [ ] Review file sizes

### Monthly
- [ ] Full security audit
- [ ] Performance profiling
- [ ] Dependency health check
- [ ] Documentation review
- [ ] Refactoring progress review

---

## Success Metrics

### Quality Improvement Targets

**Month 1:**
- Test coverage: 60% → 70%
- Large files: 12 → 8
- TODO count: 7 → 0
- Console.log: 42 → 10

**Month 2:**
- Test coverage: 70% → 80%
- Large files: 8 → 4
- Console.log: 10 → 0
- Service layer implemented

**Month 3:**
- Test coverage: 80% → 85%
- Large files: 4 → 0
- All refactoring complete
- Security enhancements deployed

**Quality Score Progression:**
- Current: 7.5/10
- Month 1: 8.0/10
- Month 2: 8.5/10
- Month 3: 9.2/10

---

## Resources & Tools

### Recommended Tools
- **Logging:** pino, pino-pretty
- **Testing:** vitest, @vitest/coverage-v8, fast-check
- **Security:** helmet, express-rate-limit, express-validator
- **Monitoring:** prom-client, clinic.js
- **Caching:** node-cache, redis (for distributed)
- **Load Testing:** autocannon, artillery

### Documentation
- TypeScript Best Practices: https://typescript-eslint.io/
- Express Security: https://expressjs.com/en/advanced/best-practice-security.html
- Testing Strategies: https://vitest.dev/guide/
- Logging Guide: https://github.com/pinojs/pino/blob/master/docs/api.md

---

**Last Updated:** 2025-12-30
**Next Review:** After high-priority items completed

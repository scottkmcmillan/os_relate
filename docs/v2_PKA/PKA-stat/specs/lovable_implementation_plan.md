# PKA-STRAT Lovable Implementation Plan

## Version: 1.0.0
## Date: 2025-12-29
## Status: Ready for Implementation

---

## Overview

This document provides the master implementation plan for building PKA-STRAT using **Lovable** for frontend development. The platform is a strategic alignment system helping organizations connect daily work to strategic objectives.

### Technology Decisions

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Lovable (Vite + React + TypeScript) | AI-powered rapid UI development |
| UI Components | Shadcn/ui + Tailwind CSS | Component library and styling |
| Frontend State | React Query + React Context | Server state + UI state |
| Authentication | Supabase Auth | User management and JWT |
| User Data | Supabase PostgreSQL | User profiles, preferences, sessions |
| Business Logic | FastAPI (Python) | Document processing, alignment scoring |
| Strategic Data | PostgreSQL + RuVector extension | Pyramid entities, embeddings, hypergraph, scores |
| Real-time | Supabase Realtime | Live updates and notifications |
| File Storage | Supabase Storage | Document uploads |

---

## Documentation Structure

### Available Specifications

| Document | Path | Purpose |
|----------|------|---------|
| **Lovable Frontend Spec** | `specs/frontend/lovable_frontend_specification.md` | Complete frontend architecture for Lovable |
| **Implementation Guide** | `specs/frontend/lovable_implementation_guide.md` | Step-by-step guide for building in Lovable |
| **Component Prompts** | `specs/frontend/lovable_component_prompts.md` | 35+ ready-to-use Lovable prompts |
| **Lovable Architecture** | `specs/architecture/lovable_architecture.md` | System architecture with hybrid backend |
| **API Specification** | `specs/backend/api_specification.md` | REST API endpoints (existing) |
| **Data Models** | `specs/data-models/data_models_specification.md` | Entity definitions and schemas |
| **Database Schema** | `specs/data-models/database_schema.md` | PostgreSQL schema |

---

## Implementation Phases

### Phase 1: Foundation (Week 1)

**Objective:** Set up project infrastructure and authentication

**Tasks:**
1. Create Lovable project with base configuration
2. Configure Supabase project (auth, database, storage)
3. Set up React Router with protected routes
4. Implement authentication flow (login, register, password reset)
5. Create base layout with sidebar navigation
6. Configure environment variables and API clients

**Lovable Prompts to Use:**
- Initial project creation (Implementation Guide, Section 2.1)
- Login page (Component Prompts, Section 1.1)
- Registration page (Component Prompts, Section 1.2)
- Sidebar navigation (Component Prompts, Section 5.1)

**Deliverables:**
- Working authentication flow
- Role-based navigation shell
- Supabase integration

---

### Phase 2: Leader Dashboard (Week 2)

**Objective:** Build executive-level strategic views

**Tasks:**
1. Create Leader Dashboard layout
2. Build Strategic Governance Overview component
3. Implement Alignment Heat Map visualization
4. Add Mission Drift Dashboard
5. Create Board Narrative Generator interface
6. Connect to backend API for alignment data

**Lovable Prompts to Use:**
- Strategic Governance Overview (Component Prompts, Section 2.1)
- Alignment Heat Map (Component Prompts, Section 2.2)
- Mission Drift Dashboard (Component Prompts, Section 2.3)
- Board Narrative Generator (Component Prompts, Section 2.4)

**API Endpoints:**
- `GET /api/v1/alignment/summary`
- `GET /api/v1/alignment/heatmap`
- `GET /api/v1/pyramid/mission/{org_id}`
- `GET /api/v1/drift/alerts`

**Deliverables:**
- Complete Leader Dashboard
- Real-time alignment visualizations
- Mission drift monitoring

---

### Phase 3: Manager Dashboard (Week 3)

**Objective:** Build team management and project tracking views

**Tasks:**
1. Create Manager Dashboard layout
2. Build Team Alignment Scorecard
3. Implement Project Priority Matrix (2x2 grid)
4. Add Duplicate Work Detector
5. Create Progress-to-Strategy Reports
6. Implement At-Risk Initiative Alerts

**Lovable Prompts to Use:**
- Team Alignment Scorecard (Component Prompts, Section 3.1)
- Project Priority Matrix (Component Prompts, Section 3.2)
- Duplicate Work Detector (Component Prompts, Section 3.3)
- Progress-to-Strategy Reports (Component Prompts, Section 3.4)
- At-Risk Initiative Alerts (Component Prompts, Section 3.5)

**API Endpoints:**
- `GET /api/v1/teams/{team_id}/alignment`
- `GET /api/v1/projects/priority-matrix`
- `GET /api/v1/analysis/duplicates`
- `GET /api/v1/reports/progress`

**Deliverables:**
- Complete Manager Dashboard
- Team performance tracking
- Project prioritization tools

---

### Phase 4: Member Dashboard (Week 4)

**Objective:** Build individual contributor views

**Tasks:**
1. Create Member Dashboard layout
2. Build Personal Purpose Dashboard with impact gauge
3. Implement Task Strategic Value Indicator
4. Add Priority Guidance list
5. Create Contribution Impact view
6. Build Pyramid of Clarity Explorer

**Lovable Prompts to Use:**
- Personal Purpose Dashboard (Component Prompts, Section 4.1)
- Task Strategic Value Indicator (Component Prompts, Section 4.2)
- Priority Guidance (Component Prompts, Section 4.3)
- Contribution Impact (Component Prompts, Section 4.4)
- Pyramid Explorer (Component Prompts, Section 4.5)

**API Endpoints:**
- `GET /api/v1/users/{user_id}/impact`
- `GET /api/v1/tasks/strategic-value`
- `GET /api/v1/pyramid/explorer`

**Deliverables:**
- Complete Member Dashboard
- Personal impact tracking
- Strategic context for daily work

---

### Phase 5: Document Management (Week 5)

**Objective:** Enable document upload and processing

**Tasks:**
1. Build Document Upload interface
2. Create Document Library view
3. Implement Document Viewer with provenance
4. Add document-to-entity linking
5. Configure Supabase Storage
6. Connect to backend document processing API

**Components:**
- Document Upload (Component Prompts, Section 5.3)
- Document Viewer (Component Prompts, Section 5.4)

**API Endpoints:**
- `POST /api/v1/documents/upload`
- `GET /api/v1/documents`
- `GET /api/v1/documents/{doc_id}/chunks`
- `POST /api/v1/documents/{doc_id}/link`

**Deliverables:**
- Document upload workflow
- Document library with search
- Provenance tracking display

---

### Phase 6: Integration & Polish (Week 6)

**Objective:** Complete integration and optimize UX

**Tasks:**
1. Implement real-time updates across dashboards
2. Add notification center
3. Create settings pages
4. Optimize performance (lazy loading, caching)
5. Add error handling and loading states
6. Implement responsive design fixes
7. User acceptance testing

**Deliverables:**
- Real-time data synchronization
- Complete notification system
- Production-ready application

---

## Supabase Setup Guide

### 1. Create Supabase Project

```bash
# Go to supabase.com and create new project
# Save these values for .env:
# - Project URL
# - Anon Key (public)
# - Service Role Key (backend only)
```

### 2. Database Tables (Supabase)

```sql
-- User profiles (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT CHECK (role IN ('leader', 'manager', 'member')) DEFAULT 'member',
  organization_id UUID,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);
```

### 3. Authentication Configuration

- Enable Email/Password authentication
- Configure email templates
- Set up redirect URLs
- (Optional) Enable OAuth providers

---

## Backend API Integration

### API Base URL Configuration

```typescript
// src/lib/api.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = {
  baseUrl: API_BASE_URL,
  endpoints: {
    alignment: `${API_BASE_URL}/api/v1/alignment`,
    documents: `${API_BASE_URL}/api/v1/documents`,
    pyramid: `${API_BASE_URL}/api/v1/pyramid`,
    tasks: `${API_BASE_URL}/api/v1/tasks`,
  }
};
```

### Authentication Header

```typescript
// Include Supabase JWT in backend requests
import { supabase } from '@/integrations/supabase/client';

export async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Authorization': `Bearer ${session?.access_token}`,
    'Content-Type': 'application/json',
  };
}
```

---

## Environment Variables

### Frontend (.env)

```bash
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx

# Backend API
VITE_API_URL=https://api.pka-strat.com

# Feature Flags
VITE_ENABLE_REALTIME=true
VITE_ENABLE_ANALYTICS=false
```

### Backend (.env)

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Supabase (for JWT validation)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_JWT_SECRET=xxx
```
# Embedding model
Recommend and implement the best open source embedding model that works as well or better than OpenAI embeddings, probably through hugging face

---

## Deployment Strategy

### Frontend (Lovable)

1. **Development:** Lovable's built-in preview
2. **Staging:** Export to GitHub, deploy to Vercel
3. **Production:** Vercel with custom domain

### Backend (FastAPI)

1. **Development:** Local Docker
2. **Staging:** Cloud Run / Railway
3. **Production:** Cloud Run with auto-scaling

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Page Load Time | < 3s |
| Time to Interactive | < 5s |
| API Response Time | < 500ms |
| Real-time Update Latency | < 1s |
| Authentication Success Rate | > 99% |
| Mobile Responsiveness | All breakpoints |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Lovable limitations | Export code for manual customization |
| Supabase downtime | Implement offline-first patterns |
| Backend API issues | Graceful error handling with fallbacks |
| Performance problems | Lazy loading, caching, pagination |
| Data consistency | Optimistic updates with rollback |

---

## Next Steps

1. **Review** this plan and specifications
2. **Create** Supabase project and configure auth
3. **Start** Lovable project with initial prompts
4. **Build** Phase 1 (authentication and navigation)
5. **Iterate** through remaining phases

---

## Related Documents

- [Lovable Frontend Specification](./frontend/lovable_frontend_specification.md)
- [Lovable Implementation Guide](./frontend/lovable_implementation_guide.md)
- [Lovable Component Prompts](./frontend/lovable_component_prompts.md)
- [Lovable Architecture](./architecture/lovable_architecture.md)
- [API Specification](./backend/api_specification.md)
- [Data Models](./data-models/data_models_specification.md)

---

**End of Implementation Plan**

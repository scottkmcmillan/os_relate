# PKA-STRAT Lovable Frontend Specification

## Version: 1.0.0
## Date: 2025-12-29
## Status: Active Development

---

## Table of Contents

1. [Overview](#overview)
2. [Lovable-Specific Architecture](#lovable-specific-architecture)
3. [Technology Stack](#technology-stack)
4. [Supabase Backend Integration](#supabase-backend-integration)
5. [Page Structure & Routes](#page-structure--routes)
6. [Component Specifications](#component-specifications)
7. [State Management](#state-management)
8. [Authentication Flow](#authentication-flow)
9. [Real-time Features](#real-time-features)
10. [Lovable Prompts Guide](#lovable-prompts-guide)
11. [UI/UX Guidelines](#uiux-guidelines)
12. [Progressive Disclosure Strategy](#progressive-disclosure-strategy)

---

## Overview

PKA-STRAT is a strategic alignment platform with three distinct role-based user experiences:
- **Leaders**: Strategic governance, alignment maps, mission drift monitoring
- **Team Managers**: Team scorecards, project priorities, progress tracking
- **Team Members**: Personal purpose, task value indicators, contribution impact

This specification adapts PKA-STRAT for Lovable, which generates Vite-based React applications with Supabase backend integration. The focus is on clear, specific component descriptions that Lovable can generate effectively.

### Design Philosophy for Lovable

1. **Component Simplicity**: Each component described in 1-2 clear sentences
2. **Shadcn/ui First**: Use shadcn components as building blocks
3. **Supabase Native**: Leverage Supabase for auth, database, storage, realtime
4. **React Query Patterns**: Use TanStack Query for server state
5. **No Complex State**: Avoid Redux/Zustand - use React Query + React Context
6. **Declarative Data Flow**: Describe data needs, not implementation details

---

## Lovable-Specific Architecture

### What Lovable Generates

```
lovable-project/
├── src/
│   ├── components/          # React components
│   │   ├── ui/              # shadcn/ui components (auto-generated)
│   │   ├── dashboard/       # Dashboard components
│   │   ├── visualizations/  # Charts and graphs
│   │   └── shared/          # Shared components
│   ├── pages/               # Route pages
│   ├── hooks/               # Custom React hooks
│   ├── integrations/        # Supabase client setup
│   │   └── supabase/
│   │       ├── client.ts
│   │       ├── auth.tsx
│   │       └── types.ts
│   ├── lib/                 # Utilities
│   └── App.tsx              # Main app component
├── supabase/                # Supabase configuration
│   ├── migrations/          # Database migrations
│   └── functions/           # Edge functions (optional)
├── index.html
├── vite.config.ts
└── package.json
```

### Key Differences from Next.js Spec

| Feature | Next.js 14 (Original) | Lovable (Vite) |
|---------|----------------------|----------------|
| Routing | App Router (SSR) | React Router (CSR) |
| Data Fetching | Server Components | React Query + Supabase |
| Auth | Custom JWT | Supabase Auth |
| Database | PostgreSQL + API | Supabase (Postgres) |
| Real-time | WebSocket/Socket.io | Supabase Realtime |
| File Storage | S3/CloudFront | Supabase Storage |
| State Management | Zustand + React Query | React Query + Context |
| Styling | Tailwind CSS | Tailwind CSS (same) |
| UI Components | shadcn/ui | shadcn/ui (same) |

---

## Technology Stack

### Core Framework
- **Vite 5.x**: Build tool and dev server
- **React 18.x**: UI library
- **TypeScript 5.x**: Type safety
- **React Router 6.x**: Client-side routing
- **TanStack Query v5**: Server state management

### UI & Styling
- **Tailwind CSS 3.x**: Utility-first CSS
- **shadcn/ui**: Component library (Radix UI + Tailwind)
- **Recharts**: Data visualizations
- **Lucide React**: Icons
- **Framer Motion**: Animations (optional)

### Backend (Supabase + PKA-STRAT API)
- **Supabase Client**: Authentication, user management, realtime
- **PKA-STRAT Backend**: PostgreSQL with RuVector extension (vectors + hypergraph)
- **Row Level Security (RLS)**: Multi-tenant isolation
- **Local Deployment**: Docker Compose for all services

### Developer Tools
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **TypeScript**: Type checking
- **Vite Dev Server**: Hot module replacement

---

## Supabase Backend Integration

### 1. Database Schema

Supabase uses PostgreSQL. Map the existing database schema to Supabase:

```sql
-- organizations table
CREATE TABLE organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- users table (managed by Supabase Auth)
-- auth.users is built-in, extend with profiles
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  role TEXT CHECK (role IN ('leader', 'manager', 'member')),
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- pyramid_entities table (simplified for Lovable)
CREATE TABLE pyramid_entities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'mission', 'vision', 'objective', 'goal',
    'portfolio', 'program', 'project', 'task'
  )),
  parent_id UUID REFERENCES pyramid_entities(id),
  title TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- alignment_scores table
CREATE TABLE alignment_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  entity_id UUID REFERENCES pyramid_entities(id) NOT NULL,
  score DECIMAL(5,2) CHECK (score >= 0 AND score <= 100),
  score_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- documents table
CREATE TABLE documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  title TEXT NOT NULL,
  file_path TEXT,
  doc_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Row Level Security (RLS)

Enable RLS for multi-tenant isolation:

```sql
-- Enable RLS on all tables
ALTER TABLE pyramid_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE alignment_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their organization's data
CREATE POLICY org_isolation ON pyramid_entities
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id
      FROM profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY org_isolation ON alignment_scores
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id
      FROM profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY org_isolation ON documents
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id
      FROM profiles
      WHERE id = auth.uid()
    )
  );
```

### 3. Supabase Client Setup

```typescript
// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js'
import { Database } from './types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
```

### 4. Type Generation

Generate TypeScript types from Supabase schema:

```bash
npx supabase gen types typescript --project-id "your-project-id" > src/integrations/supabase/types.ts
```

---

## Page Structure & Routes

### Route Definitions

```typescript
// src/lib/routes.ts
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',

  // Leader routes
  LEADER_DASHBOARD: '/leader',
  LEADER_ALIGNMENT: '/leader/alignment',
  LEADER_DRIFT: '/leader/drift',
  LEADER_NARRATIVES: '/leader/narratives',

  // Manager routes
  MANAGER_DASHBOARD: '/manager',
  MANAGER_PRIORITIES: '/manager/priorities',
  MANAGER_PROGRESS: '/manager/progress',

  // Member routes
  MEMBER_DASHBOARD: '/member',
  MEMBER_TASKS: '/member/tasks',
  MEMBER_IMPACT: '/member/impact',

  // Shared routes
  DOCUMENTS: '/documents',
  SETTINGS: '/settings',
} as const
```

### React Router Setup

```typescript
// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/integrations/supabase/auth'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              {/* Leader routes */}
              <Route path="/leader" element={<LeaderDashboard />} />
              <Route path="/leader/alignment" element={<AlignmentMap />} />
              <Route path="/leader/drift" element={<MissionDrift />} />

              {/* Manager routes */}
              <Route path="/manager" element={<ManagerDashboard />} />
              <Route path="/manager/priorities" element={<PriorityMatrix />} />

              {/* Member routes */}
              <Route path="/member" element={<MemberDashboard />} />
              <Route path="/member/tasks" element={<TaskList />} />

              {/* Shared routes */}
              <Route path="/documents" element={<Documents />} />
            </Route>

            <Route path="/" element={<Navigate to="/leader" />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
```

### Protected Route Component

```typescript
// src/components/ProtectedRoute.tsx
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/integrations/supabase/auth'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'

export function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingSpinner />
  }

  if (!user) {
    return <Navigate to="/login" />
  }

  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  )
}
```

---

## Component Specifications

All components are described for Lovable to generate. Each description is clear and actionable.

### Layout Components

#### 1. DashboardLayout

**Lovable Prompt:**
```
Create a DashboardLayout component with a sidebar navigation on the left and main content area on the right.
The sidebar should show navigation items based on user role (leader/manager/member), user profile info at the top,
and a notification bell. The sidebar should be collapsible on mobile. Use shadcn/ui's Sheet component for mobile sidebar.
Main content area should have a top bar with page title and breadcrumbs.
```

**Implementation Guidance:**
- Use `Sheet` from shadcn/ui for mobile sidebar
- Sidebar width: `w-64` on desktop, full screen on mobile
- Show role-based nav items using a mapping object
- Add notification bell with badge count
- Collapsible mobile sidebar with hamburger icon

#### 2. Sidebar Navigation

**Lovable Prompt:**
```
Create a Sidebar component that displays navigation links based on user role.
For leaders, show: Strategic Governance, Alignment Map, Mission Drift, Documents.
For managers, show: Team Scorecard, Priority Matrix, Progress Reports, Documents.
For members, show: My Purpose, My Tasks, My Impact, Documents.
Highlight the active route. Use lucide-react icons for each nav item.
```

**Data Requirements:**
```typescript
interface NavItem {
  label: string
  icon: LucideIcon
  route: string
  roles: ('leader' | 'manager' | 'member')[]
}
```

### Leader Dashboard Components

#### 3. Strategic Governance Dashboard

**Lovable Prompt:**
```
Create a StrategicGovernance component that displays key metrics in a grid layout.
Show 4 metric cards: Overall Alignment Score (large gauge chart), Mission Drift Index (smaller gauge),
Active Initiatives (number), Completed This Month (number). Below the cards, show a trend line chart
with alignment history over the past 30 days. Use Recharts for the charts. Fetch data from Supabase
using React Query from the alignment_scores table.
```

**Query Pattern:**
```typescript
const { data } = useQuery({
  queryKey: ['strategic-metrics', organizationId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('alignment_scores')
      .select('*')
      .eq('organization_id', organizationId)
      .order('score_date', { ascending: false })
      .limit(30)

    if (error) throw error
    return data
  }
})
```

#### 4. Alignment Map (Heat Map)

**Lovable Prompt:**
```
Create an AlignmentMap component that visualizes organizational alignment as a heat map.
Display teams/departments as colored boxes in a grid. Green (>80 score) = highly aligned,
yellow (50-80) = moderate, red (<50) = misaligned. When clicking a box, show a modal with
details about that team's alignment breakdown. Fetch team alignment data from Supabase
pyramid_entities and join with alignment_scores. Use shadcn/ui Dialog for the modal.
```

**Visual Layout:**
```
┌─────────────────────────────────────┐
│  Organizational Alignment Heat Map  │
├─────────────────────────────────────┤
│  ┌──────┐ ┌──────┐ ┌──────┐        │
│  │ Eng  │ │ Sales│ │ Mktg │        │
│  │ 92   │ │ 78   │ │ 54   │        │
│  │ 🟢   │ │ 🟡   │ │ 🔴   │        │
│  └──────┘ └──────┘ └──────┘        │
│  ... more teams ...                 │
└─────────────────────────────────────┘
```

#### 5. Mission Drift Dashboard

**Lovable Prompt:**
```
Create a MissionDrift component with a large speedometer-style gauge showing overall drift score (0-100, lower is better).
Below it, show 4 smaller cards: Resource Misalignment %, Document Inconsistencies count,
Strategic Coverage %, and a list of drifting entities (projects/teams with low alignment).
Each drifting entity should be clickable to show recommendations. Use Recharts for the gauge chart.
Fetch drift alerts from Supabase mission_drift_alerts table where status is 'active'.
```

#### 6. Board Narrative Generator

**Lovable Prompt:**
```
Create a BoardNarrative component with a rich text preview area showing an AI-generated executive summary.
Include buttons to generate report (triggers Supabase Edge Function), export to PDF, and customize sections.
Show a loading state while generating. The preview should display: Executive Summary, Key Metrics (with charts),
Strategic Wins, Challenges, and Next Steps. Use a WYSIWYG preview with embedded Recharts charts.
```

### Manager Dashboard Components

#### 7. Team Alignment Scorecard

**Lovable Prompt:**
```
Create a TeamScorecard component displaying the team's overall alignment score as a large radial gauge.
Below it, show 4 dimension bars: Strategic Alignment, Task Prioritization, Resource Efficiency, Goal Progress.
Each bar should be colored (green/yellow/red based on score). At the bottom, show two columns:
team member scores (sorted list with avatars) and project scores (horizontal bar chart).
Fetch data from Supabase profiles joined with alignment_scores filtered by team_id.
```

#### 8. Project Priority Matrix

**Lovable Prompt:**
```
Create a PriorityMatrix component showing a 2x2 Eisenhower matrix. X-axis is Strategic Alignment (Low to High),
Y-axis is Urgency (Low to High). Projects are draggable cards that can be moved between quadrants.
Quadrants are: Top-Right (Critical & Aligned - green), Top-Left (Urgent but Misaligned - yellow),
Bottom-Right (Important, Not Urgent - blue), Bottom-Left (Low Priority - gray).
Use react-beautiful-dnd or dnd-kit for drag-and-drop. Fetch projects from pyramid_entities where entity_type='project'.
```

**Data Structure:**
```typescript
interface Project {
  id: string
  title: string
  alignment_score: number
  urgency: 'low' | 'medium' | 'high'
  quadrant: 'critical' | 'urgent_misaligned' | 'important' | 'low'
}
```

#### 9. Progress Reports

**Lovable Prompt:**
```
Create a ProgressReports component with collapsible accordion sections for each strategic objective.
Each section shows: progress bar (0-100%), completed vs planned work, blockers (red badges),
and alignment trend (sparkline chart). At the top, add filters for time period (sprint/month/quarter)
and export to PDF button. Use shadcn/ui Accordion component. Fetch from pyramid_entities where entity_type='objective'
joined with alignment_scores and key_results.
```

### Member Dashboard Components

#### 10. Personal Purpose Dashboard

**Lovable Prompt:**
```
Create a PersonalPurpose component with a hero section showing the member's strategic impact score
as a large animated gauge (use Framer Motion). Below it, display current tasks as cards with
alignment indicators (colored dots: green/yellow/red). Each task card shows: task title, due date,
alignment score, and the strategic pillar it connects to. At the bottom, show recent impact achievements
(badges) and learning path suggestions. Fetch from tasks table joined with alignment_scores for current user.
```

#### 11. Task Strategic Value Indicator

**Lovable Prompt:**
```
Create a TaskValueIndicator component that displays as a badge on each task card.
Show a colored dot (green >80, yellow 50-80, red <50), alignment score number,
and strategic pillar icon. On hover, show a tooltip with the full strategic chain:
"This task → Project X → Objective Y → Mission Z". Use shadcn/ui Tooltip component.
```

#### 12. Pyramid of Clarity Explorer

**Lovable Prompt:**
```
Create a PyramidExplorer component showing an interactive pyramid visualization with 6 levels:
Mission (top), Vision, Objectives, Goals, Projects, Tasks (bottom). The current user's task is highlighted.
Clicking any level shows a side panel with details. Draw connecting lines showing the hierarchy path.
Use SVG for the pyramid shape. Fetch the full hierarchy from pyramid_entities table with recursive CTE or
use Supabase's built-in recursive queries.
```

### Shared Components

#### 13. Document Upload

**Lovable Prompt:**
```
Create a DocumentUpload component with drag-and-drop file upload. Show a dashed border upload zone
with an upload icon. Accept PDF, DOCX, TXT files up to 10MB. Show upload progress bar while uploading.
After upload, show preview thumbnail and metadata form (document type, title, linked entity).
Use Supabase Storage for file upload and insert metadata into documents table.
Use shadcn/ui DropZone pattern (can build with native drag events).
```

**Supabase Storage Pattern:**
```typescript
const uploadDocument = async (file: File) => {
  // Upload file to Supabase Storage
  const { data: storageData, error: storageError } = await supabase
    .storage
    .from('documents')
    .upload(`${organizationId}/${file.name}`, file)

  if (storageError) throw storageError

  // Insert metadata
  const { data: docData, error: docError } = await supabase
    .from('documents')
    .insert({
      organization_id: organizationId,
      title: file.name,
      file_path: storageData.path,
      uploaded_by: user.id
    })

  if (docError) throw docError
  return docData
}
```

#### 14. Alignment Gauge

**Lovable Prompt:**
```
Create an AlignmentGauge component that displays a semi-circular gauge chart showing an alignment score (0-100).
Color the gauge: green (>80), yellow (50-80), red (<50). Show the score number in the center.
Add a subtitle showing the trend (↑ Improving, → Stable, ↓ Declining) based on comparing to previous score.
Accept props: value (number), size ('sm', 'md', 'lg'), previousValue (number). Use Recharts RadialBarChart.
```

#### 15. Notification Center

**Lovable Prompt:**
```
Create a NotificationCenter component that shows a bell icon with badge count in the top bar.
Clicking it opens a dropdown panel (use shadcn/ui Popover) showing recent notifications.
Notifications include: drift alerts, task assignments, document approvals. Each notification is clickable
and marks as read. Fetch from a notifications table in Supabase using real-time subscriptions.
Show unread count on the badge.
```

**Real-time Pattern:**
```typescript
useEffect(() => {
  const channel = supabase
    .channel('notifications')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${user.id}`
    }, (payload) => {
      setNotifications(prev => [payload.new, ...prev])
    })
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}, [user.id])
```

---

## State Management

### React Query Patterns

Use TanStack Query for all server state:

```typescript
// src/hooks/useAlignmentScores.ts
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export function useAlignmentScores(organizationId: string) {
  return useQuery({
    queryKey: ['alignment-scores', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alignment_scores')
        .select(`
          *,
          entity:pyramid_entities(*)
        `)
        .eq('organization_id', organizationId)
        .order('score_date', { ascending: false })

      if (error) throw error
      return data
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
```

### React Context for UI State

```typescript
// src/contexts/ThemeContext.tsx
import { createContext, useContext, useState } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContext {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContext | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
```

### No Zustand/Redux Needed

Lovable apps use:
1. **React Query** for server state (API data)
2. **React Context** for global UI state (theme, sidebar collapsed, etc.)
3. **Local State** (`useState`) for component-specific state

---

## Authentication Flow

### Supabase Auth Integration

#### 1. Auth Provider

```typescript
// src/integrations/supabase/auth.tsx
import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from './client'

interface AuthContext {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContext | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
```

#### 2. Login Page

**Lovable Prompt:**
```
Create a LoginPage component with a centered card containing email and password inputs,
a "Sign In" button, and a "Don't have an account? Register" link. Use shadcn/ui Card, Input, and Button.
On submit, call the signIn function from useAuth hook. Show error toast if login fails.
Add a loading spinner on the button while authenticating. Include a logo at the top.
```

#### 3. Register Page

**Lovable Prompt:**
```
Create a RegisterPage component with email, password, confirm password inputs, and organization name input.
Include a "Sign Up" button and "Already have an account? Login" link. Use shadcn/ui form components.
Validate that passwords match. On submit, call signUp from useAuth and create organization record in Supabase.
Show success message and redirect to dashboard after registration.
```

### Role-Based Access Control

```typescript
// src/hooks/useRole.ts
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/integrations/supabase/auth'

export function useRole() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user) return null

      const { data, error } = await supabase
        .from('profiles')
        .select('role, organization_id')
        .eq('id', user.id)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!user,
  })
}
```

---

## Real-time Features

### Supabase Realtime Subscriptions

#### 1. Alignment Score Updates

**Lovable Prompt:**
```
Create a useRealtimeAlignmentScores hook that subscribes to alignment_scores table changes.
When a new score is inserted or updated, invalidate the React Query cache for alignment-scores
to trigger a refetch. Use Supabase's realtime subscription with postgres_changes event.
```

**Implementation:**
```typescript
// src/hooks/useRealtimeAlignmentScores.ts
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export function useRealtimeAlignmentScores(organizationId: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel('alignment-scores-changes')
      .on('postgres_changes', {
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'alignment_scores',
        filter: `organization_id=eq.${organizationId}`
      }, () => {
        // Invalidate queries to refetch
        queryClient.invalidateQueries({ queryKey: ['alignment-scores'] })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [organizationId, queryClient])
}
```

#### 2. Notification Updates

**Lovable Prompt:**
```
Create a useRealtimeNotifications hook that listens for new notifications in real-time.
When a notification is inserted for the current user, add it to the local state and show a toast.
Use Supabase realtime with filter on user_id. Use shadcn/ui toast for notifications.
```

#### 3. Mission Drift Alerts

**Lovable Prompt:**
```
Create a useRealtimeDriftAlerts hook that subscribes to mission_drift_alerts table.
When a new alert with severity 'critical' or 'high' is created, show a prominent toast notification
with a "View Details" button. Play a subtle alert sound (optional). Subscribe only to alerts for the current organization.
```

---

## Lovable Prompts Guide

### How to Describe Components to Lovable

#### ✅ Good Prompts (Clear, Specific, Actionable)

1. **Strategic Governance Dashboard**
   ```
   Create a StrategicGovernance component with a 2x2 grid of metric cards at the top.
   Cards show: 1) Overall Alignment Score (large number with gauge), 2) Mission Drift Index (smaller gauge),
   3) Active Initiatives (count), 4) Completed This Month (count). Below the grid, add a line chart
   showing alignment trend over 30 days. Use shadcn/ui Card and Recharts LineChart.
   Fetch data from Supabase alignment_scores table using React Query.
   ```

2. **Alignment Heat Map**
   ```
   Create an AlignmentMap component displaying teams as colored grid boxes. Each box shows team name
   and alignment score. Colors: green (>80), yellow (50-80), red (<50). Clicking a box opens a Dialog
   with team details. Fetch from pyramid_entities joined with alignment_scores. Use shadcn/ui Dialog and Grid layout.
   ```

3. **Document Upload**
   ```
   Create a DocumentUpload component with drag-and-drop zone for PDF/DOCX files.
   Show upload progress bar. After upload, display file preview and form for: document type dropdown,
   title input, linked entity selector. Upload to Supabase Storage bucket 'documents' and save metadata
   to documents table. Use shadcn/ui Input, Select, and Progress components.
   ```

#### ❌ Bad Prompts (Vague, Complex, Implementation-Heavy)

1. **Too Vague**
   ```
   Create a dashboard component with some charts
   ```
   *Problem: Doesn't specify layout, data, chart types, or data source*

2. **Too Complex**
   ```
   Create a multi-step wizard with conditional branching based on user role, dynamic form fields
   that change based on previous selections, integration with 3 different APIs, custom validation logic,
   and state persistence across page refreshes using local storage and Redux...
   ```
   *Problem: Too many features, complex state management, too many dependencies*

3. **Implementation-Focused**
   ```
   Create a component using the Factory pattern with dependency injection, implement a custom hook
   using useReducer for complex state management, memoize with useMemo and useCallback...
   ```
   *Problem: Lovable generates code, not the other way around. Describe what, not how*

### Lovable-Friendly Component Description Template

```
Component Name: [ComponentName]

Purpose: [1 sentence describing what the component does]

Layout: [Describe the visual structure - grid, flex, columns, etc.]

Elements:
- [Element 1]: [What it shows, color, size]
- [Element 2]: [What it shows, behavior]
- [Element 3]: [What it shows, interaction]

Data Source: [Supabase table/query description]

Interactions:
- [User action]: [What happens]

UI Components: [List shadcn/ui components to use]

Example:
Component Name: TeamScorecard

Purpose: Display team alignment metrics and member scores

Layout: Card with gauge at top, 4 horizontal bars below, 2-column grid at bottom

Elements:
- Overall Score: Large radial gauge (0-100), colored by score (green/yellow/red)
- Dimension Bars: Strategic Alignment, Task Prioritization, Resource Efficiency, Goal Progress
- Left Column: Team member list with avatars and scores (sorted high to low)
- Right Column: Horizontal bar chart of project scores

Data Source: Supabase profiles table joined with alignment_scores, filtered by team_id

Interactions:
- Click member: Navigate to member detail page
- Click project bar: Show project details modal

UI Components: Card, Progress, Avatar, Dialog, Badge
```

---

## UI/UX Guidelines

### Color System (Alignment-Focused)

```typescript
// Alignment score colors
const ALIGNMENT_COLORS = {
  high: 'text-green-500 bg-green-50 border-green-200',     // 90-100: Highly aligned
  good: 'text-emerald-500 bg-emerald-50 border-emerald-200', // 80-89: Well aligned
  moderate: 'text-yellow-500 bg-yellow-50 border-yellow-200', // 50-79: Needs attention
  low: 'text-orange-500 bg-orange-50 border-orange-200',   // 30-49: Misaligned
  critical: 'text-red-500 bg-red-50 border-red-200',       // 0-29: Critical drift
}

// Status colors
const STATUS_COLORS = {
  active: 'text-blue-500 bg-blue-50',
  completed: 'text-green-500 bg-green-50',
  onHold: 'text-yellow-500 bg-yellow-50',
  cancelled: 'text-gray-500 bg-gray-50',
}

// Priority colors
const PRIORITY_COLORS = {
  critical: 'text-red-600 bg-red-50 border-red-300',
  high: 'text-orange-600 bg-orange-50 border-orange-300',
  medium: 'text-yellow-600 bg-yellow-50 border-yellow-300',
  low: 'text-gray-600 bg-gray-50 border-gray-300',
}
```

### Typography Scale

```typescript
// Tailwind classes for consistent typography
const TEXT_STYLES = {
  pageTitle: 'text-3xl font-bold text-gray-900',
  sectionTitle: 'text-2xl font-semibold text-gray-800',
  cardTitle: 'text-lg font-semibold text-gray-900',
  body: 'text-base text-gray-700',
  caption: 'text-sm text-gray-600',
  label: 'text-sm font-medium text-gray-700',
}
```

### Spacing System

```typescript
// Consistent spacing using Tailwind
const SPACING = {
  containerPadding: 'px-4 md:px-6 lg:px-8',
  sectionGap: 'space-y-6',
  cardGap: 'space-y-4',
  gridGap: 'gap-4 md:gap-6',
}
```

### Responsive Breakpoints

```typescript
// Tailwind breakpoints (mobile-first)
// sm: 640px  - Mobile landscape
// md: 768px  - Tablet
// lg: 1024px - Desktop
// xl: 1280px - Large desktop
// 2xl: 1536px - Extra large

// Example responsive layout
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Responsive grid: 1 col mobile, 2 tablet, 3 desktop */}
</div>
```

### Accessibility Requirements

1. **Color Contrast**: WCAG 2.1 AA (4.5:1 for text, 3:1 for UI components)
2. **Keyboard Navigation**: All interactive elements focusable with Tab
3. **Screen Reader Support**: ARIA labels on all icons and interactive elements
4. **Focus Indicators**: Visible focus rings (use Tailwind's `focus:ring-2`)

**Lovable Prompt Example:**
```
Create all buttons with proper ARIA labels, keyboard navigation support, and focus visible indicators.
Use shadcn/ui Button component which includes these by default. Add aria-label to icon-only buttons.
```

### Loading States

**Lovable Prompt:**
```
Create a LoadingSkeleton component with animated pulse effect for dashboard cards.
Show skeleton cards matching the actual card layout with placeholder rectangles and circles.
Use Tailwind's animate-pulse and gray-200 background. Display while data is loading from Supabase.
```

### Empty States

**Lovable Prompt:**
```
Create an EmptyState component showing an illustration icon, heading, description, and action button.
Use for: no documents uploaded, no tasks assigned, no alignment data yet.
Pass props: icon (lucide-react), title, description, actionLabel, onAction. Use shadcn/ui Button.
```

### Error States

**Lovable Prompt:**
```
Create an ErrorBoundary component that catches React errors and displays a friendly error message.
Show: error icon, "Something went wrong" heading, error details (in dev mode only),
"Try Again" button that reloads the page. Use shadcn/ui Alert component with variant destructive.
```

---

## Progressive Disclosure Strategy

### Information Hierarchy

#### Level 1: Dashboard Overview (Always Visible)
- High-level metrics (overall alignment score)
- Alert counts (drift alerts, pending tasks)
- Quick actions (upload document, create project)

#### Level 2: Category Views (One Click Away)
- Alignment by department/team
- Project list with basic info
- Document library grid

#### Level 3: Detailed Views (Two Clicks / Modal)
- Individual project details
- Team alignment breakdown
- Document preview with metadata

#### Level 4: Advanced Features (Menu / Settings)
- What-if simulations
- Custom reports
- Integration settings

### Progressive Enhancement Pattern

**Lovable Prompt Example:**
```
Create a ProjectCard component with two states: collapsed (shows title, status, alignment score)
and expanded (adds description, team members, progress bar, key metrics).
Click card to toggle expansion. Use Tailwind transition for smooth animation.
Expanded state fetches additional data from Supabase only when opened.
```

### Lazy Loading

```typescript
// Lazy load heavy components
const AlignmentMap = lazy(() => import('@/components/dashboard/AlignmentMap'))
const PyramidExplorer = lazy(() => import('@/components/visualizations/PyramidExplorer'))

// Usage with Suspense
<Suspense fallback={<LoadingSkeleton />}>
  <AlignmentMap />
</Suspense>
```

### Pagination Pattern

**Lovable Prompt:**
```
Create a PaginatedList component that displays items in pages of 20.
Show page numbers, Previous/Next buttons, and "Items 1-20 of 156" text.
Use Supabase's range() method for pagination. Use shadcn/ui Pagination component.
```

**Supabase Pagination:**
```typescript
const { data } = await supabase
  .from('pyramid_entities')
  .select('*', { count: 'exact' })
  .range(page * pageSize, (page + 1) * pageSize - 1)
```

---

## Data Fetching Patterns

### 1. Basic Query

```typescript
// Fetch all projects for an organization
const { data: projects, isLoading, error } = useQuery({
  queryKey: ['projects', organizationId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('pyramid_entities')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('entity_type', 'project')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }
})
```

### 2. Query with Joins

```typescript
// Fetch projects with alignment scores
const { data: projects } = useQuery({
  queryKey: ['projects-with-scores', organizationId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('pyramid_entities')
      .select(`
        *,
        alignment_scores(score, score_date),
        owner:profiles(full_name, avatar_url)
      `)
      .eq('organization_id', organizationId)
      .eq('entity_type', 'project')

    if (error) throw error
    return data
  }
})
```

### 3. Mutations (Create/Update/Delete)

```typescript
// Create a new project
const createProject = useMutation({
  mutationFn: async (newProject: NewProject) => {
    const { data, error } = await supabase
      .from('pyramid_entities')
      .insert({
        organization_id: organizationId,
        entity_type: 'project',
        ...newProject
      })
      .select()
      .single()

    if (error) throw error
    return data
  },
  onSuccess: () => {
    // Invalidate queries to refetch
    queryClient.invalidateQueries({ queryKey: ['projects'] })
    toast({ title: 'Project created successfully' })
  }
})

// Usage
<Button onClick={() => createProject.mutate({ title: 'New Project', ... })}>
  Create Project
</Button>
```

### 4. Optimistic Updates

```typescript
const updateProjectStatus = useMutation({
  mutationFn: async ({ id, status }: { id: string, status: string }) => {
    const { error } = await supabase
      .from('pyramid_entities')
      .update({ status })
      .eq('id', id)

    if (error) throw error
  },
  onMutate: async ({ id, status }) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['projects'] })

    // Snapshot previous value
    const previousProjects = queryClient.getQueryData(['projects'])

    // Optimistically update
    queryClient.setQueryData(['projects'], (old: any[]) =>
      old.map(p => p.id === id ? { ...p, status } : p)
    )

    return { previousProjects }
  },
  onError: (err, variables, context) => {
    // Rollback on error
    queryClient.setQueryData(['projects'], context.previousProjects)
  },
  onSettled: () => {
    // Always refetch after error or success
    queryClient.invalidateQueries({ queryKey: ['projects'] })
  }
})
```

---

## File Structure Summary

```
src/
├── components/
│   ├── ui/                      # shadcn/ui components (auto-generated)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   └── ... (30+ components)
│   ├── layouts/
│   │   ├── DashboardLayout.tsx
│   │   ├── Sidebar.tsx
│   │   └── TopBar.tsx
│   ├── dashboard/
│   │   ├── leader/
│   │   │   ├── StrategicGovernance.tsx
│   │   │   ├── AlignmentMap.tsx
│   │   │   └── MissionDrift.tsx
│   │   ├── manager/
│   │   │   ├── TeamScorecard.tsx
│   │   │   └── PriorityMatrix.tsx
│   │   └── member/
│   │       ├── PersonalPurpose.tsx
│   │       └── TaskValueIndicator.tsx
│   ├── visualizations/
│   │   ├── AlignmentGauge.tsx
│   │   ├── HeatMap.tsx
│   │   └── PyramidChart.tsx
│   └── shared/
│       ├── DocumentUpload.tsx
│       ├── NotificationCenter.tsx
│       └── LoadingSkeleton.tsx
├── pages/
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── LeaderDashboard.tsx
│   ├── ManagerDashboard.tsx
│   └── MemberDashboard.tsx
├── hooks/
│   ├── useAlignmentScores.ts
│   ├── useRole.ts
│   ├── useRealtimeAlignmentScores.ts
│   └── useRealtimeNotifications.ts
├── integrations/
│   └── supabase/
│       ├── client.ts
│       ├── auth.tsx
│       └── types.ts
├── lib/
│   ├── routes.ts
│   ├── utils.ts
│   └── constants.ts
├── contexts/
│   └── ThemeContext.tsx
├── App.tsx
└── main.tsx
```

---

## Development Workflow with Lovable

### 1. Initial Setup

1. Create project in Lovable
2. Set up Supabase project and get connection strings
3. Add environment variables in Lovable:
   ```
   VITE_SUPABASE_URL=https://xxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJxxx...
   ```

### 2. Database Schema

1. Create tables in Supabase SQL Editor using schema from this spec
2. Enable RLS policies
3. Generate TypeScript types: `npx supabase gen types typescript`

### 3. Component Development

1. Describe each component to Lovable using prompts from this spec
2. Iterate on generated components with refinement prompts
3. Test in Lovable preview
4. Deploy to preview URL

### 4. Progressive Build Order

**Week 1: Foundation**
- Authentication (Login, Register, Auth Provider)
- Dashboard Layout (Sidebar, TopBar, Protected Routes)
- Basic data fetching hooks

**Week 2: Leader Dashboard**
- Strategic Governance Dashboard
- Alignment Map
- Mission Drift Dashboard

**Week 3: Manager Dashboard**
- Team Scorecard
- Priority Matrix
- Progress Reports

**Week 4: Member Dashboard**
- Personal Purpose
- Task List
- Impact View

**Week 5: Shared Features**
- Document Upload
- Notifications
- Settings

**Week 6: Polish & Real-time**
- Real-time subscriptions
- Loading/error states
- Responsive design refinement

---

## Key Differences: Lovable vs Traditional Development

| Aspect | Traditional React | Lovable Approach |
|--------|------------------|------------------|
| Development | Write code manually | Describe components in natural language |
| Backend | Set up API server | Use Supabase directly |
| Auth | Implement JWT/OAuth | Use Supabase Auth |
| Database | Write migrations | Use Supabase SQL Editor |
| State | Redux/Zustand setup | React Query + Context (generated) |
| Real-time | WebSocket setup | Supabase Realtime (one line) |
| Deployment | Configure CI/CD | One-click deploy |
| Type Safety | Manual type definitions | Generate from Supabase schema |

---

## Appendix: Supabase Schema Quick Reference

### Essential Tables

```sql
-- Organizations (multi-tenant root)
organizations: id, name, slug, created_at

-- Profiles (extends auth.users)
profiles: id, organization_id, role, full_name, avatar_url

-- Pyramid Entities (unified hierarchy)
pyramid_entities: id, organization_id, entity_type, parent_id, title, description, owner_id, status

-- Alignment Scores
alignment_scores: id, organization_id, entity_id, score, score_date

-- Documents
documents: id, organization_id, title, file_path, doc_type, uploaded_by

-- Notifications
notifications: id, user_id, title, message, type, read, created_at

-- Mission Drift Alerts
mission_drift_alerts: id, organization_id, entity_id, severity, description, status
```

### Common Queries

```typescript
// Get current user profile with organization
const { data } = await supabase
  .from('profiles')
  .select('*, organization:organizations(*)')
  .eq('id', user.id)
  .single()

// Get pyramid hierarchy for organization
const { data } = await supabase
  .from('pyramid_entities')
  .select('*, alignment_scores(score), owner:profiles(full_name)')
  .eq('organization_id', orgId)
  .order('created_at', { ascending: false })

// Get alignment scores with entity details
const { data } = await supabase
  .from('alignment_scores')
  .select('*, entity:pyramid_entities(*)')
  .eq('organization_id', orgId)
  .gte('score_date', thirtyDaysAgo)
```

---

## Conclusion

This Lovable-specific specification provides everything needed to build PKA-STRAT frontend:

1. **Clear component descriptions** optimized for Lovable's AI generation
2. **Supabase integration patterns** for auth, database, storage, real-time
3. **React Query patterns** for server state management
4. **Progressive disclosure strategy** for complex features
5. **Responsive design guidelines** for mobile-first development
6. **Development workflow** for efficient iteration with Lovable

**Key Success Factors:**
- Describe components in 1-2 clear sentences
- Use shadcn/ui components as building blocks
- Leverage Supabase for all backend needs
- Keep state management simple (React Query + Context)
- Build progressively (foundation → core features → polish)

**Next Steps:**
1. Set up Supabase project and create schema
2. Create Lovable project and add environment variables
3. Generate authentication components
4. Build Leader Dashboard first (highest priority)
5. Iterate with user feedback

---

**Document Version**: 1.0.0
**Last Updated**: 2025-12-29
**Status**: Active Development

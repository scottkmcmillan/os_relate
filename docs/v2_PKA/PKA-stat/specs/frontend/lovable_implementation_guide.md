# PKA-STRAT Implementation Guide for Lovable

## Table of Contents
1. [Lovable Workflow Overview](#lovable-workflow-overview)
2. [Project Setup](#project-setup)
3. [Component Building Strategy](#component-building-strategy)
4. [Lovable Prompt Templates](#lovable-prompt-templates)
5. [Supabase Schema Requirements](#supabase-schema-requirements)
6. [Best Practices](#best-practices)
7. [Troubleshooting Common Issues](#troubleshooting-common-issues)

---

## Lovable Workflow Overview

### How Lovable Works
Lovable is an AI-powered app builder that generates React applications with TypeScript, Tailwind CSS, and shadcn/ui components. It works iteratively through conversational prompts.

### Core Principles
1. **Start Simple, Iterate**: Begin with basic layouts, then add functionality
2. **Component-First**: Build individual components before connecting them
3. **Test as You Go**: Preview and test each component immediately
4. **Refine Incrementally**: Make small changes rather than large rewrites

### Iterative Development Approach
```
Phase 1: Structure → Create page layouts and navigation
Phase 2: Static UI → Build components with mock data
Phase 3: Data Integration → Connect to Supabase
Phase 4: Interactivity → Add forms, filters, and actions
Phase 5: Polish → Refine UX, add animations, optimize
```

### Component-by-Component Strategy
- Build one dashboard at a time
- Start with the most critical user flow (Leader Dashboard)
- Reuse components across dashboards
- Test integration points between components

---

## Project Setup in Lovable

### 1. Initial Project Creation

**Prompt Template:**
```
Create a new React application for PKA-STRAT, a strategic alignment intelligence platform for organizational governance.

Requirements:
- Modern dashboard layout with sidebar navigation
- Dark mode support with blue accent colors
- Responsive design for desktop and tablet
- TypeScript for type safety
- Tailwind CSS for styling
- shadcn/ui components

Include these main sections in the sidebar:
1. Leader Dashboard (Strategic Governance)
2. Manager Dashboard (Team Alignment)
3. Member Dashboard (Personal Purpose)
4. Documents
5. Settings

Use a professional, data-driven design aesthetic suitable for enterprise business intelligence.
```

### 2. Supabase Connection Setup

**Step-by-step Prompts:**

**Prompt 1 - Install Supabase:**
```
Add Supabase integration to this project. Install @supabase/supabase-js and create a Supabase client configuration.

Create a file src/integrations/supabase/client.ts that:
- Initializes the Supabase client
- Uses environment variables for URL and anon key
- Exports the client for use throughout the app
```

**Prompt 2 - Environment Variables:**
```
Create environment variable configuration for Supabase.

Add these variables:
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

Update the .env.example file with placeholder values and add documentation on where to find these values in the Supabase dashboard.
```

**Prompt 3 - Type Definitions:**
```
Generate TypeScript types for our Supabase database schema.

Create types for these tables:
- organizations (id, name, slug, domain, settings, subscription_tier)
- users (id, email, role, organization_id, created_at)
- profiles (id, user_id, full_name, avatar_url, preferences)
- pyramid_entities (id, organization_id, entity_type, parent_id, title, description, status)
- documents (id, organization_id, title, file_path, doc_type, processing_status)
- alignment_scores (id, entity_id, mission_alignment, overall_score, computed_at)
- drift_alerts (id, entity_id, severity, status, detected_at)

Place these in src/integrations/supabase/types.ts
```

### 3. Authentication Setup

**Prompt:**
```
Implement authentication using Supabase Auth.

Create:
1. Login page with email/password
2. Registration page with role selection (Leader, Manager, Member)
3. Protected route wrapper component
4. Auth context provider with role-based access
5. Logout functionality

Use shadcn/ui form components and include proper error handling.
```

---

## Component Building Strategy

### Build Order (Recommended)

#### Phase 1: Foundation (Days 1-2)
1. Navigation sidebar with role-aware menu items
2. Header with user profile and organization context
3. Dashboard container layout
4. Card components for metrics

#### Phase 2: Leader Dashboard (Days 3-5)
5. Strategic Governance Overview (alignment gauge, drift indicator)
6. Alignment Heat Map (organization chart with color coding)
7. Mission Drift Dashboard with trend chart
8. Board Narrative Generator interface
9. Scenario Simulator with sliders

#### Phase 3: Manager Dashboard (Days 6-8)
10. Team Alignment Scorecard table
11. Project Priority Matrix (2x2 grid)
12. Duplicate Work Detector list
13. Progress-to-Strategy Reports
14. At-Risk Initiative Alerts

#### Phase 4: Member Dashboard (Days 9-10)
15. Personal Purpose Dashboard with impact gauge
16. Task Strategic Value Indicator
17. Priority Guidance list
18. Contribution Impact view
19. Pyramid of Clarity Explorer

#### Phase 5: Document Management (Days 11-12)
20. Document Upload interface
21. Document Library with filters
22. Document Viewer with provenance
23. Document-to-Entity linking

#### Phase 6: Settings & Polish (Days 13-14)
24. User profile management
25. Organization settings
26. Notification preferences
27. Dark mode toggle
28. Responsive refinements

---

## Lovable Prompt Templates

### Dashboard Pages

#### Leader Dashboard Prompt
```
Create a Leader Dashboard page for PKA-STRAT strategic governance with these sections:

1. Strategic Governance Overview (top row):
   - Alignment Gauge (radial chart 0-100% with color zones)
   - Mission Drift Indicator (trend arrow with percentage change)
   - Strategic Coherence Score (colored badge)
   - Time Range Selector (Last 7/30/90 days dropdown)

2. Alignment Heat Map:
   - Organization chart showing departments as nodes
   - Color coding: green (80-100%), yellow (50-79%), orange (30-49%), red (0-29%)
   - Hover tooltips showing team size, active projects, alignment details
   - Legend in top-right corner

3. Mission Drift Timeline (line chart):
   - 12-month alignment score trend
   - Threshold zones (critical, warning, healthy)
   - Annotations for major drift events

4. Quick Actions Panel:
   - "Generate Board Report" button
   - "Run Scenario" button
   - "View All Alerts" link

Use shadcn/ui Card, Progress, and Badge components. Apply professional blue/gray color scheme.
```

#### Manager Dashboard Prompt
```
Create a Manager Dashboard for team alignment management with these features:

1. Team Alignment Scorecard Header:
   - Team average alignment score (large number)
   - Trend indicator (up/down arrow)
   - Quick stats: total members, projects, at-risk count

2. Team Members Table:
   Columns: Name (with avatar), Role, Alignment Score (progress bar), Contributing Projects, Last Updated
   Features: Sortable columns, color-coded scores, row click for details

3. Project Priority Matrix:
   - 2x2 grid (Strategic Importance vs Urgency)
   - Quadrants: Critical, Strategic, Tactical, Defer
   - Projects as draggable cards with name and deadline
   - Project count per quadrant

4. At-Risk Alerts Sidebar:
   - Priority-ordered list of initiatives needing attention
   - Risk level badges (high/medium/low)
   - "Acknowledge" and "View Details" actions

Use shadcn/ui Table, Card, Badge, and Avatar components. Make responsive.
```

#### Member Dashboard Prompt
```
Create a Member Dashboard focused on personal strategic contribution:

1. Personal Impact Section (centered):
   - Large radial gauge showing individual alignment score (0-100)
   - "Your Strategic Impact" label
   - Trend sparkline showing past 30 days

2. Contribution Metrics (3-card row):
   - Tasks Completed This Month (count)
   - Strategic Value Delivered (weighted points)
   - Personal Alignment Trend (sparkline)

3. Task List with Strategic Value:
   - Each task shows: title, strategic value badge (1-5 stars), alignment indicator (colored dot)
   - Sort options: by priority, value, deadline
   - Daily strategic impact goal with progress bar

4. Pyramid of Clarity Explorer:
   - Interactive tree view showing: Mission → Vision → Objectives → Goals → Your Tasks
   - Highlight the path from your tasks up to mission
   - Collapsible levels with alignment scores

Use shadcn/ui Card, Progress, and Tree components. Use encouraging color palette.
```

### Form Components

#### Document Upload Prompt
```
Create a Document Upload component for PKA-STRAT:

1. Upload Area:
   - Drag-and-drop zone with dashed border
   - "Click or drag files to upload" instruction
   - Supported formats: PDF, DOCX, PPTX, TXT
   - File size limit: 50MB

2. Document Type Selection:
   Dropdown with categories:
   - Strategic (Mission, Vision, Objectives, OKRs)
   - Product (Specs, Roadmaps, Strategy)
   - Execution (Project Plans, Reports, Retrospectives)
   - Market Intelligence (Analyst Reports, Competitive Analysis)

3. Metadata Form:
   - Document Title (auto-filled from filename)
   - Description (optional textarea)
   - Link to Pyramid Entity (dropdown of existing entities)
   - Classification Level (Public, Internal, Confidential)

4. Upload Progress:
   - Progress bar during upload
   - Processing status indicator (Uploading → Processing → Indexed)
   - Success/error toast notifications

Use shadcn/ui Input, Select, Textarea, and Progress components.
```

#### Pyramid Entity Form Prompt
```
Create a form for adding/editing Pyramid of Clarity entities:

1. Entity Type Selector:
   Radio buttons for: Mission, Vision, Strategic Objective, Goal, Portfolio, Program, Project, Task

2. Dynamic Form Fields (based on entity type):
   Common fields:
   - Title (required text input)
   - Description (textarea)
   - Owner (user dropdown)
   - Team (team dropdown)
   - Status (Draft, Active, On Hold, Completed, Cancelled)
   - Start Date, Target Date

   For Goals/OKRs:
   - Quarter selector
   - Key Results (repeatable group with metric, target, current value)

   For Projects:
   - Methodology (Agile, Waterfall, Hybrid)
   - Budget fields
   - Deliverables list

3. Parent Entity Selection:
   - Dropdown filtered by valid parents for this entity type
   - Shows current path in pyramid hierarchy

4. Action Buttons:
   - "Save as Draft" and "Publish" buttons
   - "Cancel" link

Use shadcn/ui Form, Input, Select, RadioGroup, and DatePicker components.
```

### Chart Components

#### Alignment Gauge Prompt
```
Create an Alignment Gauge component for displaying strategic alignment scores:

1. Visual Design:
   - Radial/semicircle gauge from 0-100%
   - Color zones: red (0-30), orange (31-50), yellow (51-70), green (71-100)
   - Current value displayed as large number in center
   - Optional label below gauge

2. Features:
   - Smooth animation when value changes
   - Configurable thresholds
   - Responsive sizing
   - Optional trend indicator (up/down arrow)

3. Props Interface:
   - value: number (0-100)
   - label?: string
   - showTrend?: boolean
   - previousValue?: number
   - size?: 'sm' | 'md' | 'lg'

Use Recharts RadialBarChart or custom SVG. Apply shadcn color variables.
```

#### Pyramid Visualization Prompt
```
Create a Pyramid of Clarity visualization component:

1. Structure:
   - Hierarchical tree layout (top-down or left-right)
   - Mission at top, expanding down through Vision, Objectives, Goals, etc.
   - Collapsible levels with expand/collapse controls

2. Node Design:
   - Each node shows: title, entity type badge, alignment score
   - Color-coded border based on alignment score
   - Click to select, double-click to expand/collapse
   - Hover shows full details tooltip

3. Interaction:
   - Pan and zoom controls
   - Search/filter to highlight specific entities
   - "Focus on path" to show only ancestors/descendants of selected node
   - Export as image button

4. Legend:
   - Entity type icons
   - Alignment color scale
   - Current filter status

Use React Flow or D3.js for tree layout. Style with Tailwind.
```

### Navigation Prompt
```
Create a role-aware sidebar navigation for PKA-STRAT:

1. Structure:
   - Logo at top with organization name
   - Navigation sections grouped by function
   - User profile at bottom with logout

2. Menu Items by Role:

   Leader:
   - Dashboard (Home icon) - Strategic Governance Overview
   - Alignment Map (Network icon) - Organization alignment heat map
   - Mission Drift (TrendingDown icon) - Drift monitoring
   - Reports (FileText icon) - Board narratives and exports
   - Scenarios (Lightbulb icon) - What-if simulations

   Manager:
   - Dashboard (Home icon) - Team Alignment Overview
   - Team (Users icon) - Team member scorecards
   - Projects (Briefcase icon) - Priority matrix
   - Reports (FileText icon) - Progress reports
   - Alerts (AlertTriangle icon) - At-risk initiatives

   Member:
   - Dashboard (Home icon) - Personal Purpose
   - Tasks (CheckSquare icon) - Task list with strategic value
   - Pyramid (Pyramid icon) - Clarity explorer
   - Impact (Award icon) - Contribution tracking

   Common (all roles):
   - Documents (FolderOpen icon)
   - Settings (Settings icon)

3. Features:
   - Active state highlighting
   - Collapsible on mobile
   - Badge counts for alerts/notifications

Use shadcn/ui NavigationMenu or custom sidebar. Include Lucide icons.
```

---

## Supabase Schema Requirements

### Essential Tables

#### 1. Organizations Table
```sql
CREATE TABLE public.organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  domain TEXT,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'starter', 'professional', 'enterprise')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2. User Profiles Table
```sql
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id),
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL CHECK (role IN ('leader', 'manager', 'member')),
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Lovable Prompt for Setup:**
```
Create a Supabase migration to add a profiles table that extends auth.users with organization and role information. Include RLS policies so users can read their own profile, leaders can read all profiles in their organization, and managers can read profiles of their team members.
```

#### 3. Pyramid Entities Table
```sql
CREATE TABLE public.pyramid_entities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('mission', 'vision', 'strategic_objective', 'goal', 'portfolio', 'program', 'project', 'task')),
  parent_id UUID REFERENCES public.pyramid_entities(id),
  title TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES public.profiles(id),
  team_id UUID,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'proposed', 'active', 'on_hold', 'completed', 'cancelled', 'archived')),
  start_date DATE,
  target_date DATE,
  completed_date DATE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  version INTEGER DEFAULT 1
);

CREATE INDEX idx_pyramid_org ON public.pyramid_entities(organization_id);
CREATE INDEX idx_pyramid_parent ON public.pyramid_entities(parent_id);
CREATE INDEX idx_pyramid_type ON public.pyramid_entities(entity_type);
```

#### 4. Documents Table
```sql
CREATE TABLE public.documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size_bytes BIGINT,
  file_type TEXT,
  doc_type TEXT CHECK (doc_type IN ('strategic_plan', 'execution_report', 'market_analysis', 'project_charter', 'meeting_notes', 'research', 'policy', 'other')),
  classification_level TEXT DEFAULT 'internal' CHECK (classification_level IN ('public', 'internal', 'confidential', 'restricted')),
  linked_entity_id UUID REFERENCES public.pyramid_entities(id),
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'indexed', 'failed', 'archived')),
  uploaded_by UUID REFERENCES public.profiles(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  indexed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documents_org ON public.documents(organization_id);
CREATE INDEX idx_documents_status ON public.documents(processing_status);
```

#### 5. Alignment Scores Table
```sql
CREATE TABLE public.alignment_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) NOT NULL,
  entity_id UUID REFERENCES public.pyramid_entities(id) NOT NULL,
  entity_type TEXT NOT NULL,
  mission_alignment_score NUMERIC(5,2),
  vision_alignment_score NUMERIC(5,2),
  objective_alignment_score NUMERIC(5,2),
  overall_alignment_score NUMERIC(5,2) NOT NULL,
  confidence NUMERIC(3,2),
  factors JSONB DEFAULT '[]',
  computation_method TEXT,
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alignment_entity ON public.alignment_scores(entity_id);
CREATE INDEX idx_alignment_org ON public.alignment_scores(organization_id);
```

#### 6. Drift Alerts Table
```sql
CREATE TABLE public.drift_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) NOT NULL,
  entity_id UUID REFERENCES public.pyramid_entities(id) NOT NULL,
  entity_type TEXT NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('alignment_drop', 'threshold_breach', 'trend_negative', 'anomaly_detected', 'dependency_conflict')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  previous_score NUMERIC(5,2),
  current_score NUMERIC(5,2),
  score_change NUMERIC(5,2),
  title TEXT NOT NULL,
  description TEXT,
  recommendations JSONB DEFAULT '[]',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'investigating', 'resolved', 'dismissed')),
  assigned_to UUID REFERENCES public.profiles(id),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id),
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_drift_org ON public.drift_alerts(organization_id);
CREATE INDEX idx_drift_status ON public.drift_alerts(status);
CREATE INDEX idx_drift_severity ON public.drift_alerts(severity);
```

### Row Level Security (RLS) Policies

**Lovable Prompt for RLS:**
```
Create RLS policies for PKA-STRAT with these rules:

profiles:
- Users can read/update their own profile
- Leaders and managers can read all profiles in their organization
- Only leaders can update other users' roles

pyramid_entities:
- All authenticated users in an organization can read entities
- Leaders can create/update all entities
- Managers can create/update entities at goal level and below
- Members can only update tasks assigned to them

documents:
- All authenticated users in an organization can read documents matching their classification level
- Leaders can read all documents
- Managers can read internal and below
- Members can read public only (unless linked to their tasks)
- Leaders and managers can upload documents

alignment_scores:
- All authenticated users in an organization can read scores
- Only system/service role can write scores

drift_alerts:
- All authenticated users can read alerts for their organization
- Leaders can update alert status and assignments
- Managers can acknowledge alerts for their team's entities

Use auth.uid() and match against profiles.organization_id for all policies.
```

### Realtime Subscriptions

**Lovable Prompt for Realtime:**
```
Set up Supabase Realtime subscriptions for PKA-STRAT:

1. Alignment Score Updates:
   - Subscribe to changes in alignment_scores table
   - Update dashboard gauges when scores change
   - Show toast notification for significant changes (>5 points)

2. Drift Alert Notifications:
   - Subscribe to new drift_alerts inserts
   - Display notification banner for high/critical alerts
   - Auto-refresh alerts list

3. Document Processing Status:
   - Subscribe to documents table updates
   - Update document list status badges
   - Show completion toast when document is indexed

Create custom hooks:
- useAlignmentSubscription(organizationId)
- useDriftAlerts(organizationId)
- useDocumentStatus(documentId)
```

---

## Best Practices

### Breaking Complex Features into Simple Prompts

**Bad (Too Complex):**
```
Build a complete strategic alignment dashboard with real-time data, charts, tables, filters, and role-based views.
```

**Good (Incremental):**
```
Prompt 1: Create a dashboard layout with header and 3-column grid for cards
Prompt 2: Add an Alignment Gauge component showing a score of 75%
Prompt 3: Add a Team Members table with mock data (5 rows)
Prompt 4: Connect the gauge to Supabase alignment_scores table
Prompt 5: Add role-based visibility (show/hide based on user role)
```

### Component Reusability Patterns

**Alignment Score Display (Reusable):**
```
Create a reusable AlignmentBadge component that:
- Takes a score (0-100) as prop
- Displays score with color-coded background
- Shows trend arrow if previousScore prop provided
- Variants: 'inline' (small badge), 'card' (larger with label)

Use in: Team table, Project cards, Entity details, Dashboard summaries
```

**Entity Card (Reusable):**
```
Create a reusable PyramidEntityCard component that:
- Displays entity title, type badge, and alignment score
- Shows owner avatar and status
- Has click handler for navigation
- Supports compact and expanded variants

Use in: Pyramid explorer, Search results, Related entities lists
```

### Handling Edge Cases

**Empty States:**
```
Add empty state displays for:
1. No alignment data yet - Show "Upload documents to begin alignment tracking"
2. No team members - Show "Invite team members to see alignment scores"
3. No drift alerts - Show "Great! No alignment issues detected" with green check
4. Search with no results - Show "No entities match your search"

Use shadcn/ui Alert component with appropriate icons.
```

**Loading States:**
```
Add loading states for:
1. Dashboard initial load - Skeleton cards matching final layout
2. Table data loading - Skeleton rows with pulse animation
3. Chart loading - Spinner centered in chart container
4. Document processing - Progress bar with status text

Use shadcn/ui Skeleton and Spinner components.
```

**Error States:**
```
Add error handling for:
1. API failures - Show retry button with error message
2. Authentication errors - Redirect to login with message
3. Permission denied - Show "You don't have access to this resource"
4. Network offline - Show offline banner with retry option

Use shadcn/ui Alert with destructive variant.
```

### Testing in Lovable

**Test Each Component:**
```
After each prompt, verify:
1. Component renders without errors
2. Responsive at different screen sizes (use preview resize)
3. Mock data displays correctly
4. Interactive elements (buttons, links) work
5. Styling matches design system
```

**Integration Testing:**
```
After connecting to Supabase:
1. Test authentication flow (login, logout, protected routes)
2. Verify data loads from database
3. Check RLS policies (try accessing other org's data)
4. Test real-time updates (open two browser tabs)
5. Verify file uploads to storage
```

---

## Troubleshooting Common Issues

### Component Generation Issues

**Problem: Component doesn't match requirements**
```
Solution: Be more specific in your prompt. Instead of "make it look nice", specify:
- Exact colors (use Tailwind classes)
- Specific spacing (p-4, gap-6, etc.)
- Component variants (shadcn/ui component names)
- Layout structure (grid, flex, columns)
```

**Problem: Missing functionality**
```
Solution: Break into smaller prompts. Ask for:
1. Static layout first
2. Then add interactivity
3. Then add data fetching
4. Then add error handling
```

### Supabase Integration Issues

**Problem: RLS blocking data access**
```
Solution: Check your RLS policies:
1. Verify auth.uid() matches expected user
2. Check organization_id matching logic
3. Test with service role key temporarily to isolate issue
4. Add logging to policy expressions
```

**Problem: Realtime not updating**
```
Solution:
1. Verify table has REPLICA IDENTITY FULL
2. Check subscription is on correct table/filter
3. Ensure user has SELECT permission via RLS
4. Check Supabase dashboard for subscription status
```

### State Management Issues

**Problem: Data not refreshing**
```
Solution: Use React Query properly:
1. Set appropriate staleTime
2. Use queryClient.invalidateQueries() after mutations
3. Enable refetchOnWindowFocus for dashboards
4. Use subscriptions for real-time updates
```

**Problem: UI state out of sync**
```
Solution:
1. Use React Query for server state (not local state)
2. Keep UI state minimal (only for purely local concerns)
3. Use optimistic updates with rollback
4. Implement proper loading/error states
```

### Styling Issues

**Problem: Inconsistent styling**
```
Solution:
1. Always reference shadcn/ui component names
2. Use Tailwind classes (not custom CSS)
3. Follow existing patterns in generated code
4. Use CSS variables for theme colors
```

**Problem: Responsive issues**
```
Solution:
1. Use Tailwind responsive prefixes (sm:, md:, lg:)
2. Test at common breakpoints (375px, 768px, 1024px, 1440px)
3. Use flex/grid with responsive columns
4. Hide/show elements appropriately
```

### Performance Issues

**Problem: Slow initial load**
```
Solution:
1. Implement route-based code splitting
2. Lazy load heavy components (charts, tables)
3. Use React Query caching
4. Optimize images/assets
```

**Problem: Dashboard feels sluggish**
```
Solution:
1. Paginate large tables (20-50 rows per page)
2. Debounce search/filter inputs
3. Use virtual scrolling for long lists
4. Cache computed alignment scores
```

---

## Advanced Patterns

### Multi-Step Wizards

**Document Upload Wizard:**
```
Create a 4-step document upload wizard:

Step 1 - Upload:
- File drag-and-drop area
- Selected file preview
- "Next" button (enabled when file selected)

Step 2 - Classify:
- Document type dropdown
- Classification level selector
- Auto-detected metadata display

Step 3 - Link:
- Search/select pyramid entity to link
- Preview of entity hierarchy
- "Skip" option for unlinked documents

Step 4 - Review:
- Summary of all selections
- "Upload" and "Back" buttons
- Processing progress after submit

Use shadcn/ui Steps component. Maintain state across steps.
```

### Advanced Filtering

**Pyramid Entity Filter:**
```
Create an advanced filter panel for pyramid entities:

Filters:
- Entity Type (multi-select checkboxes)
- Status (multi-select)
- Alignment Score (range slider 0-100)
- Owner (user dropdown with search)
- Date Range (date picker for created/updated)
- Has Drift Alert (toggle)

Features:
- Collapsible filter panel
- "Clear All" and "Apply" buttons
- Active filter count badge
- Save filter as preset (name and save)
- URL sync for shareable filtered views

Use shadcn/ui Sheet, Checkbox, Slider, DatePicker, and Select components.
```

### Batch Operations

**Bulk Entity Update:**
```
Add batch operations to the pyramid entities table:

1. Row selection (checkboxes)
2. "Select All" in header
3. Bulk action toolbar (appears when rows selected):
   - Change Status dropdown
   - Assign Owner dropdown
   - Delete (with confirmation)
   - Export Selected

Show selected count: "3 entities selected"
Confirm dangerous actions with dialog.

Use shadcn/ui Checkbox, DropdownMenu, and AlertDialog.
```

### Data Export

**Report Export:**
```
Create an export function for alignment reports:

Options:
- Format: PDF, Excel, CSV
- Date Range: Custom, This Month, This Quarter, This Year
- Include: Executive Summary, Detailed Scores, Drift History
- Charts: Include visualizations (PDF only)

Process:
1. Show export configuration dialog
2. Generate report on backend (or client-side for simple exports)
3. Show progress indicator
4. Download file when ready

Use shadcn/ui Dialog, Select, Checkbox, and Progress.
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] All environment variables configured
- [ ] Supabase project created and configured
- [ ] RLS policies tested and verified
- [ ] Authentication flow working
- [ ] All dashboards loading data correctly
- [ ] Error handling implemented
- [ ] Loading states implemented
- [ ] Responsive design verified
- [ ] Browser compatibility tested (Chrome, Firefox, Safari, Edge)

### Post-Export (if customizing outside Lovable)

- [ ] Dependencies up to date
- [ ] TypeScript errors resolved
- [ ] ESLint warnings addressed
- [ ] Build completes without errors
- [ ] Environment variables documented
- [ ] README updated with setup instructions
- [ ] API documentation current

---

## Related Documents

- [Lovable Frontend Specification](./lovable_frontend_specification.md)
- [Lovable Component Prompts](./lovable_component_prompts.md)
- [Lovable Architecture](../architecture/lovable_architecture.md)
- [API Specification](../backend/api_specification.md)
- [Data Models](../data-models/data_models_specification.md)
- [Product Description](../../PKA-STAT_product_description.md)

---

**End of Implementation Guide**

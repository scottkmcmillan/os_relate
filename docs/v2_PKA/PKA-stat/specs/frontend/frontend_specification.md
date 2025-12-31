# PKA-STRAT Frontend Specification

## 1. Executive Summary

PKA-STRAT is a role-based strategic alignment platform with three distinct user experiences: Leaders (strategic oversight), Team Managers (operational alignment), and Team Members (task-level purpose). The frontend architecture emphasizes real-time visualization, intuitive navigation, and contextual intelligence.

### 1.1 Design Philosophy
- **Clarity Over Complexity**: Information hierarchy reflects strategic pyramid
- **Context-Aware**: UI adapts to user role and current strategic context
- **Progressive Disclosure**: Advanced features available without overwhelming
- **Visual Intelligence**: Heat maps, charts, and indicators communicate at-a-glance insights

---

## 2. Application Architecture

### 2.1 Technology Stack

**Core Framework**:
- React 18.x with TypeScript
- Next.js 14+ (App Router for SSR/SSG)
- React Query for server state management
- Zustand for client state management

**UI & Styling**:
- Tailwind CSS 3.x with custom design system
- Shadcn/ui component library (accessible, customizable)
- Framer Motion for animations
- Recharts/D3.js for data visualizations

**Data & API**:
- Axios with interceptors for API calls
- WebSocket (Socket.io-client) for real-time updates
- React Hook Form + Zod for form validation
- SWR for data fetching with caching

**Developer Tools**:
- ESLint + Prettier (code quality)
- Husky (pre-commit hooks)
- Jest + React Testing Library
- Storybook for component development

### 2.2 Project Structure

```
/src
  /app                          # Next.js App Router
    /(auth)                     # Auth routes (login, register)
    /(dashboard)                # Protected dashboard routes
      /leader                   # Leader-specific pages
      /manager                  # Manager-specific pages
      /member                   # Member-specific pages
      layout.tsx                # Dashboard layout with nav
    /api                        # API routes (if needed)
    layout.tsx                  # Root layout
    page.tsx                    # Landing page

  /components
    /common                     # Shared components
      Button.tsx
      Card.tsx
      Modal.tsx
      Loading.tsx
    /dashboards                 # Dashboard-specific components
      /leader
        StrategicGovernance.tsx
        AlignmentMap.tsx
        MissionDriftDashboard.tsx
      /manager
        TeamAlignmentScorecard.tsx
        ProjectPriorityMatrix.tsx
      /member
        PersonalPurposeDashboard.tsx
        TaskValueIndicator.tsx
    /visualizations            # Data viz components
      HeatMap.tsx
      OrgChart.tsx
      PyramidChart.tsx
      AlignmentGauge.tsx
    /document                  # Document management
      DocumentUpload.tsx
      DocumentViewer.tsx
      ProvenanceTracker.tsx
    /navigation                # Navigation components
      Sidebar.tsx
      TopBar.tsx
      BreadcrumbNav.tsx

  /lib
    /api                       # API client functions
      documents.ts
      alignment.ts
      users.ts
    /hooks                     # Custom React hooks
      useAuth.ts
      useRBAC.ts
      useRealtime.ts
    /utils                     # Utility functions
      formatters.ts
      validators.ts
    /constants                 # Constants and configs
      routes.ts
      colors.ts
      roles.ts

  /types                       # TypeScript type definitions
    user.ts
    document.ts
    alignment.ts
    dashboard.ts

  /styles
    globals.css
    theme.css
```

---

## 3. Role-Based Dashboards

### 3.1 Leader Dashboard

**Route**: `/dashboard/leader`

**Primary Components**:

#### 3.1.1 Strategic Governance Dashboard
```typescript
interface StrategicGovernanceDashboard {
  metrics: {
    overallAlignmentScore: number;        // 0-100
    missionDriftIndex: number;            // 0-100 (0 = no drift)
    strategicInitiatives: number;
    activeProjects: number;
    resourceUtilization: number;          // Percentage
  };
  trends: {
    alignmentHistory: TimeSeriesData[];
    driftHistory: TimeSeriesData[];
  };
  alerts: StrategicAlert[];
  quickActions: Action[];
}

// Visual Layout:
// +----------------------------------+----------------------------------+
// | Alignment Score Gauge (large)    | Mission Drift Indicator         |
// +----------------------------------+----------------------------------+
// | Strategic Initiatives (grid)     | Trend Charts (line graphs)      |
// +----------------------------------+----------------------------------+
// | Critical Alerts (list)           | Quick Actions (buttons)         |
// +----------------------------------+----------------------------------+
```

**Component Specification**:
```typescript
// /components/dashboards/leader/StrategicGovernance.tsx
export interface StrategicGovernanceProps {
  organizationId: string;
  timeRange: 'week' | 'month' | 'quarter' | 'year';
  onRefresh?: () => void;
}

export const StrategicGovernance: React.FC<StrategicGovernanceProps> = ({
  organizationId,
  timeRange,
  onRefresh
}) => {
  // Real-time subscription to alignment updates
  const { data: metrics, isLoading } = useRealtimeMetrics(organizationId);

  // State for drill-down modals
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  return (
    <DashboardContainer>
      <Header title="Strategic Governance" onRefresh={onRefresh} />
      <MetricsRow>
        <AlignmentGauge value={metrics.overallAlignmentScore} size="large" />
        <MissionDriftIndicator value={metrics.missionDriftIndex} />
      </MetricsRow>
      <ContentGrid>
        <InitiativesPanel initiatives={metrics.strategicInitiatives} />
        <TrendCharts data={metrics.trends} timeRange={timeRange} />
      </ContentGrid>
      <AlertsBar alerts={metrics.alerts} />
    </DashboardContainer>
  );
};
```

#### 3.1.2 Strategic Alignment Map
```typescript
interface AlignmentMapProps {
  organizationStructure: OrgNode[];
  alignmentScores: Map<string, AlignmentScore>;
  heatMapMode: 'department' | 'project' | 'individual';
}

// Visual: Interactive org chart with heat-map overlay
// - Nodes colored by alignment score (green → yellow → red)
// - Click to drill down into department/team
// - Hover for quick stats
// - Filter by alignment threshold

// Color Scale:
// 90-100: #10B981 (green-500)
// 70-89:  #FBBF24 (yellow-400)
// 50-69:  #FB923C (orange-400)
// 0-49:   #EF4444 (red-500)
```

#### 3.1.3 Mission Drift Dashboard
```typescript
interface MissionDriftDashboard {
  driftIndicators: {
    resourceMisalignment: number;      // Projects not aligned to strategy
    documentInconsistencies: number;   // Docs with low L-Score
    siloProbability: number;           // Departments working in isolation
    strategicCoverage: number;         // % of strategy addressed by work
  };
  driftingEntities: DriftingEntity[];  // Specific teams/projects drifting
  recommendations: ActionRecommendation[];
}

// Visual Layout:
// +----------------------------------+
// | Overall Drift Gauge (speedometer)|
// +----------------------------------+
// | Drift Factors (4 cards)          |
// +------------------+---------------+
// | Drifting Entities| Recommendations|
// | (sortable list)  | (action cards) |
// +------------------+---------------+
```

#### 3.1.4 Board-Level Narrative Generator
```typescript
interface NarrativeGeneratorProps {
  organizationId: string;
  reportType: 'monthly' | 'quarterly' | 'annual';
  audienceLevel: 'board' | 'executive' | 'stakeholder';
}

// Features:
// - AI-generated executive summary
// - Key metrics visualization
// - Strategic wins and challenges
// - Export to PDF/PowerPoint
// - Customizable sections (drag-and-drop)

// Component: Rich text editor with embedded charts
```

#### 3.1.5 Resource Allocation Optimizer
```typescript
interface ResourceOptimizerProps {
  projects: Project[];
  resources: Resource[];
  constraints: Constraint[];
  optimizationGoal: 'alignment' | 'efficiency' | 'balance';
}

// Visual: Sankey diagram showing resource flow
// - Input: Available resources
// - Flow: Allocations
// - Output: Projects with alignment scores
// - Interactive: Drag to reallocate, see predicted impact
```

#### 3.1.6 Scenario Planning / What-If Simulator
```typescript
interface ScenarioSimulatorProps {
  baselineMetrics: Metrics;
  onSimulate: (scenario: Scenario) => Promise<SimulationResult>;
}

// Features:
// - Adjustable sliders for resource allocation
// - Project priority reordering
// - Real-time impact prediction
// - Compare up to 3 scenarios side-by-side
// - Save/load scenarios

// Visual: Split view with controls on left, impact charts on right
```

---

### 3.2 Team Manager Dashboard

**Route**: `/dashboard/manager`

**Primary Components**:

#### 3.2.1 Team Alignment Scorecard
```typescript
interface TeamAlignmentScorecardProps {
  teamId: string;
  timeRange: DateRange;
}

interface ScorecardData {
  overallScore: number;
  dimensions: {
    strategicAlignment: number;
    taskPrioritization: number;
    resourceEfficiency: number;
    goalProgress: number;
  };
  teamMembers: MemberScore[];
  projectBreakdown: ProjectScore[];
}

// Visual Layout:
// +----------------------------------+
// | Overall Team Score (radial gauge)|
// +----------------------------------+
// | Dimensions (4 progress bars)     |
// +------------------+---------------+
// | Member Scores    | Project Scores|
// | (ranked list)    | (bar chart)   |
// +------------------+---------------+
```

**Component Specification**:
```typescript
// /components/dashboards/manager/TeamAlignmentScorecard.tsx
export const TeamAlignmentScorecard: React.FC<TeamAlignmentScorecardProps> = ({
  teamId,
  timeRange
}) => {
  const { data: scorecard } = useQuery(['teamScorecard', teamId, timeRange],
    () => fetchTeamScorecard(teamId, timeRange)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Alignment Score</CardTitle>
        <ScoreIndicator value={scorecard.overallScore} />
      </CardHeader>
      <CardContent>
        <DimensionsGrid>
          {Object.entries(scorecard.dimensions).map(([key, value]) => (
            <DimensionCard key={key} label={key} score={value} />
          ))}
        </DimensionsGrid>
        <TwoColumnLayout>
          <MemberRankingList members={scorecard.teamMembers} />
          <ProjectScoreChart projects={scorecard.projectBreakdown} />
        </TwoColumnLayout>
      </CardContent>
    </Card>
  );
};
```

#### 3.2.2 Project Priority Matrix
```typescript
interface PriorityMatrixProps {
  projects: Project[];
  onReorder: (newOrder: string[]) => void;
}

// Visual: 2x2 Matrix (Eisenhower-style)
// X-axis: Strategic Alignment (Low → High)
// Y-axis: Urgency (Low → High)
// Quadrants:
// - Top-Right: "Critical & Aligned" (green)
// - Top-Left: "Urgent but Misaligned" (yellow, flag for review)
// - Bottom-Right: "Important, Not Urgent" (blue)
// - Bottom-Left: "Low Priority" (gray, consider stopping)

// Interaction: Drag projects between quadrants
```

#### 3.2.3 Duplicate Work Detector
```typescript
interface DuplicateWorkDetectorProps {
  teamId: string;
  threshold: number; // Similarity threshold (0-100)
}

interface DuplicateCluster {
  projects: Project[];
  similarityScore: number;
  suggestedAction: 'merge' | 'consolidate' | 'differentiate';
  estimatedWastedEffort: number; // Hours
}

// Visual:
// - Network graph showing similar projects
// - List of duplicate clusters sorted by wasted effort
// - Action buttons: "Investigate", "Merge", "Dismiss"
```

#### 3.2.4 Progress-to-Strategy Reports
```typescript
interface ProgressReportProps {
  teamId: string;
  reportPeriod: 'sprint' | 'month' | 'quarter';
}

// Features:
// - Progress bars for each strategic objective
// - Blockers and risks highlighted
// - Completed vs. planned work
// - Alignment trend over time
// - Export to PDF for leadership review

// Layout: Collapsible accordion by strategic pillar
```

#### 3.2.5 At-Risk Initiative Alerts
```typescript
interface AtRiskAlertsProps {
  teamId: string;
  riskFactors: RiskFactor[];
}

interface RiskAlert {
  initiativeId: string;
  initiativeName: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: {
    scheduleSlippage: boolean;
    budgetOverrun: boolean;
    alignmentDrift: boolean;
    resourceConstraints: boolean;
  };
  recommendedActions: Action[];
}

// Visual: Sortable table with color-coded risk indicators
// - Critical: Red icon, top of list
// - High: Orange icon
// - Medium: Yellow icon
// - Low: Blue icon

// Click row to expand and see detailed mitigation plan
```

#### 3.2.6 Framework Recommendations
```typescript
interface FrameworkRecommendationsProps {
  teamContext: TeamContext;
  currentFrameworks: Framework[];
}

// AI-driven recommendations for:
// - Agile methodologies (Scrum, Kanban, SAFe)
// - OKR structuring
// - Work breakdown approaches
// - Collaboration patterns

// Visual: Card-based layout with "Try This" actions
```

---

### 3.3 Team Member Dashboard

**Route**: `/dashboard/member`

**Primary Components**:

#### 3.3.1 Personal Purpose Dashboard
```typescript
interface PersonalPurposeDashboardProps {
  userId: string;
}

interface PurposeDashboardData {
  myStrategicContribution: number;      // Overall alignment score
  currentTasks: TaskWithContext[];
  completedWorkImpact: ImpactMetrics;
  learningOpportunities: LearningPath[];
  recognitionBadges: Badge[];
}

// Visual Layout:
// +----------------------------------+
// | "Your Strategic Impact" (gauge)  |
// +----------------------------------+
// | Current Tasks                    |
// | (cards with alignment indicators)|
// +------------------+---------------+
// | Recent Impact    | Learning Paths|
// | (achievements)   | (suggestions) |
// +------------------+---------------+
```

**Component Specification**:
```typescript
// /components/dashboards/member/PersonalPurposeDashboard.tsx
export const PersonalPurposeDashboard: React.FC<PersonalPurposeDashboardProps> = ({
  userId
}) => {
  const { data: purpose } = useQuery(['personalPurpose', userId],
    () => fetchPersonalPurpose(userId)
  );

  return (
    <DashboardContainer>
      <Hero>
        <ImpactGauge value={purpose.myStrategicContribution} />
        <MotivationalMessage contribution={purpose.myStrategicContribution} />
      </Hero>
      <TasksSection>
        <SectionHeader>Your Current Work</SectionHeader>
        <TaskGrid>
          {purpose.currentTasks.map(task => (
            <TaskCard key={task.id} task={task} />
          ))}
        </TaskGrid>
      </TasksSection>
      <TwoColumnLayout>
        <ImpactTimeline metrics={purpose.completedWorkImpact} />
        <LearningPathCards paths={purpose.learningOpportunities} />
      </TwoColumnLayout>
    </DashboardContainer>
  );
};
```

#### 3.3.2 Task Strategic Value Indicator
```typescript
interface TaskValueIndicatorProps {
  task: Task;
  strategicContext: StrategyNode;
}

// Visual: Tag/badge on each task showing:
// - Alignment score (colored dot)
// - Strategic pillar connection (icon)
// - Impact level (stars)

// Hover: Tooltip showing full strategic chain
// "This task → Project X → Objective Y → Mission Z"
```

#### 3.3.3 Priority Guidance
```typescript
interface PriorityGuidanceProps {
  userId: string;
  tasks: Task[];
}

// Features:
// - AI-recommended task order
// - Reasoning for each recommendation
// - Conflict resolution suggestions
// - Time blocking recommendations

// Visual: Drag-and-drop task list with "Smart Sort" button
```

#### 3.3.4 Contribution Impact View
```typescript
interface ContributionImpactProps {
  userId: string;
  timeRange: DateRange;
}

interface ImpactData {
  completedTasks: number;
  totalStrategicValue: number;
  impactByPillar: Record<string, number>;
  teamComparison: Percentile;
  trend: 'increasing' | 'stable' | 'decreasing';
}

// Visual:
// - Bar chart showing impact across strategic pillars
// - Trend line over time
// - Percentile ranking (gamification element)
// - Badges earned
```

#### 3.3.5 Pyramid of Clarity Explorer
```typescript
interface PyramidExplorerProps {
  userId: string;
  currentTask: Task;
}

// Visual: Interactive pyramid diagram
// Levels (bottom to top):
// 1. My Current Task (highlighted)
// 2. Project
// 3. Team Objective
// 4. Department Goal
// 5. Strategic Pillar
// 6. Mission/Vision

// Interaction:
// - Click any level to see details
// - Trace lines showing connections
// - "Why this matters" explanatory text at each level
```

---

## 4. Shared Components Library

### 4.1 Navigation Components

#### 4.1.1 Sidebar Navigation
```typescript
// /components/navigation/Sidebar.tsx
interface SidebarProps {
  userRole: UserRole;
  currentRoute: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: IconComponent;
  route: string;
  badge?: number; // For notification counts
  subItems?: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ userRole, currentRoute }) => {
  const navItems = getNavItemsForRole(userRole);

  return (
    <aside className="fixed left-0 h-screen w-64 bg-gray-900 text-white">
      <SidebarHeader>
        <Logo />
        <UserProfile compact />
      </SidebarHeader>
      <nav className="flex-1 overflow-y-auto">
        {navItems.map(item => (
          <NavItem
            key={item.id}
            item={item}
            isActive={currentRoute === item.route}
          />
        ))}
      </nav>
      <SidebarFooter>
        <NotificationCenter compact />
        <ThemeToggle />
      </SidebarFooter>
    </aside>
  );
};

// Role-based navigation items:
const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  leader: [
    { id: 'governance', label: 'Strategic Governance', icon: DashboardIcon, route: '/dashboard/leader' },
    { id: 'alignment-map', label: 'Alignment Map', icon: MapIcon, route: '/dashboard/leader/alignment' },
    { id: 'mission-drift', label: 'Mission Drift', icon: AlertIcon, route: '/dashboard/leader/drift' },
    { id: 'narratives', label: 'Board Narratives', icon: DocumentIcon, route: '/dashboard/leader/narratives' },
    { id: 'resources', label: 'Resource Optimizer', icon: SlideersIcon, route: '/dashboard/leader/resources' },
    { id: 'scenarios', label: 'What-If Simulator', icon: BeakerIcon, route: '/dashboard/leader/scenarios' },
    { id: 'documents', label: 'Documents', icon: FolderIcon, route: '/documents' },
  ],
  manager: [
    { id: 'scorecard', label: 'Team Scorecard', icon: ChartIcon, route: '/dashboard/manager' },
    { id: 'priority-matrix', label: 'Priority Matrix', icon: GridIcon, route: '/dashboard/manager/priorities' },
    { id: 'duplicates', label: 'Duplicate Detector', icon: CopyIcon, route: '/dashboard/manager/duplicates' },
    { id: 'progress', label: 'Progress Reports', icon: TrendingIcon, route: '/dashboard/manager/progress' },
    { id: 'at-risk', label: 'At-Risk Alerts', icon: WarningIcon, route: '/dashboard/manager/risks' },
    { id: 'documents', label: 'Documents', icon: FolderIcon, route: '/documents' },
  ],
  member: [
    { id: 'purpose', label: 'My Purpose', icon: CompassIcon, route: '/dashboard/member' },
    { id: 'tasks', label: 'My Tasks', icon: ChecklistIcon, route: '/dashboard/member/tasks' },
    { id: 'impact', label: 'My Impact', icon: TrophyIcon, route: '/dashboard/member/impact' },
    { id: 'pyramid', label: 'Strategy Pyramid', icon: TriangleIcon, route: '/dashboard/member/pyramid' },
    { id: 'learning', label: 'Learning', icon: BookIcon, route: '/dashboard/member/learning' },
  ],
};
```

#### 4.1.2 Top Bar
```typescript
// /components/navigation/TopBar.tsx
interface TopBarProps {
  title?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: Action[];
}

export const TopBar: React.FC<TopBarProps> = ({ title, breadcrumbs, actions }) => {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700">
      <div className="flex items-center justify-between h-16 px-6">
        <div className="flex items-center space-x-4">
          {breadcrumbs ? (
            <BreadcrumbNav items={breadcrumbs} />
          ) : (
            <h1 className="text-2xl font-semibold">{title}</h1>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <SearchBar />
          <NotificationBell />
          <HelpButton />
          <UserMenu />
        </div>
      </div>
    </header>
  );
};
```

#### 4.1.3 Breadcrumb Navigation
```typescript
// /components/navigation/BreadcrumbNav.tsx
interface Breadcrumb {
  label: string;
  href?: string;
}

interface BreadcrumbNavProps {
  items: Breadcrumb[];
}

export const BreadcrumbNav: React.FC<BreadcrumbNavProps> = ({ items }) => {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2 text-sm">
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && <ChevronRightIcon className="w-4 h-4 mx-2 text-gray-400" />}
            {item.href ? (
              <Link href={item.href} className="text-gray-600 hover:text-gray-900">
                {item.label}
              </Link>
            ) : (
              <span className="text-gray-900 font-medium">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};
```

---

### 4.2 Visualization Components

#### 4.2.1 Heat Map
```typescript
// /components/visualizations/HeatMap.tsx
interface HeatMapProps {
  data: HeatMapData[];
  colorScale: 'alignment' | 'risk' | 'performance';
  onCellClick?: (cell: HeatMapCell) => void;
}

interface HeatMapData {
  id: string;
  label: string;
  value: number; // 0-100
  metadata?: Record<string, any>;
}

export const HeatMap: React.FC<HeatMapProps> = ({ data, colorScale, onCellClick }) => {
  const getColor = (value: number) => {
    if (colorScale === 'alignment') {
      if (value >= 90) return 'bg-green-500';
      if (value >= 70) return 'bg-yellow-400';
      if (value >= 50) return 'bg-orange-400';
      return 'bg-red-500';
    }
    // Similar logic for other scales
  };

  return (
    <div className="grid grid-cols-auto gap-1">
      {data.map(cell => (
        <Tooltip key={cell.id} content={`${cell.label}: ${cell.value}`}>
          <div
            className={cn(
              "w-12 h-12 rounded cursor-pointer transition-transform hover:scale-110",
              getColor(cell.value)
            )}
            onClick={() => onCellClick?.(cell)}
          />
        </Tooltip>
      ))}
    </div>
  );
};
```

#### 4.2.2 Organization Chart
```typescript
// /components/visualizations/OrgChart.tsx
interface OrgChartProps {
  data: OrgNode;
  alignmentOverlay?: boolean;
  onNodeClick?: (node: OrgNode) => void;
}

interface OrgNode {
  id: string;
  name: string;
  role: string;
  alignmentScore?: number;
  children?: OrgNode[];
}

// Use react-organizational-chart or custom D3 implementation
export const OrgChart: React.FC<OrgChartProps> = ({
  data,
  alignmentOverlay,
  onNodeClick
}) => {
  return (
    <Tree
      data={data}
      orientation="vertical"
      translate={{ x: 400, y: 50 }}
      nodeSize={{ x: 200, y: 100 }}
      renderCustomNodeElement={({ nodeDatum }) => (
        <OrgChartNode
          node={nodeDatum}
          showAlignment={alignmentOverlay}
          onClick={onNodeClick}
        />
      )}
    />
  );
};

const OrgChartNode: React.FC<{ node: OrgNode; showAlignment: boolean }> = ({
  node,
  showAlignment
}) => {
  return (
    <foreignObject width={180} height={80} x={-90} y={-40}>
      <div className={cn(
        "bg-white border-2 rounded-lg p-3 text-center shadow-lg",
        showAlignment && getAlignmentBorderColor(node.alignmentScore)
      )}>
        <div className="font-semibold text-sm">{node.name}</div>
        <div className="text-xs text-gray-500">{node.role}</div>
        {showAlignment && (
          <AlignmentBadge score={node.alignmentScore} size="sm" />
        )}
      </div>
    </foreignObject>
  );
};
```

#### 4.2.3 Pyramid Chart
```typescript
// /components/visualizations/PyramidChart.tsx
interface PyramidChartProps {
  levels: PyramidLevel[];
  highlightedLevel?: number;
  onLevelClick?: (level: PyramidLevel) => void;
}

interface PyramidLevel {
  id: string;
  label: string;
  description: string;
  level: number; // 0 (top) to 5 (bottom)
  color?: string;
}

export const PyramidChart: React.FC<PyramidChartProps> = ({
  levels,
  highlightedLevel,
  onLevelClick
}) => {
  // Sort levels top to bottom
  const sortedLevels = [...levels].sort((a, b) => a.level - b.level);

  return (
    <svg viewBox="0 0 400 300" className="w-full h-full">
      {sortedLevels.map((level, index) => {
        const width = 100 + (index * 50); // Wider at bottom
        const height = 40;
        const y = index * 50;
        const x = (400 - width) / 2;

        return (
          <g key={level.id}>
            <rect
              x={x}
              y={y}
              width={width}
              height={height}
              fill={level.color || '#3B82F6'}
              opacity={highlightedLevel === level.level ? 1 : 0.7}
              className="cursor-pointer hover:opacity-100 transition-opacity"
              onClick={() => onLevelClick?.(level)}
            />
            <text
              x={200}
              y={y + height / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-white text-sm font-medium"
            >
              {level.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
};
```

#### 4.2.4 Alignment Gauge
```typescript
// /components/visualizations/AlignmentGauge.tsx
interface AlignmentGaugeProps {
  value: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animate?: boolean;
}

export const AlignmentGauge: React.FC<AlignmentGaugeProps> = ({
  value,
  size = 'md',
  showLabel = true,
  animate = true
}) => {
  const sizes = {
    sm: 80,
    md: 120,
    lg: 200,
  };

  const diameter = sizes[size];
  const radius = diameter / 2 - 10;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  const getColor = () => {
    if (value >= 90) return '#10B981';
    if (value >= 70) return '#FBBF24';
    if (value >= 50) return '#FB923C';
    return '#EF4444';
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={diameter} height={diameter} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          stroke="#E5E7EB"
          strokeWidth="10"
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          stroke={getColor()}
          strokeWidth="10"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={animate ? "transition-all duration-1000 ease-out" : ""}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold">{value}</span>
        {showLabel && <span className="text-xs text-gray-500">Alignment</span>}
      </div>
    </div>
  );
};
```

---

### 4.3 Document Management Components

#### 4.3.1 Document Upload Interface
```typescript
// /components/document/DocumentUpload.tsx
interface DocumentUploadProps {
  onUploadComplete: (document: Document) => void;
  acceptedTypes?: string[];
  maxSize?: number; // MB
  enableDragDrop?: boolean;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  onUploadComplete,
  acceptedTypes = ['.pdf', '.docx', '.txt'],
  maxSize = 10,
  enableDragDrop = true
}) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: acceptedTypes.join(','),
    maxSize: maxSize * 1024 * 1024,
    disabled: uploading,
    onDrop: async (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setUploading(true);
      setError(null);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await uploadDocument(formData, (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setProgress(percentCompleted);
        });

        onUploadComplete(response.data);
      } catch (err) {
        setError('Upload failed. Please try again.');
      } finally {
        setUploading(false);
        setProgress(0);
      }
    },
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
        isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300",
        uploading && "opacity-50 cursor-not-allowed"
      )}
    >
      <input {...getInputProps()} />
      {uploading ? (
        <div className="space-y-4">
          <Spinner size="lg" />
          <ProgressBar value={progress} />
          <p className="text-sm text-gray-600">Uploading... {progress}%</p>
        </div>
      ) : (
        <div className="space-y-2">
          <UploadIcon className="w-12 h-12 mx-auto text-gray-400" />
          <p className="text-lg font-medium">
            {isDragActive ? 'Drop file here' : 'Drag & drop or click to upload'}
          </p>
          <p className="text-sm text-gray-500">
            Supported: {acceptedTypes.join(', ')} (max {maxSize}MB)
          </p>
        </div>
      )}
      {error && <Alert variant="error">{error}</Alert>}
    </div>
  );
};
```

#### 4.3.2 Document Viewer
```typescript
// /components/document/DocumentViewer.tsx
interface DocumentViewerProps {
  documentId: string;
  showProvenance?: boolean;
  allowAnnotations?: boolean;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  documentId,
  showProvenance = true,
  allowAnnotations = false
}) => {
  const { data: document, isLoading } = useQuery(['document', documentId],
    () => fetchDocument(documentId)
  );

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="grid grid-cols-[1fr_300px] gap-4 h-full">
      {/* Main document view */}
      <div className="bg-white rounded-lg shadow overflow-auto">
        <DocumentContent
          content={document.content}
          type={document.type}
          allowAnnotations={allowAnnotations}
        />
      </div>

      {/* Sidebar with metadata and provenance */}
      <aside className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Document Info</CardTitle>
          </CardHeader>
          <CardContent>
            <DocumentMetadata document={document} />
          </CardContent>
        </Card>

        {showProvenance && (
          <Card>
            <CardHeader>
              <CardTitle>Provenance Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <ProvenanceTracker documentId={documentId} />
            </CardContent>
          </Card>
        )}
      </aside>
    </div>
  );
};
```

#### 4.3.3 Provenance Tracker
```typescript
// /components/document/ProvenanceTracker.tsx
interface ProvenanceTrackerProps {
  documentId: string;
}

interface ProvenanceEvent {
  id: string;
  timestamp: Date;
  eventType: 'created' | 'modified' | 'analyzed' | 'aligned';
  actor: User;
  lScore?: number;
  changes?: string[];
}

export const ProvenanceTracker: React.FC<ProvenanceTrackerProps> = ({ documentId }) => {
  const { data: provenance } = useQuery(['provenance', documentId],
    () => fetchProvenanceHistory(documentId)
  );

  return (
    <div className="space-y-4">
      {/* Current L-Score */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Lineage Score</span>
          <LScoreBadge score={provenance.currentLScore} />
        </div>
        <p className="text-xs text-gray-600 mt-1">
          Traces strategic alignment through {provenance.events.length} events
        </p>
      </div>

      {/* Event timeline */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold">History</h4>
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gray-200" />

          {provenance.events.map((event, index) => (
            <ProvenanceEventItem
              key={event.id}
              event={event}
              isFirst={index === 0}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const ProvenanceEventItem: React.FC<{ event: ProvenanceEvent; isFirst: boolean }> = ({
  event,
  isFirst
}) => {
  const eventIcons = {
    created: <PlusIcon className="w-4 h-4" />,
    modified: <EditIcon className="w-4 h-4" />,
    analyzed: <SearchIcon className="w-4 h-4" />,
    aligned: <CheckIcon className="w-4 h-4" />,
  };

  return (
    <div className="relative pl-8 pb-4">
      {/* Event icon */}
      <div className={cn(
        "absolute left-0 w-5 h-5 rounded-full flex items-center justify-center",
        isFirst ? "bg-blue-500 text-white" : "bg-gray-300 text-gray-600"
      )}>
        {eventIcons[event.eventType]}
      </div>

      {/* Event details */}
      <div className="text-sm">
        <p className="font-medium">{event.eventType}</p>
        <p className="text-gray-600">{event.actor.name}</p>
        <p className="text-xs text-gray-500">
          {formatDistanceToNow(event.timestamp)} ago
        </p>
        {event.lScore && (
          <div className="mt-1">
            <LScoreBadge score={event.lScore} size="sm" />
          </div>
        )}
      </div>
    </div>
  );
};
```

---

### 4.4 Common UI Components

#### 4.4.1 Card Component
```typescript
// /components/common/Card.tsx
interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'bordered' | 'elevated';
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  variant = 'default'
}) => {
  const variants = {
    default: 'bg-white dark:bg-gray-800',
    bordered: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
    elevated: 'bg-white dark:bg-gray-800 shadow-lg',
  };

  return (
    <div className={cn(
      "rounded-lg",
      variants[variant],
      className
    )}>
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
    {children}
  </div>
);

export const CardTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-lg font-semibold">{children}</h3>
);

export const CardContent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="px-6 py-4">
    {children}
  </div>
);
```

#### 4.4.2 Modal Component
```typescript
// /components/common/Modal.tsx
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md'
}) => {
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogOverlay className="fixed inset-0 bg-black/50" />
      <DialogContent className={cn("fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-xl", sizes[size])}>
        {title && (
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
        )}
        <div className="p-6">{children}</div>
      </DialogContent>
    </Dialog>
  );
};
```

#### 4.4.3 Loading States
```typescript
// /components/common/Loading.tsx
export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({
  size = 'md'
}) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex items-center justify-center">
      <div className={cn(
        "animate-spin rounded-full border-4 border-gray-200 border-t-blue-500",
        sizes[size]
      )} />
    </div>
  );
};

export const LoadingSkeleton: React.FC<{
  count?: number;
  height?: number;
  className?: string;
}> = ({ count = 1, height = 20, className }) => (
  <div className={cn("space-y-2", className)}>
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded"
        style={{ height }}
      />
    ))}
  </div>
);
```

---

## 5. State Management

### 5.1 Client State (Zustand)

```typescript
// /lib/store/authStore.ts
import create from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: async (credentials) => {
        const user = await loginAPI(credentials);
        set({ user, isAuthenticated: true });
      },
      logout: () => {
        logoutAPI();
        set({ user: null, isAuthenticated: false });
      },
      updateUser: (updates) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        }));
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
```

```typescript
// /lib/store/uiStore.ts
interface UIState {
  theme: 'light' | 'dark';
  sidebarCollapsed: boolean;
  notifications: Notification[];
  toggleTheme: () => void;
  toggleSidebar: () => void;
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: 'light',
  sidebarCollapsed: false,
  notifications: [],
  toggleTheme: () => set((state) => ({
    theme: state.theme === 'light' ? 'dark' : 'light'
  })),
  toggleSidebar: () => set((state) => ({
    sidebarCollapsed: !state.sidebarCollapsed
  })),
  addNotification: (notification) => set((state) => ({
    notifications: [...state.notifications, notification],
  })),
  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter(n => n.id !== id),
  })),
}));
```

### 5.2 Server State (React Query)

```typescript
// /lib/api/alignment.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const useAlignmentMetrics = (organizationId: string, timeRange: string) => {
  return useQuery({
    queryKey: ['alignmentMetrics', organizationId, timeRange],
    queryFn: () => fetchAlignmentMetrics(organizationId, timeRange),
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};

export const useUpdateAlignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AlignmentUpdate) => updateAlignment(data),
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries(['alignmentMetrics', variables.organizationId]);
      queryClient.invalidateQueries(['teamScorecard', variables.teamId]);
    },
  });
};
```

### 5.3 Real-time Updates (WebSocket)

```typescript
// /lib/hooks/useRealtime.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const useRealtime = (channel: string, queryKey: string[]) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) {
      socket = io(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001');
    }

    socket.on(channel, (data) => {
      // Update query cache with new data
      queryClient.setQueryData(queryKey, (oldData: any) => ({
        ...oldData,
        ...data,
      }));
    });

    return () => {
      socket?.off(channel);
    };
  }, [channel, queryKey, queryClient]);
};

// Usage:
// useRealtime('alignment-updates', ['alignmentMetrics', orgId]);
```

---

## 6. API Integration Patterns

### 6.1 API Client Configuration

```typescript
// /lib/api/client.ts
import axios, { AxiosError } from 'axios';
import { useAuthStore } from '@/lib/store/authStore';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor (add auth token)
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().user?.token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor (handle errors)
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired, logout
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

### 6.2 API Service Layer

```typescript
// /lib/api/documents.ts
import apiClient from './client';

export interface DocumentUploadOptions {
  file: File;
  metadata?: Record<string, any>;
  onProgress?: (progress: number) => void;
}

export const uploadDocument = async ({
  file,
  metadata,
  onProgress
}: DocumentUploadOptions) => {
  const formData = new FormData();
  formData.append('file', file);
  if (metadata) {
    formData.append('metadata', JSON.stringify(metadata));
  }

  return apiClient.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      const progress = Math.round(
        (progressEvent.loaded * 100) / (progressEvent.total || 1)
      );
      onProgress?.(progress);
    },
  });
};

export const fetchDocument = async (documentId: string) => {
  const response = await apiClient.get(`/documents/${documentId}`);
  return response.data;
};

export const fetchProvenanceHistory = async (documentId: string) => {
  const response = await apiClient.get(`/documents/${documentId}/provenance`);
  return response.data;
};

export const analyzeDocument = async (documentId: string) => {
  const response = await apiClient.post(`/documents/${documentId}/analyze`);
  return response.data;
};
```

---

## 7. Routing Structure

### 7.1 Route Definitions

```typescript
// /lib/constants/routes.ts
export const ROUTES = {
  // Public
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',

  // Leader
  LEADER_DASHBOARD: '/dashboard/leader',
  LEADER_ALIGNMENT_MAP: '/dashboard/leader/alignment',
  LEADER_MISSION_DRIFT: '/dashboard/leader/drift',
  LEADER_NARRATIVES: '/dashboard/leader/narratives',
  LEADER_RESOURCES: '/dashboard/leader/resources',
  LEADER_SCENARIOS: '/dashboard/leader/scenarios',

  // Manager
  MANAGER_DASHBOARD: '/dashboard/manager',
  MANAGER_PRIORITIES: '/dashboard/manager/priorities',
  MANAGER_DUPLICATES: '/dashboard/manager/duplicates',
  MANAGER_PROGRESS: '/dashboard/manager/progress',
  MANAGER_RISKS: '/dashboard/manager/risks',

  // Member
  MEMBER_DASHBOARD: '/dashboard/member',
  MEMBER_TASKS: '/dashboard/member/tasks',
  MEMBER_IMPACT: '/dashboard/member/impact',
  MEMBER_PYRAMID: '/dashboard/member/pyramid',
  MEMBER_LEARNING: '/dashboard/member/learning',

  // Shared
  DOCUMENTS: '/documents',
  DOCUMENT_VIEW: (id: string) => `/documents/${id}`,
  SETTINGS: '/settings',
  PROFILE: '/profile',
} as const;
```

### 7.2 Protected Routes

```typescript
// /app/(dashboard)/layout.tsx
import { redirect } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { ROUTES } from '@/lib/constants/routes';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    redirect(ROUTES.LOGIN);
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <TopBar />
        {children}
      </main>
    </div>
  );
}
```

### 7.3 Role-Based Access Control

```typescript
// /lib/hooks/useRBAC.ts
import { useAuthStore } from '@/lib/store/authStore';
import { UserRole } from '@/types/user';

export const useRBAC = () => {
  const { user } = useAuthStore();

  const hasRole = (requiredRole: UserRole | UserRole[]) => {
    if (!user) return false;

    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    return roles.includes(user.role);
  };

  const canAccessRoute = (route: string) => {
    if (!user) return false;

    const roleRoutes: Record<UserRole, string[]> = {
      leader: ['/dashboard/leader', '/documents', '/settings'],
      manager: ['/dashboard/manager', '/documents', '/settings'],
      member: ['/dashboard/member', '/settings'],
    };

    return roleRoutes[user.role].some(prefix => route.startsWith(prefix));
  };

  return { hasRole, canAccessRoute };
};

// Usage in component:
export default function LeaderOnlyPage() {
  const { hasRole } = useRBAC();

  if (!hasRole('leader')) {
    return <AccessDenied />;
  }

  return <LeaderDashboard />;
}
```

---

## 8. Responsive Design & Accessibility

### 8.1 Breakpoint System

```typescript
// tailwind.config.js
module.exports = {
  theme: {
    screens: {
      'sm': '640px',   // Mobile landscape
      'md': '768px',   // Tablet
      'lg': '1024px',  // Desktop
      'xl': '1280px',  // Wide desktop
      '2xl': '1536px', // Ultra-wide
    },
  },
};

// Usage in components:
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Responsive grid */}
</div>
```

### 8.2 Mobile Navigation

```typescript
// /components/navigation/MobileNav.tsx
export const MobileNav: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button (visible on sm screens only) */}
      <button
        className="lg:hidden fixed bottom-4 right-4 z-50 bg-blue-500 text-white p-4 rounded-full shadow-lg"
        onClick={() => setIsOpen(true)}
      >
        <MenuIcon className="w-6 h-6" />
      </button>

      {/* Slide-out drawer */}
      <Drawer isOpen={isOpen} onClose={() => setIsOpen(false)} side="left">
        <Sidebar compact />
      </Drawer>
    </>
  );
};
```

### 8.3 Accessibility Features

```typescript
// WCAG 2.1 AA compliance checklist:

// 1. Semantic HTML
<nav aria-label="Main navigation">
  <button aria-label="Close menu" onClick={handleClose}>
    <XIcon aria-hidden="true" />
  </button>
</nav>

// 2. Keyboard navigation
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') handleClose();
  if (e.key === 'Enter' || e.key === ' ') handleSubmit();
};

// 3. Focus management
const firstFocusableElement = modalRef.current?.querySelector('button, [href], input, select, textarea');
firstFocusableElement?.focus();

// 4. Screen reader announcements
<div role="status" aria-live="polite" aria-atomic="true">
  {statusMessage}
</div>

// 5. Color contrast (enforce in Tailwind)
// Text: text-gray-900 on bg-white (21:1 ratio)
// Interactive: text-blue-600 on bg-white (8.59:1 ratio)
```

---

## 9. Performance Optimization

### 9.1 Code Splitting

```typescript
// Lazy load heavy components
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('@/components/visualizations/HeavyChart'), {
  loading: () => <LoadingSkeleton height={400} />,
  ssr: false, // Disable SSR for client-only components
});
```

### 9.2 Image Optimization

```typescript
import Image from 'next/image';

<Image
  src="/images/logo.png"
  alt="PKA-STRAT Logo"
  width={200}
  height={50}
  priority // For above-the-fold images
/>
```

### 9.3 Memoization

```typescript
import { memo, useMemo, useCallback } from 'react';

// Memoize expensive computations
const sortedData = useMemo(() => {
  return data.sort((a, b) => b.score - a.score);
}, [data]);

// Memoize callbacks
const handleClick = useCallback(() => {
  onItemClick(item.id);
}, [item.id, onItemClick]);

// Memoize components
export const ExpensiveComponent = memo(({ data }) => {
  return <div>{/* Heavy rendering */}</div>;
});
```

---

## 10. Testing Strategy

### 10.1 Unit Tests (Jest + React Testing Library)

```typescript
// /components/common/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click</Button>);

    fireEvent.click(screen.getByText('Click'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByText('Disabled')).toBeDisabled();
  });
});
```

### 10.2 Integration Tests

```typescript
// /app/(dashboard)/leader/page.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LeaderDashboard from './page';

const queryClient = new QueryClient();

describe('Leader Dashboard', () => {
  it('loads and displays metrics', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <LeaderDashboard />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Strategic Governance')).toBeInTheDocument();
    });

    expect(screen.getByText(/Alignment Score/i)).toBeInTheDocument();
  });
});
```

### 10.3 E2E Tests (Playwright)

```typescript
// /e2e/leader-dashboard.spec.ts
import { test, expect } from '@playwright/test';

test('leader can view alignment map', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'leader@test.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL('/dashboard/leader');

  await page.click('text=Alignment Map');
  await expect(page).toHaveURL('/dashboard/leader/alignment');

  // Verify org chart is visible
  await expect(page.locator('.org-chart')).toBeVisible();
});
```

---

## 11. Deployment & Build

### 11.1 Environment Variables

```bash
# .env.local
NEXT_PUBLIC_API_URL=https://api.pka-strat.com
NEXT_PUBLIC_WS_URL=wss://ws.pka-strat.com
NEXT_PUBLIC_UPLOAD_MAX_SIZE=10485760 # 10MB
NEXT_PUBLIC_SENTRY_DSN=https://...
```

### 11.2 Build Commands

```json
// package.json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:e2e": "playwright test",
    "typecheck": "tsc --noEmit",
    "format": "prettier --write \"**/*.{ts,tsx,json,md}\"",
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build"
  }
}
```

### 11.3 CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run test
      - run: npm run build
```

---

## 12. Summary

This frontend specification provides a comprehensive blueprint for PKA-STRAT's web application with:

1. **Three role-based dashboards** (Leader, Manager, Member) with specialized views
2. **Reusable component library** for alignment visualization, document management, and navigation
3. **State management** using Zustand (client) and React Query (server)
4. **Real-time updates** via WebSocket integration
5. **Responsive design** with mobile-first approach
6. **Accessibility compliance** (WCAG 2.1 AA)
7. **Performance optimization** (code splitting, lazy loading, memoization)
8. **Comprehensive testing** (unit, integration, E2E)

### Key Technologies:
- **Framework**: Next.js 14+ (React 18, TypeScript)
- **UI**: Tailwind CSS, Shadcn/ui
- **State**: Zustand, React Query
- **Visualization**: Recharts, D3.js
- **Testing**: Jest, React Testing Library, Playwright

### Next Steps:
1. Set up project boilerplate with Next.js
2. Implement design system and common components
3. Build Leader dashboard (highest priority)
4. Implement Manager dashboard
5. Implement Member dashboard
6. Add real-time features
7. Comprehensive testing
8. Performance optimization
9. Deployment pipeline

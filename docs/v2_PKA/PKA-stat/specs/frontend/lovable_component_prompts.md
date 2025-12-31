# PKA-STRAT Lovable Component Prompts

## Overview
This document contains ready-to-use prompts for generating PKA-STRAT UI components using Lovable. Each prompt is designed to generate production-quality components with proper styling, data handling, and interactivity.

---

## 1. Authentication Components

### 1.1 Login Page
```
Create a modern login page component with email and password fields. Include a centered card layout with the PKA-STRAT logo at the top, email and password input fields with labels, a "Remember me" checkbox, "Forgot password?" link, and a primary action button. Add form validation with error messages below each field. Use shadcn/ui Card, Input, Button, and Checkbox components with Tailwind CSS. Include subtle animations for error states and a loading spinner on the submit button during authentication.
```

### 1.2 Registration Page
```
Build a multi-step registration component with three steps: (1) basic info (name, email, password), (2) role selection (Leader/Manager/Member with descriptions), and (3) organization details. Display a progress indicator at the top showing current step. Use shadcn/ui Form components with validation for each field. Include a "Back" and "Next" button at the bottom, with "Create Account" on the final step. Add password strength indicator and real-time email validation. Style with Tailwind using a centered card layout with smooth transitions between steps.
```

### 1.3 Password Reset
```
Create a password reset flow with two views: (1) email input to request reset, and (2) success confirmation. The first view should have a single email input field, descriptive text explaining the process, and a "Send Reset Link" button. The second view shows a success icon, confirmation message, and "Return to Login" link. Use shadcn/ui Alert component for success state. Include form validation and loading states. Style with Tailwind in a centered card layout matching the login page design.
```

### 1.4 Profile Settings
```
Design a tabbed profile settings page with three tabs: Account, Preferences, and Security. Account tab includes editable fields for name, email, role (read-only), and profile photo upload. Preferences tab has theme selector (light/dark), notification settings with toggles, and language dropdown. Security tab shows password change form and two-factor authentication setup. Use shadcn/ui Tabs, Input, Switch, and Select components. Include a "Save Changes" button that appears only when fields are modified. Add success toast notifications on save. Style with Tailwind using a max-width container.
```

---

## 2. Leader Dashboard Components

### 2.1 Strategic Governance Overview
```
Create a strategic governance overview dashboard component displaying three key metrics: alignment gauge (radial progress showing 0-100% alignment), mission drift indicator (trend line with up/down arrow and percentage change), and strategic coherence score (colored badge). Arrange these in a grid layout with three cards. Each card should have an icon, label, current value, and trend indicator. Use shadcn/ui Card and Badge components. Add subtle hover effects revealing more details. Include a time range selector (dropdown for Last 7/30/90 days) at the top. Style with Tailwind using a gradient background for cards based on health status (green for good, yellow for warning, red for critical).
```

### 2.2 Alignment Heat Map
```
Build an interactive organization chart heat map component showing alignment levels across departments. Display nodes as rounded rectangles with department name, alignment percentage, and color coding (green 80-100%, yellow 50-79%, orange 30-49%, red 0-29%). Arrange hierarchically with the CEO at top and departments below. Add connecting lines between nodes. Include hover tooltips showing detailed metrics: team size, active projects, top misalignment issues. Add a legend in the top-right corner. Use React Flow or a custom SVG solution. Include zoom and pan controls. Style with Tailwind and use smooth color transitions.
```

### 2.3 Mission Drift Dashboard
```
Design a mission drift tracking dashboard with three sections: (1) drift timeline chart showing alignment score over 12 months as a line graph with trend zones, (2) top drift contributors list showing initiatives/projects with highest drift scores and root causes, (3) corrective action recommendations as actionable cards. Use shadcn/ui Card for sections and Recharts for the timeline. Include filters for department and time range. Add "Export Report" button in header. Each drift contributor should show drift score, affected teams, and "View Details" link. Style with Tailwind using warning colors (orange/red) for high drift areas.
```

### 2.4 Board Narrative Generator
```
Create a board narrative generator interface with a configuration panel and preview pane. Left panel includes dropdowns for report type (monthly/quarterly/annual), stakeholder audience (board/investors/staff), focus areas (multi-select checkboxes for departments/initiatives), and tone selector (formal/conversational). Right panel shows generated narrative preview with sections for executive summary, strategic highlights, challenges, and next steps. Add "Regenerate" and "Export PDF" buttons. Use shadcn/ui Textarea for preview (read-only), Select, and Checkbox components. Include a loading skeleton while generating. Style with Tailwind using a two-column responsive layout.
```

### 2.5 Scenario Simulator
```
Build an interactive scenario simulator with variable input sliders and real-time outcome visualization. Top section has 4-6 input sliders for variables (budget allocation, headcount, market conditions, etc.) with current values displayed. Middle section shows predicted outcomes as radial gauges: strategic alignment impact, revenue projection, team morale, and risk level. Bottom section displays a comparison table showing current state vs. simulated scenario. Add "Reset" and "Save Scenario" buttons. Use shadcn/ui Slider and custom gauge components. Include smooth animations when values change. Style with Tailwind using a card-based layout with subtle shadows.
```

---

## 3. Manager Dashboard Components

### 3.1 Team Alignment Scorecard
```
Design a team alignment scorecard component showing individual team member alignment scores in a table format. Columns include member name with avatar, role, alignment score (0-100 with color-coded progress bar), top contributing projects, and last assessment date. Add sort functionality on each column header. Include summary statistics at the top: team average, trend arrow, and distribution chart (small bar chart showing score ranges). Add filters for role and score range. Use shadcn/ui Table, Avatar, and Progress components. Include row hover effects and "View Details" action. Style with Tailwind using alternating row colors and responsive design.
```

### 3.2 Project Priority Matrix
```
Create an interactive 2x2 priority matrix (Eisenhower matrix) showing projects plotted by strategic importance (Y-axis) and urgency (X-axis). Quadrants labeled: Critical (high/high), Strategic (high/low), Tactical (low/high), and Defer (low/low). Projects displayed as draggable cards with project name, team, and deadline. Include color coding by quadrant. Add legend in top-right and "Add Project" button. Use drag-and-drop functionality to reposition projects. Show project count per quadrant. Use shadcn/ui Card components styled with Tailwind. Include smooth animations for drag operations and responsive scaling.
```

### 3.3 Duplicate Work Detector
```
Build a duplicate work detector component showing potential redundancies across team projects. Display as a list of duplicate work groups, each showing 2-3 similar initiatives with similarity score (percentage), affected teams, resource overlap, and recommendation. Include expandable accordion sections for each group showing detailed comparison. Add filters for department, confidence threshold (slider 60-100%), and date range. Show total potential savings (hours/budget) at top. Use shadcn/ui Accordion, Badge, and Slider components. Include "Mark as Intentional" and "Merge Projects" action buttons. Style with Tailwind using warning colors for high-confidence duplicates.
```

### 3.4 Progress-to-Strategy Reports
```
Design a progress-to-strategy reporting dashboard with three chart types: (1) initiative completion funnel showing pipeline from planned to completed, (2) strategic objective progress bars with target vs. actual, (3) milestone timeline with upcoming and completed milestones. Add a date range selector and export button at top. Each section should be in a card with a header. Use Recharts for funnel and timeline, shadcn/ui Progress for objective bars. Include color coding: green for on-track, yellow for at-risk, red for delayed. Add tooltips with detailed metrics on hover. Style with Tailwind using a responsive grid layout.
```

### 3.5 At-Risk Initiative Alerts
```
Create an at-risk initiative alerts component displaying critical items requiring attention. Show as priority-ordered cards, each containing initiative name, risk level badge (high/medium/low), risk factors (budget, timeline, resources, alignment), impact if delayed, recommended actions, and assigned owner with avatar. Include filters for risk level and department. Add "Acknowledge" and "Create Action Plan" buttons on each card. Use shadcn/ui Alert, Badge, and Avatar components. Show total count of at-risk initiatives at top with trend indicator. Style with Tailwind using red/orange theme for urgent items with pulsing animation for critical alerts.
```

---

## 4. Member Dashboard Components

### 4.1 Personal Purpose Dashboard
```
Design a personal purpose dashboard centered on an impact gauge showing individual strategic contribution (0-100 score). Below the gauge, display three metrics: tasks completed this month, strategic value delivered (weighted points), and personal alignment trend (sparkline). Include a "Your Strategic Impact" section listing top 3 contributions with brief descriptions and impact scores. Add a "Purpose Statement" card showing user's role-strategy alignment with edit functionality. Use custom radial gauge component and shadcn/ui Card components. Include motivational micro-copy and achievement badges. Style with Tailwind using an encouraging color palette (blues/greens) with smooth animations.
```

### 4.2 Task Strategic Value Indicator
```
Create a task list component where each task displays its strategic value score and alignment indicators. Show tasks in a card layout with task title, description preview, strategic value badge (1-5 stars), alignment indicator (colored dot: green/yellow/red), deadline, and estimated effort. Add filters for value level, deadline, and status. Include sort options for priority, value, and deadline. Use shadcn/ui Card, Badge, and Checkbox components. Add quick actions: mark complete, view details, request clarity. Show daily strategic impact goal at top with progress bar. Style with Tailwind using value-based color coding and compact, scannable layout.
```

### 4.3 Priority Guidance List
```
Build a priority guidance component showing recommended task order based on strategic value and deadlines. Display as an ordered list with rank numbers, task cards including title, why it's prioritized (brief reason), strategic value score, deadline, and "Start Now" button. Include a "Snooze" option to defer low-priority items. Add a daily focus section at top highlighting the single most important task with prominent styling. Show completion progress for current week. Use shadcn/ui Card and Button components with numbered badges. Include drag-to-reorder functionality for user adjustments. Style with Tailwind using gradient accents for top-priority items.
```

### 4.4 Contribution Impact View
```
Design a contribution impact visualization showing how individual work connects to strategic goals. Display as a vertical flow diagram: user's tasks at bottom, connecting lines to team projects in middle, and organizational goals at top. Use different node sizes based on impact weight. Include hover tooltips showing contribution details and percentage of goal completion. Add a timeline slider to view impact over time. Show summary metrics: total goals influenced, impact score, and team ranking (opt-in). Use custom SVG or React Flow for diagram. Style with Tailwind using connecting lines with gradient colors indicating alignment strength.
```

### 4.5 Pyramid of Clarity Explorer
```
Create an interactive pyramid visualization showing organizational clarity from mission (top) to daily tasks (bottom). Display as a stacked pyramid with 5 levels: Mission/Vision, Strategic Goals, Initiatives, Projects, Tasks. Each level clickable to expand and show user's connected items. Use gradient colors from dark blue (mission) to light blue (tasks). Include a clarity score for each level (how well-defined it is for the user). Add a side panel showing details when a level is selected. Use custom SVG pyramid component with shadcn/ui Dialog for details. Include "Request Clarity" button if gaps exist. Style with Tailwind using 3D-effect shadows and smooth level transitions.
```

---

## 5. Shared Components

### 5.1 Sidebar Navigation
```
Build a collapsible sidebar navigation component that adapts based on user role (Leader/Manager/Member). Show user profile section at top with avatar, name, and role badge. Include hierarchical menu items with icons: Dashboard, Projects, Reports, Analytics, and Settings. Add role-specific items (Leaders see Governance, Managers see Team Management, Members see My Impact). Include expand/collapse button and hover tooltips when collapsed. Add notification badges for unread items. Use shadcn/ui Navigation Menu components. Include smooth slide animation and persist state in localStorage. Style with Tailwind using a dark theme with accent colors for active items.
```

### 5.2 Top Bar with Search
```
Create a sticky top navigation bar with global search, notifications, and user menu. Left side has hamburger menu (mobile) and logo. Center contains an expanding search input with autocomplete dropdown showing recent searches and suggested results (projects, documents, people). Right side has notification bell icon with unread count badge and user avatar dropdown menu (Profile, Settings, Help, Logout). Use shadcn/ui Command component for search, Popover for notifications, and DropdownMenu for user menu. Include keyboard shortcuts (Cmd+K for search). Style with Tailwind using white background with subtle shadow and responsive design.
```

### 5.3 Document Upload Interface
```
Design a document upload component with drag-and-drop zone, file browser, and upload queue. Main area shows dashed border zone with upload icon, "Drop files here" text, and "Browse Files" button. Support multiple file formats (PDF, DOCX, TXT). Show upload queue below with file list displaying filename, size, progress bar, and cancel button for each file. Include file type icons and validation for max size (10MB). Add metadata fields after upload: document type (dropdown), tags (multi-select), and description (textarea). Use shadcn/ui Dialog for metadata form. Style with Tailwind using blue accents for drag-over state and smooth progress animations.
```

### 5.4 Document Viewer with Provenance
```
Create a split-pane document viewer with document content on left and provenance panel on right. Left pane renders documents (PDF viewer or markdown renderer) with zoom controls and page navigation. Right pane shows document metadata: upload date, author, version history timeline, related documents, and strategic alignment tags. Include search within document, highlight functionality, and annotation tools. Add "Cite" button generating reference format. Use react-pdf or similar for PDF rendering. Include tabbed interface in provenance pane for Metadata, History, and Related items. Style with Tailwind using a clean, readable layout with sidebar toggle.
```

### 5.5 Alignment Gauge
```
Build a reusable radial alignment gauge component displaying a score from 0-100 with color zones: red (0-40), yellow (40-70), green (70-100). Show large centered score number, descriptive label below, and trend indicator (arrow with percentage change). Include animated needle that sweeps to current value on load. Add optional threshold markers on the arc. Support size variants (small, medium, large) and custom color schemes. Use SVG for the gauge with smooth animations. Include props for score, label, trend, and thresholds. Style with Tailwind utility classes and CSS animations for needle movement.
```

### 5.6 Heat Map Visualization
```
Create a flexible heat map component displaying tabular data with color-coded cells. Support customizable dimensions (rows/columns from data), color scales (sequential or diverging), and cell labels. Include row and column headers with sort functionality. Add hover tooltips showing exact values and context. Support click handlers for cell drilldown. Include legend showing color scale with min/max values. Add zoom and pan for large datasets. Use D3.js or Recharts for rendering. Props should accept data array, color scheme, and dimension configs. Style with Tailwind for headers and tooltips with smooth color interpolation.
```

---

## 6. Data Visualization Components

### 6.1 Line Chart for Trends
```
Build a responsive line chart component for displaying time-series trend data using Recharts. Support multiple series with legend, customizable colors, and data point markers. Include interactive tooltips showing values for all series at hover point. Add zoom controls and date range selector (1M, 3M, 6M, 1Y, All). Show grid lines and axis labels with smart formatting (abbreviated large numbers, formatted dates). Support trend annotations (arrows for significant changes). Include export options (PNG, CSV). Props should accept data array, series config, and display options. Style with Tailwind for container and controls with shadcn/ui Select for range picker.
```

### 6.2 Bar Chart for Comparisons
```
Create a bar chart component supporting grouped and stacked layouts using Recharts. Display horizontal or vertical bars with customizable colors per category. Include axis labels, value labels on bars (optional), and interactive hover tooltips. Add sort functionality (ascending/descending by value or label). Support percentage and absolute value modes. Include legend for multi-series data. Add reference lines for targets or averages. Props should accept data array, orientation, layout type, and color scheme. Include animation on mount. Style with Tailwind for container and labels with responsive scaling.
```

### 6.3 Radial Gauge for Scores
```
Design a customizable radial gauge component for displaying percentage or scored metrics (0-100). Support configurable color zones with smooth gradients, animated needle, and large centered value display. Include min/max labels, threshold markers, and optional target indicator. Support size variants and color schemes. Add subtle animations for value changes. Include comparison mode showing previous value as a ghost needle. Props should accept current value, target, thresholds, and styling options. Use SVG with smooth CSS transitions. Style with Tailwind for labels and container with custom SVG for gauge arc.
```

### 6.4 Pyramid Visualization
```
Create a pyramid chart component for hierarchical data with 3-5 stacked levels. Each level should be a trapezoid with different width based on value, labeled with category name and count/percentage. Support color gradients from top to bottom and hover effects revealing details. Include interactive click to filter/drilldown. Add legend showing level definitions. Support both percentage and absolute value modes. Props should accept level data array with labels, values, and colors. Use custom SVG rendering with smooth level transitions. Style with Tailwind for labels and tooltips with 3D-effect shadows.
```

### 6.5 Organization Chart
```
Build an interactive organization chart component displaying hierarchical structures with expandable/collapsible nodes. Each node shows a card with avatar, name, role, and optional metrics (team size, alignment score). Include connecting lines between nodes with smooth curves. Support horizontal and vertical layouts. Add zoom/pan controls and minimap for large charts. Include search/highlight functionality. Support node click to show details panel. Use React Flow or custom SVG solution. Props should accept tree data structure and layout options. Style with Tailwind for node cards with shadcn/ui Avatar and Badge components. Include smooth expand/collapse animations.
```

---

## Usage Guidelines

### Best Practices
1. **Copy Exact Prompts**: Use prompts verbatim in Lovable for best results
2. **Iterate**: After generation, request refinements for specific features
3. **Combine**: Reference multiple prompts for complex composite components
4. **Customize**: Adjust color schemes and spacing in follow-up prompts
5. **Test**: Request responsive design testing across screen sizes

### Common Follow-up Prompts
- "Make this component responsive for mobile devices"
- "Add loading skeleton states while data is fetching"
- "Include error boundary and empty state handling"
- "Add accessibility features (ARIA labels, keyboard navigation)"
- "Implement dark mode support with theme toggle"
- "Add unit tests using React Testing Library"

### Component Props Pattern
Request generated components to accept these common props:
- `data`: The data to display
- `loading`: Boolean for loading state
- `error`: Error object for error states
- `onAction`: Callback for user interactions
- `className`: Additional Tailwind classes
- `variant`: Visual style variant (if applicable)

### Integration Notes
- All components assume Tailwind CSS and shadcn/ui are configured
- Use React Query or SWR for data fetching in parent components
- Implement proper TypeScript types for all props
- Follow PKA-STRAT design system colors and spacing
- Ensure WCAG 2.1 AA accessibility compliance

---

## Appendix: Color Scheme Reference

### Alignment Color Coding
- **Green (#22c55e)**: 80-100% aligned (excellent)
- **Yellow (#eab308)**: 50-79% aligned (good)
- **Orange (#f97316)**: 30-49% aligned (needs attention)
- **Red (#ef4444)**: 0-29% aligned (critical)

### Role-Specific Colors
- **Leaders**: Deep blue (#1e40af)
- **Managers**: Purple (#7c3aed)
- **Members**: Teal (#0d9488)

### Status Colors
- **Success**: Green (#22c55e)
- **Warning**: Yellow (#eab308)
- **Error**: Red (#ef4444)
- **Info**: Blue (#3b82f6)
- **Neutral**: Gray (#6b7280)

---

*Last Updated: 2025-12-29*
*Version: 1.0*

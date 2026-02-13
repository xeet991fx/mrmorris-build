# Attio-Style Reports & Dashboards — Full Feature Map & Gap Analysis

Based on detailed review of [Attio's Help Center](https://attio.com/help/reference/managing-your-data/dashboard-and-reports).

---

## Attio's Report Creation Flow (The "Main Flow")

In Attio, reports are **not** created via a multi-step wizard modal. Instead:

1. User opens **Reports** in sidebar → opens / creates a **Dashboard**
2. Clicks **+ Add report** → picks one of 5 types
3. A **full-page report editor** opens with a **right-side config panel** where they configure:
   - **Data source** (object or list)
   - **Metric** (count records, or aggregate a number/currency/rating attribute — Sum, Avg, Min, Max, Count)
   - **Grouped by** / **Segmented by** (1–2 dimension attributes)
   - **Filters** (And/Or groups, stage-history filters)
   - **Visualization** (Bar, Line, Pie, Map, Funnel)
   - **Chart options** (target line, stacked bars, axis labels, sort order)
4. **Live preview** updates as config changes
5. User clicks **Save** (publishes) or **Save As New** (fork)

> [!IMPORTANT]
> Our current `AddReportModal.tsx` is a 6-step wizard modal. Attio uses an **inline full-page editor** with a side panel and live preview. This is the biggest UX gap.

---

## 5 Report Types — Feature Matrix

| Feature | Attio | Our Status |
|---------|-------|------------|
| **Insight** — current-state totals, grouped by 1–2 attrs, Bar/Pie/Line/Map | ✅ Full | ⚠️ Backend `ReportQueryEngine` supports it, but definition isn't persisted or rendered |
| **Historical Values** — metric over time (daily/weekly/monthly/quarterly), Current vs Historical segmenting | ✅ Full | ⚠️ Same — engine exists but not wired |
| **Funnel** — conversion rates through pipeline stages, shows %-drop per step | ✅ Full | ⚠️ Same |
| **Time in Stage** — avg/max/min time in each stage, grouped by owner etc. | ✅ Full | ⚠️ Same |
| **Stage Changed** — count/value of records entering a stage per period (daily/weekly/monthly) | ✅ Full | ⚠️ Same |

### Per-Type Config Details

#### Insight Report
- **Metric**: Count records OR select number/currency/rating attribute → aggregate (Count, Max, Avg, Min, Sum)
- **Grouped by**: 1 attribute (x-axis for bar/line)
- **Segmented by**: 2nd attribute (color-coded bars/lines) — *we don't have "segmented by"*
- **Visualization**: Bar, Pie, Line, Map (Map when grouped by Country)
- **Chart options**: Show axis labels, Target goal line, Stack bars, Sort by (numeric vs amount)

#### Historical Values Report
- **Time-based X-axis**: daily/weekly/monthly/quarterly/yearly
- **Segment mode**: **Current** (uses today's value) vs **Historical** (uses value at each period end)
- **Time period selector**: above chart, with "Compare" toggle (current vs previous period side-by-side)
- **Visualization**: Bar or Line
- **Chart options**: Stack bars, axis labels, target line

#### Funnel Report
- **Status attribute**: select which pipeline/status drives the funnel
- **Included stages**: checkboxes to pick which stages appear
- **Conversion calc**: % = records reaching current stage ÷ records reaching previous stage
- Skipped stages still count, backwards movement still counts
- **Visualization**: Funnel bars with conversion % labels

#### Time in Stage Report
- **Status attribute** + Included stages
- **Aggregation**: Max, Average, or Min time per stage
- **Grouped by**: optional (e.g., by owner for comparison)
- **Visualization**: Always bar chart
- **Chart options**: Stack bars, axis labels, target line, sort order

#### Stage Changed Report
- **Status attribute** + Included stages
- **Metric**: Count Records OR number/currency attribute with aggregation
- **Time period**: daily/weekly/monthly with period picker
- **Compare**: toggle current vs previous period
- **Visualization**: Bar or Line
- **Chart options**: Stack bars, axis labels, target line

---

## Dashboard Features

| Feature | Attio | Our Status |
|---------|-------|------------|
| Create/name/describe dashboards | ✅ | ✅ Have it |
| Drag-and-drop report reordering | ✅ | ⚠️ We have grid positions but no drag |
| Resize reports by dragging divider | ✅ | ❌ Missing |
| Multiple reports per row (configurable per line) | ✅ | ⚠️ Partial (fixed grid) |
| Dashboard access control (workspace/team/member levels) | ✅ | ❌ Missing |
| Sort, group, favorite dashboards | ✅ | ❌ Missing |

---

## Report Management Features

| Feature | Attio | Our Status |
|---------|-------|------------|
| Edit report (re-open config panel) | ✅ | ❌ No edit flow |
| Delete report | ✅ | ✅ Have it |
| Duplicate to same dashboard | ✅ | ❌ Missing |
| Duplicate to another dashboard | ✅ | ❌ Missing |
| Download as image | ✅ | ❌ Missing |
| Real-time data refresh | ✅ | ⚠️ We reload on mount only |
| Share report via URL | ✅ | ❌ Missing |
| Fullscreen report view | ✅ | ❌ Missing |
| "Calculated values" expandable data table | ✅ | ❌ Missing |
| CSV export of calculated values | ✅ | ❌ Missing |
| Drill-down to contributing records | ✅ | ❌ Missing |
| Save / Save As New / Discard changes | ✅ | ❌ We only have "create" |

---

## Filter System

| Feature | Attio | Our Status |
|---------|-------|------------|
| Filter by any attribute | ✅ | ⚠️ `FilterBuilder` has basic filters |
| Conditions: is, is not, contains, etc. | ✅ | ⚠️ Partial operators |
| And/Or filter group logic | ✅ | ❌ Missing |
| Advanced filter (convert to) | ✅ | ❌ Missing |
| Stage history filters ("was > Evaluation > before > today") | ✅ | ❌ Missing |

---

## Priority Action Items

Given our existing backend (`ReportQueryEngine`, `StageChangeEvent`, `reportSources` API), the highest-impact items to close the gap are:

### P0 — Make existing work functional (end-to-end flow)
1. **Persist `definition`** on `ReportDashboard` model + backend routes
2. **Wire `ReportWidget`** to send `definition` to `getReportData` and render result
3. **Close the AddReportModal loop** — the wizard should save the definition, not just discard it

### P1 — Match Attio's core UX
4. **Replace wizard modal with inline report editor** — full-page view with right-side config panel and live chart preview
5. **Add "Segmented by"** dimension to Insight reports (2nd grouping)
6. **Add time period selector** for Historical/Stage Changed (daily/weekly/monthly + Compare toggle)
7. **Add "Included stages" picker** for Funnel/Time in Stage/Stage Changed
8. **Chart options**: target line, stacked bars toggle, axis labels, sort order
9. **Save / Save As New / Discard** workflow

### P2 — Polish & management
10. Report editing flow (re-open editor with existing definition)
11. Duplicate report (same dashboard / to another)
12. Calculated values table + CSV export
13. Drill-down to contributing records
14. Download report as image
15. Fullscreen view

### P3 — Advanced
16. And/Or filter groups
17. Stage history filters
18. Dashboard drag-and-drop resize/reorder
19. Dashboard access control

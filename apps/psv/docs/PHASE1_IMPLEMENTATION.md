# PSV Application - Phase 1 UX Improvements

## Overview
This document outlines the Phase 1 improvements for the PSV application, focusing on high-impact UX enhancements that can be completed in approximately 2 weeks.

**Status**: Ready to implement  
**Estimated Duration**: 2 weeks  
**Last Updated**: December 17, 2025

---

## ✅ Approved Features (Phase 1)

### 1. Calculation Warnings Dashboard (6 hours)
**Priority**: P2 (High)  
**Impact**: Proactively surface calculation issues

#### Current State
- Warnings scattered across sizing workspace
- Easy to miss critical alerts
- No centralized view

#### Implementation Plan

**Files to Create:**
- `apps/psv/src/components/WarningsDashboard.tsx`

**Files to Modify:**
- `apps/psv/src/components/SizingWorkspace.tsx` - Collect warnings
- `apps/psv/src/store/usePsvStore.ts` - Add warnings state
- `apps/psv/src/components/ProtectiveSystemDetail.tsx` - Show badge

**Implementation Steps:**
1. [ ] Create warnings state in `usePsvStore`
   ```typescript
   warnings: {
     [sizingCaseId: string]: {
       id: string;
       severity: 'error' | 'warning' | 'info';
       message: string;
       source: 'hydraulic' | 'sizing' | 'scenario';
       timestamp: string;
     }[];
   }
   ```

2. [ ] Create `WarningsDashboard` component
   - Card at top of sizing workspace
   - Color-coded by severity (red/yellow/blue)
   - Click to jump to issue location
   - Collapse/expand functionality

3. [ ] Update `SizingWorkspace` to collect warnings
   - From hydraulic calculations (choked flow, Mach number)
   - From sizing results (oversized, undersized)
   - From network validation

4. [ ] Add badge to Sizing tab showing warning count
   ```tsx
   <Badge badgeContent={warningCount} color="error">
     <Tab label="Sizing" />
   </Badge>
   ```

**Success Metrics:**
- All warnings visible in one place
- Click action navigates to issue
- Warning count badge visible on tab

---

### 2. PSV Creation Wizard (2 days)
**Priority**: P2 (High)  
**Impact**: Streamline new PSV creation process

#### Current State
- No guided creation flow
- Users must navigate tabs after creating PSV
- Easy to miss required fields

#### Implementation Plan

**Files to Create:**
- `apps/psv/src/components/PsvCreationWizard.tsx`

**Files to Modify:**
- `apps/psv/src/components/ProtectiveSystemList.tsx` - Add "New PSV" button
- `apps/psv/src/store/usePsvStore.ts` - Add wizard state

**Wizard Steps:**

**Step 1: Basic Information**
- Equipment tag (required, unique validation)
- Type (PSV/RD/CSO selection)
- Set pressure with unit
- Design code selection

**Step 2: Service Conditions**
- Normal operating pressure
- Normal operating temperature  
- Fluid selection (with autocomplete)
- Phase (gas/liquid/two-phase)

**Step 3: Design Details**
- Design pressure
- Design temperature
- Inlet size
- Outlet size
- Design standard (API-520, ASME, etc.)

**Step 4: Equipment Links**
- Search and select protected equipment
- Multiple selection allowed
- Show equipment summary

**Step 5: Review & Create**
- Summary of all inputs
- Edit button for each section
- Create PSV button

**Implementation Steps:**
1. [ ] Create wizard dialog component (similar to `FireCaseScenarioDialog.tsx`)
2. [ ] Implement 5-step stepper UI
3. [ ] Add validation for each step
4. [ ] Create review screen with edit capabilities
5. [ ] Integrate with store's `addPsv` method
6. [ ] Add "Add New PSV/RD" button to `ProtectiveSystemList`
7. [ ] Navigate to new PSV detail page after creation

**Success Metrics:**
- Complete PSV creation in single flow
- All required fields validated
- Successfully creates PSV in store
- Navigates to detail page

---

### 3. Scenario Template Library (2 days)
**Priority**: P2 (High)  
**Impact**: Speed up scenario creation with pre-configured templates

#### Current State
- Manual scenario creation each time
- No reusable templates
- Repetitive data entry

#### Implementation Plan

**Files to Create:**
- `apps/psv/src/components/ScenarioTemplateDialog.tsx`
- `apps/psv/src/data/scenarioTemplates.ts`

**Files to Modify:**
- `apps/psv/src/components/ProtectiveSystemDetail.tsx` (ScenariosTab)
- `apps/psv/src/store/usePsvStore.ts` - Add template management
- `apps/psv/src/data/types.ts` - Add ScenarioTemplate type

**Template Structure:**
```typescript
interface ScenarioTemplate {
  id: string;
  name: string;
  description: string;
  cause: ScenarioCause;
  category: 'thermal' | 'hydraulic' | 'chemical' | 'external';
  icon: string; // MUI icon name
  defaultValues: Partial<OverpressureScenario>;
  customFields?: CustomField[];
}
```

**Pre-Defined Templates:**

1. **Blocked Outlet**
   - Cause: Blocked discharge
   - Relief pressure: 110% design pressure
   - Relief temp: Normal operating temp
   - Shutoff head from pump curve

2. **Utility Failure (Cooling Loss)**
   - Cause: Loss of cooling
   - Relief temp: Design temperature
   - Time to reach conditions: Configurable
   - Heat input calculation

3. **External Fire**
   - Cause: Fire exposure
   - Redirect to Fire Case Wizard
   - API-521 methodology

4. **Heat Exchanger Tube Rupture**
   - Cause: Tube failure
   - High-pressure side conditions
   - MAWP of low-pressure side

5. **Control Valve Failure**
   - Cause: FO/FC
   - Maximum flow scenario
   - Upstream pressure

6. **Thermal Expansion**
   - Cause: Trapped liquid
   - Temperature rise configurable
   - Liquid expansion coefficient

7. **Runaway Reaction**
   - Cause: Chemical reaction
   - Heat of reaction input
   - Adiabatic temperature rise

**Implementation Steps:**
1. [ ] Define `ScenarioTemplate` type in `types.ts`
2. [ ] Create template definitions in `scenarioTemplates.ts`
3. [ ] Build template selection dialog
   - Grid of template cards with icons
   - Filter by category
   - Search by name
4. [ ] Add "From Template" button to ScenariosTab
5. [ ] Implement template application logic
6. [ ] Allow users to save custom templates
7. [ ] Store custom templates in localStorage/database

**UI Design:**
- Card-based template gallery
- Icon and color-coded by category
- Click template → Opens ScenarioEditor with pre-filled values
- "Save as Template" option in ScenarioEditor

**Success Metrics:**
- 7 pre-defined templates available
- Template selection takes <10 seconds
- Reduces scenario creation time by 60%

---

### 4. Export Enhancements (1 day)
**Priority**: P2 (High)  
**Impact**: Enable sharing and reporting

#### Current State
- Hydraulic report exports to CSV
- No PDF export
- No Excel export for scenarios

#### Implementation Plan

**Files to Create:**
- `apps/psv/src/lib/export/pdfExport.ts`
- `apps/psv/src/lib/export/excelExport.ts`

**Files to Modify:**
- `apps/psv/src/components/SummaryTab.tsx` - Add PDF export button
- `apps/psv/src/components/ProtectiveSystemDetail.tsx` (ScenariosTab) - Add Excel export

**Export Features:**

**A. Summary Tab → PDF Export**
- Uses `jspdf` library
- Includes:
  - PSV header information
  - Service conditions
  - All overpressure scenarios
  - Sizing results
  - Hydraulic calculations
  - Notes (comments only)
- Company header/footer
- Page numbers
- Print-ready format

**B. Scenarios Tab → Excel Export**
- Uses `xlsx` library  
- Spreadsheet with tabs:
  - "Scenarios" - All scenarios with key data
  - "Governing" - Detailed governing case
  - "Comparison" - Side-by-side comparison
- Formulas preserved where applicable
- Color-coded by status

**C. Hydraulic Report → PDF Export** (already CSV)
- Enhanced CSV with more columns
- Add PDF option with formatted tables
- Include pressure profile chart

**Dependencies:**
```bash
bun add jspdf jspdf-autotable xlsx
bun add -d @types/jspdf
```

**Implementation Steps:**

**PDF Export:**
1. [ ] Install jspdf and jspdf-autotable
2. [ ] Create `generatePsvSummaryPdf()` function
3. [ ] Format data for PDF layout
4. [ ] Add images/charts if available
5. [ ] Add export button to SummaryTab
6. [ ] Handle errors gracefully

**Excel Export:**
1. [ ] Install xlsx
2. [ ] Create `exportScenariosToExcel()` function
3. [ ] Create worksheet for each tab
4. [ ] Apply formatting and styles
5. [ ] Add export button to ScenariosTab
6. [ ] Download file with PSV tag in filename

**Success Metrics:**
- PDF exports successfully with all sections
- Excel file opens in Excel/Sheets
- Exports complete in <3 seconds
- File naming includes PSV tag and timestamp

---

## 🚫 Removed Features (Based on User Feedback)

These features were in the original plan but removed per user request:

1. ~~**Recently Viewed List**~~ - Not needed
2. ~~**Favorites/Bookmarks**~~ - Not needed  
3. ~~**Global Search**~~ - Already exists in TopToolbar

---

## 📋 Implementation Checklist

### Pre-Implementation
- [ ] Review this plan
- [ ] Install required dependencies
- [ ] Create feature branch: `feature/phase1-ux-improvements`

### Task 1: Warnings Dashboard (Day 1)
- [ ] Update store with warnings state
- [ ] Create WarningsDashboard component
- [ ] Integrate with SizingWorkspace
- [ ] Add badge to Sizing tab
- [ ] Test with various warning scenarios

### Task 2: PSV Creation Wizard (Days 2-3)
- [ ] Create wizard component structure
- [ ] Implement Step 1: Basic Info
- [ ] Implement Step 2: Service Conditions
- [ ] Implement Step 3: Design Details
- [ ] Implement Step 4: Equipment Links
- [ ] Implement Step 5: Review & Create
- [ ] Add validation for each step
- [ ] Connect to store
- [ ] Test complete flow

### Task 3: Scenario Templates (Days 4-5)
- [ ] Define template types
- [ ] Create 7 pre-defined templates
- [ ] Build template selection dialog
- [ ] Implement template application
- [ ] Add "From Template" button
- [ ] Test each template
- [ ] Add custom template save (optional)

### Task 4: Export Features (Day 6)
- [ ] Install export libraries
- [ ] Implement PDF export for Summary
- [ ] Implement Excel export for Scenarios
- [ ] Add export buttons
- [ ] Test exports in different browsers
- [ ] Handle edge cases (no data, large files)

### Testing & Polish (Day 7)
- [ ] End-to-end testing of all features
- [ ] Fix bugs
- [ ] Update documentation
- [ ] Create demo video/screenshots
- [ ] Code review

### Deployment (Day 8)
- [ ] Merge feature branch
- [ ] Deploy to staging
- [ ] User acceptance testing
- [ ] Deploy to production

---

## 🔧 Technical Notes

### Component Architecture
All new components should follow existing patterns:
- Use Zustand for state management
- Material UI for all UI components
- TypeScript strict mode
- Glassmorphism styling
- Dark/light theme support

### State Management
Add to `usePsvStore.ts`:
```typescript
interface PsvStore {
  // ... existing state
  
  // New for Phase 1
  warnings: Map<string, Warning[]>; // Key: sizingCaseId
  scenarioTemplates: ScenarioTemplate[];
  addWarning: (caseId: string, warning: Warning) => void;
  clearWarnings: (caseId: string) => void;
  applyTemplate: (templateId: string) => Partial<OverpressureScenario>;
}
```

### Styling Conventions
- Use `sx` prop for component-specific styles
- Follow existing glassmorphism patterns
- Consistent spacing (multiples of 8px)
- Color palette: Primary #0284c7, Secondary #f59e0b

---

## 📊 Success Criteria

Phase 1 is complete when:
- [ ] All 4 features implemented and tested
- [ ] No TypeScript errors or console warnings
- [ ] All existing tests pass
- [ ] New tests added for new features
- [ ] Documentation updated
- [ ] User can create PSV in <2 minutes with wizard
- [ ] Scenario creation 60% faster with templates
- [ ] Warnings visible and actionable
- [ ] Exports work in all browsers

---

## 🔜 Next Phase Preview

**Phase 2: Calculation Enhancements** (2 weeks)
- Enhanced validation with range checks
- Sensitivity analysis tool
- Pressure profile chart
- Calculation confidence indicators
- Auto-save functionality

**Note**: Visual Network Editor will be implemented in future phase per user request.

---

## 📝 Development Environment

**Required Software:**
- Node.js 18+
- Bun
- Git

**Setup:**
```bash
cd /Users/maetee/Code/process-engineering-suite
bun install
cd apps/psv
bun run dev
```

**Testing:**
```bash
bun run test
bun run lint
npm run build
```

---

**Document Owner**: Development Team  
**Approver**: Maetee  
**Next Review**: After Phase 1 completion

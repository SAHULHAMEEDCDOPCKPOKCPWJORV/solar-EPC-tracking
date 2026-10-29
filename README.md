# Swelect Project Control

**SWELECT Energy Systems Limited**  
**Professional Solar EPC Project Planning, Scheduling, Execution Tracking, and Delay Prevention Platform**

A production-oriented web application designed specifically for utility-scale and commercial ground-mounted Solar EPC projects in India.

---

## ☀️ Key Capabilities

1. **Executive Control Dashboard**:
   - Real-time planned vs. actual physical progress tracking.
   - True forecast completion date (COD) dynamically calculated by the CPM engine.
   - Schedule variance (ahead / lagging in days).
   - Zero-float critical path driving activities.
   - Active workfront bottlenecks and execution constraints.
   - 8-phase Solar EPC lifecycle roadmap.
   - In-place active project switcher and live parameter editor.

2. **Project Setup & Indian Jurisdiction**:
   - Comprehensive project specification entry: DC Capacity (MWp), AC Capacity (MWac), Land Area (Acres), Planned Start/Finish dates.
   - Comprehensive mapping of all **28 Indian States & 8 Union Territories** with their authentic solar and administrative districts.
   - Formal Baseline Freeze Protocol with revision history (Rev 0, Rev 1, etc.).

3. **Dependency-Aware Critical Path Method (CPM) Engine**:
   - Forward pass ($ES, EF$) and backward pass ($LS, LF$) scheduling calculations.
   - Total Float ($TF$) and Free Float ($FF$) computation.
   - Full dependency relationships supported:
     - Finish-to-Start (FS)
     - Start-to-Start (SS)
     - Finish-to-Finish (FF)
     - Start-to-Finish (SF)
   - Lead and lag days handling.
   - Indian 6-day construction calendar (Sunday off, gazetted national holidays).
   - DFS cycle detection preventing circular dependency deadlocks.

4. **145-Activity Authentic SWELECT Engineering Master Schedule**:
   - **1.0 Land**: Identification, survey, legal vetting, registration, possession, geotechnical soil test, boundary demarcation.
   - **2.0 Engineering**: Packaging philosophy, DC/AC design, optimization, geotechnical report, solar PV syst simulation.
   - **3.0 Detailed Drawing Release**: Basic engineering, GFC array layout, piling coordinate drawings, MMS fabrication, DC/HT single line diagrams, CEIG scheme drawings.
   - **4.0 Procurement**: PV modules, MMS column posts, rafters/purlins, central/string inverters, power transformers, HT/LT power cables.
   - **5.0 Site Execution**: Land grading, boundary fencing, piling drilling & pull-out tests, MMS assembly, module mounting, DC trenching & cabling, inverter stations, 33kV switchyard, transformer erection.
   - **6.0 Transmission Line**: Route survey, RoW clearance, DP yard pole erection, conductor stringing, terminal bays.
   - **7.0 CEIG Approvals**: CEIG drawing submission, field inspection, punch clearance, formal statutory charging safety certificate.
   - **8.0 DISCOM & TANGEDCO Approvals**: Load flow study approval, meter testing, MRT synchronization, grid interconnect charging, formal commercial operation date (COD).

5. **Interactive Gantt Chart**:
   - Dual-tier header displaying clearly spaced weekly date intervals (`Wk X: Start Date - End Date`).
   - Bidirectional synchronized vertical scrolling between WBS table and timeline canvas.
   - Smooth horizontal auto-focus scrolling when selecting any row.
   - Baseline bars, current CPM bars, milestone diamonds, and critical path highlighting.
   - High-resolution **Gantt PDF Dossier Export** optimized for A3/A4 landscape printing and corporate sign-off.

6. **Workfront Readiness Management**:
   - Zone and block breakdown with prerequisite checklist clearance (Site, Drawing, Inspection, Manpower, Equipment, Safety, Material).
   - Mandatory vs non-mandatory check validation preventing premature activity mobilization.

7. **Float Erosion & CPM Delay Simulation**:
   - Non-destructive "What-If" delay impact testing.
   - Traces downstream impact across dependency chains to verify if delays absorb buffer float or shift final COD.
   - One-click delay commitment or discard.

8. **Company-Grade Multi-Sheet Excel Export**:
   - Formatted **Executive Dashboard** with visual ASCII progress bars, KPI scorecards, phase health, and critical path lists.
   - **WBS & Schedule CPM** sheet with all 145 activities, start/finish dates, float, and predecessors.
   - **Workfront Readiness** sheet.
   - **Quantity Progress** sheet.
   - **Delay & Constraints Log** sheet.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Icons**: Lucide React
- **Date Engine**: date-fns & custom Indian Solar EPC calendar utilities
- **Data Export**: SheetJS (xlsx)
- **Build Tool**: Vite 6

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/SAHULHAMEEDCDOPCKPOKCPWJORV/solar-EPC-tracking.git
cd solar-EPC-tracking

# Install dependencies
npm install

# Start local development server
npm run dev
```

The application will be live at `http://localhost:5173/`.

### Production Build

```bash
npm run build
npm run preview
```

---

## 📄 License
Confidential • Property of SWELECT Energy Systems Limited.

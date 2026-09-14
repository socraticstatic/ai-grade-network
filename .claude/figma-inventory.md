# Figma Design Inventory & Gap Analysis
## File: Z2DZTBbatSi8miUWWf5g7B (SDCI.fig)
## Generated: 2026-03-22

Total pages: 131 | Total frames: 299 | Product UI frames: ~180

---

## SECTION: 🔐 ENTRY & ACCESS

### Login (page: 3518:33140)
| Frame ID | Name | Size | Prototype Route | Status |
|----------|------|------|----------------|--------|
| 3518:33420 | Configure / Assets / Actions | 1920x1080 | `/login` | ✅ EXISTS |

### Onboarding (page: 1958:45122)
| Frame ID | Name | Size | Prototype Route | Status |
|----------|------|------|----------------|--------|
| 4991:7769 | Onboarding Set 4 | 1920x1080 | `/onboarding` | ✅ EXISTS |
| 2918:25991 | Terms & Conditions Denied | 1920x1080 | `/onboarding` | ✅ EXISTS (step) |
| 2918:26062 | Terms & Conditions Denied | 1920x1080 | `/onboarding` | ✅ EXISTS (variant) |
| 2918:24586 | Terms & Conditions Denied | 1920x1080 | `/onboarding` | ✅ EXISTS (variant) |

---

## SECTION: 🌍 CREATE

### Step-by-step Wizard (pages: 5036:41155 - 5036:41160)
| Frame ID | Name | Size | Prototype Route | Status |
|----------|------|------|----------------|--------|
| Steps 1-6 | Connection Creation Wizard | 1920x1080 | `/create` | ✅ EXISTS |

### Network Designer (pages: 1313:5269, 6394:37878, 6394:39423)
| Frame ID | Name | Size | Prototype Route | Status |
|----------|------|------|----------------|--------|
| 3879:20483 | Visual Designer - Cloud Node | 1920x1080 | `/create` (designer mode) | ✅ EXISTS |
| 3879:20693 | Visual Designer - Cloud Node | 1920x1080 | `/create` | ✅ EXISTS (variant) |
| 6394:39424 | Cloud to Cloud - Visual Designer | 1920x1080 | `/create` | ✅ EXISTS |
| 6590:10414 | Cloud to Cloud - Visual Designer | 1920x1080 | `/create` | ✅ EXISTS (variant) |
| 6590:10685 | Cloud to Cloud - Visual Designer | 1920x1080 | `/create` | ✅ EXISTS (variant) |
| 2842:42266 | Topology view | 1920x1148 | `/create` | ✅ EXISTS |

---

## SECTION: 📁 MANAGE

### Connections Index (page: 204:13723)
| Frame ID | Name | Size | Prototype Route | Status |
|----------|------|------|----------------|--------|
| 3348:16161 | Network Connections | 1920x1231 | `/manage` | ✅ EXISTS |
| 3382:20697 | Network Connections | 1920x1231 | `/manage` | ✅ EXISTS (variant) |
| 3348:20179 | Azure ITC Overview Active | 1920x1254 | `/connections/:id` | ✅ EXISTS |

### Connection Detail - Overview (page: 5036:76419)
| Frame ID | Name | Size | Prototype Route | Status |
|----------|------|------|----------------|--------|
| 5052:14025 | Azure ITC Overview Active | 1920x1254 | `/connections/:id/overview` | ✅ EXISTS |
| 5052:14179 | Azure ITC Overview Inactive | 1920x1254 | `/connections/:id/overview` | ✅ EXISTS |
| 6214:4488 | Azure ITC Overview Active (v2) | 1920x1254 | `/connections/:id/overview` | ✅ EXISTS |
| 6214:4597 | Azure ITC Overview Inactive (v2) | 1920x1254 | `/connections/:id/overview` | ✅ EXISTS |

### Connection Detail - Edit (page: 6169:9677)
| Frame ID | Name | Size | Prototype Route | Status |
|----------|------|------|----------------|--------|
| 6169:9678 | Edit Connection | 1920x1790 | `/connections/:id/overview` (edit mode) | ⚠️ PARTIAL - edit mode exists but needs review |
| 6214:5355 | Edit Connection (v2) | 1920x1998 | `/connections/:id/overview` | ⚠️ PARTIAL |

### Connection Detail - Network Tab
#### Cloud Routers (page: 6473:35728, 6473:35729)
| Frame ID | Name | Size | Prototype Route | Status |
|----------|------|------|----------------|--------|
| 6473:35739 | Cloud Routers (Design 1.0) | 1920x1738 | `/connections/:id/network` | ✅ EXISTS |
| 6473:41179 | Cloud Routers (Design 2.0) | 1920x1080 | `/connections/:id/network` | ✅ EXISTS |
| 6473:41380 | Cloud Routers (Design 2.0 variant) | 1920x1080 | `/connections/:id/network` | ✅ EXISTS |

#### Links (page: 5036:76421, 6473:20540)
| Frame ID | Name | Size | Prototype Route | Status |
|----------|------|------|----------------|--------|
| 5049:27758 | Virtual Links (Design 1.0) | 1920x938 | `/connections/:id/network` | ✅ EXISTS |
| 6473:20899 | Virtual Links (Design 2.0) | 1920x1080 | `/connections/:id/network` | ✅ EXISTS |

#### Functions / VNFs (page: 6473:29418, 6473:29417)
| Frame ID | Name | Size | Prototype Route | Status |
|----------|------|------|----------------|--------|
| 6473:29428 | VNF Functions Cloud Routers | 1920x1738 | `/connections/:id/network` | ✅ EXISTS |
| 6473:29711 | VNF Functions | 1920x1080 | `/connections/:id/network` | ✅ EXISTS |
| 6473:29878 | Select VNF Template | 1920x1080 | `/vnfs/:id` | ✅ EXISTS |
| 6473:30147 | Configure VNF | 1920x1080 | `/vnfs/:id` | ✅ EXISTS |
| 6473:30431 | Select VNF Template Hover | 1920x1080 | `/vnfs/:id` | ✅ EXISTS |
| 6473:30700 | Configure VNF Advanced | 1920x1080 | `/vnfs/:id` | ✅ EXISTS |
| 6473:31033 | Configure VNF Advanced Full | 1920x2168 | `/vnfs/:id` | ✅ EXISTS |
| 6473:31414 | All VNFs | 1920x1080 | `/vnfs/:id` | ✅ EXISTS |
| 6473:31629 | All VNFs List | 1920x1080 | `/vnfs/:id` | ✅ EXISTS |
| 6473:31827 | VNF Empty State | 1920x1080 | `/vnfs/:id` | ✅ EXISTS |
| 6473:31964 | All VNFs Open | 1920x1242 | `/vnfs/:id` | ✅ EXISTS |

### Pools (page: 1984:35769) ⭐ CRITICAL GAP
| Frame ID | Name | Size | Prototype Route | Status |
|----------|------|------|----------------|--------|
| 1984:35775 | Pool Grid View | 1920x1080 | `/manage` (Pools tab) | ❌ NEEDS WORK - styling doesn't match Figma |
| 1984:36007 | Pool List View | 1920x1080 | `/manage` (Pools tab) | ❌ NEEDS WORK - styling doesn't match Figma |
| 2405:31247 | Create Pool #1 | 1920x1080 | (no create pool flow) | ❌ MISSING - no create pool wizard |
| 2411:33024 | Create Pool #2 | 1920x1080 | (no create pool flow) | ❌ MISSING |
| 2411:33553 | Create Pool #3 | 1920x1080 | (no create pool flow) | ❌ MISSING |
| 2411:34005 | Create Pool #4 | 1920x1080 | (no create pool flow) | ❌ MISSING |
| 2411:34457 | Create Pool #5 | 1920x1080 | (no create pool flow) | ❌ MISSING |

### Marketplace (pages: 5036:76424, 5036:76423)
| Frame ID | Name | Size | Prototype Route | Status |
|----------|------|------|----------------|--------|
| 5052:20623 | Marketplace Products | 1920x2158 | `/manage` (Marketplace tab) | ⚠️ PARTIAL - exists but needs review |
| 5052:23124 | Marketplace Solutions | 1920x2158 | `/manage` (Marketplace tab) | ⚠️ PARTIAL |

### Insights (page: 5631:14604)
| Frame ID | Name | Size | Prototype Route | Status |
|----------|------|------|----------------|--------|
| 5631:14605 | Insights Dashboard | 1920x1080 | `/manage` (Insights tab) | ⚠️ PARTIAL - exists but needs review |
| 5631:14886-17868 | Dashboard variants (6 frames) | 1920x1080 | `/manage` (Insights tab) | ⚠️ PARTIAL |

---

## SECTION: 📊 MONITOR

### Overview (page: 2549:26899)
| Frame ID | Name | Size | Prototype Route | Status |
|----------|------|------|----------------|--------|
| 2549:27527 | Network Monitoring Overview | 1920x1080 | `/monitor` (Overview tab) | ✅ EXISTS |

### Detailed Metrics (page: 591:15723)
| Frame ID | Name | Size | Prototype Route | Status |
|----------|------|------|----------------|--------|
| 591:15726 | Detailed Metrics | 1920x1264 | `/monitor` (Metrics tab) | ✅ EXISTS |
| 591:15966 | Detailed Metrics Tooltips | 1920x1264 | `/monitor` | ✅ EXISTS |
| 591:16216 | Detailed Metrics Hover | 1920x1264 | `/monitor` | ✅ EXISTS |
| 3164:5722 | Mocked data Concept | 1920x1264 | `/monitor` | ✅ EXISTS |
| 3291:15287 | Mocked data Modal | 1920x1080 | `/monitor` | ✅ EXISTS |

### Alerts (page: 1984:24921)
| Frame ID | Name | Size | Prototype Route | Status |
|----------|------|------|----------------|--------|
| 1984:37832 | Change log | 768x520 | `/monitor` (Alerts tab) | ✅ EXISTS |

### Logs (page: 2546:8984)
| Frame ID | Name | Size | Prototype Route | Status |
|----------|------|------|----------------|--------|
| 2694:11846 | Network Monitoring Logs | 1920x1080 | `/monitor` (Logs tab) | ✅ EXISTS |
| 2694:12165 | Network Monitoring Logs (variant) | 1920x1080 | `/monitor` | ✅ EXISTS |

### Reports (pages: 5036:90371 - 5036:90376)
| Frame ID | Name | Size | Prototype Route | Status |
|----------|------|------|----------------|--------|
| 5052:39941 | Reports Overview | 1920x1080 | `/monitor` (Reports tab) | ✅ EXISTS |
| 5052:40143 | Reports Overview (variant) | 1920x1120 | `/monitor` | ✅ EXISTS |
| 5052:40352 | Reports Overview (variant) | 1920x1120 | `/monitor` | ✅ EXISTS |
| 5052:51138 | Standard Reports | 1920x1586 | `/monitor` | ✅ EXISTS |
| 5052:51394 | Standard Reports (variant) | 1920x1610 | `/monitor` | ✅ EXISTS |
| 5052:51790 | Standard Reports Generated | 1920x1586 | `/monitor` | ✅ EXISTS |
| 366:135772 | Custom Reports | 1920x2726 | `/monitor` | ⚠️ PARTIAL |
| 367:2652 - 371:6015 | Custom Report variations (7 frames) | varies | `/monitor` | ⚠️ PARTIAL |
| 5052:66196 | Templates | 1920x1080 | `/monitor` | ✅ EXISTS |
| 5052:66399-66807 | Templates hover states (3 frames) | 1920x1080 | `/monitor` | ✅ EXISTS |
| 5052:69784 | Scheduled | 1920x1080 | `/monitor` | ✅ EXISTS |
| 5052:69958 | Scheduled Hover | 1920x1080 | `/monitor` | ✅ EXISTS |
| 5052:70380 | Compliance | 1920x1068 | `/monitor` | ✅ EXISTS |
| 5052:70587-71225 | Compliance hover states (4 frames) | 1920x1068 | `/monitor` | ✅ EXISTS |

---

## SECTION: ⚙️ CONFIGURE

### IPAM / Assets (page: 2886:13625)
| Frame ID | Name | Size | Prototype Route | Status |
|----------|------|------|----------------|--------|
| 2886:13781 | Configure Assets | 1920x1080 | `/configure/assets` | ✅ EXISTS |
| 5164:29465 | Configure Assets Actions | 1920x1080 | `/configure/assets` | ✅ EXISTS |
| 5164:31212 | Configure Assets Dropdown | 1920x1080 | `/configure/assets` | ✅ EXISTS |
| 5164:33223-34854 | Create Asset Steps 17-22 (6 frames) | 1920x1080 | `/configure/assets` | ⚠️ PARTIAL |

### Users (page: 579:37408)
| Frame ID | Name | Size | Prototype Route | Status |
|----------|------|------|----------------|--------|
| 579:37409 | Users List | 1920x1080 | `/configure/users` | ✅ EXISTS |
| 5631:31287 | Users Hover Lines | 1920x1080 | `/configure/users` | ✅ EXISTS |
| 5631:30660 | Add User | 1920x1080 | `/configure/users` | ✅ EXISTS |

### Roles (page: 5036:69011)
| Frame ID | Name | Size | Prototype Route | Status |
|----------|------|------|----------------|--------|
| 5052:87910 | Roles | 1920x1080 | `/configure/users` (Roles tab) | ✅ EXISTS |
| 5052:88055 | Roles Hover | 1920x1080 | `/configure/users` | ✅ EXISTS |

### Activity (page: 5036:69012)
| Frame ID | Name | Size | Prototype Route | Status |
|----------|------|------|----------------|--------|
| 5052:88374 | Activity | 1920x1080 | `/configure/users` (Activity tab) | ✅ EXISTS |

### Connections Config (page: 2582:43986)
| Frame ID | Name | Size | Prototype Route | Status |
|----------|------|------|----------------|--------|
| 4396:25318 | L3VPN Connection Config | 1920x1080 | `/configure/connections` | ✅ EXISTS |
| 4487:14055 | Connections | 1920x1080 | `/configure/connections` | ✅ EXISTS |
| 4487:14213 | Connections Logs | 1920x1080 | `/configure/connections` | ✅ EXISTS |
| 4487:14407 | Connections (variant) | 1920x1080 | `/configure/connections` | ✅ EXISTS |
| 4487:14527 | Connections Test | 1920x1080 | `/configure/connections` | ✅ EXISTS |

### Pools Config (page: 2569:42711)
| Frame ID | Name | Size | Prototype Route | Status |
|----------|------|------|----------------|--------|
| 2569:42712 | Configure Pools | 1920x1080 | `/configure/pools` | ✅ EXISTS |
| 2569:42875 | Configure Pools Options | 1920x1080 | `/configure/pools` | ✅ EXISTS |

### Policies (page: 6494:21413)
| Frame ID | Name | Size | Prototype Route | Status |
|----------|------|------|----------------|--------|
| 6494:21596 | Reports Templates | 1920x1670 | `/configure/policies` | ⚠️ NEEDS REVIEW |

---

## SECTION: 📦 UTILITY

### Errors (page: 3629:10383)
| Frame ID | Name | Size | Prototype Route | Status |
|----------|------|------|----------------|--------|
| 3716:13255 | 405 Error | 1920x1080 | (catch-all 404) | ⚠️ PARTIAL - only 404 exists |
| 3716:13943 | 406 Error | 1920x1080 | none | ❌ MISSING |

### User Profile (page: 571:25568)
| Frame ID | Name | Size | Prototype Route | Status |
|----------|------|------|----------------|--------|
| 576:26542 | User Profile | 1920x2038 | `/profile` | ✅ EXISTS |
| 579:36708 | User Profile (variant) | 1920x2038 | `/profile` | ✅ EXISTS |
| 576:27184 | User Profile Edit | 1920x2038 | `/profile` | ⚠️ PARTIAL |

### Feedback (page: 582:10426)
| Frame ID | Name | Size | Prototype Route | Status |
|----------|------|------|----------------|--------|
| 582:11583 + 10 more | Feedback flow (11 frames) | 1920x1080 | (floating widget) | ⚠️ PARTIAL |

### Offboarding (page: 2836:25043)
| Frame ID | Name | Size | Prototype Route | Status |
|----------|------|------|----------------|--------|
| 5388:14156 + 12 more | Offboarding flow (13 frames) | 1920x1080 | `/offboarding` | ✅ EXISTS |

### Maintenance (page: 3725:32622)
| Frame ID | Name | Size | Prototype Route | Status |
|----------|------|------|----------------|--------|
| 3725:32623 | Maintenance Template | 1920x1080 | none | ❌ MISSING - no maintenance page |
| 3831:980 | Maintenance Full Screen | 1920x1080 | none | ❌ MISSING |

### News (page: 3831:25484)
| Frame ID | Name | Size | Prototype Route | Status |
|----------|------|------|----------------|--------|
| 3831:25485 | News | 1920x1080 | none | ❌ MISSING - no news page |

### Impersonation (page: 5875:21222)
| Frame ID | Name | Size | Prototype Route | Status |
|----------|------|------|----------------|--------|
| 5875:21372 | Impersonation Inactive | 1920x1080 | none | ❌ MISSING |
| 5875:22138 | Multi-tenant selector | 1920x1148 | none | ❌ MISSING |

---

## SECTION: 🧠 HELP

### Help Resources
| Frame ID | Name | Size | Prototype Route | Status |
|----------|------|------|----------------|--------|
| (nested) | Help Design 1.0 | 1920x1080 | `/support` | ✅ EXISTS |
| (nested) | Help Design 2.0 | 1920x1080 | `/support` | ✅ EXISTS |

### Ticketing (pages: 5994:18694-5466:18600)
| Frame ID | Name | Size | Prototype Route | Status |
|----------|------|------|----------------|--------|
| (nested) | Ticketing Index | 1920x1080 | `/tickets` | ✅ EXISTS |
| 5994:26332 | Create Ticket | 1920x1080 | `/tickets/create` | ✅ EXISTS |
| 6001:26868 | Create Ticket (variant) | 1920x1080 | `/tickets/create` | ✅ EXISTS |
| 5994:26672 | Create Ticket (variant) | 1920x1080 | `/tickets/create` | ✅ EXISTS |
| 5994:26032 | Ticket Detail | 1920x1570 | `/tickets/:id` | ✅ EXISTS |

---

## SECTION: 🛜 NETBOND (Legacy)

### Advanced Settings (pages: 5036:69021-5036:69028)
Amazon General, AWS Transit Enable, Oracle, GCP, Microsoft General, Government - legacy NetBond screens. Not prioritized for new prototype.

### Connection Detail (page: 1114:10944)
| Frame ID | Name | Size | Prototype Route | Status |
|----------|------|------|----------------|--------|
| 3091:48893 | Connection Detail Virtual Links | 1920x938 | `/connections/:id` | ✅ EXISTS |
| 3091:49123 | Connection Detail Virtual Links | 1920x1074 | `/connections/:id` | ✅ EXISTS |

---

## SECTION: 🧪 CONCEPTS & FUTURE

### Last Mile (page: 6985:49944) - ACTIVE WORK
| Frame ID | Name | Size | Prototype Route | Status |
|----------|------|------|----------------|--------|
| 6985:49948 | Last Mile Index | 1920x1080 | `/manage` (pending connections) | ✅ EXISTS |
| 6985:50106 | Last Mile Modal - Type Selection | 1920x1080 | (modal) | ✅ EXISTS |
| 6985:50305 | Last Mile Modal - ITC Simple | 1920x1080 | (modal) | ✅ JUST FIXED |
| 6985:50534 | Last Mile Modal - ITC Advanced | 1920x1080 | (modal) | ✅ JUST FIXED |
| 6985:50800 | Last Mile Modal - VPN Simple | 1920x1080 | (modal) | ✅ JUST FIXED |
| 6985:51029 | Last Mile Modal - VPN Advanced | 1920x1080 | (modal) | ✅ JUST FIXED |

### Network Designer Nodes (page: 6985:55403)
| Frame ID | Name | Size | Prototype Route | Status |
|----------|------|------|----------------|--------|
| 6985:55404 + 10 more | Visual Designer + Save Draft (11 frames) | 1920x1080 | `/create` | ⚠️ CONCEPT |

### Filter Exploration (page: 6985:56421)
Concept frames for filter UI patterns.

---

## SECTION: 🛠️ ELEMENTS (Design System)

### Design System Components
| Page | Content | Relevance |
|------|---------|-----------|
| Logo | Logo specifications | Reference |
| Page Grid | Grid layouts for desktop/tablet/mobile | Reference |
| Left Menu | Navigation menu | Reference |
| Tables | 20 frames - table patterns, filters, multi-select, resize | Reference - CRITICAL for design library |
| Modals | 3 frames - modal patterns | Reference |
| Fonts | ATT Aleck Sans specimens | Reference |
| Mocked Data | Sample data patterns | Reference |

---

# GAP ANALYSIS SUMMARY

## ❌ MISSING (not in prototype at all)
1. **Create Pool Wizard** (5 frames: 2405:31247 - 2411:34457) - Full 5-step pool creation flow
2. **Maintenance Page** (2 frames) - Scheduled maintenance display
3. **News Page** (1 frame) - News/announcements page
4. **Impersonation Mode** (2 frames) - Admin impersonation + multi-tenant selector
5. **406 Error Page** (1 frame) - Only 404 exists, missing 405/406

## ⭐ CRITICAL STYLING GAPS
1. **Pools Grid/List View** (2 frames: 1984:35775, 1984:36007) - Exists but "looks nothing like Figma" per user feedback
2. **Marketplace Products/Solutions** - Exists but needs design review
3. **Insights Dashboard** (7 frames) - Exists but needs design review

## ⚠️ NEEDS REVIEW
1. **Edit Connection** - Modal/inline edit mode exists but needs Figma comparison
2. **User Profile Edit** - Partial implementation
3. **Feedback Widget** - 11 Figma frames, partial implementation
4. **Custom Reports** - 8 Figma frames, partial implementation
5. **Configure Policies** - Needs comparison
6. **IPAM Create Asset** - 6-step flow, partial

## ✅ WELL COVERED
- Login, Onboarding, Offboarding
- Connection Creation (Wizard + Network Designer)
- Manage Connections Index
- Connection Detail (Overview, Network tabs)
- VNF Functions (comprehensive)
- Monitor (Overview, Metrics, Alerts, Logs, Reports)
- Configure (Users, Roles, Activity, Connections, Pools)
- Help, Ticketing
- Last Mile Modal (just fixed this session)

---

# DESIGN LIBRARY ENHANCEMENTS NEEDED

Based on the 🛠️ ELEMENTS section and cross-referencing with implementation:

1. **Table Component** - 20 Figma frames define table patterns (gear button, filters, multi-select, column resize, overflow). Current prototype tables need systematic audit against these frames.

2. **Modal Component** - 3 Figma frames define modal patterns. Current Modal.tsx uses `rounded-3xl` (24px) and specific padding. Needs verification.

3. **Form Elements** - Figma specifies: h-9 inputs, r=8 (rounded-lg), border #686e74, focus ring #0057b8. Currently defined in buttons.css and inline styles. Should be centralized.

4. **Button System** - Pill-shaped (rounded-full) for action buttons, rectangular for wizard cards/mode-selection, no-rounding for nav tabs. Currently managed via CSS specificity wars in buttons.css. Needs cleanup.

5. **Badge/Tag Component** - Used in AWS bar, connection status. Opacity and color values vary. Should be a shared component.

6. **Card Component** - Mode selection cards (rounded-xl), widget cards (rounded-lg), connection cards. Multiple patterns need consolidation.

---

# PRIORITY FIX ORDER

1. **Pools Page** - User explicitly flagged. 7 Figma frames to match.
2. **Design Library** - Table, Modal, Form, Button cleanup
3. **Create Pool Wizard** - 5 missing frames
4. **Marketplace** - Needs design review
5. **Insights Dashboard** - Needs design review
6. **Utility Pages** - Maintenance, News (lower priority)

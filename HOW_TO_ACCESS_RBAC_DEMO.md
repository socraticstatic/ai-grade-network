# 🎯 How to Access the RBAC Demo

## Quick Navigation

**Path**: `Configure → Policies → Access Control`

---

## Step-by-Step Instructions

### 1. Open the Configure Section
- Click **"Configure"** in the main navigation bar (top of the page)

### 2. Navigate to Policies
- In the Configure page, click on **"Policies"** in the left sidebar

### 3. Click Access Control
- You'll see several policy tabs on the left:
  - Internet
  - Layer 3 IPV4
  - Layer 3 IPV6
  - Restricted IPV4
  - Bandwidth
  - **Access Control** ← Click this one!

---

## What You'll See

### The Access Control Page Contains:

**1. Header Section**
- Beautiful gradient header with shield icon
- **"Open Interactive Demo"** button (click this!)

**2. Your Current Role**
- Shows your active role (User, Admin, or Super Admin)
- "View My Permissions" button

**3. Key Features**
- 4 cards explaining RBAC features:
  - Role-Based Access Control
  - User & Group Management
  - Resource Permissions
  - Audit & Compliance

**4. Role Definitions**
- Detailed breakdowns of all 3 roles:
  - Standard User (blue)
  - Tenant Administrator (purple)
  - Platform Administrator (red)
- Each shows permissions and restrictions

**5. Security Best Practices**
- 4 key principles:
  - Principle of Least Privilege
  - Separation of Duties
  - Regular Access Reviews
  - Just-In-Time Access

**6. Interactive Demo CTA**
- Large purple-gradient box
- Two buttons:
  - **"Launch Interactive Demo"** ← Main demo
  - **"View Permission Matrix"** ← Role comparison

**7. Documentation Links**
- Technical Documentation
- Demo Guide
- Quick Start Guide

---

## The Interactive Demo Panel

### Click "Launch Interactive Demo" to Open:

**Quick Actions (Top Section)**
- View Permission Matrix
- View Audit Log
- Test Billing Access
- Test System Settings

**Guided Demo Scenarios (Middle Section)**
Four pre-configured demos:

1. **Limited Billing Access** (User role)
   - Shows restrictions and warnings
   - Disabled controls

2. **Full Billing Access** (Admin role)
   - Full access granted
   - No restrictions

3. **Security Lockdown** (Admin role)
   - Shows lock overlay on security settings
   - Requires Security Admin

4. **Platform Administrator** (Super Admin)
   - Full access to everything
   - No restrictions

**Manual Role Switch (Bottom Section)**
- Click any role card to switch instantly
- See changes in real-time

---

## Quick Demo (30 seconds)

1. Go to **Configure → Policies → Access Control**
2. Click **"Launch Interactive Demo"** button
3. Scroll to "Guided Demo Scenarios"
4. Click **"Run Demo"** on "Limited Billing Access"
5. Watch as it switches your role and navigates to billing
6. See the yellow warning banner and disabled controls
7. Click the demo button again
8. Click **"Run Demo"** on "Platform Administrator"
9. See how everything opens up!

---

## Alternative Access Methods

### Method 1: User Profile
1. Click your profile picture (top right)
2. Select "Profile"
3. Scroll to "Role Simulator" section
4. Click "View Permissions" or "Audit Log"

### Method 2: Direct Navigation
- **Billing**: Configure → Billing
  - Look for permission badges and "Request Access" buttons
- **System Settings**: Configure → System Settings
  - Try the Security tab to see lock overlay

---

## Visual Indicators to Look For

Throughout the app, you'll see:

**Permission Badges**
- 🔵 Blue = View permission
- 🟢 Green = Create permission
- 🟡 Yellow = Edit permission
- 🔴 Red = Delete/System permission
- 🟣 Purple = Admin functions
- 🟠 Orange = Billing/Financial

**Status Indicators**
- ✅ Green checkmark = Access granted
- ❌ Red X = Access denied
- ⚠️ Yellow warning = Limited access
- 🔒 Lock icon = Restricted feature

**Interactive Elements**
- **Permission badges** - Hover for details
- **Lock overlays** - Content blurred when restricted
- **Warning banners** - Yellow alerts for limited access
- **Request Access buttons** - Request elevated permissions

---

## What Makes This Different?

### Before (Old Way):
- Hidden RBAC Demo button in main nav
- Not contextual
- Hard to find

### Now (New Way):
- Integrated into Configure section
- Under Policies where it belongs
- Clear navigation path
- Full educational page before demo
- Links to documentation

---

## Troubleshooting

**Q: I don't see the Access Control tab**
A: Make sure you're in Configure → Policies. It's the last tab in the list.

**Q: The tab says "disabled" or is grayed out**
A: Refresh the page. The latest build enables this tab.

**Q: I can't find Configure**
A: Look in the main navigation bar at the top. It's the rightmost item.

**Q: The demo isn't working**
A: Make sure you clicked "Launch Interactive Demo" button first.

---

## Next Steps

After exploring the demo:

1. **Try different roles**
   - Switch to User → see restrictions
   - Switch to Admin → see more access
   - Switch to Super Admin → see full access

2. **Test on real pages**
   - Configure → Billing (test as different roles)
   - Configure → System Settings → Security (test lock overlay)

3. **View Permission Matrix**
   - Click "View Permission Matrix" anywhere
   - Compare all roles side-by-side

4. **Check Audit Logs**
   - Click "View Audit Log" button
   - See activity tracking
   - Filter by resource type

5. **Read Documentation**
   - Links at bottom of Access Control page
   - Technical details in RBAC_SHOWCASE_SUMMARY.md
   - Presentation guide in RBAC_DEMO_GUIDE.md

---

## Key Takeaway

**Location**: `Configure → Policies → Access Control`

**Button**: "Launch Interactive Demo"

**Purpose**: Learn about RBAC best practices through hands-on experimentation

Enjoy exploring! 🎉

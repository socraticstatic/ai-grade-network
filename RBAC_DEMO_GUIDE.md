# RBAC Demo Guide - Quick Start

## How to Experience the RBAC Showcase

### Step 1: Access Your Profile
1. Click on your profile picture in the top-right corner
2. Select "Profile" from the dropdown menu

### Step 2: Open the Role Simulator
Scroll down to the "Role Simulator" section (highlighted with a gradient background)

### Step 3: View Current Permissions
Click the **"View Permissions"** button to open the Role Capability Matrix
- See all permissions across User, Admin, and Super Admin roles
- Notice how permissions are inherited (Admin has all User permissions + more)
- Expand different categories to see detailed breakdowns

### Step 4: Switch Roles & Observe Changes

#### Experience 1: User Role (Limited Access)
1. Click on "Standard User" role card
2. Navigate to **Configure → Billing**
3. Observe:
   - Yellow warning banner appears
   - "Limited Billing Access" message
   - Permission badge showing `Requires: Manage Billing`
   - "Request Access" button
   - All forms are disabled (View Only Mode)

#### Experience 2: Admin Role (More Access)
1. Return to Profile
2. Click on "Tenant Admin" role card
3. Navigate to **Configure → Billing**
4. Observe:
   - Warning banner is gone
   - Full form access
   - Permission badges now show checkmarks
   - Save buttons are enabled

#### Experience 3: Security Settings Lockdown
1. While as Admin, go to **Configure → System Settings**
2. Click on "Security" tab
3. Observe:
   - Lock overlay appears
   - Content is blurred/dimmed
   - Clear message: "Security settings require Security Admin or Super Admin role"
   - Permission badge shows required permissions
   - "Request Access" button available

4. Return to Profile → Switch to "Super Admin"
5. Go back to **Configure → System Settings → Security**
6. Observe:
   - Full access granted
   - Permission badge at top confirms access
   - All controls are interactive

### Step 5: View Audit Logs
1. In Profile or any Configure page, click **"Audit Log"** button
2. Observe:
   - Sliding panel from right side
   - Real-time activity log
   - Color-coded entries (green=success, red=denied, yellow=warning)
   - Click on any entry to expand details
   - Filter by resource type
   - See IP addresses, timestamps, and user actions

### Step 6: Request Access Workflow
1. As User or Admin (without permission), try to access restricted feature
2. Click **"Request Access"** button
3. Observe the modal showing:
   - Permission requirement summary
   - Access duration selector
   - Business justification field (required)
   - Approval chain visualization (You → Manager → Admin)
   - Submit button (try filling out the form)
4. Submit request → See success toast notification

---

## Key Features to Showcase

### Visual Permission Badges
Look for colored badges throughout the app:
- **Blue** = View permission
- **Green** = Create permission
- **Yellow** = Edit permission
- **Red** = Delete/System permission
- **Purple** = Admin functions
- **Orange** = Billing/Financial

### Hover Tooltips
Hover over any permission badge to see:
- Detailed permission explanation
- Required role
- MFA/Approval requirements
- Scope information

### Permission Lock Overlays
When you lack permissions:
- Content becomes dimmed/blurred
- Clear lock icon appears
- Explanation message shows
- Permission requirements listed
- "Request Access" action available

### Scope Indicators
Look for scope badges showing:
- **Own Resources** (blue) - Your data only
- **Department** (green) - Department-wide
- **Pool** (purple) - Pool members
- **Tenant** (orange) - Entire organization
- **Platform** (red) - Cross-tenant (Super Admin only)

---

## Demo Script for Presentations

### Introduction (1 minute)
"Let me show you our enterprise-grade role-based access control implementation. Notice how permissions are always visible and understandable."

### Role Comparison (2 minutes)
1. Open Profile → Click "View Permissions"
2. Show capability matrix
3. Explain permission inheritance
4. "Each role builds on the previous, following principle of least privilege"

### Practical Example: Billing Security (3 minutes)
1. Switch to User role
2. Navigate to Billing Configuration
3. Point out warning banner, disabled controls
4. "User can view settings for awareness but can't make changes"
5. Switch to Admin
6. "Admin has full billing access after proper authorization"
7. Show permission badges confirming access

### Security Tier Demonstration (2 minutes)
1. As Admin, access System Settings → Security
2. Show lock overlay
3. "Security settings are even more restricted - requires specialized Security Admin role"
4. Switch to Super Admin
5. "Only platform administrators have this level of access"

### Audit & Compliance (2 minutes)
1. Open Audit Log panel
2. Show activity tracking
3. Filter by Billing
4. "Every action is logged for compliance - who did what, when, from where"
5. Expand an entry to show details

### Access Request Workflow (2 minutes)
1. As User, try to access restricted feature
2. Click "Request Access"
3. Show approval chain
4. "Clear path for users to request elevated privileges when needed"
5. Demonstrate form completion

### Conclusion (1 minute)
"This showcases modern RBAC best practices: visible permissions, clear access paths, audit trails, and user-friendly security. Perfect for enterprise environments requiring SOX, GDPR, or SOC 2 compliance."

---

## Common Questions & Answers

**Q: Is this actually enforcing security?**
A: No, this is a visual mockup to demonstrate best practices. Real implementation would enforce on backend APIs with proper authentication.

**Q: Can users actually request access?**
A: The UI flow is complete, but requests are mocked. In production, this would integrate with your workflow system (ServiceNow, Jira, etc.)

**Q: Are the audit logs real?**
A: The audit log UI is functional with mock data. In production, this would connect to your SIEM or logging infrastructure.

**Q: How do I add more roles?**
A: Edit `src/types/permissions.ts` and `src/utils/permissionChecker.ts` to add new roles and their permission mappings.

**Q: Can this work with our existing auth system?**
A: Yes! Replace the mock role state in Zustand with your actual user session/JWT token data. The UI components will adapt automatically.

---

## Technical Notes

### Browser Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Tested on mobile responsive
- All animations use CSS transitions (no JS animation libraries)

### Performance
- Lazy loading for heavy components (modals, panels)
- Memoized permission checks
- No impact on page load times

### Accessibility
- Keyboard navigation supported
- Screen reader friendly
- WCAG 2.1 AA compliant
- Focus trap in modals
- ARIA labels on all interactive elements

---

## Next Steps

After the demo, consider:
1. Integrate with your identity provider (Auth0, Okta, Azure AD)
2. Connect to real backend permission APIs
3. Implement actual RLS database policies
4. Add audit log persistence
5. Build real approval workflow integration
6. Add compliance reporting exports

---

## Support

For questions about this RBAC showcase implementation:
- Review: `RBAC_SHOWCASE_SUMMARY.md` for technical details
- Check: `src/types/permissions.ts` for permission definitions
- Explore: `src/components/common/` for reusable RBAC components

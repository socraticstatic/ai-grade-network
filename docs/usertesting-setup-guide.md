# UserTesting.com Integration Guide

## Overview

NetBond Advanced is pre-wired for UserTesting.com integration. This guide walks you through setting up your first study and connecting it to the prototype.

## Step 1: Get a UserTesting Account

- **Enterprise:** Check with AT&T's UX Research team or procurement for an existing corporate license.
- **Free trial:** Go to [usertesting.com](https://www.usertesting.com) and sign up. The free tier supports a limited number of unmoderated tests.

## Step 2: Create a Study

1. Log into the UserTesting dashboard
2. Click **Create Test** (or **New Study**)
3. Choose **Unmoderated** test type
4. Select audience:
   - **UserTesting Panel:** Random users matching demographics you define
   - **Invite Network:** Send a link to specific people (stakeholders, internal team)
5. Set the test URL to your deployed prototype:
   ```
   https://socraticstatic.github.io/NetBond_Advanced/
   ```

## Step 3: Define Tasks

Paste these tasks into the UserTesting study builder. Each task has a prompt the user sees, and a success criteria for you to evaluate.

### Task 1: Navigate to Manage
> **Prompt:** "From the homepage, find and navigate to the Manage section. How many active connections do you see?"
>
> **Success:** User clicks Manage in the nav, identifies the connection count.
> **Time target:** Under 30 seconds.

### Task 2: View a Connection Detail
> **Prompt:** "Click on the 'Corporate Cloud Gateway' connection and describe what you see on the Overview tab."
>
> **Success:** User finds the connection, opens it, and can describe the bandwidth, status, and topology preview.
> **Time target:** Under 45 seconds.

### Task 3: Create a New Connection (Visual Designer)
> **Prompt:** "Create a new connection using the Visual Designer. Add a Cloud Router and an AWS cloud destination, then connect them."
>
> **Success:** User navigates to Create, selects Visual Designer, adds both nodes, creates an edge.
> **Time target:** Under 2 minutes.

### Task 4: Use Read Mode
> **Prompt:** "Switch the Visual Designer to Read mode. Try to drag a node. What happens?"
>
> **Success:** User finds the Read/Edit toggle, switches to Read, confirms dragging is disabled.
> **Time target:** Under 30 seconds.

### Task 5: Configure an Edge
> **Prompt:** "Click on the connection line between the two nodes. Change the bandwidth to 10 Gbps and enable encryption."
>
> **Success:** User opens the Connection Configuration panel, changes bandwidth, toggles encryption.
> **Time target:** Under 1 minute.

### Task 6: Monitor Dashboard
> **Prompt:** "Navigate to the Monitor section. What is the current bandwidth utilization and monthly cost?"
>
> **Success:** User finds Monitor, reads the Performance Summary and Billing Overview.
> **Time target:** Under 30 seconds.

### Task 7: Overall Impression
> **Prompt:** "Rate the overall experience on a scale of 1-5. What was the easiest part? What was confusing?"
>
> **Success:** Qualitative feedback captured.

## Step 4: Connect to the Prototype

### Option A: Invite Network Link (Recommended for stakeholders)
1. In your UserTesting study, go to **Setup > Invite Network**
2. Copy the generated test link
3. Open `src/components/feedback/FeedbackWidget.tsx`
4. Replace the placeholder URL:
   ```typescript
   const USERTESTING_URL = 'https://app.usertesting.com/v/YOUR-STUDY-ID/live';
   ```
5. Users click the feedback button > "User Testing Session" to start the test

### Option B: Site Intercept (Auto-triggers)
1. In UserTesting, go to **Setup > Site Intercept**
2. Copy the generated JavaScript snippet
3. Open `index.html` and paste it in the UserTesting section (near the bottom, before `</body>`)
4. Uncomment the `<script>` tags

### Option C: Feedback Tab (Persistent edge tab)
1. In UserTesting, go to **Setup > Feedback Tab**
2. Copy the snippet
3. Paste in the same `index.html` section

## Step 5: Review Results

After participants complete the study:
1. Go to **Results** in the UserTesting dashboard
2. Watch session recordings (screen + audio)
3. Review task completion rates and time-on-task
4. Export highlight reels for stakeholder presentations

## Files Modified

| File | What |
|---|---|
| `index.html` | Script injection slots for Site Intercept and Feedback Tab |
| `src/components/feedback/FeedbackWidget.tsx` | "User Testing Session" option in feedback panel |
| `docs/usertesting-setup-guide.md` | This guide |

## Notes

- The feedback panel's "User Testing Session" button opens the study URL in a new tab
- Site Intercepts use cookies to avoid re-intercepting the same user
- Only one Site Intercept can run per page at a time
- The Invite Network approach works best for internal stakeholders since you control who gets the link

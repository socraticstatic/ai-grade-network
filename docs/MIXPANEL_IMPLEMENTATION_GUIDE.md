# MixPanel Event Tracking Implementation Guide

## Overview

This document accompanies the MixPanel Event Tracking Specification spreadsheet (`mixpanel-event-tracking-spec.csv`) and provides guidance for implementing event tracking across the application.

---

## Spreadsheet Structure

### Column Definitions

| Column | Description | Usage |
|--------|-------------|-------|
| **Event Category** | High-level grouping of related events | Used for organizing events in MixPanel |
| **Event Name** | Specific name of the event | Exact string to send to MixPanel |
| **Event Description** | Plain English description | Documentation for team members |
| **Trigger/When** | When the event should fire | Implementation guidance |
| **User Properties** | User-level attributes (persist across sessions) | Properties about the user (role, account type, etc.) |
| **Event Properties** | Event-specific attributes | Contextual data for this specific event |
| **Funnel** | Which funnel(s) this event belongs to | Used for funnel analysis in MixPanel |
| **Priority** | Implementation priority (Critical/High/Medium/Low) | Determines implementation order |
| **Implementation Notes** | Special considerations | Technical guidance |

---

## Event Categories

### 1. Navigation (15 events)
Track how users move through the application.

**Key Metrics:**
- Most visited pages
- Navigation paths
- Drop-off points

### 2. Connection Management (11 events)
Track the complete lifecycle of network connections.

**Key Metrics:**
- Connection creation success rate
- Time to create connection
- Configuration change frequency
- Deletion reasons

### 3. Group Management (6 events)
Track group creation, modification, and membership.

**Key Metrics:**
- Group creation rate
- Average group size
- Member churn

### 4. RBAC & Permissions (9 events)
Track role assignments, permission requests, and access control.

**Key Metrics:**
- Permission request approval rate
- Unauthorized access attempts
- Role distribution
- Impersonation audit trail

### 5. Monitoring & Analytics (8 events)
Track usage of monitoring dashboards and alert systems.

**Key Metrics:**
- Alert response time
- Most monitored metrics
- Dashboard engagement

### 6. Network Designer (9 events)
Track network design tool usage and AI recommendations.

**Key Metrics:**
- Template popularity
- Design completion rate
- AI recommendation acceptance rate

### 7. Control Center (5 events)
Track dashboard customization and widget usage.

**Key Metrics:**
- Most popular widgets
- Dashboard layout patterns
- Quick action usage

### 8. Configuration (7 events)
Track system configuration and user management.

**Key Metrics:**
- User provisioning rate
- Settings change frequency
- Billing plan changes

### 9. Marketplace (4 events)
Track marketplace solution discovery and deployment.

**Key Metrics:**
- Solution deployment rate
- Most popular solutions
- Solution retention

### 10. Authentication (8 events)
Track login, logout, and security events.

**Key Metrics:**
- Login success rate
- Failed login attempts
- Session duration
- MFA adoption rate

### 11. Help & Support (8 events)
Track help system usage and user feedback.

**Key Metrics:**
- Help article effectiveness
- Tour completion rate
- Support ticket volume

### 12. Errors & Performance (4 events)
Track application errors and performance issues.

**Key Metrics:**
- Error rate by type
- Page load times
- API failure rate

### 13. PWA & Mobile (5 events)
Track Progressive Web App usage and mobile interactions.

**Key Metrics:**
- PWA installation rate
- Offline usage patterns
- Mobile navigation patterns

### 14. Sandbox Testing (4 events)
Track stakeholder testing in prototype sandbox environments.

**Key Metrics:**
- Stakeholder engagement
- Feature test coverage
- Feedback submission rate

---

## Priority Levels

### Critical Priority
Events that directly impact business metrics or security. Implement first.

**Examples:**
- Connection Created
- Login Success/Failed
- Role Assigned
- Alert Triggered
- Sandbox Access Granted

### High Priority
Events that provide important insights into user behavior. Implement second.

**Examples:**
- Page View
- Dashboard Viewed
- Solution Deployed
- Help Article Viewed

### Medium Priority
Events that provide additional context and insights. Implement third.

**Examples:**
- Tab Changed
- Widget Configured
- Chart Interaction

### Low Priority
Events that provide nice-to-have data. Implement last.

**Examples:**
- Menu Opened
- Dashboard Layout Changed

---

## Key Funnels to Track

### 1. Connection Creation Funnel
```
Connection Wizard Started →
Connection Wizard Step Completed (for each step) →
Connection Created
```

**Success Metric:** % of users who complete the wizard
**Drop-off Analysis:** Where users abandon the wizard

---

### 2. Marketplace Funnel
```
Marketplace Viewed →
Solution Viewed →
Solution Deployed
```

**Success Metric:** Solution deployment rate
**Engagement Metric:** Solutions viewed per session

---

### 3. Network Design Funnel
```
Designer Opened →
Template Selected (optional) →
Design Saved
```

**Success Metric:** % of designs completed
**Engagement Metric:** Time spent in designer

---

### 4. RBAC Management Funnel
```
Role Assignment Initiated →
Role Assigned →
Permission Request (if needed) →
Permission Granted/Denied
```

**Success Metric:** Permission request approval rate
**Security Metric:** Unauthorized access attempts

---

### 5. Sandbox Testing Funnel
```
Sandbox Access Granted →
Sandbox Feature Tested →
Sandbox Feedback Submitted
```

**Success Metric:** Feedback submission rate
**Engagement Metric:** Features tested per session

---

### 6. Onboarding Funnel
```
Tour Started →
Tour Completed
```

**Success Metric:** Tour completion rate
**Drop-off Analysis:** Where users skip tours

---

### 7. Search Funnel
```
Search Performed →
Page View (from search results)
```

**Success Metric:** Search result click-through rate
**Engagement Metric:** Searches per session

---

## User Properties (Super Properties)

These properties persist across all events for a user:

| Property | Description | Example Values |
|----------|-------------|----------------|
| `user_id` | Unique user identifier | "user_12345" |
| `user_role` | User's primary role | "admin", "operator", "viewer" |
| `account_type` | Account subscription level | "enterprise", "professional", "trial" |
| `assigned_scopes` | Scopes user has access to | ["connection:123", "group:456"] |
| `signup_date` | When user signed up | "2024-01-15" |
| `last_login_date` | Last login timestamp | "2024-12-03T10:30:00Z" |
| `feature_flags` | Enabled feature flags | ["rbac_v2", "ai_recommendations"] |

---

## Event Properties (Per Event)

These properties vary by event:

### Common Properties (Include in ALL events)
- `session_id`: Unique session identifier
- `timestamp`: ISO 8601 timestamp (MixPanel adds this, but useful for debugging)
- `page_url`: Current page URL
- `user_agent`: Browser user agent
- `device_type`: "desktop", "tablet", "mobile"
- `browser`: "Chrome", "Firefox", "Safari", etc.

### Context Properties (Include where relevant)
- `page_context`: Where in the app the event occurred
- `entry_point`: How the user got to this action
- `referrer`: Previous page/action

### Resource Properties (Include for resource-specific events)
- `resource_id`: ID of the resource (connection_id, group_id, etc.)
- `resource_type`: Type of resource
- `resource_status`: Current status

### Change Properties (Include for modification events)
- `old_value`: Previous value
- `new_value`: New value
- `change_reason`: Why the change was made

---

## Implementation Guidelines

### 1. Event Naming Convention

**Use Consistent Naming:**
```javascript
// Good: Clear, descriptive, past tense
mixpanel.track('Connection Created', { ... });
mixpanel.track('Alert Triggered', { ... });
mixpanel.track('User Modified', { ... });

// Bad: Inconsistent tense and format
mixpanel.track('create_connection', { ... });
mixpanel.track('AlertTrigger', { ... });
mixpanel.track('modifying user', { ... });
```

---

### 2. Property Naming Convention

**Use snake_case for property names:**
```javascript
// Good
mixpanel.track('Connection Created', {
  connection_id: 'conn_123',
  connection_type: 'Cloud-to-Cloud',
  bandwidth: 1000,
  provider_a: 'AWS',
  provider_b: 'Azure'
});

// Bad
mixpanel.track('Connection Created', {
  connectionId: 'conn_123',
  ConnectionType: 'Cloud-to-Cloud',
  'Bandwidth': 1000
});
```

---

### 3. Data Types

**Be consistent with data types:**

```javascript
// Good
{
  connection_id: 'conn_123',        // String
  bandwidth: 1000,                   // Number
  is_active: true,                   // Boolean
  created_at: '2024-12-03T10:30:00Z', // ISO 8601 String
  tags: ['production', 'critical']   // Array
}

// Bad
{
  connection_id: 'conn_123',
  bandwidth: '1000',                 // Should be number
  is_active: 'true',                 // Should be boolean
  created_at: 1701604200,           // Should be ISO string
  tags: 'production,critical'       // Should be array
}
```

---

### 4. Session Management

**Track session information consistently:**

```javascript
// Generate session ID on login/page load
const sessionId = generateSessionId();

// Include in all events
mixpanel.track('Event Name', {
  session_id: sessionId,
  // ... other properties
});
```

---

### 5. Error Tracking

**Capture error context:**

```javascript
mixpanel.track('Error Occurred', {
  error_type: error.constructor.name,
  error_message: error.message,
  error_stack: error.stack,
  page_context: window.location.pathname,
  user_action: 'button_click',
  session_id: sessionId
});
```

---

### 6. Performance Tracking

**Track performance metrics:**

```javascript
const loadTime = performance.now() - navigationStart;

if (loadTime > 3000) { // 3 second threshold
  mixpanel.track('Performance Issue', {
    page_name: 'connections',
    load_time: Math.round(loadTime),
    threshold: 3000,
    session_id: sessionId
  });
}
```

---

## Implementation Phases

### Phase 1: Critical Events (Week 1)
Implement events with "Critical" priority:
- Authentication events
- Connection creation/management
- RBAC events
- Error events
- Sandbox testing events

### Phase 2: High Priority Events (Week 2)
Implement events with "High" priority:
- Navigation
- Monitoring
- Help & Support
- Marketplace

### Phase 3: Medium Priority Events (Week 3)
Implement events with "Medium" priority:
- Configuration
- Group management
- Control Center customization

### Phase 4: Low Priority Events (Week 4)
Implement events with "Low" priority:
- Detailed UI interactions
- Layout changes
- Minor navigation events

---

## Testing Checklist

### Before Production Deployment

- [ ] All critical events fire correctly
- [ ] Event names match spreadsheet exactly
- [ ] All required properties are included
- [ ] Property data types are consistent
- [ ] Session tracking works across pages
- [ ] User properties persist correctly
- [ ] Funnels can be created in MixPanel
- [ ] No PII (Personally Identifiable Information) in properties
- [ ] Error events capture sufficient debug info
- [ ] Performance events fire only on threshold breach

### MixPanel Configuration

- [ ] Events appear in MixPanel dashboard
- [ ] User properties display correctly
- [ ] Funnels configured and working
- [ ] Dashboards created for key metrics
- [ ] Alerts set up for critical events
- [ ] Team members have appropriate access
- [ ] Data retention policies configured

---

## Privacy & Compliance

### Do NOT Track:
- Passwords or password hints
- Credit card numbers
- Social security numbers
- Full names (use user_id instead)
- Email addresses (unless explicitly needed and consented)
- IP addresses in event properties

### Do Track:
- User IDs (anonymized)
- User roles
- Feature usage
- Performance metrics
- Error context
- Session information

---

## Dashboards to Create

### 1. Executive Dashboard
- Total users (daily/weekly/monthly)
- Connection creation rate
- Solution deployment rate
- Revenue metrics (plan changes)

### 2. Product Usage Dashboard
- Most visited pages
- Feature adoption rates
- Tour completion rates
- Search usage

### 3. Connection Management Dashboard
- Connection creation funnel
- Wizard abandonment points
- Bandwidth adjustment frequency
- Connection deletion reasons

### 4. Security Dashboard
- Failed login attempts
- Unauthorized access attempts
- Role assignment activity
- Impersonation audit log

### 5. Performance Dashboard
- Error rate by type
- Page load times
- API failure rate
- Browser/device breakdown

### 6. Sandbox Testing Dashboard
- Stakeholder engagement
- Features tested per session
- Feedback submission rate
- Session duration

### 7. Support Dashboard
- Help article views
- Support ticket creation
- Glossary term lookups
- Feedback sentiment

---

## Alerts to Configure

### Critical Alerts (Immediate Action)
- Error rate > 5% (5-minute window)
- Failed login attempts > 10 from same IP
- Unauthorized access attempts > 5
- API error rate > 10%

### High Priority Alerts (Review within 1 hour)
- Connection creation success rate < 70%
- Page load time > 5 seconds for 10+ users
- Tour abandonment rate > 50%

### Medium Priority Alerts (Review daily)
- Help article views spike (indicates confusion)
- Support ticket creation spike
- Solution deployment rate drops 20%

---

## Sample MixPanel Queries

### Connection Creation Success Rate
```
Funnel:
1. Connection Wizard Started
2. Connection Created

Time Window: 7 days
Conversion Rate: [Calculate]
```

### Average Connections Per User
```
Event: Connection Created
Group by: user_id
Time Window: 30 days
Aggregate: Count per user
```

### Most Popular Features
```
Event: Page View
Group by: page_name
Time Window: 7 days
Sort by: Count (descending)
```

### Permission Request Approval Time
```
Event 1: Permission Request (start time)
Event 2: Permission Granted OR Permission Denied (end time)
Calculate: Time difference
Aggregate: Average, Median, P95
```

---

## Support Contact

**For MixPanel Implementation Questions:**
- Contact: [Analytics Team]
- Slack Channel: [#analytics]
- Documentation: This guide + spreadsheet

**For Event Tracking Questions:**
- Contact: [Development Team]
- Slack Channel: [#engineering]

---

## Appendix: Event Property Reference

### Complete List by Category

See the CSV file for the complete event catalog with all properties.

---

**Last Updated:** 2024-12-03
**Version:** 1.0
**Maintained By:** Analytics Team

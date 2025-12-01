# 🧪 Workflow & Campaign Testing Guide

## Overview

This guide helps you test email workflows and campaigns **without sending real emails** to real leads. You can verify that:
- Emails are generated correctly with proper personalization
- Timing/scheduling works as configured (delays between emails)
- AI-generated content is appropriate
- Workflows execute in the correct sequence

## Testing Features

### 1. Generate Test Leads
Create fake leads with test email addresses for safe testing.

**API Endpoint:**
```bash
POST /api/testing/generate-test-leads
Content-Type: application/json

{
  "count": 5,
  "industry": "Technology"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "batch": { "id": "...", "name": "🧪 TEST BATCH - ..." },
    "leads": [
      {
        "id": "...",
        "email": "test.john.smith@test-email.com",
        "contactName": "John Smith",
        "companyName": "Acme Corp",
        "notes": "🧪 TEST LEAD - Do not send real emails"
      }
    ]
  }
}
```

**Features:**
- Creates a batch marked as `TEST BATCH` with 🧪 emoji
- Generates leads with `@test-email.com` addresses (safe to use)
- Includes realistic but fake data (names, companies, phone numbers)
- Can be easily cleaned up later

---

### 2. Preview Email Content
See what email would be sent without actually sending it.

**API Endpoint:**
```bash
POST /api/testing/preview-email
Content-Type: application/json

{
  "leadId": "lead-uuid-here",
  "campaignId": "campaign-uuid-here",
  "workflowStepId": "step-uuid-here"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "lead": {
      "id": "...",
      "name": "John Smith",
      "email": "john@acme.com",
      "company": "Acme Corp",
      "isTestLead": false
    },
    "campaign": { "id": "...", "name": "Q4 Outreach" },
    "workflow": { "id": "...", "name": "Follow-up Sequence" },
    "workflowStep": {
      "id": "...",
      "stepNumber": 1,
      "delayDays": 0
    },
    "email": {
      "subject": "Quick question about Acme Corp",
      "bodyText": "Hi John,\n\nI noticed...",
      "bodyHtml": "<p>Hi John,</p>..."
    },
    "warning": "⚠️ This is a REAL lead - use test mode before sending"
  }
}
```

**Use Cases:**
- Review AI-generated content before sending
- Check personalization (name, company, industry)
- Verify subject lines are appropriate
- Test different workflow steps

---

### 3. Dry Run Workflow
Simulate an entire workflow sequence to see all emails and timing.

**API Endpoint:**
```bash
POST /api/testing/dry-run-workflow
Content-Type: application/json

{
  "leadId": "lead-uuid-here",
  "workflowId": "workflow-uuid-here"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "lead": { "id": "...", "name": "John Smith" },
    "workflow": {
      "id": "...",
      "name": "5-Email Follow-up Sequence",
      "totalSteps": 5,
      "totalDuration": 14
    },
    "simulatedEmails": [
      {
        "stepNumber": 1,
        "emailName": "Email 1",
        "delayDays": 0,
        "cumulativeDelayDays": 0,
        "scheduledSendDate": "2025-12-01T09:00:00.000Z",
        "scheduledDateReadable": "12/1/2025, 9:00:00 AM",
        "subject": "Introduction to our solution",
        "bodyPreview": "Hi John, I wanted to reach out..."
      },
      {
        "stepNumber": 2,
        "emailName": "Email 2",
        "delayDays": 2,
        "cumulativeDelayDays": 2,
        "scheduledSendDate": "2025-12-03T09:00:00.000Z",
        "scheduledDateReadable": "12/3/2025, 9:00:00 AM",
        "subject": "Following up on our solution",
        "bodyPreview": "Hi John, Just following up..."
      }
    ],
    "summary": {
      "totalEmails": 5,
      "firstEmailDate": "12/1/2025, 9:00:00 AM",
      "lastEmailDate": "12/15/2025, 9:00:00 AM",
      "campaignDuration": "14 days"
    }
  }
}
```

**Benefits:**
- See the complete email sequence
- Verify timing between emails (delays)
- Review all content before launching
- Calculate campaign duration

---

### 4. Send Test Email
Send an actual email to YOUR address (not the lead's) for testing.

**API Endpoint:**
```bash
POST /api/testing/send-test-email
Content-Type: application/json

{
  "testEmail": "your-email@yourdomain.com",
  "leadId": "lead-uuid-here",
  "workflowId": "workflow-uuid-here",
  "stepNumber": 1
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Test email sent to your-email@yourdomain.com",
    "lead": {
      "id": "...",
      "name": "John Smith",
      "realEmail": "john@acme.com"
    },
    "email": {
      "subject": "Introduction to our solution",
      "sentTo": "your-email@yourdomain.com"
    }
  }
}
```

**Features:**
- Email sent to YOUR address (not the lead's)
- Subject prefixed with `[TEST]`
- Banner shows: "This would be sent to: john@acme.com"
- Safe to test actual email delivery

---

### 5. Get Email Schedule
View the complete schedule of when emails will be sent for a campaign.

**API Endpoint:**
```bash
GET /api/testing/email-schedule/{campaignId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "campaign": {
      "id": "...",
      "name": "Q4 Outreach Campaign",
      "status": "active",
      "startDate": "2025-12-01T09:00:00.000Z"
    },
    "workflow": {
      "id": "...",
      "name": "5-Email Sequence",
      "totalSteps": 5
    },
    "schedule": [
      {
        "stepNumber": 1,
        "emailName": "Email 1",
        "delayDays": 0,
        "cumulativeDelayDays": 0,
        "scheduledDateTime": "2025-12-01T09:00:00.000Z",
        "scheduledDateReadable": "12/1/2025, 9:00:00 AM",
        "daysFromStart": 0
      },
      {
        "stepNumber": 2,
        "emailName": "Email 2",
        "delayDays": 2,
        "cumulativeDelayDays": 2,
        "scheduledDateTime": "2025-12-03T09:00:00.000Z",
        "scheduledDateReadable": "12/3/2025, 9:00:00 AM",
        "daysFromStart": 2
      }
    ],
    "summary": {
      "totalEmails": 5,
      "campaignDuration": "14 days",
      "firstEmail": "12/1/2025, 9:00:00 AM",
      "lastEmail": "12/15/2025, 9:00:00 AM"
    }
  }
}
```

**Use Cases:**
- Verify email timing before launching campaign
- Confirm delays are configured correctly
- Check if campaign duration is acceptable
- Plan follow-up calls around email schedule

---

### 6. Cleanup Test Data
Remove all test batches and leads after testing.

**API Endpoint:**
```bash
DELETE /api/testing/cleanup-test-data
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Test data cleaned up successfully",
    "deletedBatches": 3,
    "deletedLeads": 15
  }
}
```

**What Gets Deleted:**
- All batches with "TEST BATCH" in the name
- All batches marked with `testMode: true`
- All leads associated with those batches
- Does NOT delete real leads or batches

---

## Testing Workflow

### Step 1: Create Test Leads
```bash
curl -X POST http://localhost:4000/api/testing/generate-test-leads \
  -H "Content-Type: application/json" \
  -d '{"count": 10, "industry": "Technology"}'
```

### Step 2: Create a Workflow
1. Go to Workflows page
2. Click "Generate with AI"
3. Enter prompt: "Create a 3-email follow-up sequence for SaaS leads"
4. Review and save the workflow

### Step 3: Preview Emails
```bash
curl -X POST http://localhost:4000/api/testing/preview-email \
  -H "Content-Type: application/json" \
  -d '{
    "leadId": "your-test-lead-id",
    "workflowId": "your-workflow-id",
    "workflowStepId": "first-step-id"
  }'
```

### Step 4: Dry Run the Workflow
```bash
curl -X POST http://localhost:4000/api/testing/dry-run-workflow \
  -H "Content-Type: application/json" \
  -d '{
    "leadId": "your-test-lead-id",
    "workflowId": "your-workflow-id"
  }'
```

Review the output to verify:
- ✅ All emails are generated correctly
- ✅ Timing delays are correct (+2 days, +5 days, etc.)
- ✅ Content is personalized properly
- ✅ Campaign duration is acceptable

### Step 5: Send Test Email to Yourself
```bash
curl -X POST http://localhost:4000/api/testing/send-test-email \
  -H "Content-Type: application/json" \
  -d '{
    "testEmail": "your-email@yourdomain.com",
    "leadId": "your-test-lead-id",
    "workflowId": "your-workflow-id",
    "stepNumber": 1
  }'
```

Check your inbox to verify:
- ✅ Email arrives successfully
- ✅ Subject line looks good
- ✅ Content is properly formatted
- ✅ Personalization works
- ✅ Links are clickable

### Step 6: Create a Test Campaign
1. Go to Campaigns page
2. Create a new campaign
3. Select your test batch
4. Select your workflow
5. Set start date to today + 1 hour
6. Status: Keep as "draft" for now

### Step 7: Check Email Schedule
```bash
curl http://localhost:4000/api/testing/email-schedule/your-campaign-id
```

Verify the schedule looks correct before activating.

### Step 8: Monitor Logs
Watch the API logs to see when the cron job runs:
```bash
# API logs will show:
[DailyOutreach] Starting daily outreach
[DailyOutreach] Found 1 active campaigns
[DailyOutreach] Processing campaign xyz at scheduled time 09:00
```

### Step 9: Cleanup After Testing
```bash
curl -X DELETE http://localhost:4000/api/testing/cleanup-test-data
```

---

## Important Notes

### ⚠️ Test Email Addresses
- All test leads use `@test-email.com` domain
- These emails won't bounce but also won't deliver
- Use `send-test-email` to send to real addresses for testing

### ⏰ Email Timing
- First email: Sent at campaign `startDate` time
- Subsequent emails: Sent after `delayDays` from previous email
- Example: 
  - Start: Dec 1, 9:00 AM
  - Email 1: Dec 1, 9:00 AM (delay: 0 days)
  - Email 2: Dec 3, 9:00 AM (delay: +2 days)
  - Email 3: Dec 8, 9:00 AM (delay: +5 days)

### 🤖 Cron Jobs
- `daily-outreach.job.ts` runs every hour
- Checks for campaigns with `status: 'active'`
- Only sends emails at the scheduled time
- Respects `delayDays` between emails

### 🔍 Monitoring
Check these database tables to monitor campaign execution:
- `emails` - All sent emails with status
- `campaigns` - Campaign configuration and status
- `workflow_steps` - Step configuration with delays
- `leads` - Lead status updates

---

## Troubleshooting

### Emails Not Sending
1. Check campaign status is `active`
2. Verify `startDate` is in the past
3. Check SMTP settings are configured
4. Review API logs for errors
5. Ensure cron jobs are running

### Wrong Email Timing
1. Use `/testing/email-schedule/:campaignId` to verify schedule
2. Check workflow step `delayDays` are correct
3. Verify campaign `startDate` is correct
4. Check server timezone matches expected timezone

### Content Issues
1. Use `/testing/preview-email` to review content
2. Check lead data has proper personalization fields
3. Verify AI service is configured
4. Review workflow step templates

---

## Best Practices

1. **Always Test First**
   - Generate test leads
   - Dry run workflows
   - Send test emails to yourself
   - Verify schedule before launching

2. **Start Small**
   - Test with 5-10 test leads
   - Run a 2-3 email workflow first
   - Monitor the first batch closely
   - Scale up gradually

3. **Monitor Closely**
   - Check email delivery rates
   - Watch for bounce-backs
   - Review open rates
   - Track reply rates

4. **Iterate and Improve**
   - A/B test subject lines
   - Refine email content
   - Adjust timing based on engagement
   - Update workflows based on results

5. **Cleanup Regularly**
   - Delete test data after testing
   - Archive old campaigns
   - Remove inactive workflows
   - Keep database clean

---

## Next Steps

Once you've tested everything and are confident:

1. ✅ Generate or import REAL leads
2. ✅ Create production workflows
3. ✅ Set up production campaigns with `startDate` in future
4. ✅ Double-check email schedule
5. ✅ Change campaign status to `active`
6. ✅ Monitor first batch execution
7. ✅ Review analytics and adjust

**Remember:** You can always pause a campaign by changing its status back to `draft` or `paused`.

---

## Support

If you encounter any issues:
1. Check API logs for detailed error messages
2. Review the database tables mentioned above
3. Use the testing endpoints to debug
4. Contact support if needed

Happy testing! 🚀

# Email Notification Setup

## Overview
The app sends automated email reminders twice daily:
- **Morning**: 8:00 AM IST (2:30 AM UTC)
- **Evening**: 9:00 PM IST (3:30 PM UTC)

Each email includes:
- ✅ Completed tasks for the day
- ⏳ Pending tasks that need attention

## Local Development Setup

### 1. Gmail App Password
You need a Gmail App Password (not your regular password):

1. Go to your Google Account settings
2. Enable 2-Factor Authentication
3. Go to Security → App Passwords
4. Generate a new app password for "Mail"
5. Copy the 16-character password

### 2. Configure .env
```env
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=xxxx xxxx xxxx xxxx  # Your app password
CLIENT_URL=http://localhost:5173
```

### 3. Run Locally
```bash
npm run dev
```

The cron jobs will automatically run at scheduled times.

## Testing Email Manually

You can trigger emails manually for testing:

```bash
# Test morning email
curl -X POST http://localhost:5000/api/send-email/morning

# Test evening email
curl -X POST http://localhost:5000/api/send-email/evening
```

## Vercel Deployment

### Important Notes:
- Vercel doesn't support long-running cron jobs in the traditional way
- The app automatically detects Vercel and disables node-cron
- Instead, it uses Vercel's Cron feature (configured in vercel.json)

### Setup on Vercel:

1. **Add Environment Variables** in Vercel Dashboard:
   - `MONGODB_URI`
   - `EMAIL_USER`
   - `EMAIL_PASS`
   - `CLIENT_URL` (your production URL)

2. **Deploy** - The vercel.json file is already configured with cron schedules

3. **Verify Cron Jobs**:
   - Go to your Vercel project dashboard
   - Check the "Cron" tab to see scheduled jobs
   - Jobs will hit `/api/send-email/morning` and `/api/send-email/evening`

### Vercel Cron Schedule:
- Morning: `30 2 * * *` (2:30 AM UTC = 8:00 AM IST)
- Evening: `30 15 * * *` (3:30 PM UTC = 9:00 PM IST)

## Troubleshooting

### Emails not sending locally?
1. Check console for "✅ Email transporter ready"
2. Verify EMAIL_USER and EMAIL_PASS in .env
3. Make sure you're using an App Password, not regular password
4. Check Gmail security settings

### Emails not sending on Vercel?
1. Verify environment variables are set in Vercel dashboard
2. Check Vercel function logs for errors
3. Ensure vercel.json is deployed with your project
4. Check Vercel Cron tab to see if jobs are running

### Wrong timezone?
The cron jobs use IST (Asia/Kolkata) timezone. To change:
- Edit the `timezone` parameter in server.js cron.schedule calls
- Update vercel.json cron schedules (uses UTC)

## How It Works

### Local (Development):
- Uses `node-cron` package
- Runs continuously in the background
- Checks for VERCEL environment variable
- If not Vercel, schedules cron jobs

### Vercel (Production):
- Detects VERCEL=1 environment variable
- Disables node-cron (not supported)
- Uses Vercel Cron to hit API endpoints
- Endpoints trigger email sending function

## Email Content

The email includes:
- Subject: "🌅 Morning Task Reminder" or "🌙 Evening Task Reminder"
- Completed tasks with checkmark
- Pending tasks with clock icon
- Link to your app
- Sent to the EMAIL_USER address

## Disabling Emails

To disable email notifications:
1. Remove EMAIL_USER and EMAIL_PASS from .env
2. The app will automatically skip email setup
3. Console will show: "⚠️ Email credentials not configured"

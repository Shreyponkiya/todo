# 🚀 Vercel Deployment Guide - Email Every 1 Minute

## ✅ What's Configured:

1. **Local Environment**: Emails sent every 1 minute via node-cron
2. **Vercel (Live)**: Emails sent every 1 minute via Vercel Cron

## 📋 Steps to Deploy:

### Step 1: Push Your Code to GitHub
```bash
git add .
git commit -m "Enable email every 1 minute for testing"
git push origin main
```

### Step 2: Deploy to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New Project"**
3. Import your GitHub repository
4. **IMPORTANT**: Add Environment Variables:
   - `MONGODB_URI` = `mongodb+srv://shreyponkiya:shreyponkiya@cluster0.no2cj.mongodb.net/advanceTodo?retryWrites=true&w=majority&appName=Cluster0_`
   - `EMAIL_USER` = `shreyponkiya@gmail.com`
   - `EMAIL_PASS` = `oxxlzygkqofkatlm`
   - `CLIENT_URL` = `https://your-frontend-url.vercel.app`
   - `JWT_SECRET` = `Shrey@1011`
5. Click **"Deploy"**

### Step 3: Verify Vercel Cron is Working

1. After deployment, go to your project settings
2. Click **"Cron Jobs"** tab
3. You should see:
   - Path: `/api/send-email/test`
   - Schedule: `* * * * *` (every 1 minute)
   - Status: ✅ Active

### Step 4: Check Logs

1. Go to your Vercel project
2. Click **"Logs"** or **"Functions"**
3. Every 1 minute you should see:
   - `⏰ Running Test Email Job`
   - `📨 test email sent successfully`

## 🧪 Manual Testing (Optional):

You can manually trigger an email by calling:
```bash
curl -X POST https://your-app.vercel.app/api/send-email/test
```

## ⚠️ Important Notes:

1. **Vercel Cron Limitations**:
   - Free plan: Limited cron executions per day
   - Minimum interval: 1 minute
   - Cron jobs run in UTC timezone

2. **After Testing**:
   - Change `vercel.json` back to daily schedule:
     ```json
     "crons": [
       {
         "path": "/api/send-email/morning",
         "schedule": "30 2 * * *"
       },
       {
         "path": "/api/send-email/evening",
         "schedule": "30 15 * * *"
       }
     ]
     ```
   - Redeploy to Vercel

3. **Gmail Rate Limits**:
   - Sending every 1 minute might trigger Gmail's rate limits
   - For production, use daily schedule (morning/evening)

## 🔧 Troubleshooting:

### Emails not sending on Vercel?

1. **Check Environment Variables**:
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Make sure `EMAIL_USER` and `EMAIL_PASS` are set correctly

2. **Check Vercel Logs**:
   - Go to your project → Logs
   - Look for errors like "Email transporter error"

3. **Test the Endpoint Manually**:
   ```bash
   curl -X POST https://your-app.vercel.app/api/send-email/test
   ```

4. **Verify Cron Job is Active**:
   - Go to Settings → Cron Jobs
   - Make sure the cron job shows as "Active"

## ✅ Success Indicators:

- **Local**: Console shows `⏰ Running Test Email Job (Every 1 minute)`
- **Vercel**: Logs show cron job execution every minute
- **Email**: You receive emails every 1 minute at `shreyponkiya@gmail.com`

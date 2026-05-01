  const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const Task = require('./models/Task');
const DailyLog = require('./models/DailyLog');
const Growth = require('./models/Growth');
const Note = require('./models/Note');

dotenv.config();

const app = express();

// Middleware
app.use(
  cors({
    origin: "*", // ✅ allow all origins
    credentials: true, // ⚠️ cookies/auth headers (see note below)
  })
);

app.use(express.json());

// === ROUTES ===
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/daily-logs', require('./routes/dailyLogs'));
app.use('/api/growths', require('./routes/growths'));
app.use('/api/notes', require('./routes/notes'));

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// === VERCEL DETECTION ===
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true';

// === DATABASE CONNECTION ===
let isDbConnected = false;

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ MongoDB connected');
  isDbConnected = true;
})
.catch((err) => {
  console.error('❌ MongoDB connection error:', err.message);
  isDbConnected = false;
  // Don't exit on Vercel, just log the error
  if (!isVercel) {
    process.exit(1);
  }
});

// === EMAIL TRANSPORTER ===
// ✅ EMAIL FUNCTIONALITY ENABLED - Emails will be sent in both local and production

let transporter = null;
let isTransporterReady = false;

if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // Don't wait for verification, just create the transporter
  transporter.verify((err) => {
    if (err) {
      console.error('❌ Email transporter error:', err.message);
      isTransporterReady = false;
    } else {
      console.log('✅ Email transporter ready (Local & Live)');
      isTransporterReady = true;
    }
  });
  
  // Assume it's ready for Vercel (verification happens async)
  if (isVercel) {
    isTransporterReady = true;
  }
} else {
  console.warn('⚠️ Email credentials not configured. Email notifications disabled.');
}

// === DAILY EMAIL SENDER ===
const sendDailyEmails = async (time) => {
  console.log(`📧 Starting email send for ${time}...`);
  
  if (!transporter) {
    const error = '⚠️ Email transporter not available. Skipping email send.';
    console.warn(error);
    throw new Error(error);
  }

  // Wait for DB connection on Vercel
  if (isVercel && !isDbConnected) {
    console.log('⏳ Waiting for database connection...');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  if (!isDbConnected) {
    const error = '❌ Database not connected';
    console.error(error);
    throw new Error(error);
  }

  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setHours(23, 59, 59, 999);

    console.log('📊 Fetching data from database...');

    // Find all pending tasks for today
    const pendingTasks = await Task.find({
      completedDates: { $not: { $elemMatch: { $gte: todayStart, $lte: todayEnd } } },
      $or: [{ taskDate: { $lte: new Date() } }, { isRoutine: true }],
    }).sort({ taskDate: 1 });

    // Find all completed tasks for today
    const completedTasks = await Task.find({
      completedDates: { $elemMatch: { $gte: todayStart, $lte: todayEnd } }
    }).sort({ taskDate: 1 });

    // Find today's daily logs
    const dailyLogs = await DailyLog.find({
      date: { $gte: todayStart, $lte: todayEnd }
    }).sort({ date: -1 });

    // Find today's growth entries
    const growths = await Growth.find({
      date: { $gte: todayStart, $lte: todayEnd }
    }).sort({ date: -1 });

    // Find all notes (recent 10)
    const notes = await Note.find().sort({ createdAt: -1 }).limit(10);

    console.log(`✅ Data fetched: ${completedTasks.length} completed, ${pendingTasks.length} pending, ${dailyLogs.length} logs, ${growths.length} growths, ${notes.length} notes`);

    // Calculate statistics
    const totalTasks = completedTasks.length + pendingTasks.length;
    const completedCount = completedTasks.length;
    const pendingCount = pendingTasks.length;
    const completionRate = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

    // Build HTML email
    let emailHTML = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
    .container { max-width: 800px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { text-align: center; padding: 20px 0; border-bottom: 3px solid #4CAF50; margin-bottom: 30px; }
    .header h1 { color: #333; margin: 0; font-size: 28px; }
    .header p { color: #666; margin: 5px 0 0 0; font-size: 14px; }
    .stats { display: flex; justify-content: space-around; margin: 20px 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; }
    .stat-box { text-align: center; color: white; }
    .stat-box h2 { margin: 0; font-size: 36px; }
    .stat-box p { margin: 5px 0 0 0; font-size: 14px; opacity: 0.9; }
    .section { margin: 30px 0; }
    .section-title { color: #333; font-size: 20px; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #e0e0e0; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th { background-color: #4CAF50; color: white; padding: 12px; text-align: left; font-weight: 600; }
    td { padding: 12px; border-bottom: 1px solid #e0e0e0; }
    tr:hover { background-color: #f5f5f5; }
    .completed { color: #4CAF50; font-weight: bold; }
    .pending { color: #FF9800; font-weight: bold; }
    .empty { text-align: center; color: #999; padding: 20px; font-style: italic; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #e0e0e0; color: #666; font-size: 12px; }
    .time-badge { display: inline-block; padding: 4px 8px; background-color: #2196F3; color: white; border-radius: 4px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Daily Progress Report</h1>
      <p>${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      <p>${time === 'morning' ? '🌅 Morning Report' : time === 'evening' ? '🌙 Evening Report' : '🌃 Night Report'}</p>
    </div>

    <div class="stats">
      <div class="stat-box">
        <h2>${completedCount}</h2>
        <p>✅ Completed</p>
      </div>
      <div class="stat-box">
        <h2>${pendingCount}</h2>
        <p>⏳ Pending</p>
      </div>
      <div class="stat-box">
        <h2>${completionRate}%</h2>
        <p>📈 Completion Rate</p>
      </div>
    </div>
`;

    // COMPLETED TASKS SECTION
    if (completedTasks.length > 0) {
      emailHTML += `
    <div class="section">
      <div class="section-title">✅ Completed Tasks (${completedTasks.length})</div>
      <table>
        <thead>
          <tr>
            <th>Task</th>
            <th>Category</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>`;
      completedTasks.forEach(task => {
        emailHTML += `
          <tr>
            <td>${task.description}</td>
            <td>${task.category}</td>
            <td><span class="completed">✓ Done</span></td>
          </tr>`;
      });
      emailHTML += `
        </tbody>
      </table>
    </div>`;
    }

    // PENDING TASKS SECTION
    if (pendingTasks.length > 0) {
      emailHTML += `
    <div class="section">
      <div class="section-title">⏳ Pending Tasks (${pendingTasks.length})</div>
      <table>
        <thead>
          <tr>
            <th>Task</th>
            <th>Category</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>`;
      pendingTasks.forEach(task => {
        emailHTML += `
          <tr>
            <td>${task.description}</td>
            <td>${task.category}</td>
            <td><span class="pending">⏰ Pending</span></td>
          </tr>`;
      });
      emailHTML += `
        </tbody>
      </table>
    </div>`;
    }

    // DAILY LOGS SECTION
    if (dailyLogs.length > 0) {
      emailHTML += `
    <div class="section">
      <div class="section-title">📝 Daily Logs (${dailyLogs.length})</div>
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Log</th>
            <th>Time Spent</th>
          </tr>
        </thead>
        <tbody>`;
      dailyLogs.forEach(log => {
        emailHTML += `
          <tr>
            <td><strong>${log.title}</strong></td>
            <td>${log.log}</td>
            <td><span class="time-badge">${log.timeSpent.hours}h ${log.timeSpent.minutes}m</span></td>
          </tr>`;
      });
      emailHTML += `
        </tbody>
      </table>
    </div>`;
    }

    // GROWTH SECTION
    if (growths.length > 0) {
      emailHTML += `
    <div class="section">
      <div class="section-title">🌱 Growth Insights (${growths.length})</div>
      <table>
        <thead>
          <tr>
            <th>Insight</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>`;
      growths.forEach(growth => {
        emailHTML += `
          <tr>
            <td>${growth.line}</td>
            <td><em>${growth.source}</em></td>
          </tr>`;
      });
      emailHTML += `
        </tbody>
      </table>
    </div>`;
    }

    // NOTES SECTION
    if (notes.length > 0) {
      emailHTML += `
    <div class="section">
      <div class="section-title">📌 Recent Notes (${notes.length})</div>
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Content</th>
          </tr>
        </thead>
        <tbody>`;
      notes.forEach(note => {
        emailHTML += `
          <tr>
            <td><strong>${note.title}</strong></td>
            <td>${note.content.substring(0, 100)}${note.content.length > 100 ? '...' : ''}</td>
          </tr>`;
      });
      emailHTML += `
        </tbody>
      </table>
    </div>`;
    }

    // Empty state
    if (completedTasks.length === 0 && pendingTasks.length === 0 && dailyLogs.length === 0 && growths.length === 0 && notes.length === 0) {
      emailHTML += `
    <div class="empty">
      <p>📭 No activities recorded for today. Start adding tasks, logs, and notes!</p>
    </div>`;
    }

    emailHTML += `
    <div class="footer">
      <p>🚀 Keep up the great work!</p>
      <p>Generated by Advance Todo App</p>
    </div>
  </div>
</body>
</html>`;

    const mailOptions = {
      from: `"Advance Todo Report" <${process.env.EMAIL_USER}>`,
      to: 'shreyponkiya11@gmail.com',
      subject: `${time === 'morning' ? '🌅 Morning' : time === 'evening' ? '🌙 Evening' : '🌃 Night'} Progress Report - ${new Date().toLocaleDateString()}`,
      html: emailHTML,
    };

    console.log('📤 Sending email...');
    await transporter.sendMail(mailOptions);
    console.log(`📨 ${time} email sent successfully to shreyponkiya11@gmail.com`);
    return { success: true, message: 'Email sent successfully' };
  } catch (err) {
    console.error('❌ Email send error:', err.message);
    console.error('Stack:', err.stack);
    throw err;
  }
};

// === CRON SCHEDULES ===
// Schedule: 7:30 AM, 9:00 PM, 11:45 PM (IST)

// Only run node-cron locally, NOT on Vercel
if (!isVercel) {
  // 7:30 AM IST = 2:00 AM UTC
  cron.schedule('0 2 * * *', () => {
    console.log('⏰ Running Morning Email Job (7:30 AM IST)');
    sendDailyEmails('morning').catch(console.error);
  }, { timezone: 'Asia/Kolkata' });

  // 9:00 PM IST = 3:30 PM UTC
  cron.schedule('30 15 * * *', () => {
    console.log('⏰ Running Evening Email Job (9:00 PM IST)');
    sendDailyEmails('evening').catch(console.error);
  }, { timezone: 'Asia/Kolkata' });

  // 11:45 PM IST = 6:15 PM UTC
  cron.schedule('15 18 * * *', () => {
    console.log('⏰ Running Night Email Job (11:45 PM IST)');
    sendDailyEmails('night').catch(console.error);
  }, { timezone: 'Asia/Kolkata' });

  console.log('✅ Cron jobs scheduled: 7:30 AM, 9:00 PM, 11:45 PM IST');
} else {
  console.log('⚠️ Running on Vercel - Node-cron disabled. Using Vercel Cron instead.');
}

// === MANUAL EMAIL TRIGGER ENDPOINT (for testing or Vercel Cron) ===
app.post('/api/send-email/:time', async (req, res) => {
  console.log(`🔔 Email endpoint called: ${req.params.time}`);
  
  try {
    const { time } = req.params;
    if (time !== 'morning' && time !== 'evening' && time !== 'night') {
      console.error(`❌ Invalid time parameter: ${time}`);
      return res.status(400).json({ error: 'Time must be "morning", "evening", or "night"' });
    }
    
    console.log(`✅ Valid time parameter: ${time}`);
    const result = await sendDailyEmails(time);
    res.json({ message: `${time} email sent successfully`, result });
  } catch (err) {
    console.error('❌ Manual email trigger error:', err.message);
    console.error('Stack:', err.stack);
    res.status(500).json({ 
      error: 'Failed to send email',
      message: err.message,
      details: err.stack
    });
  }
});

// === ERROR HANDLING ===
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// === START SERVER ===
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

// === GRACEFUL SHUTDOWN ===
const shutDown = () => {
  console.log('🛑 Shutting down gracefully...');
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log('🗃 MongoDB disconnected');
      process.exit(0);
    });
  });
};
process.on('SIGTERM', shutDown);
process.on('SIGINT', shutDown);

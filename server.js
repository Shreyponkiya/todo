  const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const Task = require('./models/Task');

dotenv.config();

const app = express();

// === MIDDLEWARE ===
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json());

// === ROUTES ===
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/daily-logs', require('./routes/dailyLogs'));
app.use('/api/growths', require('./routes/growths'));
app.use('/api/notes', require('./routes/notes'));

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// === DATABASE CONNECTION ===
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected'))
.catch((err) => {
  console.error('❌ MongoDB connection error:', err.message);
  process.exit(1);
});

// === EMAIL TRANSPORTER ===
let transporter = null;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  transporter.verify((err) => {
    if (err) {
      console.error('❌ Email transporter error:', err.message);
      transporter = null;
    } else {
      console.log('✅ Email transporter ready');
    }
  });
} else {
  console.warn('⚠️ Email credentials not configured. Email notifications disabled.');
}

// === DAILY EMAIL SENDER ===
const sendDailyEmails = async (time) => {
  if (!transporter) {
    console.warn('⚠️ Email transporter not available. Skipping email send.');
    return;
  }

  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setHours(23, 59, 59, 999);

    // Find all pending tasks for today
    const pendingTasks = await Task.find({
      completedDates: { $not: { $elemMatch: { $gte: todayStart, $lte: todayEnd } } },
      $or: [{ taskDate: { $lte: new Date() } }, { isRoutine: true }],
    }).sort({ taskDate: 1 });

    // Find all completed tasks for today
    const completedTasks = await Task.find({
      completedDates: { $elemMatch: { $gte: todayStart, $lte: todayEnd } }
    }).sort({ taskDate: 1 });

    let emailBody = '';
    
    if (pendingTasks.length === 0 && completedTasks.length === 0) {
      console.log('📭 No tasks to report');
      return;
    }

    // Add completed tasks section
    if (completedTasks.length > 0) {
      emailBody += '✅ COMPLETED TASKS:\n\n';
      completedTasks.forEach(t => {
        emailBody += `• ${t.description} (${t.category})\n`;
      });
      emailBody += '\n';
    }

    // Add pending tasks section
    if (pendingTasks.length > 0) {
      emailBody += '⏳ PENDING TASKS:\n\n';
      pendingTasks.forEach(t => {
        emailBody += `• ${t.description} (${t.category})\n`;
      });
      emailBody += '\n';
    }

    const mailOptions = {
      from: `"Advance Todo" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: `${time === 'morning' ? '🌅 Morning' : '🌙 Evening'} Task Reminder`,
      text: `
Hi there,

${emailBody}
Complete them in Advance Todo:
${process.env.CLIENT_URL || 'http://localhost:3000'}

Stay productive!
      `.trim(),
    };

    await transporter.sendMail(mailOptions);
    console.log(`📨 ${time} email sent successfully`);
  } catch (err) {
    console.error('❌ Email send error:', err.message);
  }
};

// === CRON SCHEDULES (Indian Time) ===
// Only run cron jobs if not on Vercel (Vercel doesn't support long-running processes)
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true';

if (!isVercel) {
  // 8:00 AM IST = 2:30 AM UTC
  cron.schedule('30 2 * * *', () => {
    console.log('⏰ Running Morning Email Job (IST 8:00 AM)');
    sendDailyEmails('morning').catch(console.error);
  }, { timezone: 'Asia/Kolkata' });

  // 9:00 PM IST = 3:30 PM UTC
  cron.schedule('30 15 * * *', () => {
    console.log('⏰ Running Evening Email Job (IST 9:00 PM)');
    sendDailyEmails('evening').catch(console.error);
  }, { timezone: 'Asia/Kolkata' });

  console.log('✅ Cron jobs scheduled (Morning: 8:00 AM IST, Evening: 9:00 PM IST)');
} else {
  console.log('⚠️ Running on Vercel - Cron jobs disabled (use Vercel Cron instead)');
}

// === MANUAL EMAIL TRIGGER ENDPOINT (for testing or Vercel Cron) ===
app.post('/api/send-email/:time', async (req, res) => {
  try {
    const { time } = req.params;
    if (time !== 'morning' && time !== 'evening') {
      return res.status(400).json({ error: 'Time must be "morning" or "evening"' });
    }
    await sendDailyEmails(time);
    res.json({ message: `${time} email sent successfully` });
  } catch (err) {
    console.error('Manual email trigger error:', err);
    res.status(500).json({ error: 'Failed to send email' });
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

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const Task = require('./models/Task');
const User = require('./models/User');

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
app.use('/api/auth', require('./routes/auth'));
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
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify((err, success) => {
  if (err) console.error('❌ Email transporter error:', err);
  else console.log('✅ Email transporter ready');
});

// === DAILY EMAIL SENDER ===
const sendDailyEmails = async (time) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️ Email credentials missing. Skipping email send.');
    return;
  }

  try {
    const users = await User.find().select('email name');
    for (const user of users) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(todayStart);
      todayEnd.setHours(23, 59, 59, 999);

      const pendingTasks = await Task.find({
        user: user._id,
        completedDates: { $not: { $elemMatch: { $gte: todayStart, $lte: todayEnd } } },
        $or: [{ taskDate: { $lte: new Date() } }, { isRoutine: true }],
      }).sort({ taskDate: 1 });

      if (pendingTasks.length === 0) continue;

      const taskList = pendingTasks
        .map(t => `• ${t.description} (${t.category})`)
        .join('\n');

      const mailOptions = {
        from: `"Advance Todo" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: `${time === 'morning' ? 'Morning' : 'Evening'} Task Reminder`,
        text: `
Hi ${user.name || 'User'},

Here are your pending tasks for today:

${taskList}

Complete them in Advance Todo:
${process.env.CLIENT_URL || 'http://localhost:3000'}

Stay productive!
        `.trim(),
      };

      await transporter.sendMail(mailOptions);
      console.log(`📨 Email sent to ${user.email} (${time})`);
    }
  } catch (err) {
    console.error('❌ Email send error:', err);
  }
};

// === CRON SCHEDULES (Indian Time) ===
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

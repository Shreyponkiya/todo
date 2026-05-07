const nodemailer = require('nodemailer');
const mongoose = require('mongoose');

// MongoDB Models
const TaskSchema = new mongoose.Schema({
  description: String,
  category: String,
  taskDate: Date,
  isRoutine: Boolean,
  completedDates: [Date],
});

const DailyLogSchema = new mongoose.Schema({
  title: String,
  log: String,
  date: Date,
  timeSpent: {
    hours: Number,
    minutes: Number,
  },
});

const GrowthSchema = new mongoose.Schema({
  line: String,
  source: String,
  date: Date,
});

const NoteSchema = new mongoose.Schema({
  title: String,
  content: String,
  createdAt: Date,
});

const Task = mongoose.models.Task || mongoose.model('Task', TaskSchema);
const DailyLog = mongoose.models.DailyLog || mongoose.model('DailyLog', DailyLogSchema);
const Growth = mongoose.models.Growth || mongoose.model('Growth', GrowthSchema);
const Note = mongoose.models.Note || mongoose.model('Note', NoteSchema);

// Email sending function
async function sendEmail(time) {
  // Connect to MongoDB
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  }

  // Create email transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setHours(23, 59, 59, 999);

  // Fetch data
  const pendingTasks = await Task.find({
    completedDates: { $not: { $elemMatch: { $gte: todayStart, $lte: todayEnd } } },
    $or: [{ taskDate: { $lte: new Date() } }, { isRoutine: true }],
  }).sort({ taskDate: 1 });

  const completedTasks = await Task.find({
    completedDates: { $elemMatch: { $gte: todayStart, $lte: todayEnd } }
  }).sort({ taskDate: 1 });

  const dailyLogs = await DailyLog.find({
    date: { $gte: todayStart, $lte: todayEnd }
  }).sort({ date: -1 });

  const growths = await Growth.find({
    date: { $gte: todayStart, $lte: todayEnd }
  }).sort({ date: -1 });

  const notes = await Note.find().sort({ createdAt: -1 }).limit(10);

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
    .test-badge { background: #FF5722; color: white; padding: 10px 20px; border-radius: 5px; display: inline-block; margin: 10px 0; font-weight: bold; }
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
      <div class="test-badge">🧪 TEST MODE - Every 1 Minute</div>
      <p>${new Date().toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
      <p>🧪 Test Report</p>
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

  if (completedTasks.length === 0 && pendingTasks.length === 0 && dailyLogs.length === 0 && growths.length === 0 && notes.length === 0) {
    emailHTML += `
    <div class="empty">
      <p>📭 No activities recorded for today. Start adding tasks, logs, and notes!</p>
    </div>`;
  }

  emailHTML += `
    <div class="footer">
      <p>🧪 This is a TEST email sent every 1 minute</p>
      <p>🚀 Keep up the great work!</p>
      <p>Generated by Advance Todo App</p>
    </div>
  </div>
</body>
</html>`;

  const mailOptions = {
    from: `"Advance Todo Report [TEST]" <${process.env.EMAIL_USER}>`,
    to: 'shreyponkiya11@gmail.com',
    subject: `🧪 TEST - Progress Report - ${new Date().toLocaleTimeString()}`,
    html: emailHTML,
  };

  await transporter.sendMail(mailOptions);
  return { success: true, message: `Test email sent successfully at ${new Date().toLocaleTimeString()}` };
}

module.exports = async (req, res) => {
  try {
    console.log('🧪 Vercel Cron TEST: Email triggered at', new Date().toLocaleTimeString());
    const result = await sendEmail('test');
    res.status(200).json(result);
  } catch (error) {
    console.error('❌ Test email error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

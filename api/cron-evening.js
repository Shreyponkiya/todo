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

  // Build HTML email with improved template
  let emailHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 20px;
      line-height: 1.6;
    }
    .email-wrapper { 
      max-width: 800px; 
      margin: 0 auto; 
      background-color: #ffffff; 
      border-radius: 16px; 
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .header { 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-align: center; 
      padding: 40px 30px;
    }
    .header h1 { 
      font-size: 32px; 
      font-weight: 700;
      margin-bottom: 10px;
      text-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    .header .date { 
      font-size: 16px; 
      opacity: 0.95;
      font-weight: 500;
    }
    .header .report-type {
      display: inline-block;
      background: rgba(255,255,255,0.2);
      padding: 8px 20px;
      border-radius: 20px;
      margin-top: 15px;
      font-size: 14px;
      font-weight: 600;
      backdrop-filter: blur(10px);
    }
    .content { padding: 40px 30px; }
    .stats-grid { 
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 40px;
    }
    .stat-card { 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 25px;
      border-radius: 12px;
      text-align: center;
      color: white;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    }
    .stat-card h2 { 
      font-size: 42px; 
      font-weight: 700;
      margin-bottom: 8px;
    }
    .stat-card p { 
      font-size: 14px; 
      opacity: 0.95;
      font-weight: 500;
    }
    .section { 
      margin-bottom: 35px;
      background: #f8f9fa;
      padding: 25px;
      border-radius: 12px;
    }
    .section-title { 
      color: #2d3748;
      font-size: 22px; 
      font-weight: 700;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 3px solid #667eea;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .task-list { 
      background: white;
      border-radius: 8px;
      overflow: hidden;
    }
    .task-item { 
      padding: 18px 20px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: background 0.2s;
    }
    .task-item:last-child { border-bottom: none; }
    .task-item:hover { background-color: #f7fafc; }
    .task-info { flex: 1; }
    .task-title { 
      font-size: 16px;
      font-weight: 600;
      color: #2d3748;
      margin-bottom: 5px;
    }
    .task-category { 
      font-size: 13px;
      color: #718096;
      background: #e2e8f0;
      padding: 4px 12px;
      border-radius: 12px;
      display: inline-block;
    }
    .task-status { 
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      white-space: nowrap;
    }
    .status-completed { 
      background: #c6f6d5;
      color: #22543d;
    }
    .status-pending { 
      background: #fed7d7;
      color: #742a2a;
    }
    .log-item {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 15px;
      border-left: 4px solid #667eea;
    }
    .log-title {
      font-size: 18px;
      font-weight: 600;
      color: #2d3748;
      margin-bottom: 10px;
    }
    .log-content {
      color: #4a5568;
      font-size: 14px;
      line-height: 1.6;
      margin-bottom: 10px;
    }
    .time-badge { 
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }
    .growth-item {
      background: white;
      padding: 18px;
      border-radius: 8px;
      margin-bottom: 12px;
      border-left: 4px solid #48bb78;
    }
    .growth-text {
      color: #2d3748;
      font-size: 15px;
      margin-bottom: 8px;
      line-height: 1.5;
    }
    .growth-source {
      color: #718096;
      font-size: 13px;
      font-style: italic;
    }
    .note-item {
      background: white;
      padding: 18px;
      border-radius: 8px;
      margin-bottom: 12px;
      border-left: 4px solid #ed8936;
    }
    .note-title {
      font-size: 16px;
      font-weight: 600;
      color: #2d3748;
      margin-bottom: 8px;
    }
    .note-content {
      color: #4a5568;
      font-size: 14px;
      line-height: 1.5;
    }
    .empty-state { 
      text-align: center; 
      color: #a0aec0;
      padding: 40px 20px;
      font-size: 16px;
      background: white;
      border-radius: 8px;
    }
    .footer { 
      background: #2d3748;
      color: white;
      text-align: center; 
      padding: 30px;
      font-size: 13px;
    }
    .footer p { margin: 5px 0; opacity: 0.9; }
    .footer-highlight {
      color: #667eea;
      font-weight: 600;
    }
    @media only screen and (max-width: 600px) {
      .stats-grid { grid-template-columns: 1fr; }
      .header h1 { font-size: 24px; }
      .stat-card h2 { font-size: 32px; }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="header">
      <h1>📊 Daily Progress Report</h1>
      <div class="date">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
      <div class="report-type">${time === 'morning' ? '🌅 Morning Report' : time === 'evening' ? '🌙 Evening Report' : '🌃 Night Report'}</div>
    </div>

    <div class="content">
      <div class="stats-grid">
        <div class="stat-card">
          <h2>${completedCount}</h2>
          <p>✅ Completed</p>
        </div>
        <div class="stat-card">
          <h2>${pendingCount}</h2>
          <p>⏳ Pending</p>
        </div>
        <div class="stat-card">
          <h2>${completionRate}%</h2>
          <p>📈 Success Rate</p>
        </div>
      </div>
`;

  if (completedTasks.length > 0) {
    emailHTML += `
      <div class="section">
        <div class="section-title">✅ Completed Tasks (${completedTasks.length})</div>
        <div class="task-list">`;
    completedTasks.forEach(task => {
      emailHTML += `
          <div class="task-item">
            <div class="task-info">
              <div class="task-title">${task.description}</div>
              <span class="task-category">${task.category}</span>
            </div>
            <span class="task-status status-completed">✓ Done</span>
          </div>`;
    });
    emailHTML += `
        </div>
      </div>`;
  }

  if (pendingTasks.length > 0) {
    emailHTML += `
      <div class="section">
        <div class="section-title">⏳ Pending Tasks (${pendingTasks.length})</div>
        <div class="task-list">`;
    pendingTasks.forEach(task => {
      emailHTML += `
          <div class="task-item">
            <div class="task-info">
              <div class="task-title">${task.description}</div>
              <span class="task-category">${task.category}</span>
            </div>
            <span class="task-status status-pending">⏰ Pending</span>
          </div>`;
    });
    emailHTML += `
        </div>
      </div>`;
  }

  if (dailyLogs.length > 0) {
    emailHTML += `
      <div class="section">
        <div class="section-title">📝 Daily Logs (${dailyLogs.length})</div>`;
    dailyLogs.forEach(log => {
      emailHTML += `
        <div class="log-item">
          <div class="log-title">${log.title}</div>
          <div class="log-content">${log.log}</div>
          <span class="time-badge">⏱️ ${log.timeSpent.hours}h ${log.timeSpent.minutes}m</span>
        </div>`;
    });
    emailHTML += `
      </div>`;
  }

  if (growths.length > 0) {
    emailHTML += `
      <div class="section">
        <div class="section-title">🌱 Growth Insights (${growths.length})</div>`;
    growths.forEach(growth => {
      emailHTML += `
        <div class="growth-item">
          <div class="growth-text">${growth.line}</div>
          <div class="growth-source">Source: ${growth.source}</div>
        </div>`;
    });
    emailHTML += `
      </div>`;
  }

  if (notes.length > 0) {
    emailHTML += `
      <div class="section">
        <div class="section-title">📌 Recent Notes (${notes.length})</div>`;
    notes.forEach(note => {
      emailHTML += `
        <div class="note-item">
          <div class="note-title">${note.title}</div>
          <div class="note-content">${note.content.substring(0, 150)}${note.content.length > 150 ? '...' : ''}</div>
        </div>`;
    });
    emailHTML += `
      </div>`;
  }

  if (completedTasks.length === 0 && pendingTasks.length === 0 && dailyLogs.length === 0 && growths.length === 0 && notes.length === 0) {
    emailHTML += `
      <div class="empty-state">
        <p>📭 No activities recorded for today.</p>
        <p>Start adding tasks, logs, and notes to track your progress!</p>
      </div>`;
  }

  emailHTML += `
    </div>
    <div class="footer">
      <p>🚀 <span class="footer-highlight">Keep up the great work!</span></p>
      <p>Generated by Advance Todo App • ${new Date().toLocaleString()}</p>
      <p>Sent to shreyponkiya11@gmail.com</p>
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

  await transporter.sendMail(mailOptions);
  return { success: true, message: `${time} email sent successfully` };
}

module.exports = async (req, res) => {
  try {
    console.log('🔔 Vercel Cron: Evening email triggered at', new Date().toISOString());
    
    // Set timeout to ensure function doesn't hang
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Function timeout after 50 seconds')), 50000)
    );
    
    const result = await Promise.race([
      sendEmail('evening'),
      timeoutPromise
    ]);
    
    console.log('✅ Evening email sent successfully');
    res.status(200).json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('❌ Evening email error:', error.message);
    console.error('Stack:', error.stack);
    
    // Still return 200 to prevent Vercel from retrying
    res.status(200).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

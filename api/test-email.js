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

module.exports = async (req, res) => {
  try {
    console.log('🧪 Test email endpoint called at:', new Date().toISOString());
    
    // Check environment variables
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return res.status(500).json({ 
        success: false, 
        error: 'EMAIL_USER or EMAIL_PASS not configured',
        env: {
          EMAIL_USER: process.env.EMAIL_USER ? 'Set' : 'Not set',
          EMAIL_PASS: process.env.EMAIL_PASS ? 'Set' : 'Not set',
          MONGODB_URI: process.env.MONGODB_URI ? 'Set' : 'Not set'
        }
      });
    }

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

    // Build simple HTML email
    const emailHTML = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
    .container { max-width: 800px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 10px; }
    .header { text-align: center; padding: 20px 0; border-bottom: 3px solid #4CAF50; }
    .test-badge { background: #FF5722; color: white; padding: 10px; border-radius: 5px; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🧪 TEST EMAIL</h1>
      <div class="test-badge">This is a test email from Vercel</div>
      <p>Sent at: ${new Date().toLocaleString()}</p>
    </div>
    <div style="padding: 20px;">
      <h2>Statistics:</h2>
      <p>✅ Completed: ${completedCount}</p>
      <p>⏳ Pending: ${pendingCount}</p>
      <p>📈 Completion Rate: ${completionRate}%</p>
      <hr>
      <p><strong>Environment Check:</strong></p>
      <p>✅ MongoDB Connected</p>
      <p>✅ Email Transporter Ready</p>
      <p>✅ Data Fetched Successfully</p>
    </div>
  </div>
</body>
</html>`;

    const mailOptions = {
      from: `"Advance Todo Test" <${process.env.EMAIL_USER}>`,
      to: 'shreyponkiya11@gmail.com',
      subject: `🧪 TEST - Email System Working - ${new Date().toLocaleTimeString()}`,
      html: emailHTML,
    };

    await transporter.sendMail(mailOptions);
    
    res.status(200).json({ 
      success: true, 
      message: 'Test email sent successfully',
      timestamp: new Date().toISOString(),
      data: {
        completedTasks: completedCount,
        pendingTasks: pendingCount,
        dailyLogs: dailyLogs.length,
        growths: growths.length,
        notes: notes.length
      }
    });
  } catch (error) {
    console.error('❌ Test email error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: error.stack
    });
  }
};

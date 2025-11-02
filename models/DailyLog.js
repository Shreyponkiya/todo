const mongoose = require('mongoose');

const dailyLogSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  title: { type: String, required: true },
  log: { type: String, required: true },
  // --- CHANGED BLOCK ---
  timeSpent: {
    hours: { type: Number, required: true, default: 0, min: 0 },
    minutes: { type: Number, required: true, default: 0, min: 0, max: 59 }
  },
  // --- END CHANGED BLOCK ---
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('DailyLog', dailyLogSchema);
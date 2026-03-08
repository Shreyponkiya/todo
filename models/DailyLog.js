const mongoose = require('mongoose');

const dailyLogSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  title: { type: String, required: true },
  log: { type: String, required: true },
  timeSpent: {
    hours: { type: Number, required: true, default: 0, min: 0 },
    minutes: { type: Number, required: true, default: 0, min: 0, max: 59 }
  }
}, { timestamps: true });

module.exports = mongoose.model('DailyLog', dailyLogSchema);

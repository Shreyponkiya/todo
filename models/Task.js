const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String, required: true },
  taskDate: { type: Date, required: true },
  estimatedDays: { type: Number, default: 0 },
  estimatedMonths: { type: Number, default: 0 },
  estimatedTime: { type: String },
  category: { type: String, required: true },
  isRoutine: { type: Boolean, default: false },
  completedDates: [{ type: Date }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Task', taskSchema);
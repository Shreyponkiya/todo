const mongoose = require('mongoose');

const growthSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  line: { type: String, required: true }, // new growth line
  source: { type: String, required: true }, // where to find
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Growth', growthSchema);
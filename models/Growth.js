const mongoose = require('mongoose');

const growthSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  line: { type: String, required: true },
  source: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Growth', growthSchema);
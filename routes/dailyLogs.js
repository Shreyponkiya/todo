const express = require('express');
const DailyLog = require('../models/DailyLog');
const {protect} = require('../middleware/auth');
const router = express.Router();

router.use(protect);

// Get all logs (with date filter)
router.get('/', async (req, res) => {
  try {
    const query = { user: req.userId };
    if (req.query.date) query.date = { $eq: new Date(req.query.date) };
    const logs = await DailyLog.find(query).sort({ date: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single log by ID
router.get('/:id', async (req, res) => {
  try {
    const log = await DailyLog.findOne({ _id: req.params.id, user: req.userId });
    if (!log) return res.status(404).json({ error: 'Log not found' });
    res.json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add log
router.post('/', async (req, res) => {
  try {
    const log = new DailyLog({ ...req.body, user: req.userId });
    await log.save();
    res.status(201).json({ message: 'Log created', log });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update log
router.put('/:id', async (req, res) => {
  try {
    const log = await DailyLog.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      req.body,
      { new: true }
    );
    if (!log) return res.status(404).json({ error: 'Log not found' });
    res.json({ message: 'Log updated', log });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete log
router.delete('/:id', async (req, res) => {
  try {
    const log = await DailyLog.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!log) return res.status(404).json({ error: 'Log not found' });
    res.json({ message: 'Log deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
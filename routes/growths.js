const express = require('express');
const Growth = require('../models/Growth');
const {protect} = require('../middleware/auth');
const router = express.Router();

router.use(protect);

// Get all growths
router.get('/', async (req, res) => {
  try {
    const query = { user: req.userId };
    if (req.query.date) query.date = { $eq: new Date(req.query.date) };
    const growths = await Growth.find(query).sort({ date: -1 });
    res.json(growths);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add growth
router.post('/', async (req, res) => {
  try {
    const growth = new Growth({ ...req.body, user: req.userId });
    await growth.save();
    res.status(201).json(growth);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update growth
router.put('/:id', async (req, res) => {
  try {
    const growth = await Growth.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      req.body,
      { new: true }
    );
    if (!growth) return res.status(404).json({ error: 'Growth not found' });
    res.json(growth);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete growth
router.delete('/:id', async (req, res) => {
  try {
    const growth = await Growth.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!growth) return res.status(404).json({ error: 'Growth not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
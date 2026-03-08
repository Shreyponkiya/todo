const express = require('express');
const Note = require('../models/Note');
const router = express.Router();

// Get all notes
router.get('/', async (req, res) => {
  const notes = await Note.find({}).sort({ createdAt: -1 });
  res.json(notes);
});

// Add note
router.post('/', async (req, res) => {
  const note = new Note(req.body);
  await note.save();
  res.json(note);
});

// Update note
router.put('/:id', async (req, res) => {
  const note = await Note.findOneAndUpdate({ _id: req.params.id }, req.body, { new: true });
  res.json(note);
});

// Delete note
router.delete('/:id', async (req, res) => {
  await Note.findOneAndDelete({ _id: req.params.id });
  res.json({ message: 'Deleted' });
});

module.exports = router;
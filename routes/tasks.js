// Updated routes/tasks.js - Reorder routes to put specific paths before parametric /:id
const express = require('express');
const router = express.Router();
const {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  tickTask,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/taskController');

// Task routes
router.get('/', getTasks);
router.post('/', createTask);

// Category routes - Specific paths before /:id
router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

// Catch-all parametric routes last
router.get('/:id', getTaskById);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);
router.patch('/:id/tick', tickTask);

module.exports = router;
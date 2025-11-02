// Updated routes/tasks.js - Reorder routes to put specific paths before parametric /:id
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
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

console.log('Loaded controllers:', {
  getTasks: typeof getTasks,
  getTaskById: typeof getTaskById,
  createTask: typeof createTask,
  updateTask: typeof updateTask,
  deleteTask: typeof deleteTask,
  tickTask: typeof tickTask,
  protect: typeof protect,
  getCategories: typeof getCategories,
  createCategory: typeof createCategory,
  updateCategory: typeof updateCategory,
  deleteCategory: typeof deleteCategory
});

// Task routes
router.get('/', protect, getTasks);
router.post('/', protect, createTask);

// Category routes - Specific paths before /:id
router.get('/categories', protect, getCategories);
router.post('/categories', protect, createCategory);
router.put('/categories/:id', protect, updateCategory);
router.delete('/categories/:id', protect, deleteCategory);

// Catch-all parametric routes last
router.get('/:id', protect, getTaskById);
router.put('/:id', protect, updateTask);
router.delete('/:id', protect, deleteTask);
router.patch('/:id/tick', protect, tickTask);

module.exports = router;
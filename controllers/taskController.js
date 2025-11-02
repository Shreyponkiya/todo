const Task = require('../models/Task');
const Category = require('../models/Category');
// GET all tasks (with optional date filter)
const getTasks = async (req, res) => {
  try {
    const { date } = req.query;
    const query = { user: req.userId };

    if (date) {
      const selected = new Date(date);
      const start = new Date(selected.setHours(0, 0, 0, 0));
      const end = new Date(selected.setHours(23, 59, 59, 999));

      query.$or = [
        { taskDate: { $gte: start, $lte: end } },
        { isRoutine: true }
      ];
    }

    const tasks = await Task.find(query).sort({ taskDate: 1 });
    res.json(tasks);
  } catch (err) {
    console.error('getTasks error:', err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};
// const getCategories = async (req, res) => {
//   try {
//     // For now, hardcoded dynamic categories; replace with DB query if needed
//     const categories = [
//       'Work',
//       'Personal',
//       'Health',
//       'Fitness',
//       'Learning',
//       'Chores',
//       'Finance',
//       'Social'
//     ];
//     res.json(categories);
//   } catch (err) {
//     console.error('getCategories error:', err);
//     res.status(500).json({ error: 'Failed to fetch categories' });
//   }
// };
// GET single task by ID
const getTaskById = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.userId });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (err) {
    console.error('getTaskById error:', err);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
};

// CREATE new task
const createTask = async (req, res) => {
  try {
    const {
      description,
      taskDate,
      estimatedDays = 0,
      estimatedMonths = 0,
      estimatedTime = '',
      category,
      isRoutine = false
    } = req.body;

    if (!description || !taskDate || !category) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const task = new Task({
      user: req.userId,
      description,
      taskDate,
      estimatedDays,
      estimatedMonths,
      estimatedTime,
      category,
      isRoutine,
      completedDates: []
    });

    await task.save();
    res.status(201).json({ message: 'Task created', task });
  } catch (err) {
    console.error('createTask error:', err);
    res.status(400).json({ error: err.message || 'Failed to create task' });
  }
};

// UPDATE task
// UPDATE task
const updateTask = async (req, res) => {  // ← Ensure 'const' and exact name
  try {
    const updates = req.body;
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      updates,
      { new: true, runValidators: true }
    );

    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json({ message: 'Task updated', task });
  } catch (err) {
    console.error('updateTask error:', err);
    res.status(400).json({ error: err.message || 'Failed to update task' });
  }
};

// DELETE task
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error('deleteTask error:', err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
};

// TICK task for today
const tickTask = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const task = await Task.findOne({ _id: req.params.id, user: req.userId });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const todayStr = today.toISOString().split('T')[0];
    const alreadyTicked = task.completedDates.some(
      d => d.toISOString().split('T')[0] === todayStr
    );

    if (!alreadyTicked) {
      task.completedDates.push(today);
      await task.save();
    }

    res.json({ message: 'Ticked for today', task });
  } catch (err) {
    console.error('tickTask error:', err);
    res.status(500).json({ error: 'Failed to tick task' });
  }
};

const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ user: req.userId }).sort({ name: 1 });
    res.json(categories); // Return full [{ _id, name, ... }]
  } catch (err) {
    console.error('getCategories error:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};  

// CREATE new category
const createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    const existing = await Category.findOne({ name, user: req.userId });
    if (existing) {
      return res.status(400).json({ error: 'Category already exists' });
    }
    const category = new Category({
      name,
      user: req.userId
    });
    await category.save();
    res.status(201).json({ message: 'Category created', name: category.name });
  } catch (err) {
    console.error('createCategory error:', err);
    res.status(400).json({ error: err.message || 'Failed to create category' });
  }
};

// UPDATE category
const updateCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const category = await Category.findOne({ _id: req.params.id, user: req.userId });
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    if (!name) {
      return res.status(400).json({ error: 'New name is required' });
    }
    const existing = await Category.findOne({ name, user: req.userId, _id: { $ne: req.params.id } });
    if (existing) {
      return res.status(400).json({ error: 'Category name already exists' });
    }
    category.name = name;
    await category.save();
    res.json({ message: 'Category updated', name: category.name });
  } catch (err) {
    console.error('updateCategory error:', err);
    res.status(400).json({ error: err.message || 'Failed to update category' });
  }
};

// DELETE category
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json({ message: 'Category deleted' });
  } catch (err) {
    console.error('deleteCategory error:', err);
    res.status(500).json({ error: 'Failed to delete category' });
  }
};

// Export ALL functions
module.exports = {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  tickTask,
  getCategories,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
};
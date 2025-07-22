const express = require('express');
const { body } = require('express-validator');
const { auth, authorize } = require('../config/auth');
const {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse
} = require('../controllers/courseController');

const router = express.Router();

const courseValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('duration').trim().notEmpty().withMessage('Duration is required'),
  body('price').isNumeric().withMessage('Price must be a number'),
  body('category').isIn(['Programming', 'Data Science', 'Design', 'Business', 'Language', 'Other']).withMessage('Invalid category'),
  body('level').isIn(['beginner', 'intermediate', 'advanced']).withMessage('Invalid level')
];

router.get('/', getAllCourses);
router.get('/instructor', auth, authorize('instructor', 'admin'), require('../controllers/courseController').getInstructorCourses);
router.get('/:id', getCourseById);
router.post('/', auth, authorize('instructor', 'admin'), courseValidation, createCourse);
router.put('/:id', auth, authorize('instructor', 'admin'), courseValidation, updateCourse);
router.delete('/:id', auth, authorize('instructor', 'admin'), deleteCourse);

module.exports = router;
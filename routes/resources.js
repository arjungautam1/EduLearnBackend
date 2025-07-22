const express = require('express');
const { body } = require('express-validator');
const { auth, authorize } = require('../config/auth');
const {
  getCourseResources,
  createResource,
  updateResource,
  deleteResource
} = require('../controllers/resourceController');

const router = express.Router();

const resourceValidation = [
  body('courseId').notEmpty().withMessage('Course ID is required'),
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('type').isIn(['video', 'pdf', 'article', 'quiz', 'assignment']).withMessage('Invalid resource type'),
  body('url').isURL().withMessage('Valid URL is required'),
  body('order').optional().isInt({ min: 1 }).withMessage('Order must be a positive integer')
];

router.get('/course/:courseId', getCourseResources);
router.post('/', auth, authorize('instructor', 'admin'), resourceValidation, createResource);
router.put('/:id', auth, authorize('instructor', 'admin'), resourceValidation, updateResource);
router.delete('/:id', auth, authorize('instructor', 'admin'), deleteResource);

module.exports = router;
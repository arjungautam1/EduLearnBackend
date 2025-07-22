const express = require('express');
const { body } = require('express-validator');
const { auth } = require('../config/auth');
const {
  enrollInCourse,
  updateProgress,
  getUserEnrollments,
  getEnrollmentById,
  getEnrollmentStatus,
  markLessonComplete,
  updateCourseProgress
} = require('../controllers/enrollmentController');

const router = express.Router();

const enrollmentValidation = [
  body('courseId').notEmpty().withMessage('Course ID is required')
];

const progressValidation = [
  body('progress').isInt({ min: 0, max: 100 }).withMessage('Progress must be between 0 and 100'),
  body('resourceId').optional().notEmpty().withMessage('Resource ID must be provided if specified')
];

router.post('/', auth, enrollmentValidation, enrollInCourse);
router.put('/:id/progress', auth, progressValidation, updateProgress);
router.put('/course/:courseId/lesson', auth, markLessonComplete);
router.put('/course/:courseId/progress', auth, updateCourseProgress);
router.get('/user', auth, getUserEnrollments);
router.get('/course/:courseId', auth, getEnrollmentStatus);
router.get('/:id', auth, getEnrollmentById);

module.exports = router;
const express = require('express');
const { auth, authorize } = require('../config/auth');
const {
  getInstructorAnalytics,
  getCourseAnalytics,
  getAdminAnalytics
} = require('../controllers/analyticsController');

const router = express.Router();

// Instructor analytics
router.get('/instructor', auth, authorize('instructor', 'admin'), getInstructorAnalytics);

// Specific course analytics
router.get('/course/:courseId', auth, authorize('instructor', 'admin'), getCourseAnalytics);

// Admin analytics
router.get('/admin', auth, authorize('admin'), getAdminAnalytics);

module.exports = router;
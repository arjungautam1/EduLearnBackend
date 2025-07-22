const express = require('express');
const { body } = require('express-validator');
const { auth } = require('../config/auth');
const {
  addRating,
  getCourseRatings,
  getUserRating,
  deleteRating
} = require('../controllers/ratingController');

const router = express.Router();

const ratingValidation = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('review').optional().isLength({ max: 1000 }).withMessage('Review must be less than 1000 characters')
];

// Add or update rating for a course
router.post('/course/:courseId', auth, ratingValidation, addRating);

// Get all ratings for a course
router.get('/course/:courseId', getCourseRatings);

// Get user's rating for a course
router.get('/course/:courseId/user', auth, getUserRating);

// Delete user's rating for a course
router.delete('/course/:courseId', auth, deleteRating);

module.exports = router;
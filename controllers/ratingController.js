const Rating = require('../models/Rating');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const mongoose = require('mongoose');

const addRating = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { rating, review } = req.body;
    const userId = req.user._id;

    // Check if user is enrolled in the course
    const enrollment = await Enrollment.findOne({ userId, courseId });
    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'You must be enrolled in this course to rate it'
      });
    }

    // Check if user has already rated this course
    const existingRating = await Rating.findOne({ userId, courseId });
    if (existingRating) {
      // Update existing rating
      existingRating.rating = rating;
      existingRating.review = review;
      await existingRating.save();
      
      // Recalculate course rating
      await updateCourseRating(courseId);
      
      return res.json({
        success: true,
        data: existingRating,
        message: 'Rating updated successfully'
      });
    }

    // Create new rating
    const newRating = new Rating({
      userId,
      courseId,
      rating,
      review,
      isVerified: enrollment.completionStatus === 'completed'
    });

    await newRating.save();
    
    // Recalculate course rating
    await updateCourseRating(courseId);

    await newRating.populate('userId', 'name');

    res.status(201).json({
      success: true,
      data: newRating,
      message: 'Rating added successfully'
    });
  } catch (error) {
    console.error('Error adding rating:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add rating'
    });
  }
};

const getCourseRatings = async (req, res) => {
  try {
    const { courseId } = req.params;
    console.log('Getting ratings for courseId:', courseId);
    
    // Validate courseId
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid course ID'
      });
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const ratings = await Rating.find({ courseId })
      .populate('userId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    console.log('Found ratings:', ratings.length);
    const total = await Rating.countDocuments({ courseId });

    // Get rating statistics - simplified version
    let stats = { averageRating: 0, totalRatings: 0, fiveStars: 0, fourStars: 0, threeStars: 0, twoStars: 0, oneStar: 0 };
    
    if (total > 0) {
      console.log('Calculating stats for courseId:', courseId);
      const aggregateResult = await Rating.aggregate([
        { $match: { courseId: new mongoose.Types.ObjectId(courseId) } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalRatings: { $sum: 1 },
          fiveStars: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
          fourStars: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
          threeStars: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
          twoStars: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
          oneStar: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } }
        }
      }
    ]);
      
      console.log('Aggregate result:', aggregateResult);
      stats = aggregateResult[0] || stats;
    }

    console.log('Final stats:', stats);

    res.json({
      success: true,
      data: {
        ratings,
        stats,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching course ratings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ratings'
    });
  }
};

const getUserRating = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id;

    const rating = await Rating.findOne({ userId, courseId })
      .populate('userId', 'name');

    res.json({
      success: true,
      data: rating
    });
  } catch (error) {
    console.error('Error fetching user rating:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch rating'
    });
  }
};

const deleteRating = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id;

    const rating = await Rating.findOneAndDelete({ userId, courseId });
    if (!rating) {
      return res.status(404).json({
        success: false,
        message: 'Rating not found'
      });
    }

    // Recalculate course rating
    await updateCourseRating(courseId);

    res.json({
      success: true,
      message: 'Rating deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting rating:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete rating'
    });
  }
};

// Helper function to update course rating
const updateCourseRating = async (courseId) => {
  try {
    const stats = await Rating.aggregate([
      { $match: { courseId: new mongoose.Types.ObjectId(courseId) } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalRatings: { $sum: 1 }
        }
      }
    ]);

    const course = await Course.findById(courseId);
    if (course) {
      if (stats.length > 0) {
        course.rating = Math.round(stats[0].averageRating * 10) / 10; // Round to 1 decimal
        course.totalRatings = stats[0].totalRatings;
      } else {
        course.rating = 0;
        course.totalRatings = 0;
      }
      await course.save();
    }
  } catch (error) {
    console.error('Error updating course rating:', error);
  }
};

module.exports = {
  addRating,
  getCourseRatings,
  getUserRating,
  deleteRating
};
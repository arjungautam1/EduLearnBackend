const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Rating = require('../models/Rating');
const User = require('../models/User');
const mongoose = require('mongoose');

const getInstructorAnalytics = async (req, res) => {
  try {
    const instructorId = req.user._id;

    // Get instructor's courses
    const courses = await Course.find({ instructor: instructorId });
    const courseIds = courses.map(c => c._id);

    // Basic statistics
    const totalCourses = courses.length;
    const totalStudentsEnrolled = await Enrollment.countDocuments({ 
      courseId: { $in: courseIds } 
    });
    const totalRevenue = courses.reduce((sum, course) => {
      return sum + (course.price * course.studentsEnrolled);
    }, 0);

    // Enrollment statistics by month (last 12 months)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const enrollmentsByMonth = await Enrollment.aggregate([
      {
        $match: {
          courseId: { $in: courseIds },
          enrollmentDate: { $gte: oneYearAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$enrollmentDate' },
            month: { $month: '$enrollmentDate' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Course completion rates
    const completionStats = await Enrollment.aggregate([
      {
        $match: { courseId: { $in: courseIds } }
      },
      {
        $group: {
          _id: '$courseId',
          totalEnrollments: { $sum: 1 },
          completedEnrollments: {
            $sum: { $cond: [{ $eq: ['$completionStatus', 'completed'] }, 1, 0] }
          },
          averageProgress: { $avg: '$progress' }
        }
      },
      {
        $lookup: {
          from: 'courses',
          localField: '_id',
          foreignField: '_id',
          as: 'course'
        }
      },
      {
        $unwind: '$course'
      },
      {
        $project: {
          courseTitle: '$course.title',
          totalEnrollments: 1,
          completedEnrollments: 1,
          completionRate: {
            $multiply: [
              { $divide: ['$completedEnrollments', '$totalEnrollments'] },
              100
            ]
          },
          averageProgress: { $round: ['$averageProgress', 2] }
        }
      }
    ]);

    // Rating statistics
    const ratingStats = await Rating.aggregate([
      {
        $match: { courseId: { $in: courseIds } }
      },
      {
        $group: {
          _id: '$courseId',
          averageRating: { $avg: '$rating' },
          totalRatings: { $sum: 1 },
          ratingDistribution: {
            $push: '$rating'
          }
        }
      },
      {
        $lookup: {
          from: 'courses',
          localField: '_id',
          foreignField: '_id',
          as: 'course'
        }
      },
      {
        $unwind: '$course'
      },
      {
        $project: {
          courseTitle: '$course.title',
          averageRating: { $round: ['$averageRating', 1] },
          totalRatings: 1,
          ratingDistribution: 1
        }
      }
    ]);

    // Revenue by course
    const revenueByCategory = courses.reduce((acc, course) => {
      const category = course.category;
      if (!acc[category]) {
        acc[category] = 0;
      }
      acc[category] += course.price * course.studentsEnrolled;
      return acc;
    }, {});

    // Top performing courses
    const topCourses = courses
      .sort((a, b) => b.studentsEnrolled - a.studentsEnrolled)
      .slice(0, 5)
      .map(course => ({
        id: course._id,
        title: course.title,
        studentsEnrolled: course.studentsEnrolled,
        rating: course.rating,
        revenue: course.price * course.studentsEnrolled
      }));

    res.json({
      success: true,
      data: {
        overview: {
          totalCourses,
          totalStudentsEnrolled,
          totalRevenue,
          averageRating: courses.reduce((sum, c) => sum + c.rating, 0) / courses.length || 0
        },
        enrollmentsByMonth,
        completionStats,
        ratingStats,
        revenueByCategory,
        topCourses
      }
    });
  } catch (error) {
    console.error('Error fetching instructor analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics'
    });
  }
};

const getCourseAnalytics = async (req, res) => {
  try {
    const { courseId } = req.params;
    const instructorId = req.user._id;

    // Verify instructor owns the course
    const course = await Course.findOne({ _id: courseId, instructor: instructorId });
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found or access denied'
      });
    }

    // Enrollment analytics
    const enrollmentStats = await Enrollment.aggregate([
      { $match: { courseId: mongoose.Types.ObjectId(courseId) } },
      {
        $group: {
          _id: null,
          totalEnrollments: { $sum: 1 },
          completedCount: {
            $sum: { $cond: [{ $eq: ['$completionStatus', 'completed'] }, 1, 0] }
          },
          inProgressCount: {
            $sum: { $cond: [{ $eq: ['$completionStatus', 'in_progress'] }, 1, 0] }
          },
          notStartedCount: {
            $sum: { $cond: [{ $eq: ['$completionStatus', 'not_started'] }, 1, 0] }
          },
          averageProgress: { $avg: '$progress' }
        }
      }
    ]);

    // Enrollment over time (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const enrollmentTrend = await Enrollment.aggregate([
      {
        $match: {
          courseId: mongoose.Types.ObjectId(courseId),
          enrollmentDate: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$enrollmentDate' },
            month: { $month: '$enrollmentDate' },
            day: { $dayOfMonth: '$enrollmentDate' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    // Student demographics
    const studentDemographics = await Enrollment.aggregate([
      { $match: { courseId: mongoose.Types.ObjectId(courseId) } },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $group: {
          _id: null,
          students: { $push: '$user' }
        }
      }
    ]);

    // Rating breakdown
    const ratings = await Rating.find({ courseId }).populate('userId', 'name');

    res.json({
      success: true,
      data: {
        course: {
          id: course._id,
          title: course.title,
          category: course.category,
          price: course.price,
          rating: course.rating,
          totalRatings: course.totalRatings
        },
        enrollmentStats: enrollmentStats[0] || {
          totalEnrollments: 0,
          completedCount: 0,
          inProgressCount: 0,
          notStartedCount: 0,
          averageProgress: 0
        },
        enrollmentTrend,
        ratings,
        revenue: course.price * course.studentsEnrolled
      }
    });
  } catch (error) {
    console.error('Error fetching course analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch course analytics'
    });
  }
};

const getAdminAnalytics = async (req, res) => {
  try {
    // Platform overview
    const totalUsers = await User.countDocuments();
    const totalCourses = await Course.countDocuments();
    const totalEnrollments = await Enrollment.countDocuments();
    const totalRevenue = await Course.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: { $multiply: ['$price', '$studentsEnrolled'] } }
        }
      }
    ]);

    // User growth (last 12 months)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const userGrowth = await User.aggregate([
      {
        $match: { createdAt: { $gte: oneYearAgo } }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Category distribution
    const categoryStats = await Course.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalStudents: { $sum: '$studentsEnrolled' },
          averageRating: { $avg: '$rating' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalCourses,
          totalEnrollments,
          totalRevenue: totalRevenue[0]?.total || 0
        },
        userGrowth,
        categoryStats
      }
    });
  } catch (error) {
    console.error('Error fetching admin analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin analytics'
    });
  }
};

module.exports = {
  getInstructorAnalytics,
  getCourseAnalytics,
  getAdminAnalytics
};
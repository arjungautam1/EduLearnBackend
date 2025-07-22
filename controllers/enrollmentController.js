const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const User = require('../models/User');
const crypto = require('crypto');

const enrollInCourse = async (req, res) => {
  try {
    const { courseId } = req.body;
    const userId = req.user._id;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    const existingEnrollment = await Enrollment.findOne({ userId, courseId });
    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: 'Already enrolled in this course'
      });
    }

    const enrollmentData = {
      enrollmentId: crypto.randomUUID(),
      userId,
      courseId,
      enrollmentDate: new Date()
    };

    const enrollment = new Enrollment(enrollmentData);
    await enrollment.save();

    await User.findByIdAndUpdate(userId, {
      $push: {
        enrolledCourses: {
          courseId,
          enrollmentDate: new Date()
        }
      }
    });

    await enrollment.populate([
      { path: 'userId', select: 'name email' },
      { path: 'courseId', select: 'title description thumbnailUrl price' }
    ]);

    res.status(201).json({
      success: true,
      data: enrollment,
      message: 'Successfully enrolled in course'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const updateProgress = async (req, res) => {
  try {
    const { progress, resourceId } = req.body;
    const enrollmentId = req.params.id;

    const enrollment = await Enrollment.findById(enrollmentId);
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    if (enrollment.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this enrollment'
      });
    }

    const updateData = {
      progress: Math.min(Math.max(progress, 0), 100),
      lastAccessed: new Date()
    };

    if (progress >= 100) {
      updateData.completionStatus = 'completed';
    } else if (progress > 0) {
      updateData.completionStatus = 'in_progress';
    }

    if (resourceId) {
      const existingResource = enrollment.completedResources.find(
        r => r.resourceId.toString() === resourceId
      );

      if (!existingResource) {
        enrollment.completedResources.push({
          resourceId,
          completedAt: new Date()
        });
      }
    }

    const updatedEnrollment = await Enrollment.findByIdAndUpdate(
      enrollmentId,
      updateData,
      { new: true }
    ).populate([
      { path: 'userId', select: 'name email' },
      { path: 'courseId', select: 'title description' }
    ]);

    if (resourceId) {
      await updatedEnrollment.save();
    }

    res.json({
      success: true,
      data: updatedEnrollment,
      message: 'Progress updated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const getUserEnrollments = async (req, res) => {
  try {
    const userId = req.user._id;

    const enrollments = await Enrollment.find({ userId })
      .populate({
        path: 'courseId',
        select: 'title description thumbnailUrl price category level duration instructor',
        populate: {
          path: 'instructor',
          select: 'name'
        }
      })
      .sort({ enrollmentDate: -1 });

    res.json({
      success: true,
      data: enrollments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getEnrollmentById = async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id)
      .populate([
        { path: 'userId', select: 'name email' },
        { 
          path: 'courseId', 
          select: 'title description thumbnailUrl instructor',
          populate: {
            path: 'instructor',
            select: 'name email'
          }
        },
        {
          path: 'completedResources.resourceId',
          select: 'title type duration'
        }
      ]);

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    if (enrollment.userId._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: enrollment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getEnrollmentStatus = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id;

    const enrollment = await Enrollment.findOne({ userId, courseId })
      .populate([
        { path: 'userId', select: 'name email' },
        { 
          path: 'courseId', 
          select: 'title description thumbnailUrl instructor',
          populate: {
            path: 'instructor',
            select: 'name email'
          }
        }
      ]);

    if (!enrollment) {
      // For instructors/admins, return success with no data instead of error
      if (req.user.role === 'instructor' || req.user.role === 'admin') {
        return res.json({
          success: true,
          data: null,
          message: 'Instructor/Admin access - no enrollment required'
        });
      }
      
      return res.status(404).json({
        success: false,
        message: 'Not enrolled in this course'
      });
    }

    res.json({
      success: true,
      data: enrollment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const markLessonComplete = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { lessonId } = req.body;
    const userId = req.user._id;

    const enrollment = await Enrollment.findOne({ userId, courseId });
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Check if lesson is already completed
    const existingLesson = enrollment.completedResources.find(
      r => r.resourceId.toString() === lessonId
    );

    if (!existingLesson) {
      enrollment.completedResources.push({
        resourceId: lessonId,
        completedAt: new Date()
      });
      
      enrollment.lastAccessed = new Date();
      await enrollment.save();
    }

    res.json({
      success: true,
      data: enrollment,
      message: 'Lesson marked as complete'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const updateCourseProgress = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { progress } = req.body;
    const userId = req.user._id;

    const enrollment = await Enrollment.findOne({ userId, courseId });
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    enrollment.progress = Math.min(Math.max(progress, 0), 100);
    enrollment.lastAccessed = new Date();
    
    if (progress >= 100) {
      enrollment.completionStatus = 'completed';
    } else if (progress > 0) {
      enrollment.completionStatus = 'in_progress';
    }

    await enrollment.save();

    res.json({
      success: true,
      data: enrollment,
      message: 'Progress updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  enrollInCourse,
  updateProgress,
  getUserEnrollments,
  getEnrollmentById,
  getEnrollmentStatus,
  markLessonComplete,
  updateCourseProgress
};
const Course = require('../models/Course');
const crypto = require('crypto');
const mongoose = require('mongoose');

const getAllCourses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const search = req.query.search;
    const category = req.query.category;
    const level = req.query.level;
    const minPrice = req.query.minPrice;
    const maxPrice = req.query.maxPrice;

    let query = { isActive: true };

    if (search) {
      query.$text = { $search: search };
    }

    if (category) {
      query.category = category;
    }

    if (level) {
      query.level = level;
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    const courses = await Course.find(query)
      .populate('instructor', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Course.countDocuments(query);

    res.json({
      success: true,
      data: courses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('instructor', 'name email avatar');

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    res.json({
      success: true,
      data: course
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const createCourse = async (req, res) => {
  try {
    const courseData = {
      ...req.body,
      courseId: crypto.randomUUID(),
      instructor: req.user._id,
      objectives: req.body.objectives || [],
      requirements: req.body.requirements || [],
      modules: req.body.modules || []
    };

    const course = new Course(courseData);
    await course.save();

    await course.populate('instructor', 'name email');

    res.status(201).json({
      success: true,
      data: course,
      message: 'Course created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const updateCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this course'
      });
    }

    const updateData = {
      ...req.body,
      objectives: req.body.objectives || course.objectives,
      requirements: req.body.requirements || course.requirements,
      modules: req.body.modules || course.modules
    };

    const updatedCourse = await Course.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('instructor', 'name email');

    res.json({
      success: true,
      data: updatedCourse,
      message: 'Course updated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this course'
      });
    }

    await Course.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all courses for the logged-in instructor
const getInstructorCourses = async (req, res) => {
  try {
    console.log('=== INSTRUCTOR COURSES DEBUG ===');
    console.log('User:', req.user);
    console.log('User ID:', req.user._id);
    console.log('User Role:', req.user.role);
    
    let query = {};
    
    // Instructors can only see their own courses, admins can see all
    if (req.user.role === 'instructor') {
      query.instructor = req.user._id;
      console.log('Query for instructor:', query);
    }
    console.log('Final query:', query);
    
    const courses = await Course.find(query)
      .populate('instructor', 'name email')
      .sort({ createdAt: -1 });
      
    console.log('Found courses:', courses.length);
    console.log('Courses:', courses.map(c => ({ 
      id: c._id, 
      title: c.title, 
      instructor: c.instructor 
    })));
    console.log('=== END DEBUG ===');
      
    res.json({
      success: true,
      data: courses
    });
  } catch (error) {
    console.error('Error in getInstructorCourses:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  getInstructorCourses
};
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const User = require('../models/User');
const crypto = require('crypto');

const generateCertificate = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id;

    // Find the enrollment
    const enrollment = await Enrollment.findOne({ userId, courseId })
      .populate([
        { path: 'userId', select: 'name email' },
        { 
          path: 'courseId', 
          select: 'title instructor',
          populate: {
            path: 'instructor',
            select: 'name'
          }
        }
      ]);

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Check if course is completed
    if (enrollment.progress < 100 || enrollment.completionStatus !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Course must be completed to generate certificate'
      });
    }

    // Generate certificate if not already generated
    if (!enrollment.certificate.issued) {
      const certificateId = crypto.randomUUID();
      
      enrollment.certificate = {
        issued: true,
        issuedAt: new Date(),
        certificateId: certificateId,
        certificateUrl: `/certificates/${certificateId}.png`
      };
      
      await enrollment.save();
    }

    res.json({
      success: true,
      data: {
        certificateId: enrollment.certificate.certificateId,
        certificateUrl: enrollment.certificate.certificateUrl,
        issuedAt: enrollment.certificate.issuedAt,
        studentName: enrollment.userId.name,
        courseName: enrollment.courseId.title,
        instructorName: enrollment.courseId.instructor.name,
        completionDate: enrollment.certificate.issuedAt
      }
    });
  } catch (error) {
    console.error('Error generating certificate:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate certificate'
    });
  }
};

const getCertificate = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id;

    const enrollment = await Enrollment.findOne({ userId, courseId })
      .populate([
        { path: 'userId', select: 'name email' },
        { 
          path: 'courseId', 
          select: 'title instructor',
          populate: {
            path: 'instructor',
            select: 'name'
          }
        }
      ]);

    if (!enrollment || !enrollment.certificate.issued) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }

    res.json({
      success: true,
      data: {
        certificateId: enrollment.certificate.certificateId,
        certificateUrl: enrollment.certificate.certificateUrl,
        issuedAt: enrollment.certificate.issuedAt,
        studentName: enrollment.userId.name,
        courseName: enrollment.courseId.title,
        instructorName: enrollment.courseId.instructor.name,
        completionDate: enrollment.certificate.issuedAt
      }
    });
  } catch (error) {
    console.error('Error fetching certificate:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch certificate'
    });
  }
};

const getUserCertificates = async (req, res) => {
  try {
    const userId = req.user._id;

    const enrollments = await Enrollment.find({ 
      userId, 
      'certificate.issued': true 
    }).populate([
      { 
        path: 'courseId', 
        select: 'title category instructor',
        populate: {
          path: 'instructor',
          select: 'name'
        }
      }
    ]).sort({ 'certificate.issuedAt': -1 });

    const certificates = enrollments.map(enrollment => ({
      certificateId: enrollment.certificate.certificateId,
      certificateUrl: enrollment.certificate.certificateUrl,
      issuedAt: enrollment.certificate.issuedAt,
      courseName: enrollment.courseId.title,
      courseCategory: enrollment.courseId.category,
      instructorName: enrollment.courseId.instructor.name,
      courseId: enrollment.courseId._id
    }));

    res.json({
      success: true,
      data: certificates
    });
  } catch (error) {
    console.error('Error fetching user certificates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch certificates'
    });
  }
};

module.exports = {
  generateCertificate,
  getCertificate,
  getUserCertificates
};
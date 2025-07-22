const express = require('express');
const { auth } = require('../config/auth');
const {
  generateCertificate,
  getCertificate,
  getUserCertificates
} = require('../controllers/certificateController');

const router = express.Router();

// Generate certificate for completed course
router.post('/course/:courseId', auth, generateCertificate);

// Get certificate for specific course
router.get('/course/:courseId', auth, getCertificate);

// Get all user certificates
router.get('/user', auth, getUserCertificates);

module.exports = router;
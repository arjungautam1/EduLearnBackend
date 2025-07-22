const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  resourceId: {
    type: String,
    unique: true,
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['video', 'pdf', 'article', 'quiz', 'assignment']
  },
  url: {
    type: String,
    required: true
  },
  duration: {
    type: String,
    default: ''
  },
  pages: {
    type: Number,
    default: null
  },
  order: {
    type: Number,
    required: true,
    default: 1
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

resourceSchema.index({ courseId: 1, order: 1 });

module.exports = mongoose.model('Resource', resourceSchema);
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const connectDB = require('./config/database');

const app = express();

connectDB();

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes default
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // Production ready limit
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(limiter);
// Configure allowed origins from environment variable or use defaults
const defaultOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://edulearnlambton.vercel.app',
  'https://edulearn-lambton.vercel.app',
  'https://edulearn.vercel.app',
  'https://edulearnbackend.onrender.com' // allow backend self-origin for health checks
];

const allowedOrigins = process.env.CORS_ORIGIN 
  ? [...defaultOrigins, ...process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())]
  : defaultOrigins;

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Check if origin matches allowed origins or is a Vercel deployment
    if (allowedOrigins.includes(origin) || 
        (origin && origin.includes('.vercel.app'))) {
      return callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 200
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'html');

app.use('/api/courses', require('./routes/courses'));
app.use('/api/resources', require('./routes/resources'));
app.use('/api/users', require('./routes/users'));
app.use('/api/enrollments', require('./routes/enrollments'));
app.use('/api/certificates', require('./routes/certificates'));
app.use('/api/ratings', require('./routes/ratings'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/admin', require('./routes/admin'));

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'EduLearn API is running successfully!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

app.get('/', (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'Welcome to EduLearn API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api',
      docs: 'https://your-api-docs-url.com'
    }
  });
});

app.get('/courses', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'courses.html'));
});

app.get('/course/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'course-detail.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

app.get('/learn/:courseId', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'learning.html'));
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!' 
  });
});

app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Backend server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`API available at: http://localhost:${PORT}/api`);
});
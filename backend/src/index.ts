import dotenv from 'dotenv';
// Load environment variables first
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
import { connectDB } from './config/db';
import authRoutes from './routes/authRoutes';
import resourceRoutes from './routes/resourceRoutes';
import communityRoutes from './routes/communityRoutes';
import supportRoutes from './routes/supportRoutes';
import notificationRoutes from './routes/notificationRoutes';
import adminRoutes from './routes/adminRoutes';
import opportunityRoutes from './routes/opportunityRoutes';
import userRoutes from './routes/userRoutes';
import hackathonRoutes from './routes/hackathonRoutes';
import { startCleanupJob } from './jobs/cleanupJob';

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB Atlas
if (process.env.NODE_ENV !== 'test') {
  connectDB();
}

// 1. Helmet: Secure HTTP Headers
app.use(helmet());

// 2. CORS: Cross-Origin Resource Sharing
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

// 3. Rate Limiter: Prevent DDoS & Brute Force
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.'
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Limit each IP to 15 authentication requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.'
  }
});

app.use('/api/', apiLimiter);
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);
app.use('/api/v1/auth/forgot-password', authLimiter);
app.use('/api/v1/auth/reset-password', authLimiter);

// 4. JSON Parser: Body parsing (with safe size constraints)
app.use(express.json({ limit: '10mb' }));

// 5. HPP: Prevent HTTP Parameter Pollution
app.use(hpp());

// 6. Request Logger
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${req.method}] ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// 7. Route Registries
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1', resourceRoutes);
app.use('/api/v1', communityRoutes);
app.use('/api/v1', supportRoutes);
app.use('/api/v1', notificationRoutes);
app.use('/api/v1', adminRoutes);
app.use('/api/v1', opportunityRoutes);
app.use('/api/v1', userRoutes);
app.use('/api/v1', hackathonRoutes);

app.get('/api/v1/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Backend service is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Fallback 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Resource not found: [${req.method}] ${req.originalUrl}`
  });
});

// 8. Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  // Log full error internally
  console.error('SERVER ERROR LOG:', err);

  const statusCode = err.statusCode || 500;
  
  // Hide stack trace and database-specific errors in production
  const message = process.env.NODE_ENV === 'production' && statusCode === 500
    ? 'An internal server error occurred.'
    : err.message || 'Internal Server Error';

  return res.status(statusCode).json({
    success: false,
    message
  });
});

// Start Express Server
let server: any;
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, () => {
    console.log(`The Helping Society backend is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    // Start background post cleanup job
    startCleanupJob();
  });
}

export { app, server };
export default app;

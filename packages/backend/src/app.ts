import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { healthRouter } from './routes/health';
import { apartmentsRouter } from './routes/apartments';
import { villagesRouter } from './routes/villages';
import { usersRouter } from './routes/users';
import { authRouter } from './routes/auth';
import bookingsRouter from './routes/bookings';
import serviceTypesRouter from './routes/serviceTypes';
import serviceRequestsRouter from './routes/serviceRequests';
import utilityReadingsRouter from './routes/utilityReadings';
import emailsRouter from './routes/emails';
import paymentMethodsRouter from './routes/paymentMethods';
import paymentsRouter from './routes/payments';
import billsRouter from './routes/bills';

/**
 * Create and configure Express application
 */
const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Logging middleware
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check routes (no auth required)
app.use('/api/health', healthRouter);

// Authentication routes
app.use('/api/auth', authRouter);

// Protected API routes
app.use('/api/apartments', apartmentsRouter);
app.use('/api/villages', villagesRouter);
app.use('/api/users', usersRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/service-types', serviceTypesRouter);
app.use('/api/service-requests', serviceRequestsRouter);
app.use('/api/utility-readings', utilityReadingsRouter);
app.use('/api/emails', emailsRouter);
app.use('/api/payment-methods', paymentMethodsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/bills', billsRouter);

// Root endpoint - API documentation
app.get('/', (req, res) => {
  res.json({
    name: 'Tourist Village Management System API',
    version: '1.0.0',
    status: 'running',
    environment: process.env.NODE_ENV || 'development',
    documentation: {
      authentication: '/api/auth',
      health: '/api/health'
    },
    endpoints: {
      auth: {
        base: '/api/auth',
        endpoints: [
          'POST /api/auth/register',
          'POST /api/auth/login', 
          'POST /api/auth/refresh',
          'POST /api/auth/logout',
          'GET  /api/auth/me',
          'POST /api/auth/change-password',
          'POST /api/auth/verify-token',
          'GET  /api/auth/health'
        ]
      },
      management: {
        apartments: '/api/apartments',
        villages: '/api/villages',
        users: '/api/users',
        bookings: '/api/bookings'
      },
      services: {
        serviceTypes: '/api/service-types',
        serviceRequests: '/api/service-requests',
        utilityReadings: '/api/utility-readings'
      },
      financial: {
        payments: '/api/payments',
        paymentMethods: '/api/payment-methods',
        bills: '/api/bills'
      },
      communication: {
        emails: '/api/emails'
      },
      monitoring: {
        health: '/api/health'
      }
    }
  });
});

// Global error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error handler:', err);
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      message: err.message
    });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Invalid or expired token'
    });
  }

  // Default error response
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler - catch all unmatched routes
app.use(/(.*)/, (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `The route ${req.method} ${req.originalUrl} does not exist`,
    availableRoutes: {
      auth: '/api/auth',
      health: '/api/health',
      documentation: '/'
    }
  });
});

export default app; 
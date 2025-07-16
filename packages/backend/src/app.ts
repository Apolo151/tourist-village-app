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
import invoicesRouter from './routes/invoices';

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
app.use('/health', healthRouter);

// Authentication routes
app.use('/auth', authRouter);

// Protected API routes
app.use('/apartments', apartmentsRouter);
app.use('/villages', villagesRouter);
app.use('/users', usersRouter);
app.use('/bookings', bookingsRouter);
app.use('/service-types', serviceTypesRouter);
app.use('/service-requests', serviceRequestsRouter);
app.use('/utility-readings', utilityReadingsRouter);
app.use('/emails', emailsRouter);
app.use('/payment-methods', paymentMethodsRouter);
app.use('/payments', paymentsRouter);
app.use('/invoices', invoicesRouter);

// Root endpoint - API documentation
app.get('/', (req, res) => {
  res.json({
    name: 'Tourist Village Management System API',
    version: '1.0.0',
    status: 'running',
    environment: process.env.NODE_ENV || 'development',
    documentation: {
      authentication: '/auth',
      health: '/health'
    },
    endpoints: {
      auth: {
        base: '/auth',
        endpoints: [
          'POST /auth/register',
          'POST /auth/login', 
          'POST /auth/refresh',
          'POST /auth/logout',
          'GET  /auth/me',
          'POST /auth/change-password',
          'POST /auth/verify-token',
          'GET  /auth/health'
        ]
      },
      management: {
        apartments: '/apartments',
        villages: '/villages',
        users: '/users',
        bookings: '/bookings'
      },
      services: {
        serviceTypes: '/service-types',
        serviceRequests: '/service-requests',
        utilityReadings: '/utility-readings'
      },
      financial: {
        payments: '/payments',
        paymentMethods: '/payment-methods',
        bills: '/bills'
      },
      communication: {
        emails: '/emails'
      },
      monitoring: {
        health: '/health'
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
      auth: '/auth',
      health: '/health',
      documentation: '/'
    }
  });
});

export default app; 
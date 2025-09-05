import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
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
import { payingStatusTypesRouter } from './routes/payingStatusTypes';
import { salesStatusTypesRouter } from './routes/salesStatusTypes';

/**
 * Create and configure Express application
 */
const app = express();

// Add this at the beginning of app.ts before other middlewares
app.use((req, res, next) => {
  console.log(`[DEBUG] Request started: ${req.method} ${req.path}`);
  
  // Save the original end method
  const originalEnd = res.end;
  const startTime = Date.now();
  
  // Override the end method with correct signature
  res.end = function(chunk?: any, encoding?: BufferEncoding | (() => void), cb?: (() => void)) {
    const duration = Date.now() - startTime;
    console.log(`[DEBUG] Request completed: ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    // @ts-ignore
    return originalEnd.apply(this, arguments);
  };
  
  next();
});


// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", process.env.FRONTEND_URL || "*"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:"],
        baseUri: ["'self'"],
      },
    },
  })
);

// CORS configuration
app.use(cors({
  origin: '*',
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  allowedHeaders: ['*'],
}));

// Logging middleware
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Define API route prefix
const API_PREFIX = '/api';

// Health check routes (no auth required)
app.use(`${API_PREFIX}/health`, healthRouter);

// Authentication routes
app.use(`${API_PREFIX}/auth`, authRouter);

// Protected API routes
app.use(`${API_PREFIX}/apartments`, apartmentsRouter);
app.use(`${API_PREFIX}/villages`, villagesRouter);
app.use(`${API_PREFIX}/users`, usersRouter);
app.use(`${API_PREFIX}/bookings`, bookingsRouter);
app.use(`${API_PREFIX}/service-types`, serviceTypesRouter);
app.use(`${API_PREFIX}/service-requests`, serviceRequestsRouter);
app.use(`${API_PREFIX}/utility-readings`, utilityReadingsRouter);
app.use(`${API_PREFIX}/emails`, emailsRouter);
app.use(`${API_PREFIX}/payment-methods`, paymentMethodsRouter);
app.use(`${API_PREFIX}/payments`, paymentsRouter);
app.use(`${API_PREFIX}/invoices`, invoicesRouter);
app.use(`${API_PREFIX}/paying-status-types`, payingStatusTypesRouter);
app.use(`${API_PREFIX}/sales-status-types`, salesStatusTypesRouter);

// API documentation endpoint
app.get(`${API_PREFIX}`, (req, res) => {
  res.json({
    name: 'Tourist Village Management System API',
    version: '1.0.0',
    status: 'running',
    environment: process.env.NODE_ENV || 'development',
    documentation: {
      authentication: `${API_PREFIX}/auth`,
      health: `${API_PREFIX}/health`
    },
    endpoints: {
      auth: {
        base: `${API_PREFIX}/auth`,
        endpoints: [
          `POST ${API_PREFIX}/auth/register`,
          `POST ${API_PREFIX}/auth/login`, 
          `POST ${API_PREFIX}/auth/refresh`,
          `POST ${API_PREFIX}/auth/logout`,
          `GET  ${API_PREFIX}/auth/me`,
          `POST ${API_PREFIX}/auth/change-password`,
          `POST ${API_PREFIX}/auth/verify-token`,
          `GET  ${API_PREFIX}/auth/health`
        ]
      },
      management: {
        apartments: `${API_PREFIX}/apartments`,
        villages: `${API_PREFIX}/villages`,
        users: `${API_PREFIX}/users`,
        bookings: `${API_PREFIX}/bookings`
      },
      services: {
        serviceTypes: `${API_PREFIX}/service-types`,
        serviceRequests: `${API_PREFIX}/service-requests`,
        utilityReadings: `${API_PREFIX}/utility-readings`
      },
      financial: {
        payments: `${API_PREFIX}/payments`,
        paymentMethods: `${API_PREFIX}/payment-methods`,
        bills: `${API_PREFIX}/bills`
      },
      communication: {
        emails: `${API_PREFIX}/emails`
      },
      monitoring: {
        health: `${API_PREFIX}/health`
      }
    }
  });
});

// Serve static files from frontend/dist
// if parent directory is "dist"
let frontendPath = '';
if (path.basename(path.resolve(__dirname, '..')) === 'dist') {
  frontendPath = path.resolve(__dirname, '../../../frontend/dist');
} else {
  frontendPath = path.resolve(__dirname, '../../frontend/dist');
}
app.use(express.static(frontendPath));

// API 404 handler - use a function to check path pattern instead
app.use((req, res, next) => {
  // Only handle API routes
  if (req.path.startsWith(API_PREFIX) && 
      // But not already handled routes
      !req.path.match(/^\/api\/(health|auth|apartments|villages|users|bookings|service-types|service-requests|utility-readings|emails|payment-methods|payments|invoices|paying-status-types|sales-status-types)(\/.+)?$/)) {
    return res.status(404).json({ 
      success: false, 
      error: 'API route not found',
      message: `The route ${req.method} ${req.originalUrl} does not exist` 
    });
  }
  next();
});


app.use((req, res, next) => {
  // only intercept GET or HEAD
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  if (req.path.startsWith(API_PREFIX)) return next();
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Global error handling middleware for API routes
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


export default app; 
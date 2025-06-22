import { Router, Request, Response } from 'express';
import { db } from '../database/connection';

export const healthRouter = Router();

// Basic health check
healthRouter.get('/', async (req: Request, res: Response) => {
  try {
    res.status(200).json({
      status: 'OK',
      message: 'Server is healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Server health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Database health check
healthRouter.get('/db', async (req: Request, res: Response) => {
  try {
    await db.raw('SELECT 1 as health_check');
    res.status(200).json({
      status: 'OK',
      message: 'Database connection is healthy',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Database connection failed',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Detailed system info
healthRouter.get('/system', async (req: Request, res: Response) => {
  try {
    const dbResult = await db.raw('SELECT version() as db_version');
    
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: process.env.NODE_ENV || 'development'
      },
      database: {
        connected: true,
        version: dbResult.rows[0]?.db_version || 'Unknown'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: process.env.NODE_ENV || 'development'
      },
      database: {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
}); 
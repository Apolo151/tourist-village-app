import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import and export app for testing
import app from './app';
export { app };

// If this file is run directly, start the server
if (require.main === module) {
  require('./server');
} 
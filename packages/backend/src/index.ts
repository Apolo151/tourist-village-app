import dotenv from 'dotenv';
import app from './app';

// Load environment variables
dotenv.config();

// Export app for testing
export { app };

// If this file is run directly, start the server
if (require.main === module) {
  require('./server');
} 
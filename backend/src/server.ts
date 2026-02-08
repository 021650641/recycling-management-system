import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { config } from './config';
import { healthCheck } from './db';

// Import routes (will be created)
import authRoutes from './routes/auth';
import transactionRoutes from './routes/transactions';
import inventoryRoutes from './routes/inventory';
import reportRoutes from './routes/reports';
import locationRoutes from './routes/locations';
import materialRoutes from './routes/materials';
import wastePickerRoutes from './routes/wastePickers';
import apartmentRoutes from './routes/apartments';
import clientRoutes from './routes/clients';
import syncRoutes from './routes/sync';
import userRoutes from './routes/users';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(compression());
app.use(morgan(config.nodeEnv === 'development' ? 'dev' : 'combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  const dbHealthy = await healthCheck();
  
  res.status(dbHealthy ? 200 : 503).json({
    status: dbHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbHealthy ? 'connected' : 'disconnected',
  });
});

// API routes
const apiRouter = express.Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/transactions', transactionRoutes);
apiRouter.use('/inventory', inventoryRoutes);
apiRouter.use('/reports', reportRoutes);
apiRouter.use('/locations', locationRoutes);
apiRouter.use('/materials', materialRoutes);
apiRouter.use('/waste-pickers', wastePickerRoutes);
apiRouter.use('/apartments', apartmentRoutes);
apiRouter.use('/clients', clientRoutes);
apiRouter.use('/sync', syncRoutes);
apiRouter.use('/users', userRoutes);

app.use(config.apiPrefix, apiRouter);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.url}`,
  });
});

// Error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    error: config.nodeEnv === 'production' ? 'Server Error' : err.name,
    message: config.nodeEnv === 'production' && statusCode === 500 
      ? 'An unexpected error occurred' 
      : message,
    ...(config.nodeEnv === 'development' && { stack: err.stack }),
  });
});

// Start server
const server = app.listen(config.port, () => {
  console.log(`🚀 Server running on port ${config.port}`);
  console.log(`📚 API available at http://localhost:${config.port}${config.apiPrefix}`);
  console.log(`🏥 Health check at http://localhost:${config.port}/health`);
  console.log(`🌍 Environment: ${config.nodeEnv}`);
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  console.log(`\n${signal} received, closing server gracefully...`);
  
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;

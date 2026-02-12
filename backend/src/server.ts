import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { config } from './config';
import { healthCheck } from './db';
import logger from './services/logger';
import { startScheduler, stopScheduler } from './services/scheduler';

// Import routes
import authRoutes from './routes/auth';
import transactionRoutes from './routes/transactions';
import inventoryRoutes from './routes/inventory';
import reportRoutes from './routes/reports';
import locationRoutes from './routes/locations';
import materialRoutes from './routes/materials';
import wastePickerRoutes from './routes/wastePickers';
import apartmentRoutes from './routes/apartments';
import clientRoutes from './routes/clients';
import salesRoutes from './routes/sales';
import syncRoutes from './routes/sync';
import userRoutes from './routes/users';
import settingsRoutes from './routes/settings';
import logRoutes from './routes/logs';
import scheduleRoutes from './routes/schedules';
import deliveryRoutes from './routes/delivery';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(compression());
app.use(morgan(config.nodeEnv === 'development' ? 'dev' : 'combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', async (_req: Request, res: Response) => {
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
apiRouter.use('/sales', salesRoutes);
apiRouter.use('/sync', syncRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/settings', settingsRoutes);
apiRouter.use('/logs', logRoutes);
apiRouter.use('/schedules', scheduleRoutes);
apiRouter.use('/delivery', deliveryRoutes);

app.use(config.apiPrefix, apiRouter);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.url}`,
  });
});

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  logger.error(`${err.message}`, { stack: err.stack, status: err.statusCode || err.status || 500 });
  
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

// Log registered route modules
const routeModules = [
  'auth', 'transactions', 'inventory', 'reports', 'locations',
  'materials', 'waste-pickers', 'apartments', 'clients', 'sales',
  'sync', 'users', 'settings', 'logs', 'schedules',
];
logger.info(`Registered ${routeModules.length} route modules under ${config.apiPrefix}`);

// Start server with EADDRINUSE retry logic
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;
let retryCount = 0;

function startServer(): void {
  const server_instance = app.listen(config.port, () => {
    logger.info(`Server running on port ${config.port}`);
    logger.info(`API available at http://localhost:${config.port}${config.apiPrefix}`);
    logger.info(`Environment: ${config.nodeEnv}`);
    // Start report scheduler after server is up
    startScheduler().catch(err => logger.error(`Scheduler init error: ${err.message}`));
  });

  server_instance.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE' && retryCount < MAX_RETRIES) {
      retryCount++;
      console.warn(`Port ${config.port} in use, retrying (${retryCount}/${MAX_RETRIES}) in ${RETRY_DELAY_MS}ms...`);
      setTimeout(() => startServer(), RETRY_DELAY_MS);
    } else {
      console.error(`Fatal: ${err.message}`);
      process.exit(1);
    }
  });

  // Store reference for graceful shutdown
  currentServer = server_instance;
}

let currentServer: ReturnType<typeof app.listen>;
startServer();

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully...`);
  stopScheduler();
  if (currentServer) {
    currentServer.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }

  setTimeout(() => {
    console.error('Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
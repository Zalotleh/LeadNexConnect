import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { rateLimit } from 'express-rate-limit';
import { logger } from './utils/logger';
import { emailQueueService } from './services/outreach/email-queue.service';
import { dailyLeadGenerationJob } from './jobs/daily-lead-generation.job';
import { dailyOutreachJob } from './jobs/daily-outreach.job';
import { followUpCheckerJob } from './jobs/follow-up-checker.job';

// Import routes
import leadsRoutes from './routes/leads.routes';
import campaignsRoutes from './routes/campaigns.routes';
import emailsRoutes from './routes/emails.routes';
import analyticsRoutes from './routes/analytics.routes';
import scrapingRoutes from './routes/scraping.routes';
import settingsRoutes from './routes/settings.routes';
import apiPerformanceRoutes from './routes/api-performance.routes';
import aiRoutes from './routes/ai.routes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(compression()); // Compress responses
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  }));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    uptime: process.uptime(),
  });
});

// API Routes
app.use('/api/leads', leadsRoutes);
app.use('/api/campaigns', campaignsRoutes);
app.use('/api/emails', emailsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/scraping', scrapingRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/performance', apiPerformanceRoutes);
app.use('/api/ai', aiRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Route not found',
      code: 'NOT_FOUND',
    },
  });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  res.status(err.status || 500).json({
    success: false,
    error: {
      message: err.message || 'Internal server error',
      code: err.code || 'INTERNAL_ERROR',
      ...(NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
});

// Start server
app.listen(PORT, async () => {
  logger.info(`🚀 LeadNexConnect API server running on port ${PORT}`);
  logger.info(`📍 Environment: ${NODE_ENV}`);
  logger.info(`🔗 Frontend URL: ${process.env.FRONTEND_URL}`);
  
  // Initialize email queue
  try {
    logger.info('📧 Starting email queue processing...');
    emailQueueService.startProcessing(5); // Process 5 emails concurrently
    
    const stats = await emailQueueService.getStats();
    logger.info('📊 Email queue initialized', {
      waiting: stats.waiting,
      active: stats.active,
      completed: stats.completed,
      failed: stats.failed,
    });
  } catch (error: any) {
    logger.error('❌ Failed to initialize email queue', {
      error: error.message,
    });
  }

  // Start cron jobs
  try {
    logger.info('⏰ Starting cron jobs...');
    dailyLeadGenerationJob.start();
    dailyOutreachJob.start();
    followUpCheckerJob.start();
    logger.info('✅ All cron jobs started successfully');
  } catch (error: any) {
    logger.error('❌ Failed to start cron jobs', {
      error: error.message,
    });
  }
  
  if (NODE_ENV === 'development') {
    logger.info(`📖 API Docs: http://localhost:${PORT}/health`);
  }
});

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Shutting down gracefully...');
  
  try {
    // Stop cron jobs
    dailyLeadGenerationJob.stop();
    dailyOutreachJob.stop();
    followUpCheckerJob.stop();
    logger.info('Cron jobs stopped');
  } catch (error: any) {
    logger.error('Error stopping cron jobs', { error: error.message });
  }
  
  try {
    // Close email queue
    await emailQueueService.close();
    logger.info('Email queue closed');
  } catch (error: any) {
    logger.error('Error closing email queue', { error: error.message });
  }
  
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

export default app;

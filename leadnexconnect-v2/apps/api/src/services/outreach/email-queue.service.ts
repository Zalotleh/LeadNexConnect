import Bull, { Job } from 'bull';
import { logger } from '../../utils/logger';
import { emailSenderService } from './email-sender.service';
import { db, campaigns } from '@leadnex/database';
import { eq } from 'drizzle-orm';

// Redis connection configuration
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

// Queue configuration
const REDIS_CONFIG = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

export interface EmailJob {
  leadId: string;
  campaignId?: string;
  to: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
  followUpStage: string;
  metadata?: any;
}

export class EmailQueueService {
  private queue: Bull.Queue<EmailJob>;
  private isProcessing: boolean = false;

  constructor() {
    // Initialize Bull queue
    this.queue = new Bull<EmailJob>('email-queue', {
      redis: REDIS_CONFIG,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 500, // Keep last 500 failed jobs
      },
    });

    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Add email to queue
   */
  async addEmail(emailData: EmailJob, priority?: number): Promise<Job<EmailJob>> {
    try {
      logger.info('[EmailQueue] Adding email to queue', {
        to: emailData.to,
        subject: emailData.subject,
        leadId: emailData.leadId,
      });

      const job = await this.queue.add(emailData, {
        priority: priority || 10, // Default priority
        delay: 0, // Send immediately
      });

      logger.info('[EmailQueue] Email added to queue', {
        jobId: job.id,
        to: emailData.to,
      });

      return job;
    } catch (error: any) {
      logger.error('[EmailQueue] Error adding email to queue', {
        error: error.message,
        to: emailData.to,
      });
      throw error;
    }
  }

  /**
   * Add multiple emails to queue in batch
   */
  async addBatch(emails: EmailJob[]): Promise<Job<EmailJob>[]> {
    try {
      logger.info('[EmailQueue] Adding batch to queue', { count: emails.length });

      const jobs = await Promise.all(
        emails.map((email, index) =>
          this.queue.add(email, {
            priority: 10,
            delay: index * 1000, // Stagger by 1 second each
          })
        )
      );

      logger.info('[EmailQueue] Batch added to queue', {
        count: jobs.length,
        jobIds: jobs.map((j: Job<EmailJob>) => j.id),
      });

      return jobs;
    } catch (error: any) {
      logger.error('[EmailQueue] Error adding batch to queue', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Schedule email for later sending
   */
  async scheduleEmail(
    emailData: EmailJob,
    sendAt: Date
  ): Promise<Job<EmailJob>> {
    try {
      const delay = sendAt.getTime() - Date.now();

      if (delay < 0) {
        throw new Error('Cannot schedule email in the past');
      }

      logger.info('[EmailQueue] Scheduling email', {
        to: emailData.to,
        sendAt: sendAt.toISOString(),
        delayMs: delay,
      });

      const job = await this.queue.add(emailData, {
        delay,
        priority: 10,
      });

      return job;
    } catch (error: any) {
      logger.error('[EmailQueue] Error scheduling email', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Start processing queue
   */
  startProcessing(concurrency: number = 5): void {
    if (this.isProcessing) {
      logger.warn('[EmailQueue] Already processing');
      return;
    }

    logger.info('[EmailQueue] Starting queue processing', { concurrency });

    this.queue.process(concurrency, async (job: Job<EmailJob>) => {
      return this.processEmailJob(job);
    });

    this.isProcessing = true;
  }

  /**
   * Process individual email job
   */
  private async processEmailJob(job: Job<EmailJob>): Promise<void> {
    const { data } = job;

    try {
      logger.info('[EmailQueue] Processing email job', {
        jobId: job.id,
        to: data.to,
        campaignId: data.campaignId,
        attempt: job.attemptsMade + 1,
      });

      // Check if campaign is still active (if campaignId is provided)
      if (data.campaignId) {
        const campaign = await db
          .select()
          .from(campaigns)
          .where(eq(campaigns.id, data.campaignId))
          .limit(1);

        if (!campaign[0]) {
          logger.warn('[EmailQueue] Campaign not found, cancelling job', {
            jobId: job.id,
            campaignId: data.campaignId,
          });
          throw new Error('Campaign not found');
        }

        if (campaign[0].status !== 'active') {
          logger.warn('[EmailQueue] Campaign not active, cancelling job', {
            jobId: job.id,
            campaignId: data.campaignId,
            status: campaign[0].status,
          });
          throw new Error(`Campaign is ${campaign[0].status}, not sending email`);
        }
      }

      // Check rate limits before sending
      const canSend = await this.checkRateLimit();
      if (!canSend) {
        logger.warn('[EmailQueue] Rate limit exceeded, delaying job');
        throw new Error('Rate limit exceeded');
      }

      // Send email using email sender service
      await emailSenderService.sendEmail({
        leadId: data.leadId,
        campaignId: data.campaignId,
        subject: data.subject,
        bodyText: data.bodyText,
        bodyHtml: data.bodyHtml,
        followUpStage: data.followUpStage,
      });

      logger.info('[EmailQueue] Email sent successfully', {
        jobId: job.id,
        to: data.to,
      });

      // Update job progress
      await job.progress(100);
    } catch (error: any) {
      logger.error('[EmailQueue] Error processing email job', {
        jobId: job.id,
        to: data.to,
        error: error.message,
        attempt: job.attemptsMade + 1,
      });

      throw error; // Let Bull handle retries
    }
  }

  /**
   * Check rate limits (50 emails per hour)
   */
  private async checkRateLimit(): Promise<boolean> {
    try {
      const counts = await this.queue.getJobCounts();
      const activeJobs = counts.active || 0;
      const waitingJobs = counts.waiting || 0;

      // Get completed jobs in last hour
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      const completedJobs = await this.queue.getCompleted();
      const recentCompleted = completedJobs.filter(
        (job: Job<EmailJob>) => job.finishedOn && job.finishedOn > oneHourAgo
      ).length;

      const totalInHour = activeJobs + recentCompleted;

      logger.info('[EmailQueue] Rate limit check', {
        activeJobs,
        waitingJobs,
        recentCompleted,
        totalInHour,
        limit: 50,
      });

      // Allow if under 50 per hour
      return totalInHour < 50;
    } catch (error: any) {
      logger.error('[EmailQueue] Error checking rate limit', {
        error: error.message,
      });
      // Allow by default if check fails
      return true;
    }
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    try {
      const counts = await this.queue.getJobCounts();

      return {
        waiting: counts.waiting || 0,
        active: counts.active || 0,
        completed: counts.completed || 0,
        failed: counts.failed || 0,
        delayed: counts.delayed || 0,
      };
    } catch (error: any) {
      logger.error('[EmailQueue] Error getting stats', {
        error: error.message,
      });
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
      };
    }
  }

  /**
   * Pause queue processing
   */
  async pause(): Promise<void> {
    logger.info('[EmailQueue] Pausing queue');
    await this.queue.pause();
  }

  /**
   * Resume queue processing
   */
  async resume(): Promise<void> {
    logger.info('[EmailQueue] Resuming queue');
    await this.queue.resume();
  }

  /**
   * Clear all jobs from queue
   */
  async clearQueue(): Promise<void> {
    logger.warn('[EmailQueue] Clearing queue');
    await this.queue.empty();
  }

  /**
   * Cancel all jobs for a specific campaign
   */
  async cancelCampaignJobs(campaignId: string): Promise<number> {
    try {
      logger.info('[EmailQueue] Cancelling jobs for campaign', { campaignId });
      
      // Get all waiting and delayed jobs
      const waitingJobs = await this.queue.getWaiting();
      const delayedJobs = await this.queue.getDelayed();
      const allPendingJobs = [...waitingJobs, ...delayedJobs];
      
      let cancelledCount = 0;
      
      // Remove jobs that belong to this campaign
      for (const job of allPendingJobs) {
        if (job.data.campaignId === campaignId) {
          await job.remove();
          cancelledCount++;
          logger.info('[EmailQueue] Cancelled job', {
            jobId: job.id,
            campaignId,
            to: job.data.to,
          });
        }
      }
      
      logger.info('[EmailQueue] Campaign jobs cancelled', {
        campaignId,
        cancelledCount,
      });
      
      return cancelledCount;
    } catch (error: any) {
      logger.error('[EmailQueue] Error cancelling campaign jobs', {
        campaignId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get failed jobs
   */
  async getFailedJobs(): Promise<Job<EmailJob>[]> {
    return this.queue.getFailed();
  }

  /**
   * Retry failed job
   */
  async retryJob(jobId: string): Promise<void> {
    try {
      const job = await this.queue.getJob(jobId);
      if (job) {
        await job.retry();
        logger.info('[EmailQueue] Job retried', { jobId });
      }
    } catch (error: any) {
      logger.error('[EmailQueue] Error retrying job', {
        jobId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Set up event listeners for monitoring
   */
  private setupEventListeners(): void {
    this.queue.on('completed', (job: Job) => {
      logger.info('[EmailQueue] Job completed', {
        jobId: job.id,
        to: job.data.to,
      });
    });

    this.queue.on('failed', (job: Job, error: Error) => {
      logger.error('[EmailQueue] Job failed', {
        jobId: job.id,
        to: job.data.to,
        error: error.message,
        attempts: job.attemptsMade,
      });
    });

    this.queue.on('stalled', (job: Job) => {
      logger.warn('[EmailQueue] Job stalled', {
        jobId: job.id,
        to: job.data.to,
      });
    });

    this.queue.on('error', (error: Error) => {
      logger.error('[EmailQueue] Queue error', {
        error: error.message,
      });
    });

    this.queue.on('waiting', (jobId: string) => {
      logger.debug('[EmailQueue] Job waiting', { jobId });
    });

    this.queue.on('active', (job: Job) => {
      logger.debug('[EmailQueue] Job active', {
        jobId: job.id,
        to: job.data.to,
      });
    });
  }

  /**
   * Close queue connection
   */
  async close(): Promise<void> {
    logger.info('[EmailQueue] Closing queue');
    await this.queue.close();
  }
}

export const emailQueueService = new EmailQueueService();

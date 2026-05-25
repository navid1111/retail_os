import { Queue } from 'bullmq';
import * as Sentry from '@sentry/node';
import { getRedisUrl } from '../config/env';

// Define queue names as constants
export const QUEUE_NAMES = {
  SEND_EMAIL: 'send-email',
  PROCESS_IMAGE: 'process-image',
  GENERATE_REPORT: 'generate-report',
  CLEANUP_TASKS: 'cleanup-tasks',
  WRITE_AUDIT_LOG: 'write-audit-log',
} as const;

type QueueKey = keyof typeof QUEUE_NAMES;
type QueueInstance = Queue<any, any, string>;

const buildConnectionOptions = () => {
  const redisUrl = getRedisUrl();
  const url = new URL(redisUrl);

  const db = url.pathname && url.pathname !== '/' ? Number(url.pathname.slice(1)) : undefined;

  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password || undefined,
    db: Number.isNaN(db as number) ? undefined : db,
    tls: url.protocol === 'rediss:' ? {} : undefined,
  };
};

// Create queue instances
const createQueues = () => {
  const connection = buildConnectionOptions();

  return {
    emailQueue: new Queue(QUEUE_NAMES.SEND_EMAIL, { connection }),
    imageQueue: new Queue(QUEUE_NAMES.PROCESS_IMAGE, { connection }),
    reportQueue: new Queue(QUEUE_NAMES.GENERATE_REPORT, { connection }),
    cleanupQueue: new Queue(QUEUE_NAMES.CLEANUP_TASKS, { connection }),
    auditLogQueue: new Queue(QUEUE_NAMES.WRITE_AUDIT_LOG, { connection }),
  };
};

export const queues = createQueues();

const queueByName: Record<QueueKey, QueueInstance> = {
  SEND_EMAIL: queues.emailQueue,
  PROCESS_IMAGE: queues.imageQueue,
  GENERATE_REPORT: queues.reportQueue,
  CLEANUP_TASKS: queues.cleanupQueue,
  WRITE_AUDIT_LOG: queues.auditLogQueue,
};

// Helper function to add jobs to queues
export const addJobToQueue = async (
  queueName: keyof typeof QUEUE_NAMES,
  jobName: string,
  data: any,
  options?: any
) => {
  try {
    const queue = queueByName[queueName];
    const job = await queue.add(jobName, data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      ...options,
    });
    return job;
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
};

// Helper function to add repeatable/scheduled jobs
export const addRepeatingJob = async (
  queueName: keyof typeof QUEUE_NAMES,
  jobName: string,
  data: any,
  pattern: string, // cron pattern: '0 0 * * *' for daily, '*/5 * * * *' for every 5 mins
  options?: any
) => {
  try {
    const queue = queueByName[queueName];
    const job = await queue.add(jobName, data, {
      repeat: {
        pattern,
        removeOnComplete: true,
      },
      ...options,
    });
    return job;
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
};

// Cleanup function to close all queues
export const closeQueues = async () => {
  try {
    await Promise.all([
      queues.emailQueue.close(),
      queues.imageQueue.close(),
      queues.reportQueue.close(),
      queues.cleanupQueue.close(),
      queues.auditLogQueue.close(),
    ]);
    console.log('All queues closed successfully');
  } catch (error) {
    console.error('Error closing queues:', error);
    Sentry.captureException(error);
  }
};

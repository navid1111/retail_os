import type { Job, JobState } from "bullmq";
import { QUEUE_NAMES, queues } from "../queues/queues";

const JOB_STATES: JobState[] = [
  "active",
  "waiting",
  "delayed",
  "failed",
  "completed",
];

type QueueCounts = Awaited<ReturnType<(typeof queues.imageQueue)["getJobCounts"]>>;

export type AdminJobSummary = {
  id?: string;
  name: string;
  queue: string;
  state: JobState | "unknown";
  attemptsMade: number;
  progress: unknown;
  timestamp?: number;
  processedOn?: number;
  finishedOn?: number;
  failedReason?: string;
  data: unknown;
  returnvalue?: unknown;
};

export type AdminQueueSummary = {
  key: keyof typeof QUEUE_NAMES;
  name: string;
  counts: QueueCounts;
  jobs: AdminJobSummary[];
};

const queueEntries = [
  ["SEND_EMAIL", queues.emailQueue],
  ["PROCESS_IMAGE", queues.imageQueue],
  ["GENERATE_REPORT", queues.reportQueue],
  ["CLEANUP_TASKS", queues.cleanupQueue],
  ["WRITE_AUDIT_LOG", queues.auditLogQueue],
] as const;

const formatJob = async (
  queueName: string,
  job: Job
): Promise<AdminJobSummary> => ({
  id: job.id,
  name: job.name,
  queue: queueName,
  state: (await job.getState().catch(() => "unknown")) as AdminJobSummary["state"],
  attemptsMade: job.attemptsMade,
  progress: job.progress,
  timestamp: job.timestamp,
  processedOn: job.processedOn,
  finishedOn: job.finishedOn,
  failedReason: job.failedReason,
  data: job.data,
  returnvalue: job.returnvalue,
});

export const getAdminJobDashboard = async (): Promise<{
  queues: AdminQueueSummary[];
  generatedAt: string;
}> => {
  const summaries = await Promise.all(
    queueEntries.map(async ([key, queue]) => {
      const [counts, jobs] = await Promise.all([
        queue.getJobCounts(...JOB_STATES),
        queue.getJobs(JOB_STATES, 0, 24, false),
      ]);

      return {
        key,
        name: QUEUE_NAMES[key],
        counts,
        jobs: await Promise.all(jobs.map((job) => formatJob(QUEUE_NAMES[key], job))),
      };
    })
  );

  return {
    queues: summaries,
    generatedAt: new Date().toISOString(),
  };
};

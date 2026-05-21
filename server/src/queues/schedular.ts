import { Worker } from "bullmq";
import * as Sentry from "@sentry/node";
import { QUEUE_NAMES } from "./queues";

const buildConnectionOptions = () => {
	const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
	const url = new URL(redisUrl);

	const db = url.pathname && url.pathname !== "/" ? Number(url.pathname.slice(1)) : undefined;

	return {
		host: url.hostname,
		port: Number(url.port || 6379),
		username: url.username || undefined,
		password: url.password || undefined,
		db: Number.isNaN(db as number) ? undefined : db,
		tls: url.protocol === "rediss:" ? {} : undefined,
	};
};

export interface QueueScheduler {
	imageWorker: Worker;
}

export const startQueueScheduler = (): QueueScheduler => {
	const connection = buildConnectionOptions();

	const imageWorker = new Worker(
		QUEUE_NAMES.PROCESS_IMAGE,
		async (job) => {
			console.log("Processing image job", job.id, job.data);
			return { processed: true };
		},
		{ connection }
	);

	imageWorker.on("failed", (job, err) => {
		console.error("Image worker failed", job?.id, err);
		Sentry.captureException(err);
	});

	return { imageWorker };
};

export const closeQueueScheduler = async (scheduler: QueueScheduler): Promise<void> => {
	await scheduler.imageWorker.close();
};

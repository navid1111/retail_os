import { dataStoreMcp } from "./dataStoreMcp.service";

type GeminiPart = {
  text?: string;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
  }>;
};

export type AdminChatResponse = {
  answer: string;
  query?: Record<string, unknown>;
  rows?: unknown[];
  rawResult?: unknown;
};

type PlannedQuery = {
  answer?: string;
  query?: Record<string, unknown>;
  deterministicAnswer?: boolean;
};

const READ_OPERATIONS = new Set([
  "find",
  "findOne",
  "aggregate",
  "countDocuments",
  "distinct",
]);

export async function askAdminDatabaseAssistant(
  question: string
): Promise<AdminChatResponse> {
  const schema = await dataStoreMcp.inspectDatabase();
  const plannedQuery = planKnownDatabaseQuery(question) ?? (await planDatabaseQuery(question, schema));

  if (!plannedQuery.query) {
    return {
      answer:
        plannedQuery.answer ||
        "I inspected the database, but I could not turn that request into a safe read-only query.",
    };
  }

  const query = normalizeMongoQuery(plannedQuery.query);
  const queryResult = await dataStoreMcp.queryDatabase(query);
  const rows = extractRows(queryResult);
  const answer = plannedQuery.deterministicAnswer
    ? summarizeKnownDatabaseResult(question, queryResult)
    : await summarizeDatabaseResult(question, schema, query, queryResult);

  return {
    answer,
    query,
    rows,
    rawResult: queryResult,
  };
}

function planKnownDatabaseQuery(question: string): PlannedQuery | undefined {
  const normalizedQuestion = question.toLowerCase();
  const asksForVisits = /\bvisits?\b/.test(normalizedQuestion);
  const asksForAiAnalysis = /ai[_\s-]?analys/.test(normalizedQuestion);

  if (!asksForVisits || !asksForAiAnalysis) {
    return undefined;
  }

  const requestedLimit = Number(normalizedQuestion.match(/\b(\d{1,2})\b/)?.[1] ?? 5);
  const limit = Math.max(1, Math.min(requestedLimit, 25));

  return {
    deterministicAnswer: true,
    query: {
      operation: "aggregate",
      collection: "visits",
      pipeline: [
        { $sort: { checkInTime: -1, createdAt: -1, _id: -1 } },
        { $limit: limit },
        {
          $lookup: {
            from: "ai_analyses",
            localField: "_id",
            foreignField: "visitId",
            as: "aiAnalysis",
          },
        },
        {
          $unwind: {
            path: "$aiAnalysis",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "stores",
            localField: "storeId",
            foreignField: "_id",
            as: "store",
          },
        },
        {
          $unwind: {
            path: "$store",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: { $toString: "$_id" },
            storeName: "$store.storeName",
            checkInTime: 1,
            status: 1,
            overallScore: 1,
            aiScore: "$aiAnalysis.complianceScore",
            aiProducts: { $size: { $ifNull: ["$aiAnalysis.productsDetected", []] } },
            aiCompetitors: "$aiAnalysis.competitorsDetected",
            aiMissingSkus: "$aiAnalysis.missingSkus",
            aiSummary: "$aiAnalysis.supervisorSummary",
          },
        },
      ],
    },
  };
}

function summarizeKnownDatabaseResult(question: string, queryResult: unknown): string {
  const rows = extractRows(queryResult) || [];
  const rowsWithAi = rows.filter((row) => {
    if (!row || typeof row !== "object") {
      return false;
    }

    const record = row as Record<string, unknown>;
    return (
      record.aiScore !== undefined ||
      Boolean(record.aiSummary) ||
      (Array.isArray(record.aiCompetitors) && record.aiCompetitors.length > 0) ||
      (Array.isArray(record.aiMissingSkus) && record.aiMissingSkus.length > 0)
    );
  }).length;

  const requestedRows = rows.length === 1 ? "visit" : "visits";
  const tableRows = rows.map((row) => {
    const record = (row && typeof row === "object" ? row : {}) as Record<string, unknown>;
    const id = String(record._id ?? "-");
    const products = Number(record.aiProducts ?? 0);
    const competitors = Array.isArray(record.aiCompetitors) ? record.aiCompetitors.length : 0;
    const missingSkus = Array.isArray(record.aiMissingSkus) ? record.aiMissingSkus.length : 0;
    const score = typeof record.aiScore === "number" ? `${Math.round(record.aiScore)}/100` : "-";
    const checkInTime = record.checkInTime
      ? new Date(String(record.checkInTime)).toISOString().replace("T", " ").slice(0, 16)
      : "-";

    return `| ...${id.slice(-4)} | ${record.storeName ?? "-"} | ${checkInTime} | ${record.status ?? "-"} | ${products} | ${competitors} | ${missingSkus} | ${score} |`;
  });

  return [
    `Here are the ${rows.length} most recent ${requestedRows} with AI analysis joined from ai_analyses. ${rowsWithAi} of ${rows.length} ${requestedRows} have saved AI analysis data.`,
    "",
    "| Visit | Store | Check-In | Status | Products | Competitors | Missing SKUs | Score |",
    "| :--- | :--- | :--- | :--- | ---: | ---: | ---: | :--- |",
    ...tableRows,
    "",
    "**Key observations:**",
    `- AI analysis is available for ${rowsWithAi} of ${rows.length} ${requestedRows}.`,
    `- ${rows.length - rowsWithAi} ${rows.length - rowsWithAi === 1 ? "visit is" : "visits are"} still missing saved AI analysis data.`,
  ].join("\n");
}

async function planDatabaseQuery(question: string, schema: unknown): Promise<PlannedQuery> {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const prompt = [
    "You are the RetailOS admin database assistant.",
    "Use the inspected MongoDB schema to produce exactly one safe read-only MongoDB query.",
    "Return only JSON. Do not wrap it in Markdown.",
    "Allowed operations: find, findOne, aggregate, countDocuments, distinct.",
    "Never create update/delete/insert/drop commands.",
    "For find queries, include a limit of 100 or less.",
    "Use ISO date strings inside $date wrappers when dates are needed.",
    `Current date in Asia/Dhaka is ${today}.`,
    "",
    "Response shape:",
    '{"query":{"operation":"aggregate","collection":"visits","pipeline":[]},"answer":"optional short explanation if no query is needed"}',
    "",
    `Schema: ${JSON.stringify(schema)}`,
    `Question: ${question}`,
  ].join("\n");

  const text = await callGemini(prompt);
  const parsed = parseJsonObject(text) as PlannedQuery;

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Gemini did not return a valid query plan");
  }

  return parsed;
}

async function summarizeDatabaseResult(
  question: string,
  schema: unknown,
  query: Record<string, unknown>,
  queryResult: unknown
): Promise<string> {
  const prompt = [
    "You are the RetailOS admin database assistant.",
    "Answer the admin's question using the query result.",
    "Return a presentation-ready response.",
    "If the result has multiple records, include a compact Markdown table before observations.",
    "Summarize arrays as counts in the table unless the admin specifically asks for raw item details.",
    "Use readable dates, short IDs, and business-friendly column names.",
    "After the table, add 2-4 concise bullet observations.",
    "Do not invent values that are not in the result.",
    "Do not dump raw JSON unless the admin specifically asks for raw JSON.",
    "",
    `Question: ${question}`,
    `Schema summary: ${JSON.stringify(schema).slice(0, 12000)}`,
    `Query: ${JSON.stringify(query)}`,
    `Result: ${JSON.stringify(queryResult).slice(0, 18000)}`,
  ].join("\n");

  return callGemini(prompt);
}

async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
        },
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini request failed: ${response.status} ${body}`);
  }

  const data = (await response.json()) as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim();

  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  return text;
}

function parseJsonObject(text: string): unknown {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  return JSON.parse(cleaned);
}

function normalizeMongoQuery(query: Record<string, unknown>): Record<string, unknown> {
  const operation = String(query.operation || "");
  const collection = String(query.collection || "");

  if (!READ_OPERATIONS.has(operation)) {
    throw new Error(`Unsafe or unsupported operation: ${operation}`);
  }

  if (!collection || collection.startsWith("system.")) {
    throw new Error("A valid collection is required");
  }

  const normalized = reviveDates(query) as Record<string, unknown>;

  if (operation === "find") {
    const limit = Number(normalized.limit || 100);
    normalized.limit = Math.max(1, Math.min(limit, 100));
  }

  if (operation === "aggregate") {
    const pipeline = Array.isArray(normalized.pipeline) ? normalized.pipeline : [];
    const hasLimit = pipeline.some(
      (stage) => stage && typeof stage === "object" && "$limit" in stage
    );
    normalized.pipeline = hasLimit ? pipeline : [...pipeline, { $limit: 100 }];
  }

  return normalized;
}

function reviveDates(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(reviveDates);
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.$date === "string") {
      return new Date(record.$date);
    }

    return Object.fromEntries(
      Object.entries(record).map(([key, item]) => [key, reviveDates(item)])
    );
  }

  return value;
}

function extractRows(queryResult: unknown): unknown[] | undefined {
  if (!queryResult || typeof queryResult !== "object") {
    return undefined;
  }

  const results = (queryResult as { results?: unknown }).results;
  if (Array.isArray(results)) {
    return results;
  }

  if (results === undefined || results === null) {
    return undefined;
  }

  return [{ value: results }];
}

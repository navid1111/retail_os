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
  const plannedQuery = await planDatabaseQuery(question, schema);

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
  const answer = await summarizeDatabaseResult(question, schema, query, queryResult);

  return {
    answer,
    query,
    rows,
    rawResult: queryResult,
  };
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
    "Be concise. Mention important numbers and patterns. If the result is tabular, describe the table.",
    "Do not invent values that are not in the result.",
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
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

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

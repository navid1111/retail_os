import type { Document, Filter } from "mongodb";
import { getDB } from "../db/mongo";

type MongoOperation = "find" | "findOne" | "aggregate" | "countDocuments" | "distinct";

type MongoQuery = {
  operation: MongoOperation;
  collection: string;
  filter?: Filter<Document>;
  projection?: Document;
  sort?: Document;
  limit?: number;
  skip?: number;
  pipeline?: Document[];
  field?: string;
};

const READ_OPERATIONS = new Set<MongoOperation>([
  "find",
  "findOne",
  "aggregate",
  "countDocuments",
  "distinct",
]);

const assertSafeQuery = (query: Record<string, unknown>): MongoQuery => {
  const operation = String(query.operation || "") as MongoOperation;
  const collection = String(query.collection || "");

  if (!READ_OPERATIONS.has(operation)) {
    throw new Error(`Unsafe or unsupported operation: ${operation}`);
  }

  if (!collection || collection.startsWith("system.")) {
    throw new Error("A valid collection is required");
  }

  return query as MongoQuery;
};

class DataStoreMcpClient {
  async inspectDatabase(name?: string): Promise<unknown> {
    const db = getDB();
    const collections = name
      ? [await this.inspectCollection(name)]
      : await Promise.all(
          (await db.listCollections({}, { nameOnly: true }).toArray()).map((collection) =>
            this.inspectCollection(collection.name)
          )
        );

    return {
      connectionId: "retailos-direct-mongo",
      type: "mongodb",
      database: db.databaseName,
      collections,
      relationships: [],
    };
  }

  async queryDatabase(query: Record<string, unknown>): Promise<unknown> {
    const db = getDB();
    const payload = assertSafeQuery(query);
    const collection = db.collection(payload.collection);
    let results: unknown;

    switch (payload.operation) {
      case "find":
        results = await collection
          .find(payload.filter || {}, {
            projection: payload.projection,
            sort: payload.sort,
            limit: Math.max(1, Math.min(Number(payload.limit || 100), 100)),
            skip: payload.skip,
          })
          .toArray();
        break;
      case "findOne":
        results = await collection.findOne(payload.filter || {}, {
          projection: payload.projection,
          sort: payload.sort,
        });
        break;
      case "aggregate":
        results = await collection.aggregate(payload.pipeline || []).toArray();
        break;
      case "countDocuments":
        results = await collection.countDocuments(payload.filter || {});
        break;
      case "distinct":
        if (!payload.field) {
          throw new Error("MongoDB distinct queries require a field");
        }
        results = await collection.distinct(payload.field, payload.filter || {});
        break;
      default:
        throw new Error(`Unsafe or unsupported operation: ${payload.operation}`);
    }

    return {
      connectionId: "retailos-direct-mongo",
      type: "mongodb",
      database: db.databaseName,
      structure: await this.inspectCollection(payload.collection),
      query: payload,
      results,
    };
  }

  private async inspectCollection(collectionName: string): Promise<unknown> {
    const db = getDB();
    const collection = db.collection(collectionName);
    const [indexes, sample, estimatedDocumentCount] = await Promise.all([
      collection.indexes(),
      collection.findOne({}, { projection: { _id: 0 } }),
      collection.estimatedDocumentCount(),
    ]);

    return {
      name: collectionName,
      estimatedDocumentCount,
      sampleFields: sample ? Object.keys(sample) : [],
      indexes: indexes.map((index) => ({
        name: index.name,
        key: index.key,
        unique: Boolean(index.unique),
      })),
    };
  }
}

export const dataStoreMcp = new DataStoreMcpClient();

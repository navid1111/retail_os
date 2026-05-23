import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import path from "path";

type JsonRpcResponse = {
  id?: number;
  result?: unknown;
  error?: { message?: string };
};

type McpToolResult = {
  content?: Array<{ type: string; text?: string }>;
};

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  timeout: NodeJS.Timeout;
};

class DataStoreMcpClient {
  private child: ChildProcessWithoutNullStreams | null = null;
  private buffer = "";
  private nextId = 1;
  private pending = new Map<number, PendingRequest>();
  private startPromise: Promise<void> | null = null;
  private connectionPromise: Promise<string> | null = null;

  async inspectDatabase(name?: string): Promise<unknown> {
    const connectionId = await this.ensureDatabaseConnection();
    return this.callTool("inspect_database", { connectionId, name });
  }

  async queryDatabase(query: Record<string, unknown>): Promise<unknown> {
    const connectionId = await this.ensureDatabaseConnection();
    return this.callTool("query_database", { connectionId, query });
  }

  private async ensureDatabaseConnection(): Promise<string> {
    if (!this.connectionPromise) {
      this.connectionPromise = this.connectDatabase();
    }

    return this.connectionPromise;
  }

  private async connectDatabase(): Promise<string> {
    await this.ensureStarted();

    const uri = process.env.MONGODB_URI;
    const database = process.env.MONGODB_DB || "retailos";

    if (!uri) {
      throw new Error("MONGODB_URI is not configured");
    }

    const result = await this.callTool("connect_database", {
      type: "mongodb",
      uri,
      database,
      id: "retailos-admin-chat",
    });

    const connectionId = (result as { connectionId?: string }).connectionId;
    if (!connectionId) {
      throw new Error("MCP database connection did not return a connectionId");
    }

    return connectionId;
  }

  private async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    await this.ensureStarted();

    const result = (await this.request("tools/call", {
      name,
      arguments: args,
    })) as McpToolResult;

    const text = result.content?.find((item) => item.type === "text")?.text;
    if (!text) {
      return result;
    }

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  private async ensureStarted(): Promise<void> {
    if (!this.startPromise) {
      this.startPromise = this.start();
    }

    return this.startPromise;
  }

  private async start(): Promise<void> {
    const serverPath =
      process.env.DATA_STORE_MCP_PATH ||
      path.resolve(process.cwd(), "admin/data-store-mcp/dist/server.js");

    this.child = spawn("node", [serverPath], {
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
    });

    this.child.stdout.setEncoding("utf8");
    this.child.stdout.on("data", (chunk: string) => this.handleStdout(chunk));
    this.child.stderr.setEncoding("utf8");
    this.child.stderr.on("data", (chunk: string) => {
      if (process.env.NODE_ENV !== "test") {
        console.error(chunk.trim());
      }
    });
    this.child.on("exit", () => {
      this.child = null;
      this.startPromise = null;
      this.connectionPromise = null;
      this.rejectAllPending(new Error("Data-store MCP process exited"));
    });

    await this.request("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "retailos-api", version: "1.0.0" },
    });

    this.notify("notifications/initialized", {});
  }

  private handleStdout(chunk: string): void {
    this.buffer += chunk;

    while (this.buffer.includes("\n")) {
      const newlineIndex = this.buffer.indexOf("\n");
      const line = this.buffer.slice(0, newlineIndex).trim();
      this.buffer = this.buffer.slice(newlineIndex + 1);

      if (!line) {
        continue;
      }

      let message: JsonRpcResponse;
      try {
        message = JSON.parse(line);
      } catch {
        continue;
      }

      if (message.id === undefined) {
        continue;
      }

      const pending = this.pending.get(message.id);
      if (!pending) {
        continue;
      }

      clearTimeout(pending.timeout);
      this.pending.delete(message.id);

      if (message.error) {
        pending.reject(new Error(message.error.message || "MCP request failed"));
        continue;
      }

      pending.resolve(message.result);
    }
  }

  private request(method: string, params: Record<string, unknown>): Promise<unknown> {
    if (!this.child) {
      return Promise.reject(new Error("Data-store MCP process is not running"));
    }

    const id = this.nextId++;
    const payload = { jsonrpc: "2.0", id, method, params };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`MCP request timed out: ${method}`));
      }, 15000);

      this.pending.set(id, { resolve, reject, timeout });
      this.child?.stdin.write(`${JSON.stringify(payload)}\n`);
    });
  }

  private notify(method: string, params: Record<string, unknown>): void {
    this.child?.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method, params })}\n`);
  }

  private rejectAllPending(error: Error): void {
    this.pending.forEach((pending) => {
      clearTimeout(pending.timeout);
      pending.reject(error);
    });
    this.pending.clear();
  }
}

export const dataStoreMcp = new DataStoreMcpClient();

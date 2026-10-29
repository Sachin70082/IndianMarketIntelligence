import WebSocket from "ws";
import protobuf from "protobufjs";
import path from "path";
import { getMarketDataFeedAuthorizedUrl } from "./client";

let protoRoot: protobuf.Root | null = null;
let feedResponseType: protobuf.Type | null = null;

async function loadProto(): Promise<protobuf.Type> {
  if (feedResponseType) return feedResponseType;

  const protoPath = path.join(process.cwd(), "lib", "upstox", "proto", "MarketDataFeed.proto");
  protoRoot = await protobuf.load(protoPath);
  feedResponseType = protoRoot.lookupType("com.upstox.marketdatafeederv3udapi.rpc.proto.FeedResponse");
  return feedResponseType;
}

export type FeedCallback = (data: unknown) => void;

class UpstoxFeedManager {
  private ws: WebSocket | null = null;
  private isConnecting = false;
  private isConnected = false;
  private subscribedKeys = new Set<string>();
  private listeners = new Set<FeedCallback>();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  public async connect(): Promise<void> {
    if (this.isConnected || this.isConnecting) return;
    this.isConnecting = true;

    try {
      const authUrl = await getMarketDataFeedAuthorizedUrl();
      const Type = await loadProto();

      this.ws = new WebSocket(authUrl, {
        followRedirects: true,
      });

      this.ws.binaryType = "arraybuffer";

      this.ws.on("open", () => {
        this.isConnected = true;
        this.isConnecting = false;
        this.reconnectAttempts = 0;

        // Resubscribe keys if any
        if (this.subscribedKeys.size > 0) {
          this.sendSubscription(Array.from(this.subscribedKeys));
        }

        this.notifyListeners({
          type: "status",
          status: "CONNECTED",
          message: "Upstox WebSocket V3 connected",
        });
      });

      this.ws.on("message", (data: WebSocket.RawData) => {
        try {
          let buffer: Uint8Array;
          if (Buffer.isBuffer(data)) {
            buffer = new Uint8Array(data);
          } else if (data instanceof ArrayBuffer) {
            buffer = new Uint8Array(data);
          } else {
            return;
          }

          const decoded = Type.decode(buffer);
          const messageObj = Type.toObject(decoded, {
            longs: Number,
            enums: String,
            bytes: String,
          });

          this.notifyListeners({
            type: "feed",
            data: messageObj,
          });
        } catch {
          // Ignore partial or ping frames
        }
      });

      this.ws.on("close", (code, reason) => {
        this.isConnected = false;
        this.isConnecting = false;
        this.notifyListeners({
          type: "status",
          status: "DISCONNECTED",
          message: `WebSocket closed (${code}): ${reason.toString() || "Connection lost"}`,
        });
        this.scheduleReconnect();
      });

      this.ws.on("error", () => {
        this.isConnected = false;
        this.isConnecting = false;
        this.notifyListeners({
          type: "status",
          status: "ERROR",
          message: "Upstox WebSocket error encountered",
        });
        this.scheduleReconnect();
      });
    } catch (err: unknown) {
      this.isConnecting = false;
      this.isConnected = false;
      this.notifyListeners({
        type: "status",
        status: "ERROR",
        message: (err as Error)?.message || "Failed to initialize WebSocket feed",
      });
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.notifyListeners({
        type: "status",
        status: "DISCONNECTED",
        message: "Maximum reconnect attempts reached. Switching to REST polling.",
      });
      return;
    }

    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 15000);
    this.reconnectAttempts++;

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  public subscribe(keys: string[]): void {
    for (const k of keys) {
      this.subscribedKeys.add(k);
    }
    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.sendSubscription(keys);
    } else {
      this.connect();
    }
  }

  public unsubscribe(keys: string[]): void {
    for (const k of keys) {
      this.subscribedKeys.delete(k);
    }
    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.sendUnsubscription(keys);
    }
  }

  private sendSubscription(instrumentKeys: string[]): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const request = {
      guid: `sub_${Date.now()}`,
      method: "sub",
      data: {
        mode: "full",
        instrumentKeys,
      },
    };
    const binaryMessage = Buffer.from(JSON.stringify(request));
    this.ws.send(binaryMessage);
  }

  private sendUnsubscription(instrumentKeys: string[]): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const request = {
      guid: `unsub_${Date.now()}`,
      method: "unsub",
      data: {
        instrumentKeys,
      },
    };
    const binaryMessage = Buffer.from(JSON.stringify(request));
    this.ws.send(binaryMessage);
  }

  public addListener(cb: FeedCallback): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notifyListeners(data: unknown): void {
    for (const listener of this.listeners) {
      try {
        listener(data);
      } catch {
        // Safe listener execution
      }
    }
  }

  public getStatus(): { isConnected: boolean; isConnecting: boolean } {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
    };
  }

  public disconnect(): void {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.isConnecting = false;
  }
}

// Global singleton instance for the server process
declare global {
  // eslint-disable-next-line no-var
  var __upstoxFeedManager: UpstoxFeedManager | undefined;
}

export function getUpstoxFeedManager(): UpstoxFeedManager {
  if (!global.__upstoxFeedManager) {
    global.__upstoxFeedManager = new UpstoxFeedManager();
  }
  return global.__upstoxFeedManager;
}

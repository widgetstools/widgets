import type { EventMap, EventBusInstance } from '../types/common';

type Handler<T> = (payload: T) => void;

export class EventBus implements EventBusInstance {
  private listeners = new Map<string, Set<Handler<any>>>();

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    const handlers = this.listeners.get(event as string);
    if (!handlers) return;
    for (const handler of handlers) {
      handler(payload);
    }
  }

  on<K extends keyof EventMap>(
    event: K,
    handler: Handler<EventMap[K]>,
  ): () => void {
    const key = event as string;
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(handler);

    return () => {
      const handlers = this.listeners.get(key);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.listeners.delete(key);
        }
      }
    };
  }

  destroy(): void {
    this.listeners.clear();
  }
}

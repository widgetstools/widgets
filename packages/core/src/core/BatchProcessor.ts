import type { GridApi } from 'ag-grid-community';

interface TransactionItem {
  add?: Record<string, unknown>[];
  update?: Record<string, unknown>[];
  remove?: Record<string, unknown>[];
}

export class BatchProcessor {
  private pending: TransactionItem = {};
  private timer: ReturnType<typeof setTimeout> | null = null;
  private rowIdField: string;

  constructor(
    private readonly getApi: () => GridApi | null,
    private readonly waitMs: number = 100,
    rowIdField: string = 'id',
  ) {
    this.rowIdField = rowIdField;
  }

  enqueue(transaction: TransactionItem): void {
    if (transaction.add) {
      this.pending.add = [...(this.pending.add ?? []), ...transaction.add];
    }
    if (transaction.update) {
      this.mergeUpdates(transaction.update);
    }
    if (transaction.remove) {
      this.pending.remove = [...(this.pending.remove ?? []), ...transaction.remove];
    }
    this.scheduleFlush();
  }

  flush(): void {
    this.cancelTimer();
    const api = this.getApi();
    if (!api) return;

    const tx = this.pending;
    this.pending = {};

    const hasWork = (tx.add?.length ?? 0) + (tx.update?.length ?? 0) + (tx.remove?.length ?? 0) > 0;
    if (!hasWork) return;

    api.applyTransactionAsync({
      add: tx.add,
      update: tx.update,
      remove: tx.remove,
    });
  }

  destroy(): void {
    this.cancelTimer();
    this.pending = {};
  }

  private mergeUpdates(updates: Record<string, unknown>[]): void {
    if (!this.pending.update) {
      this.pending.update = updates;
      return;
    }
    const map = new Map<unknown, Record<string, unknown>>();
    for (const row of this.pending.update) {
      map.set(row[this.rowIdField], row);
    }
    for (const row of updates) {
      const id = row[this.rowIdField];
      const existing = map.get(id);
      if (existing) {
        Object.assign(existing, row);
      } else {
        map.set(id, row);
      }
    }
    this.pending.update = Array.from(map.values());
  }

  private scheduleFlush(): void {
    if (this.timer !== null) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.flush();
    }, this.waitMs);
  }

  private cancelTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

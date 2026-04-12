export class GridLifecycle {
  private cleanupFns = new Map<string, Set<() => void>>();

  register(gridId: string, cleanup: () => void): void {
    if (!this.cleanupFns.has(gridId)) {
      this.cleanupFns.set(gridId, new Set());
    }
    this.cleanupFns.get(gridId)!.add(cleanup);
  }

  destroy(gridId: string): void {
    const fns = this.cleanupFns.get(gridId);
    if (!fns) return;
    for (const fn of fns) {
      try {
        fn();
      } catch {
        // Swallow cleanup errors to ensure all cleanups run
      }
    }
    this.cleanupFns.delete(gridId);
  }

  destroyAll(): void {
    for (const gridId of this.cleanupFns.keys()) {
      this.destroy(gridId);
    }
  }

  has(gridId: string): boolean {
    return this.cleanupFns.has(gridId);
  }
}

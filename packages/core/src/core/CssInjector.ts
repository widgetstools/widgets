import type { CssInjectorInstance } from '../types/common';

const STYLE_ATTR = 'data-grid-customizer';

export class CssInjector implements CssInjectorInstance {
  private rules = new Map<string, string>();
  private styleElement: HTMLStyleElement | null = null;
  private dirty = false;
  private flushRAF: number | null = null;

  constructor(private readonly gridId: string) {}

  addRule(ruleId: string, cssText: string): void {
    const existing = this.rules.get(ruleId);
    if (existing === cssText) return;
    this.rules.set(ruleId, cssText);
    this.scheduleFlush();
  }

  removeRule(ruleId: string): void {
    if (!this.rules.has(ruleId)) return;
    this.rules.delete(ruleId);
    this.scheduleFlush();
  }

  clear(): void {
    if (this.rules.size === 0) return;
    this.rules.clear();
    this.scheduleFlush();
  }

  destroy(): void {
    if (this.flushRAF !== null) {
      cancelAnimationFrame(this.flushRAF);
      this.flushRAF = null;
    }
    if (this.styleElement?.parentNode) {
      this.styleElement.parentNode.removeChild(this.styleElement);
    }
    this.styleElement = null;
    this.rules.clear();
  }

  private scheduleFlush(): void {
    if (this.dirty) return;
    this.dirty = true;
    this.flushRAF = requestAnimationFrame(() => {
      this.flush();
      this.dirty = false;
      this.flushRAF = null;
    });
  }

  private flush(): void {
    this.ensureStyleElement();
    const parts: string[] = [];
    for (const [, cssText] of this.rules) {
      parts.push(cssText);
    }
    this.styleElement!.textContent = parts.join('\n');
  }

  private ensureStyleElement(): void {
    if (this.styleElement) return;
    this.styleElement = document.createElement('style');
    this.styleElement.setAttribute(STYLE_ATTR, this.gridId);
    document.head.appendChild(this.styleElement);
  }
}

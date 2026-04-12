import React, { useState, useMemo } from 'react';
import type { SettingsPanelProps } from '../../types/module';
import { ExpressionEngine } from '../../expression';
import { Icons } from '../../ui/icons';
import { Button } from '../../ui/shadcn/button';

const engine = new ExpressionEngine();

export function ExpressionEditorPanel({ gridId }: SettingsPanelProps) {
  const [expression, setExpression] = useState('');
  const [sampleData, setSampleData] = useState('{"price": 99.5, "quantity": 100, "status": "OPEN"}');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const validation = useMemo(() => engine.validate(expression), [expression]);

  const evaluationResult = useMemo(() => {
    if (!expression || !validation.valid) return null;
    try {
      const data = JSON.parse(sampleData);
      const result = engine.parseAndEvaluate(expression, {
        x: data.price ?? null,
        value: data.price ?? null,
        data,
        columns: data,
      });
      return { value: result, error: null };
    } catch (err) {
      return { value: null, error: (err as Error).message };
    }
  }, [expression, sampleData, validation.valid]);

  const functionsByCategory = useMemo(() => engine.getFunctionsByCategory(), []);
  const categories = Object.keys(functionsByCategory).sort();

  return (
    <div>
      {/* Expression Input */}
      <div className="gc-section">
        <div className="gc-section-title">Expression Playground</div>
        <p style={{ fontSize: 11, color: 'var(--gc-text-dim)', marginBottom: 8 }}>
          Test expressions before using them in Calculated Columns, Conditional Styling, or Named Queries.
        </p>
        <textarea
          className="flex w-full rounded border border-border bg-card px-2 py-1.5 text-[11px] text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
          style={{
            width: '100%',
            height: 80,
            resize: 'vertical',
            padding: 8,
            lineHeight: 1.6,
            borderColor: expression && !validation.valid ? 'var(--gc-danger)' : undefined,
          }}
          value={expression}
          onChange={(e) => setExpression(e.target.value)}
          placeholder="{price} * {quantity}"
          spellCheck={false}
        />
        {expression && !validation.valid && (
          <div style={{ fontSize: 11, color: 'var(--gc-danger)', marginTop: 4 }}>
            {validation.errors[0]?.message}
          </div>
        )}
      </div>

      {/* Sample Data */}
      <div className="gc-section">
        <div className="gc-section-title">Sample Row Data</div>
        <textarea
          className="flex w-full rounded border border-border bg-card px-2 py-1.5 text-[11px] text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
          style={{ width: '100%', height: 60, resize: 'vertical', padding: 8, lineHeight: 1.4 }}
          value={sampleData}
          onChange={(e) => setSampleData(e.target.value)}
          spellCheck={false}
        />
      </div>

      {/* Result */}
      <div className="gc-section">
        <div className="gc-section-title">Result</div>
        <div style={{
          background: 'var(--gc-bg)',
          border: '1px solid var(--gc-border)',
          borderRadius: 'var(--gc-radius-sm)',
          padding: '8px 12px',
          fontFamily: 'var(--gc-font-mono)',
          fontSize: 13,
          minHeight: 32,
          color: evaluationResult?.error ? 'var(--gc-danger)' : 'var(--gc-accent)',
        }}>
          {!expression ? (
            <span style={{ color: 'var(--gc-text-dim)' }}>Enter an expression above</span>
          ) : !validation.valid ? (
            <span style={{ color: 'var(--gc-danger)' }}>Invalid expression</span>
          ) : evaluationResult?.error ? (
            evaluationResult.error
          ) : (
            JSON.stringify(evaluationResult?.value)
          )}
        </div>
        {expression && validation.valid && (
          <div style={{ fontSize: 10, color: 'var(--gc-text-dim)', marginTop: 4 }}>
            Type: {typeof evaluationResult?.value}
            {(() => {
              try {
                const ast = engine.parse(expression);
                const agStr = engine.tryCompileToAgString(ast);
                if (agStr) return ` | AG-Grid string: ${agStr}`;
                return ' | Requires function evaluator';
              } catch { return ''; }
            })()}
          </div>
        )}
      </div>

      {/* Function Reference */}
      <div className="gc-section">
        <div className="gc-section-title">Function Reference ({engine.getFunctions().length})</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={activeCategory === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
            >
              {cat} ({functionsByCategory[cat].length})
            </Button>
          ))}
        </div>

        {activeCategory && functionsByCategory[activeCategory] && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {functionsByCategory[activeCategory].map((fn) => (
              <div
                key={fn.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '4px 8px',
                  fontSize: 11,
                  borderRadius: 'var(--gc-radius-sm)',
                  background: 'var(--gc-surface)',
                  cursor: 'pointer',
                }}
                onClick={() => setExpression((prev) => prev + fn.name + '(')}
                title={fn.description}
              >
                <code style={{ fontFamily: 'var(--gc-font-mono)', color: 'var(--gc-accent)', fontWeight: 600, minWidth: 100 }}>
                  {fn.signature}
                </code>
                <span style={{ color: 'var(--gc-text-dim)', flex: 1 }}>{fn.description}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

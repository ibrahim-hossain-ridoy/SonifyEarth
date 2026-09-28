import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathFormulaProps {
  expression: string;
  display?: boolean;
  className?: string;
}

export const MathFormula: React.FC<MathFormulaProps> = ({
  expression,
  display = false,
  className = '',
}) => {
  const rendered = useMemo(
    () => katex.renderToString(expression, { displayMode: display, throwOnError: false }),
    [display, expression]
  );

  return (
    <span
      className={`math-formula ${display ? 'math-formula-display' : 'math-formula-inline'} ${className}`}
      role="math"
      aria-label={expression}
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  );
};

import React from 'react';

interface DoubleBezelCardProps {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  glow?: 'cyan' | 'indigo' | 'amber' | 'none';
  id?: string;
}

export const DoubleBezelCard: React.FC<DoubleBezelCardProps> = ({
  children,
  className = '',
  innerClassName = '',
  glow = 'none',
  id,
}) => {
  const glowStyles = {
    cyan: 'shadow-glow-cyan/20 border-rain-500/25',
    indigo: 'shadow-glow-indigo/20 border-monsoon-500/25',
    amber: 'shadow-glow-amber/20 border-amberRisk-500/25',
    none: 'border-white/[0.08]',
  };

  return (
    <div
      id={id}
      className={`relative rounded-3xl p-1.5 md:p-2 bg-gradient-to-b from-white/[0.07] to-white/[0.02] border ${glowStyles[glow]} shadow-2xl transition-all duration-300 ${className}`}
    >
      <div
        className={`w-full h-full rounded-[calc(1.5rem-0.375rem)] bg-space-900/90 backdrop-blur-xl border border-white/[0.05] shadow-bezel-inner p-6 md:p-8 ${innerClassName}`}
      >
        {children}
      </div>
    </div>
  );
};

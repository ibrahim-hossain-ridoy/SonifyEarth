import React, { useEffect, useRef } from 'react';
import { audioEngine } from '../../lib/audioEngine';

interface AudioVisualizerProps {
  height?: number;
  barColor?: string;
  active?: boolean;
  label?: string;
  activity?: number;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  height = 70,
  barColor = '#38bdf8',
  active = false,
  label = 'AUDIO MONITOR',
  activity = 0.35,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let phase = 0;

    const render = () => {
      animId = requestAnimationFrame(render);
      const analyser = audioEngine.getAnalyser();

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Subtle background grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      const midY = canvas.height / 2;
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(canvas.width, midY);
      ctx.stroke();

      if (analyser && active) {
        const bufferLength = analyser.frequencyBinCount;
        const timeData = new Uint8Array(bufferLength);
        analyser.getByteTimeDomainData(timeData);

        // Draw Oscilloscope Waveform
        ctx.lineWidth = 2;
        ctx.strokeStyle = barColor;
        ctx.shadowColor = barColor;
        ctx.shadowBlur = 10;
        ctx.beginPath();

        const sliceWidth = canvas.width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = timeData[i] / 128.0;
          const y = (v * canvas.height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        ctx.stroke();
        ctx.shadowBlur = 0;

        // Draw frequency spectrum overlay
        const freqData = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(freqData);
        const barWidth = (canvas.width / (bufferLength / 2)) * 1.5;
        let barX = 0;

        for (let i = 0; i < bufferLength / 2; i += 2) {
          const barHeight = (freqData[i] / 255) * (canvas.height * 0.45);
          ctx.fillStyle = `${barColor}22`;
          ctx.fillRect(barX, canvas.height - barHeight, barWidth - 1, barHeight);
          barX += barWidth;
        }
      } else {
        // Idle gentle wave animation
        phase += 0.04;
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.beginPath();

        for (let x = 0; x < canvas.width; x += 3) {
          const y =
            midY +
            Math.sin(x * (0.022 + activity * 0.02) + phase) *
              (3 + activity * 12) *
              Math.sin(x * 0.01);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [active, activity, barColor]);

  return (
    <div className="relative w-full rounded-xl bg-space-950/80 border border-white/[0.06] overflow-hidden p-2">
      <div className="flex justify-between items-center px-1 pb-1">
        <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400">
          {label}
        </span>
        <span
          className={`inline-block w-2 h-2 rounded-full ${
            active ? 'bg-rain-400 animate-ping' : 'bg-slate-700'
          }`}
        />
      </div>
      <canvas
        ref={canvasRef}
        width={400}
        height={height}
        className="w-full h-auto block rounded"
      />
    </div>
  );
};

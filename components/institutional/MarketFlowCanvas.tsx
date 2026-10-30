'use client';

import React, { useEffect, useRef } from 'react';
import { SectorScreeningSummary, InstitutionalStockSignal } from '@/lib/institutional/types';

interface MarketFlowCanvasProps {
  sectors: SectorScreeningSummary[];
  bullishSignals: InstitutionalStockSignal[];
  bearishSignals: InstitutionalStockSignal[];
  selectedSymbol?: string;
  onHoverStock?: (symbol: string | null) => void;
}

interface Particle {
  x: number;
  y: number;
  speed: number;
  curveIndex: number;
  t: number; // 0 to 1 along curve
  isBull: boolean;
  size: number;
  alpha: number;
}

export function MarketFlowCanvas({
  sectors,
  bullishSignals,
  bearishSignals,
  selectedSymbol,
}: MarketFlowCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 600);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 650);

    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener('resize', handleResize);

    // Generate stream curve paths
    const bullCurveCount = 14;
    const bearCurveCount = 12;

    // Stream particles
    const particles: Particle[] = [];
    for (let i = 0; i < 45; i++) {
      particles.push({
        x: 0,
        y: 0,
        speed: 0.003 + Math.random() * 0.004,
        curveIndex: Math.floor(Math.random() * bullCurveCount),
        t: Math.random(),
        isBull: true,
        size: 1 + Math.random() * 2,
        alpha: 0.4 + Math.random() * 0.6,
      });
    }
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: 0,
        y: 0,
        speed: 0.003 + Math.random() * 0.004,
        curveIndex: Math.floor(Math.random() * bearCurveCount),
        t: Math.random(),
        isBull: false,
        size: 1 + Math.random() * 2,
        alpha: 0.4 + Math.random() * 0.6,
      });
    }

    let timeStep = 0;

    const render = () => {
      timeStep += 0.015;

      // 1. Clear background
      ctx.fillStyle = '#03060c';
      ctx.fillRect(0, 0, width, height);

      const midY = height * 0.52;
      const originX = 15;
      const centerColX = width * 0.68;
      const rightEdgeX = width;

      // 2. Subtle Background Grid & Horizontal Percentage Levels
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;

      const levels = [
        { y: height * 0.1, label: '+2.0%' },
        { y: height * 0.22, label: '+1.0%' },
        { y: height * 0.35, label: '+0.5%' },
        { y: midY, label: '0.00%', isCenter: true },
        { y: height * 0.68, label: '-0.5%' },
        { y: height * 0.82, label: '-1.0%' },
        { y: height * 0.92, label: '-2.0%' },
      ];

      levels.forEach((lvl) => {
        ctx.beginPath();
        if (lvl.isCenter) {
          ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
          ctx.setLineDash([4, 4]);
        } else {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
          ctx.setLineDash([2, 6]);
        }
        ctx.moveTo(originX, lvl.y);
        ctx.lineTo(centerColX, lvl.y);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.font = '9px monospace';
        ctx.fillStyle = lvl.isCenter ? 'rgba(6, 182, 212, 0.8)' : 'rgba(100, 116, 139, 0.5)';
        ctx.fillText(lvl.label, originX + 5, lvl.y - 3);
      });

      // 3. Bottom Time Axis Markers (09:15, 10:00, 11:00, 12:00, 13:00, 14:00, 15:00, 15:30)
      const times = ['09:15', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '15:30'];
      const timeStepWidth = (centerColX - originX) / (times.length - 1);
      ctx.fillStyle = 'rgba(100, 116, 139, 0.6)';
      ctx.font = '9px monospace';
      times.forEach((tStr, i) => {
        const tx = originX + i * timeStepWidth;
        ctx.fillText(tStr, tx - 12, height - 8);

        // Subtle vertical time tick
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
        ctx.beginPath();
        ctx.moveTo(tx, 20);
        ctx.lineTo(tx, height - 20);
        ctx.stroke();
      });

      // 4. Draw Upward Flowing Bullish Wave Streams (Origin to Center Column)
      for (let i = 0; i < bullCurveCount; i++) {
        const targetY = height * 0.08 + (i / (bullCurveCount - 1)) * (midY * 0.75);
        const waveAmp = 18 + Math.sin(timeStep + i) * 6;
        const cp1x = originX + (centerColX - originX) * 0.28;
        const cp1y = midY - waveAmp * 1.5;
        const cp2x = originX + (centerColX - originX) * 0.65;
        const cp2y = targetY + Math.cos(timeStep + i * 0.5) * 8;

        ctx.beginPath();
        ctx.moveTo(originX, midY);
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, centerColX, targetY);

        ctx.strokeStyle = `rgba(16, 185, 129, ${0.15 + (i % 3 === 0 ? 0.35 : 0.15)})`;
        ctx.lineWidth = i % 4 === 0 ? 2 : 1.2;
        ctx.stroke();
      }

      // 5. Draw Downward Flowing Bearish Wave Streams (Origin to Center Column)
      for (let i = 0; i < bearCurveCount; i++) {
        const targetY = midY + height * 0.08 + (i / (bearCurveCount - 1)) * (height * 0.36);
        const waveAmp = 16 + Math.sin(timeStep + i * 1.2) * 6;
        const cp1x = originX + (centerColX - originX) * 0.3;
        const cp1y = midY + waveAmp * 1.5;
        const cp2x = originX + (centerColX - originX) * 0.65;
        const cp2y = targetY + Math.sin(timeStep + i * 0.8) * 8;

        ctx.beginPath();
        ctx.moveTo(originX, midY);
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, centerColX, targetY);

        ctx.strokeStyle = `rgba(244, 63, 94, ${0.15 + (i % 3 === 0 ? 0.35 : 0.15)})`;
        ctx.lineWidth = i % 4 === 0 ? 2 : 1.2;
        ctx.stroke();
      }

      // 6. Draw Stream Particles
      particles.forEach((p) => {
        p.t += p.speed;
        if (p.t > 1) p.t = 0;

        const i = p.curveIndex;
        let startY = midY;
        let targetY: number;
        let cp1y: number;
        let cp2y: number;

        if (p.isBull) {
          targetY = height * 0.08 + (i / (bullCurveCount - 1)) * (midY * 0.75);
          cp1y = midY - 24;
          cp2y = targetY;
        } else {
          targetY = midY + height * 0.08 + (i / (bearCurveCount - 1)) * (height * 0.36);
          cp1y = midY + 24;
          cp2y = targetY;
        }

        const cp1x = originX + (centerColX - originX) * 0.28;
        const cp2x = originX + (centerColX - originX) * 0.65;

        // Cubic bezier interpolation
        const u = 1 - p.t;
        const tt = p.t * p.t;
        const uu = u * u;
        const uuu = uu * u;
        const ttt = tt * p.t;

        const px = uuu * originX + 3 * uu * p.t * cp1x + 3 * u * tt * cp2x + ttt * centerColX;
        const py = uuu * startY + 3 * uu * p.t * cp1y + 3 * u * tt * cp2y + ttt * targetY;

        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.isBull
          ? `rgba(52, 211, 153, ${p.alpha})`
          : `rgba(251, 113, 133, ${p.alpha})`;
        ctx.shadowColor = p.isBull ? '#10b981' : '#f43f5e';
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // 7. Central Order Flow Column & Intensity Histogram (x = centerColX to centerColX + 36)
      const colW = 38;
      const colX = centerColX;

      // Column Background
      ctx.fillStyle = 'rgba(7, 13, 26, 0.9)';
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
      ctx.lineWidth = 1;
      ctx.fillRect(colX, 25, colW, height - 50);
      ctx.strokeRect(colX, 25, colW, height - 50);

      // Top Demand Bracket Box [ ]
      const topBracketY = height * 0.08;
      const topBracketH = height * 0.34;
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      // Top-left corner
      ctx.strokeRect(colX - 4, topBracketY, 6, 6);
      // Top-right corner
      ctx.strokeRect(colX + colW - 2, topBracketY, 6, 6);
      // Bottom corners
      ctx.strokeRect(colX - 4, topBracketY + topBracketH - 6, 6, 6);
      ctx.strokeRect(colX + colW - 2, topBracketY + topBracketH - 6, 6, 6);

      // Bottom Supply Bracket Box [ ]
      const botBracketY = midY + height * 0.06;
      const botBracketH = height * 0.34;
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(colX - 4, botBracketY, 6, 6);
      ctx.strokeRect(colX + colW - 2, botBracketY, 6, 6);
      ctx.strokeRect(colX - 4, botBracketY + botBracketH - 6, 6, 6);
      ctx.strokeRect(colX + colW - 2, botBracketY + botBracketH - 6, 6, 6);

      // Horizontal Order-Flow Intensity Ticks
      const tickCount = 45;
      for (let i = 0; i < tickCount; i++) {
        const ty = 30 + (i / tickCount) * (height - 60);
        const isUpper = ty < midY;
        const tickLen = 6 + Math.sin(i * 0.8 + timeStep) * 12 + ((i % 5 === 0) ? 14 : 0);

        ctx.beginPath();
        ctx.moveTo(colX + 2, ty);
        ctx.lineTo(colX + 2 + Math.min(colW - 4, Math.max(4, tickLen)), ty);
        ctx.strokeStyle = isUpper ? 'rgba(16, 185, 129, 0.7)' : 'rgba(244, 63, 94, 0.7)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Readout metrics at center
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('210', colX - 22, midY - 6);
      ctx.fillStyle = 'rgba(6, 182, 212, 0.9)';
      ctx.fillText('40', colX + colW + 8, midY - 6);

      // 8. Connecting Fan-Out Bezier Tentacles from Center Column to Right Stock Cards
      // Green connectors to Bullish Cards (Upper right)
      const bullOutCount = 10;
      for (let i = 0; i < bullOutCount; i++) {
        const startY = topBracketY + (i / bullOutCount) * topBracketH;
        const endY = height * 0.05 + (i / bullOutCount) * (height * 0.42);
        const cp1 = colX + colW + 40;
        const cp2 = rightEdgeX - 40;

        ctx.beginPath();
        ctx.moveTo(colX + colW, startY);
        ctx.bezierCurveTo(cp1, startY, cp2, endY, rightEdgeX, endY);
        ctx.strokeStyle = `rgba(16, 185, 129, ${0.2 + (i % 2 === 0 ? 0.35 : 0.15)})`;
        ctx.lineWidth = i % 3 === 0 ? 1.8 : 1;
        ctx.stroke();
      }

      // Red connectors to Bearish Cards (Lower right)
      const bearOutCount = 10;
      for (let i = 0; i < bearOutCount; i++) {
        const startY = botBracketY + (i / bearOutCount) * botBracketH;
        const endY = midY + height * 0.05 + (i / bearOutCount) * (height * 0.42);
        const cp1 = colX + colW + 40;
        const cp2 = rightEdgeX - 40;

        ctx.beginPath();
        ctx.moveTo(colX + colW, startY);
        ctx.bezierCurveTo(cp1, startY, cp2, endY, rightEdgeX, endY);
        ctx.strokeStyle = `rgba(244, 63, 94, ${0.2 + (i % 2 === 0 ? 0.35 : 0.15)})`;
        ctx.lineWidth = i % 3 === 0 ? 1.8 : 1;
        ctx.stroke();
      }

      // Neutral Cyan Transition Curve (Equilibrium)
      ctx.beginPath();
      ctx.moveTo(colX + colW, midY);
      ctx.bezierCurveTo(colX + colW + 60, midY, rightEdgeX - 50, midY, rightEdgeX, midY);
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.7)';
      ctx.lineWidth = 2;
      ctx.stroke();

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [sectors, bullishSignals, bearishSignals, selectedSymbol]);

  return (
    <div className="relative w-full h-full min-h-[550px] bg-[#03060c] flex items-center justify-center overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}


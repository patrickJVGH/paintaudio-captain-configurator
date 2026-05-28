import React from 'react';
import { hexToRgb } from '@/utils/parser';
import type { KeyConfig, LedColor } from '@/types/midi';

interface VirtualPedalProps {
  keys: KeyConfig[];
  currentStates: number[];
  selectedKey: number | null;
  onKeyClick: (index: number) => void;
  onKeySelect: (index: number) => void;
}

const BUTTON_POSITIONS = [
  { x: 60, y: 50 },
  { x: 180, y: 50 },
  { x: 300, y: 50 },
  { x: 60, y: 160 },
  { x: 180, y: 160 },
  { x: 300, y: 160 },
];

const LED_ARCS: Array<{ start: number; end: number; segment: keyof LedColor }> = [
  { start: -90, end: 30, segment: 'seg1' },
  { start: 30, end: 150, segment: 'seg2' },
  { start: 150, end: 270, segment: 'seg3' },
];

const VirtualPedal: React.FC<VirtualPedalProps> = ({
  keys,
  currentStates,
  selectedKey,
  onKeyClick,
  onKeySelect,
}) => {
  return (
    <div className="flex flex-col items-center gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        MIDI Captain MINI 6
      </h2>
      <svg
        viewBox="0 0 380 240"
        className="w-full max-w-md pedal-shadow rounded-2xl"
        style={{ background: 'hsl(var(--pedal-surface))' }}
      >
        <rect x="0" y="0" width="380" height="240" rx="16" fill="hsl(220, 15%, 16%)" stroke="hsl(220, 15%, 25%)" strokeWidth="2" />

        {[[15, 15], [365, 15], [15, 225], [365, 225]].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="4" fill="hsl(220, 10%, 30%)" stroke="hsl(220, 10%, 35%)" strokeWidth="1" />
        ))}

        <text x="190" y="228" textAnchor="middle" fill="hsl(220, 10%, 35%)" fontSize="8" fontFamily="Inter, sans-serif" fontWeight="600">
          PAINTAUDIO - SUPER MODE
        </text>

        {keys.map((key, i) => {
          const pos = BUTTON_POSITIONS[i];
          const stateIdx = currentStates[i] || 0;
          const state = key.states[stateIdx];
          const isSelected = selectedKey === i;
          const colors = state?.ledColor || { seg1: '0x000000', seg2: '0x000000', seg3: '0x000000' };

          return (
            <g key={i}>
              <circle
                cx={pos.x}
                cy={pos.y}
                r="34.5"
                fill="none"
                stroke="hsl(220, 12%, 16%)"
                strokeWidth="9"
                opacity="0.75"
                className="pointer-events-none"
              />

              {LED_ARCS.map((arc) => (
                <LedArc
                  key={arc.segment}
                  cx={pos.x}
                  cy={pos.y}
                  startAngle={arc.start}
                  endAngle={arc.end}
                  color={hexToRgb(colors[arc.segment])}
                />
              ))}

              <circle
                cx={pos.x}
                cy={pos.y}
                r="28"
                fill={isSelected ? 'hsl(220, 12%, 28%)' : 'hsl(220, 12%, 22%)'}
                stroke={isSelected ? 'hsl(var(--primary))' : 'hsl(220, 12%, 30%)'}
                strokeWidth={isSelected ? 2.5 : 1.5}
                className="cursor-pointer transition-all"
                onClick={(e) => {
                  e.stopPropagation();
                  onKeySelect(i);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  onKeyClick(i);
                }}
              />

              <circle cx={pos.x} cy={pos.y} r="22" fill="none" stroke="hsl(220, 10%, 28%)" strokeWidth="0.5" className="pointer-events-none" />

              <text
                x={pos.x}
                y={pos.y + 4}
                textAnchor="middle"
                fill="hsl(var(--foreground))"
                fontSize="11"
                fontFamily="JetBrains Mono, monospace"
                fontWeight="600"
                className="pointer-events-none select-none"
              >
                {i + 1}
              </text>

              <text
                x={pos.x}
                y={pos.y + 50}
                textAnchor="middle"
                fill="hsl(var(--muted-foreground))"
                fontSize="8"
                fontFamily="JetBrains Mono, monospace"
                className="pointer-events-none"
              >
                {stateIdx + 1}/{key.keytimes}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="text-xs text-muted-foreground">
        Clique para selecionar - Duplo-clique para simular
      </p>
    </div>
  );
};

interface LedArcProps {
  cx: number;
  cy: number;
  startAngle: number;
  endAngle: number;
  color: string;
}

const LedArc: React.FC<LedArcProps> = ({ cx, cy, startAngle, endAngle, color }) => {
  const radius = 34.5;
  const path = describeArc(cx, cy, radius, startAngle, endAngle);

  const isBlack = color === 'rgb(0, 0, 0)';
  const strokeColor = isBlack ? 'hsl(220, 12%, 19%)' : color;
  const dimOpacity = isBlack ? 0.45 : 1;

  return (
    <>
      {!isBlack && (
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="16"
          strokeLinecap="round"
          strokeOpacity="0.48"
          style={{ filter: 'blur(3px)' }}
          className="pointer-events-none"
        />
      )}
      <path
        d={path}
        fill="none"
        stroke={strokeColor}
        strokeWidth="8"
        strokeLinecap="round"
        opacity={dimOpacity}
        className="pointer-events-none"
      />
      {!isBlack && (
        <path
          d={path}
          fill="none"
          stroke="rgba(255, 255, 255, 0.55)"
          strokeWidth="2"
          strokeLinecap="round"
          className="pointer-events-none"
        />
      )}
    </>
  );
};

function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, radius, startAngle);
  const end = polarToCartesian(cx, cy, radius, endAngle);
  const sweep = endAngle - startAngle;
  const largeArcFlag = Math.abs(sweep) > 180 ? 1 : 0;
  const sweepFlag = sweep >= 0 ? 1 : 0;

  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${end.x} ${end.y}`;
}

function polarToCartesian(cx: number, cy: number, radius: number, angleInDegrees: number): { x: number; y: number } {
  const radians = (angleInDegrees * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
}

export default VirtualPedal;

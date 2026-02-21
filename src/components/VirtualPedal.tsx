import React from 'react';
import { hexToRgb } from '@/utils/parser';
import type { KeyConfig } from '@/types/midi';

interface VirtualPedalProps {
  keys: KeyConfig[];
  currentStates: number[];
  selectedKey: number | null;
  onKeyClick: (index: number) => void;
  onKeySelect: (index: number) => void;
}

const BUTTON_POSITIONS = [
  { x: 60, y: 50 },   // key0 - top left
  { x: 180, y: 50 },  // key1 - top center
  { x: 300, y: 50 },  // key2 - top right
  { x: 60, y: 160 },  // key3 - bottom left
  { x: 180, y: 160 }, // key4 - bottom center
  { x: 300, y: 160 }, // key5 - bottom right
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
        {/* Pedal body */}
        <rect x="0" y="0" width="380" height="240" rx="16" fill="hsl(220, 15%, 16%)" stroke="hsl(220, 15%, 25%)" strokeWidth="2" />
        
        {/* Screws */}
        {[[15, 15], [365, 15], [15, 225], [365, 225]].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="4" fill="hsl(220, 10%, 30%)" stroke="hsl(220, 10%, 35%)" strokeWidth="1" />
        ))}

        {/* Label */}
        <text x="190" y="228" textAnchor="middle" fill="hsl(220, 10%, 35%)" fontSize="8" fontFamily="Inter, sans-serif" fontWeight="600">
          PAINTAUDIO · SUPER MODE
        </text>

        {keys.map((key, i) => {
          const pos = BUTTON_POSITIONS[i];
          const stateIdx = currentStates[i] || 0;
          const state = key.states[stateIdx];
          const isSelected = selectedKey === i;
          const colors = state?.ledColor || { seg1: '0x000000', seg2: '0x000000', seg3: '0x000000' };

          return (
            <g key={i}>
              {/* LED ring segments */}
              <LedSegment cx={pos.x} cy={pos.y} angle={-30} color={hexToRgb(colors.seg1)} />
              <LedSegment cx={pos.x} cy={pos.y} angle={90} color={hexToRgb(colors.seg2)} />
              <LedSegment cx={pos.x} cy={pos.y} angle={210} color={hexToRgb(colors.seg3)} />

              {/* Button body */}
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

              {/* Button surface texture */}
              <circle cx={pos.x} cy={pos.y} r="22" fill="none" stroke="hsl(220, 10%, 28%)" strokeWidth="0.5" className="pointer-events-none" />

              {/* Label */}
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

              {/* State indicator */}
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
        Clique para selecionar · Duplo-clique para simular
      </p>
    </div>
  );
};

interface LedSegmentProps {
  cx: number;
  cy: number;
  angle: number;
  color: string;
}

const LedSegment: React.FC<LedSegmentProps> = ({ cx, cy, angle, color }) => {
  const r = 36;
  const segLength = 8;
  const rad = (angle * Math.PI) / 180;
  const x = cx + r * Math.cos(rad);
  const y = cy + r * Math.sin(rad);

  const isBlack = color === 'rgb(0, 0, 0)';

  return (
    <>
      {!isBlack && (
        <circle cx={x} cy={y} r="6" fill={color} opacity="0.25" className="pointer-events-none" />
      )}
      <rect
        x={x - segLength / 2}
        y={y - 2}
        width={segLength}
        height={4}
        rx="2"
        fill={isBlack ? 'hsl(220, 10%, 20%)' : color}
        transform={`rotate(${angle}, ${x}, ${y})`}
        className="pointer-events-none"
        opacity={isBlack ? 0.3 : 1}
      />
    </>
  );
};

export default VirtualPedal;

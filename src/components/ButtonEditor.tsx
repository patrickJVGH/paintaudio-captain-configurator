import React, { useEffect, useState } from 'react';
import type { KeyConfig, LedMode } from '@/types/midi';
import { hexToInput, rgbInputToHex } from '@/utils/parser';
import { Palette, Copy, ClipboardPaste, Pipette } from 'lucide-react';

interface ButtonEditorProps {
  keyConfig: KeyConfig;
  keyIndex: number;
  onUpdate: (keyIndex: number, updated: KeyConfig) => void;
}

const LED_MODES: LedMode[] = ['normal', 'select', 'toggle', 'tap'];

const PRESET_COLORS = [
  { name: 'Vermelho', color: '0xFF0000' },
  { name: 'Verde', color: '0x00FF00' },
  { name: 'Azul', color: '0x0000FF' },
  { name: 'Amarelo', color: '0xFFFF00' },
  { name: 'Laranja', color: '0xFF8000' },
  { name: 'Roxo', color: '0x8000FF' },
  { name: 'Ciano', color: '0x00FFFF' },
  { name: 'Rosa', color: '0xFF0080' },
  { name: 'Branco', color: '0xFFFFFF' },
  { name: 'Desligado', color: '0x000000' },
];

type CommandField = 'shortDw' | 'shortUp' | 'longDw' | 'longUp';

function parseBuilderCommand(raw: string): { type: 'CC' | 'PC' | 'NT'; channel: number; param: number; value?: number } | null {
  const trimmed = (raw || '').trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^\[(\d+)\]\[(CC|PC|NT)\]\[(\d+)\](?:\[(\d+)\])?$/i);
  if (!match) return null;

  const [, channelRaw, typeRaw, paramRaw, valueRaw] = match;
  const type = typeRaw.toUpperCase() as 'CC' | 'PC' | 'NT';

  return {
    type,
    channel: Number(channelRaw),
    param: Number(paramRaw),
    value: valueRaw !== undefined ? Number(valueRaw) : undefined,
  };
}

const ButtonEditor: React.FC<ButtonEditorProps> = ({ keyConfig, keyIndex, onUpdate }) => {
  const [activeState, setActiveState] = useState(0);
  const [copiedColors, setCopiedColors] = useState<{ seg1: string; seg2: string; seg3: string } | null>(null);
  const [commandMode, setCommandMode] = useState<'raw' | 'builder'>('raw');

  const updateKeytimes = (val: number) => {
    const clamped = Math.max(1, Math.min(4, val));
    const updated = { ...keyConfig, keytimes: clamped };
    while (updated.states.length < clamped) {
      updated.states = [...updated.states, {
        ledColor: { seg1: '0x000000', seg2: '0x000000', seg3: '0x000000' },
        shortDw: '', shortUp: '', longDw: '', longUp: '',
      }];
    }
    if (activeState >= clamped) setActiveState(clamped - 1);
    onUpdate(keyIndex, updated);
  };

  const updateLedMode = (mode: LedMode) => {
    onUpdate(keyIndex, { ...keyConfig, ledmode: mode });
  };

  const updateColor = (stateIdx: number, segment: 'seg1' | 'seg2' | 'seg3', color: string) => {
    const states = [...keyConfig.states];
    states[stateIdx] = {
      ...states[stateIdx],
      ledColor: { ...states[stateIdx].ledColor, [segment]: rgbInputToHex(color) },
    };
    onUpdate(keyIndex, { ...keyConfig, states });
  };

  const applyPreset = (color: string) => {
    const states = [...keyConfig.states];
    states[activeState] = {
      ...states[activeState],
      ledColor: { seg1: color, seg2: color, seg3: color },
    };
    onUpdate(keyIndex, { ...keyConfig, states });
  };

  const copyColors = () => {
    setCopiedColors({ ...keyConfig.states[activeState].ledColor });
  };

  const pasteColors = () => {
    if (!copiedColors) return;
    const states = [...keyConfig.states];
    states[activeState] = { ...states[activeState], ledColor: { ...copiedColors } };
    onUpdate(keyIndex, { ...keyConfig, states });
  };

  const updateCommand = (stateIdx: number, field: 'shortDw' | 'shortUp' | 'longDw' | 'longUp', value: string) => {
    const states = [...keyConfig.states];
    states[stateIdx] = { ...states[stateIdx], [field]: value };
    onUpdate(keyIndex, { ...keyConfig, states });
  };

  const currentState = keyConfig.states[activeState];
  if (!currentState) return null;

  const missingFields: string[] = [];
  for (let i = 0; i < keyConfig.keytimes; i++) {
    if (!keyConfig.existingFields.has(`ledcolor${i + 1}`)) missingFields.push(`ledcolor${i + 1}`);
    if (!keyConfig.existingFields.has(`short_dw${i + 1}`)) missingFields.push(`short_dw${i + 1}`);
  }

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">
          Botão {keyIndex + 1}
        </h3>
        <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-mono text-primary">
          key{keyIndex}
        </span>
      </div>

      {/* Keytimes & LedMode */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Keytimes</label>
          <div className="flex items-center gap-2">
            <button onClick={() => updateKeytimes(keyConfig.keytimes - 1)} className="rounded bg-secondary px-2.5 py-1 text-sm font-bold text-secondary-foreground hover:bg-secondary/80">−</button>
            <span className="w-8 text-center font-mono text-lg font-bold">{keyConfig.keytimes}</span>
            <button onClick={() => updateKeytimes(keyConfig.keytimes + 1)} className="rounded bg-secondary px-2.5 py-1 text-sm font-bold text-secondary-foreground hover:bg-secondary/80">+</button>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">LED Mode</label>
          <select
            value={keyConfig.ledmode}
            onChange={(e) => updateLedMode(e.target.value as LedMode)}
            className="w-full rounded border border-border bg-secondary px-2 py-1.5 text-sm text-secondary-foreground"
          >
            {LED_MODES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* State tabs */}
      <div className="flex gap-1">
        {Array.from({ length: keyConfig.keytimes }, (_, i) => (
          <button
            key={i}
            onClick={() => setActiveState(i)}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeState === i
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            Estado {i + 1}
          </button>
        ))}
      </div>

      {/* Color editor */}
      <div className="rounded-lg border border-border bg-card/50 p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Cores LED
          </span>
          <div className="flex gap-1">
            <button onClick={copyColors} title="Copiar cores" className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground">
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button onClick={pasteColors} title="Colar cores" disabled={!copiedColors} className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30">
              <ClipboardPaste className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {(['seg1', 'seg2', 'seg3'] as const).map((seg, i) => (
            <div key={seg} className="flex flex-col items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">Seg {i + 1}</span>
              <input
                type="color"
                value={hexToInput(currentState.ledColor[seg])}
                onChange={(e) => updateColor(activeState, seg, e.target.value)}
                className="h-8 w-full cursor-pointer rounded border border-border bg-transparent"
              />
              <input
                type="text"
                value={currentState.ledColor[seg]}
                onChange={(e) => updateColor(activeState, seg, e.target.value)}
                className="w-full rounded border border-border bg-secondary px-1.5 py-0.5 text-center font-mono text-[10px] text-secondary-foreground"
                placeholder="0xRRGGBB"
              />
            </div>
          ))}
        </div>

        {/* Presets */}
        <div className="mt-3">
          <div className="mb-1.5 flex items-center gap-1">
            <Palette className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Presets</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {PRESET_COLORS.map(p => (
              <button
                key={p.name}
                onClick={() => applyPreset(p.color)}
                title={p.name}
                className="h-5 w-5 rounded-sm border border-border transition-transform hover:scale-125"
                style={{ backgroundColor: `#${p.color.replace('0x', '')}` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Command editor */}
      <div className="rounded-lg border border-border bg-card/50 p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Comandos — Estado {activeState + 1}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setCommandMode('raw')}
              className={`rounded px-2 py-0.5 text-[10px] font-medium ${commandMode === 'raw' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}
            >
              Raw
            </button>
            <button
              onClick={() => setCommandMode('builder')}
              className={`rounded px-2 py-0.5 text-[10px] font-medium ${commandMode === 'builder' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}
            >
              Builder
            </button>
          </div>
        </div>

        {commandMode === 'raw' ? (
          <div className="space-y-2">
            {[
              { label: 'Short Press ↓', field: 'shortDw' as const },
              { label: 'Short Press ↑', field: 'shortUp' as const },
              { label: 'Long Press ↓', field: 'longDw' as const },
              { label: 'Long Press ↑', field: 'longUp' as const },
            ].map(({ label, field }) => (
              <div key={field}>
                <label className="mb-0.5 block text-[10px] text-muted-foreground">{label}</label>
                <input
                  type="text"
                  value={currentState[field]}
                  onChange={(e) => updateCommand(activeState, field, e.target.value)}
                  className="w-full rounded border border-border bg-secondary px-2 py-1 font-mono text-xs text-secondary-foreground"
                  placeholder="(vazio)"
                />
              </div>
            ))}
          </div>
        ) : (
          <CommandBuilder
            keyIndex={keyIndex}
            currentState={currentState}
            activeState={activeState}
            onUpdate={(field, value) => updateCommand(activeState, field, value)}
          />
        )}
      </div>

      {/* Warnings */}
      {missingFields.length > 0 && (
        <div className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning">
          ⚠ Campos ausentes no template: {missingFields.join(', ')}. O app criará estes campos no TXT ao exportar/salvar.
        </div>
      )}
    </div>
  );
};

// Builder sub-component
const CommandBuilder: React.FC<{
  keyIndex: number;
  currentState: { shortDw: string; shortUp: string; longDw: string; longUp: string };
  activeState: number;
  onUpdate: (field: CommandField, value: string) => void;
}> = ({ keyIndex, currentState, activeState, onUpdate }) => {
  const [type, setType] = useState<'CC' | 'PC' | 'NT'>('CC');
  const [channel, setChannel] = useState(1);
  const [param, setParam] = useState(0);
  const [value, setValue] = useState(127);
  const [targetField, setTargetField] = useState<CommandField>('shortDw');

  useEffect(() => {
    const firstFilledField =
      (['shortDw', 'shortUp', 'longDw', 'longUp'] as const).find((field) => currentState[field]?.trim()) || 'shortDw';
    setTargetField(firstFilledField);
  }, [keyIndex, activeState]);

  useEffect(() => {
    const parsed = parseBuilderCommand(currentState[targetField]);
    if (!parsed) {
      return;
    }

    setType(parsed.type);
    setChannel(Number.isFinite(parsed.channel) ? parsed.channel : 1);
    setParam(Number.isFinite(parsed.param) ? parsed.param : 0);

    if (parsed.type !== 'PC') {
      setValue(Number.isFinite(parsed.value ?? NaN) ? (parsed.value as number) : 127);
    }
  }, [currentState, targetField]);

  const generate = () => {
    let cmd = '';
    if (type === 'CC') cmd = `[${channel}][CC][${param}][${value}]`;
    else if (type === 'PC') cmd = `[${channel}][PC][${param}]`;
    else cmd = `[${channel}][NT][${param}][${value}]`;
    onUpdate(targetField, cmd);
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-muted-foreground">Tipo</label>
          <select value={type} onChange={e => setType(e.target.value as 'CC' | 'PC' | 'NT')} className="w-full rounded border border-border bg-secondary px-2 py-1 text-xs text-secondary-foreground">
            <option value="CC">CC (Control Change)</option>
            <option value="PC">PC (Program Change)</option>
            <option value="NT">NT (Note)</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">Destino</label>
          <select value={targetField} onChange={e => setTargetField(e.target.value as CommandField)} className="w-full rounded border border-border bg-secondary px-2 py-1 text-xs text-secondary-foreground">
            <option value="shortDw">Short Press ↓</option>
            <option value="shortUp">Short Press ↑</option>
            <option value="longDw">Long Press ↓</option>
            <option value="longUp">Long Press ↑</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] text-muted-foreground">Canal (1-16)</label>
          <input type="number" min={1} max={16} value={channel} onChange={e => setChannel(+e.target.value)} className="w-full rounded border border-border bg-secondary px-2 py-1 font-mono text-xs text-secondary-foreground" />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">Número</label>
          <input type="number" min={0} max={127} value={param} onChange={e => setParam(+e.target.value)} className="w-full rounded border border-border bg-secondary px-2 py-1 font-mono text-xs text-secondary-foreground" />
        </div>
        {type !== 'PC' && (
          <div>
            <label className="text-[10px] text-muted-foreground">Valor</label>
            <input type="number" min={0} max={127} value={value} onChange={e => setValue(+e.target.value)} className="w-full rounded border border-border bg-secondary px-2 py-1 font-mono text-xs text-secondary-foreground" />
          </div>
        )}
      </div>
      <button onClick={generate} className="w-full rounded bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
        Aplicar Comando
      </button>
    </div>
  );
};

export default ButtonEditor;

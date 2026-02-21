export type LedMode = 'normal' | 'select' | 'toggle' | 'tap';

export interface LedColor {
  seg1: string; // 0xRRGGBB
  seg2: string;
  seg3: string;
}

export interface MidiCommand {
  raw: string;
  parsed?: {
    channel: number;
    type: 'CC' | 'PC' | 'NT';
    param: number;
    value: number;
  };
}

export interface KeyState {
  ledColor: LedColor;
  shortDw: string;
  shortUp: string;
  longDw: string;
  longUp: string;
}

export interface KeyConfig {
  index: number; // 0-5
  keytimes: number;
  ledmode: LedMode;
  states: KeyState[];
  // Track which fields exist in the original file
  existingFields: Set<string>;
}

export interface GlobalConfig {
  display_pc_offset?: string;
  ledbright?: string;
  screenbright?: string;
  midithrough?: string;
  [key: string]: string | undefined;
}

export interface PageConfig {
  page_name?: string;
  [key: string]: string | undefined;
}

export interface PedalConfig {
  originalLines: string[];
  global: GlobalConfig;
  page: PageConfig;
  keys: KeyConfig[];
  // Map of lineIndex -> { section, field } for reconstruction
  lineMap: LineMapping[];
}

export interface LineMapping {
  lineIndex: number;
  section: string; // 'globalsetup' | 'PAGE' | 'key0'..'key5'
  field: string;
}

export interface SimulationState {
  currentStates: number[]; // current state index for each key (0-based)
}

export interface EventLog {
  timestamp: number;
  keyIndex: number;
  stateIndex: number;
  action: string;
  commands: string[];
}

export interface ColorPreset {
  name: string;
  color: string; // 0xRRGGBB
}

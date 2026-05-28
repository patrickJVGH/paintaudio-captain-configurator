export interface MidiCaptainFileInfo {
  name: string;
  size: number;
  modifiedAt: string;
}

export interface MidiCaptainDeviceInfo {
  id: string;
  label: string;
  root: string;
  configPath: string;
  files: MidiCaptainFileInfo[];
}

export interface MidiCaptainReadRequest {
  deviceId: string;
  fileName: string;
}

export interface MidiCaptainWriteRequest {
  deviceId: string;
  fileName: string;
  content: string;
}

export interface MidiCaptainBridge {
  scan: () => Promise<MidiCaptainDeviceInfo[]>;
  readFile: (request: MidiCaptainReadRequest) => Promise<{ fileName: string; content: string }>;
  writeFile: (
    request: MidiCaptainWriteRequest,
  ) => Promise<{ ok: true; fileName: string; backupPath?: string | null }>;
}

export interface DesktopBridge {
  isElectron: boolean;
  platform: string;
  midiCaptain: MidiCaptainBridge;
}

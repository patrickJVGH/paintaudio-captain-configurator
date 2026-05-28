import React from "react";
import { HardDrive, RefreshCw, Save, Usb } from "lucide-react";
import type { MidiCaptainDeviceInfo } from "@/types/desktop";

interface MidiCaptainUsbPanelProps {
  enabled: boolean;
  devices: MidiCaptainDeviceInfo[];
  selectedDeviceId: string;
  selectedFileName: string;
  loading: boolean;
  errorMessage: string | null;
  infoMessage: string | null;
  canOpen: boolean;
  canSave: boolean;
  onRefresh: () => void;
  onSelectDevice: (deviceId: string) => void;
  onSelectFile: (fileName: string) => void;
  onOpenFile: () => void;
  onSaveFile: () => void;
}

const MidiCaptainUsbPanel: React.FC<MidiCaptainUsbPanelProps> = ({
  enabled,
  devices,
  selectedDeviceId,
  selectedFileName,
  loading,
  errorMessage,
  infoMessage,
  canOpen,
  canSave,
  onRefresh,
  onSelectDevice,
  onSelectFile,
  onOpenFile,
  onSaveFile,
}) => {
  if (!enabled) {
    return (
      <div className="rounded-xl border border-border bg-card/40 p-3">
        <div className="mb-1 flex items-center gap-2">
          <Usb className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            MIDI Captain USB
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Conexao USB direta disponivel no app desktop (Electron).
        </p>
      </div>
    );
  }

  const selectedDevice = devices.find((device) => device.id === selectedDeviceId) || null;
  const files = selectedDevice?.files || [];
  const connected = devices.length > 0;

  return (
    <div className="rounded-xl border border-border bg-card/50 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Usb className={`h-4 w-4 ${connected ? "text-primary" : "text-muted-foreground"}`} />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            MIDI Captain USB
          </span>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </div>

      <p className={`mb-2 text-[11px] ${connected ? "text-primary" : "text-muted-foreground"}`}>
        {connected ? `${devices.length} dispositivo(s) encontrado(s)` : "MIDI Captain nao conectado"}
      </p>

      <div className="grid gap-2 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
          Dispositivo
          <select
            value={selectedDeviceId}
            onChange={(event) => onSelectDevice(event.target.value)}
            disabled={!connected || loading}
            className="rounded border border-border bg-secondary px-2 py-1 text-xs text-secondary-foreground disabled:opacity-50"
          >
            {devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
          Arquivo
          <select
            value={selectedFileName}
            onChange={(event) => onSelectFile(event.target.value)}
            disabled={!connected || files.length === 0 || loading}
            className="rounded border border-border bg-secondary px-2 py-1 text-xs text-secondary-foreground disabled:opacity-50"
          >
            {files.map((file) => (
              <option key={file.name} value={file.name}>
                {file.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {selectedDevice && (
        <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
          <HardDrive className="h-3 w-3" />
          Pasta: <span className="font-mono">{selectedDevice.configPath}</span>
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={onOpenFile}
          disabled={!canOpen || loading}
          className="rounded bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          Abrir do MIDI Captain
        </button>
        <button
          onClick={onSaveFile}
          disabled={!canSave || loading}
          className="inline-flex items-center gap-1 rounded border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" />
          Salvar no MIDI Captain
        </button>
      </div>

      {errorMessage && <p className="mt-2 text-[11px] text-destructive">{errorMessage}</p>}
      {!errorMessage && infoMessage && <p className="mt-2 text-[11px] text-primary">{infoMessage}</p>}
    </div>
  );
};

export default MidiCaptainUsbPanel;

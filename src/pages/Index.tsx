import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Download, FileText, Settings, Upload } from "lucide-react";
import FileUpload from "@/components/FileUpload";
import MidiCaptainUsbPanel from "@/components/MidiCaptainUsbPanel";
import VirtualPedal from "@/components/VirtualPedal";
import ButtonEditor from "@/components/ButtonEditor";
import EventConsole from "@/components/EventConsole";
import HxStompMidiMiniGuide from "@/components/HxStompMidiMiniGuide";
import { cleanupPage1Text, exportPage1, parsePage1 } from "@/utils/parser";
import type { EventLog, KeyConfig, PedalConfig } from "@/types/midi";
import type { MidiCaptainDeviceInfo } from "@/types/desktop";

interface LoadedUsbSource {
  deviceId: string;
  fileName: string;
}

const Index = () => {
  const [config, setConfig] = useState<PedalConfig | null>(null);
  const [selectedKey, setSelectedKey] = useState<number | null>(null);
  const [currentStates, setCurrentStates] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const [events, setEvents] = useState<EventLog[]>([]);
  const [fileName, setFileName] = useState("page1.txt");
  const [loadedUsbSource, setLoadedUsbSource] = useState<LoadedUsbSource | null>(null);

  const desktopBridge = typeof window !== "undefined" ? window.desktopApp : undefined;
  const usbEnabled = Boolean(desktopBridge?.isElectron && desktopBridge?.midiCaptain);

  const [usbDevices, setUsbDevices] = useState<MidiCaptainDeviceInfo[]>([]);
  const [selectedUsbDeviceId, setSelectedUsbDeviceId] = useState("");
  const [selectedUsbFileName, setSelectedUsbFileName] = useState("");
  const [usbLoading, setUsbLoading] = useState(false);
  const [usbErrorMessage, setUsbErrorMessage] = useState<string | null>(null);
  const [usbInfoMessage, setUsbInfoMessage] = useState<string | null>(null);

  const activeUsbDevice = useMemo(
    () => usbDevices.find((device) => device.id === selectedUsbDeviceId) || null,
    [usbDevices, selectedUsbDeviceId],
  );

  const applyConfigFromText = useCallback(
    (content: string, name: string, source: LoadedUsbSource | null) => {
      const parsed = parsePage1(content);
      setConfig(parsed);
      setFileName(name);
      setSelectedKey(null);
      setCurrentStates([0, 0, 0, 0, 0, 0]);
      setEvents([]);
      setLoadedUsbSource(source);
    },
    [],
  );

  const handleFileLoaded = useCallback(
    (content: string, name: string) => {
      applyConfigFromText(content, name, null);
      setUsbInfoMessage("Arquivo local carregado.");
      setUsbErrorMessage(null);
    },
    [applyConfigFromText],
  );

  const refreshUsbDevices = useCallback(
    async (silent = false) => {
      if (!desktopBridge?.midiCaptain) {
        return;
      }

      if (!silent) {
        setUsbLoading(true);
      }

      try {
        const devices = await desktopBridge.midiCaptain.scan();
        setUsbDevices(devices);
        setUsbErrorMessage(null);
        if (devices.length === 0) {
          setUsbInfoMessage("Conecte o MIDI Captain por USB para habilitar abrir/salvar direto.");
        }
      } catch (error) {
        setUsbErrorMessage(error instanceof Error ? error.message : "Falha ao listar dispositivos USB.");
      } finally {
        if (!silent) {
          setUsbLoading(false);
        }
      }
    },
    [desktopBridge],
  );

  useEffect(() => {
    if (!usbEnabled) {
      return;
    }

    refreshUsbDevices();
    const timer = window.setInterval(() => {
      refreshUsbDevices(true);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [usbEnabled, refreshUsbDevices]);

  useEffect(() => {
    if (usbDevices.length === 0) {
      setSelectedUsbDeviceId("");
      return;
    }

    setSelectedUsbDeviceId((previous) => {
      if (previous && usbDevices.some((device) => device.id === previous)) {
        return previous;
      }
      return usbDevices[0].id;
    });
  }, [usbDevices]);

  useEffect(() => {
    if (!activeUsbDevice) {
      setSelectedUsbFileName("");
      return;
    }

    setSelectedUsbFileName((previous) => {
      if (previous && activeUsbDevice.files.some((file) => file.name === previous)) {
        return previous;
      }
      return activeUsbDevice.files[0]?.name || "";
    });
  }, [activeUsbDevice]);

  const handleOpenFromUsb = useCallback(async () => {
    if (!desktopBridge?.midiCaptain || !activeUsbDevice || !selectedUsbFileName) {
      return;
    }

    setUsbLoading(true);
    setUsbErrorMessage(null);
    try {
      const result = await desktopBridge.midiCaptain.readFile({
        deviceId: activeUsbDevice.id,
        fileName: selectedUsbFileName,
      });
      applyConfigFromText(result.content, result.fileName, {
        deviceId: activeUsbDevice.id,
        fileName: result.fileName,
      });
      setUsbInfoMessage(`Arquivo ${result.fileName} carregado do MIDI Captain.`);
    } catch (error) {
      setUsbErrorMessage(error instanceof Error ? error.message : "Falha ao abrir arquivo no MIDI Captain.");
    } finally {
      setUsbLoading(false);
    }
  }, [activeUsbDevice, applyConfigFromText, desktopBridge, selectedUsbFileName]);

  const handleSaveToUsb = useCallback(async () => {
    if (!desktopBridge?.midiCaptain || !config) {
      return;
    }

    const deviceId = selectedUsbDeviceId || loadedUsbSource?.deviceId;
    const targetFileName = selectedUsbFileName || loadedUsbSource?.fileName;

    if (!deviceId || !targetFileName) {
      setUsbErrorMessage("Selecione um dispositivo e um arquivo para salvar.");
      return;
    }

    const output = exportPage1(config);

    setUsbLoading(true);
    setUsbErrorMessage(null);
    try {
      const result = await desktopBridge.midiCaptain.writeFile({
        deviceId,
        fileName: targetFileName,
        content: output,
      });
      setLoadedUsbSource({ deviceId, fileName: targetFileName });
      setFileName(targetFileName);
      setUsbInfoMessage(
        result.backupPath
          ? `Salvo em ${targetFileName}. Backup criado automaticamente.`
          : `Salvo em ${targetFileName}.`,
      );
      await refreshUsbDevices(true);
    } catch (error) {
      setUsbErrorMessage(error instanceof Error ? error.message : "Falha ao salvar no MIDI Captain.");
    } finally {
      setUsbLoading(false);
    }
  }, [config, desktopBridge, loadedUsbSource, refreshUsbDevices, selectedUsbDeviceId, selectedUsbFileName]);

  const handleKeyClick = useCallback(
    (index: number) => {
      if (!config) {
        return;
      }

      setCurrentStates((previous) => {
        const next = [...previous];
        const key = config.keys[index];
        next[index] = (next[index] + 1) % key.keytimes;
        return next;
      });

      const key = config.keys[index];
      const nextState = (currentStates[index] + 1) % key.keytimes;
      const state = key.states[nextState];
      const commands: string[] = [];
      if (state?.shortDw) {
        commands.push(state.shortDw);
      }

      setEvents((previous) =>
        [
          {
            timestamp: Date.now(),
            keyIndex: index,
            stateIndex: nextState,
            action: "press",
            commands,
          },
          ...previous,
        ].slice(0, 50),
      );
    },
    [config, currentStates],
  );

  const handleKeyUpdate = useCallback(
    (keyIndex: number, updated: KeyConfig) => {
      if (!config) {
        return;
      }
      const newKeys = [...config.keys];
      newKeys[keyIndex] = updated;
      setConfig({ ...config, keys: newKeys });
    },
    [config],
  );

  const handleExport = useCallback(() => {
    if (!config) {
      return;
    }
    const output = exportPage1(config);
    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }, [config, fileName]);

  const handleOrganizeTxt = useCallback(() => {
    if (!config) {
      return;
    }

    const exported = exportPage1(config);
    const cleaned = cleanupPage1Text(exported);

    if (cleaned === exported) {
      setUsbInfoMessage("TXT ja esta organizado.");
      setUsbErrorMessage(null);
      return;
    }

    const reparsed = parsePage1(cleaned);
    setConfig(reparsed);
    setUsbInfoMessage("TXT organizado. Comentarios e estrutura foram preservados.");
    setUsbErrorMessage(null);
  }, [config]);

  const handleNewFile = useCallback(() => {
    setConfig(null);
    setSelectedKey(null);
    setCurrentStates([0, 0, 0, 0, 0, 0]);
    setEvents([]);
    setFileName("page1.txt");
    setLoadedUsbSource(null);
  }, []);

  const canOpenFromUsb = usbEnabled && Boolean(activeUsbDevice && selectedUsbFileName);
  const canSaveToUsb = canOpenFromUsb && Boolean(config);
  const sourceLabel = loadedUsbSource ? `USB: ${loadedUsbSource.fileName}` : "Arquivo local";

  if (!config) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background p-4">
        <div className="text-center">
          <div className="mb-2 flex items-center justify-center gap-2">
            <Settings className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-extrabold tracking-tight">
              MIDI Captain <span className="text-primary">Config</span>
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Configurador visual para PaintAudio MIDI Captain MINI 6 - Super Mode
          </p>
        </div>

        <div className="w-full max-w-lg">
          <FileUpload onFileLoaded={handleFileLoaded} />
        </div>

        <div className="w-full max-w-2xl">
          <MidiCaptainUsbPanel
            enabled={usbEnabled}
            devices={usbDevices}
            selectedDeviceId={selectedUsbDeviceId}
            selectedFileName={selectedUsbFileName}
            loading={usbLoading}
            errorMessage={usbErrorMessage}
            infoMessage={usbInfoMessage}
            canOpen={canOpenFromUsb}
            canSave={false}
            onRefresh={() => refreshUsbDevices()}
            onSelectDevice={setSelectedUsbDeviceId}
            onSelectFile={setSelectedUsbFileName}
            onOpenFile={handleOpenFromUsb}
            onSaveFile={handleSaveToUsb}
          />
        </div>

        <p className="max-w-md text-center text-xs text-muted-foreground">
          Carregue um pageN.txt local ou abra direto do MIDI Captain conectado por USB.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-3">
          <Settings className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-sm font-bold">MIDI Captain Config</h1>
            <span className="font-mono text-[10px] text-muted-foreground">
              {config.page.page_name || fileName} - {sourceLabel}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleNewFile}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Upload className="h-3.5 w-3.5" />
            Novo Arquivo
          </button>
          <button
            onClick={handleOrganizeTxt}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <FileText className="h-3.5 w-3.5" />
            Organizar TXT
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Download className="h-3.5 w-3.5" />
            Baixar TXT
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 lg:flex-row">
        <div className="flex flex-col gap-4 lg:w-[420px]">
          <MidiCaptainUsbPanel
            enabled={usbEnabled}
            devices={usbDevices}
            selectedDeviceId={selectedUsbDeviceId}
            selectedFileName={selectedUsbFileName}
            loading={usbLoading}
            errorMessage={usbErrorMessage}
            infoMessage={usbInfoMessage}
            canOpen={canOpenFromUsb}
            canSave={canSaveToUsb}
            onRefresh={() => refreshUsbDevices()}
            onSelectDevice={setSelectedUsbDeviceId}
            onSelectFile={setSelectedUsbFileName}
            onOpenFile={handleOpenFromUsb}
            onSaveFile={handleSaveToUsb}
          />

          <div className="glass-panel rounded-xl p-4">
            <VirtualPedal
              keys={config.keys}
              currentStates={currentStates}
              selectedKey={selectedKey}
              onKeyClick={handleKeyClick}
              onKeySelect={setSelectedKey}
            />
          </div>

          <div className="glass-panel rounded-xl p-3">
            <div className="mb-2 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Configuracao Global
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs">
              {Object.entries(config.global)
                .filter(([, value]) => value)
                .map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-muted-foreground">{key}</span>
                    <span className="text-foreground">{value}</span>
                  </div>
                ))}
            </div>
          </div>

          <EventConsole events={events} />
        </div>

        <div className="grid flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          {selectedKey !== null ? (
            <div className="glass-panel rounded-xl p-4">
              <ButtonEditor keyConfig={config.keys[selectedKey]} keyIndex={selectedKey} onUpdate={handleKeyUpdate} />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border p-12">
              <div className="text-center">
                <Settings className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  Selecione um botao no pedal virtual para editar.
                </p>
              </div>
            </div>
          )}

          <HxStompMidiMiniGuide />
        </div>
      </div>
    </div>
  );
};

export default Index;

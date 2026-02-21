import React, { useState, useCallback } from 'react';
import { parsePage1, exportPage1 } from '@/utils/parser';
import type { PedalConfig, KeyConfig, EventLog } from '@/types/midi';
import FileUpload from '@/components/FileUpload';
import VirtualPedal from '@/components/VirtualPedal';
import ButtonEditor from '@/components/ButtonEditor';
import EventConsole from '@/components/EventConsole';
import { Download, Upload, Settings, FileText } from 'lucide-react';

const Index = () => {
  const [config, setConfig] = useState<PedalConfig | null>(null);
  const [selectedKey, setSelectedKey] = useState<number | null>(null);
  const [currentStates, setCurrentStates] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const [events, setEvents] = useState<EventLog[]>([]);
  const [fileName, setFileName] = useState('page1.txt');

  const handleFileLoaded = useCallback((content: string, name: string) => {
    const parsed = parsePage1(content);
    setConfig(parsed);
    setFileName(name);
    setSelectedKey(null);
    setCurrentStates([0, 0, 0, 0, 0, 0]);
    setEvents([]);
  }, []);

  const handleKeyClick = useCallback((index: number) => {
    if (!config) return;
    setCurrentStates(prev => {
      const next = [...prev];
      const key = config.keys[index];
      next[index] = (next[index] + 1) % key.keytimes;
      return next;
    });

    // Log event
    const key = config.keys[index];
    const nextState = (currentStates[index] + 1) % key.keytimes;
    const state = key.states[nextState];
    const commands: string[] = [];
    if (state?.shortDw) commands.push(state.shortDw);

    setEvents(prev => [{
      timestamp: Date.now(),
      keyIndex: index,
      stateIndex: nextState,
      action: 'press',
      commands,
    }, ...prev].slice(0, 50));
  }, [config, currentStates]);

  const handleKeyUpdate = useCallback((keyIndex: number, updated: KeyConfig) => {
    if (!config) return;
    const newKeys = [...config.keys];
    newKeys[keyIndex] = updated;
    setConfig({ ...config, keys: newKeys });
  }, [config]);

  const handleExport = useCallback(() => {
    if (!config) return;
    const output = exportPage1(config);
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }, [config, fileName]);

  const handleNewFile = useCallback(() => {
    setConfig(null);
    setSelectedKey(null);
    setEvents([]);
  }, []);

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
            Configurador visual para PaintAudio MIDI Captain MINI 6 — Super Mode
          </p>
        </div>
        <div className="w-full max-w-lg">
          <FileUpload onFileLoaded={handleFileLoaded} />
        </div>
        <p className="max-w-md text-center text-xs text-muted-foreground">
          Carregue o arquivo page1.txt do seu dispositivo para começar a editar cores de LED e comandos MIDI.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-3">
          <Settings className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-sm font-bold">MIDI Captain Config</h1>
            <span className="font-mono text-[10px] text-muted-foreground">
              {config.page.page_name || fileName}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleNewFile} className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
            <Upload className="h-3.5 w-3.5" />
            Novo Arquivo
          </button>
          <button onClick={handleExport} className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
            <Download className="h-3.5 w-3.5" />
            Baixar page1.txt
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 flex-col gap-4 p-4 lg:flex-row">
        {/* Left: Pedal + Console */}
        <div className="flex flex-col gap-4 lg:w-[420px]">
          <div className="glass-panel rounded-xl p-4">
            <VirtualPedal
              keys={config.keys}
              currentStates={currentStates}
              selectedKey={selectedKey}
              onKeyClick={handleKeyClick}
              onKeySelect={setSelectedKey}
            />
          </div>

          {/* Global settings summary */}
          <div className="glass-panel rounded-xl p-3">
            <div className="mb-2 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Configuração Global
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs">
              {Object.entries(config.global).filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="text-foreground">{v}</span>
                </div>
              ))}
            </div>
          </div>

          <EventConsole events={events} />
        </div>

        {/* Right: Editor */}
        <div className="flex-1">
          {selectedKey !== null ? (
            <div className="glass-panel rounded-xl p-4">
              <ButtonEditor
                keyConfig={config.keys[selectedKey]}
                keyIndex={selectedKey}
                onUpdate={handleKeyUpdate}
              />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border p-12">
              <div className="text-center">
                <Settings className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  Selecione um botão no pedal virtual para editar
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;

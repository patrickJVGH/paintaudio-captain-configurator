import React from "react";
import { BookOpen, Clock3, SlidersHorizontal } from "lucide-react";

const snapshotValues = [
  { value: "0", action: "Snapshot 1" },
  { value: "1", action: "Snapshot 2" },
  { value: "2", action: "Snapshot 3" },
  { value: "3", action: "Snapshot 4" },
  { value: "8", action: "Proximo snapshot" },
  { value: "9", action: "Snapshot anterior" },
];

const quickCcMap = [
  { cc: "1", action: "EXP 1 (0-127)" },
  { cc: "2", action: "EXP 2 (0-127)" },
  { cc: "49-56", action: "FS1-FS8 (emula os footswitches do HX)" },
  { cc: "64", action: "Tap Tempo (64-127)" },
  { cc: "68", action: "Tuner on/off (0-127)" },
  { cc: "69", action: "Snapshot select (0-3, 8, 9)" },
  { cc: "70", action: "All Bypass (0-63 bypass, 64-127 on)" },
  { cc: "71", action: "MODE switch (0-127)" },
  { cc: "72", action: "Preset anterior/proximo (0-63 / 64-127)" },
  { cc: "73", action: "Alterna Play/Edit (0-127)" },
  { cc: "75-77", action: "Knobs globais 1-3 (0-127)" },
  { cc: "81", action: "Page Left/Right (0-63 / 64-127)" },
];

const looperCcMap = [
  { cc: "60", action: "Record/Overdub (0-63 overdub, 64-127 record)" },
  { cc: "61", action: "Play/Stop (0-63 stop, 64-127 play)" },
  { cc: "62", action: "Play Once (64-127)" },
  { cc: "63", action: "Undo/Redo (64-127)" },
  { cc: "65", action: "Forward/Reverse (0-63 forward, 64-127 reverse)" },
  { cc: "66", action: "Full/Half speed (0-63 full, 64-127 half)" },
];

const HxStompMidiMiniGuide: React.FC = () => {
  return (
    <div className="glass-panel rounded-xl p-4">
      <div className="mb-3 flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold uppercase tracking-wide">Mini Manual MIDI HX Stomp</h3>
      </div>

      <p className="mb-3 text-xs text-muted-foreground">
        Resumo traduzido das pags. 69-71 do manual HX Stomp XL 3.80, focado em mapeamento para os SWT.
      </p>

      <div className="space-y-3">
        <section className="rounded-lg border border-border bg-card/50 p-3">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Recall de Preset e Snapshot
          </h4>
          <div className="space-y-1.5 text-xs">
            <p>
              Canal MIDI padrao do HX: <span className="font-mono">1</span> (ajustavel em{" "}
              <span className="font-mono">Global Settings {">"} MIDI/Tempo</span>).
            </p>
            <p>
              Exemplo de preset: <span className="font-mono">[1][PC][61]</span> (PC 061 no canal 1).
            </p>
            <p>
              Exemplo de snapshot: <span className="font-mono">[1][CC][69][0]</span> (Snapshot 1).
            </p>
            <p className="text-muted-foreground">
              Dica: para carregar preset + snapshot, envie PC e em seguida CC69.
            </p>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1 text-[11px]">
            {snapshotValues.map((item) => (
              <div key={item.value} className="rounded border border-border/70 px-2 py-1 font-mono">
                <span className="text-primary">CC69={item.value}</span> {item.action}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card/50 p-3">
          <div className="mb-2 flex items-center gap-1.5">
            <Clock3 className="h-3.5 w-3.5 text-muted-foreground" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tempo e Sync
            </h4>
          </div>
          <div className="space-y-1.5 text-xs">
            <p>
              Parametros de Delay/Mod podem seguir Tap Tempo/MIDI Clock quando o valor esta em nota
              (1/4, 1/8 pontuada etc.).
            </p>
            <p>
              O HX recebe MIDI Clock por padrao e pode transmitir em{" "}
              <span className="font-mono">Global Settings {">"} MIDI/Tempo</span>.
            </p>
            <p>Pressionar TAP no downbeat reinicia efeitos sincronizados por beat/LFO.</p>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card/50 p-3">
          <div className="mb-2 flex items-center gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              CCs Reservados (mais usados)
            </h4>
          </div>
          <div className="grid gap-1 text-[11px]">
            {quickCcMap.map((item) => (
              <div key={item.cc} className="rounded border border-border/70 px-2 py-1">
                <span className="font-mono text-primary">CC{item.cc}</span>{" "}
                <span className="text-foreground">{item.action}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Faixa padrao de bypass/controle: <span className="font-mono">0-63</span> = off/primeira acao,{" "}
            <span className="font-mono">64-127</span> = on/segunda acao.
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            CC reservados nao podem ser aprendidos no Controller Assign (manual pag. 70).
          </p>
        </section>

        <section className="rounded-lg border border-border bg-card/50 p-3">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Looper via MIDI CC
          </h4>
          <div className="grid gap-1 text-[11px]">
            {looperCcMap.map((item) => (
              <div key={item.cc} className="rounded border border-border/70 px-2 py-1">
                <span className="font-mono text-primary">CC{item.cc}</span>{" "}
                <span className="text-foreground">{item.action}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Bancos reservados: <span className="font-mono">CC0</span> (Bank MSB) e{" "}
            <span className="font-mono">CC32</span> (Bank LSB).
          </p>
        </section>
      </div>
    </div>
  );
};

export default HxStompMidiMiniGuide;

import React from 'react';
import { parseMidiCommand } from '@/utils/parser';
import type { EventLog } from '@/types/midi';
import { Terminal } from 'lucide-react';

interface EventConsoleProps {
  events: EventLog[];
}

const EventConsole: React.FC<EventConsoleProps> = ({ events }) => {
  return (
    <div className="flex flex-col rounded-lg border border-border bg-console">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Terminal className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Console de Eventos
        </span>
      </div>
      <div className="scrollbar-thin max-h-48 overflow-y-auto p-2 font-mono text-xs">
        {events.length === 0 ? (
          <p className="p-2 text-muted-foreground">
            Duplo-clique em um botão para simular...
          </p>
        ) : (
          events.map((event, i) => (
            <div
              key={i}
              className="flex gap-2 border-b border-border/30 py-1.5 last:border-0 animate-fade-in"
            >
              <span className="text-muted-foreground">
                [{new Date(event.timestamp).toLocaleTimeString('pt-BR')}]
              </span>
              <span className="text-primary">
                Botão {event.keyIndex + 1}
              </span>
              <span className="text-foreground">
                → Estado {event.stateIndex + 1}
              </span>
              {event.commands.length > 0 && (
                <span className="text-accent">
                  | {event.commands.map(c => parseMidiCommand(c)).join(', ')}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default EventConsole;

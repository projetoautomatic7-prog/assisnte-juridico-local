import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Terminal, Settings, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export interface LogEntry {
  id: string;
  timestamp: string;
  agentName: string;
  type: 'info' | 'tool' | 'success' | 'error' | 'thinking';
  message: string;
  details?: any;
}

interface AILogViewerProps {
  logs: LogEntry[];
}

export function AILogViewer({ logs }: AILogViewerProps) {
  return (
    <div className="flex flex-col h-full border rounded-lg bg-slate-950 text-slate-50 font-mono text-xs overflow-hidden shadow-xl">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-blue-400" />
          <span className="font-semibold uppercase tracking-wider">Console de Atividades IA</span>
        </div>
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500/50" />
          <div className="w-2 h-2 rounded-full bg-amber-500/50" />
          <div className="w-2 h-2 rounded-full bg-green-500/50" />
        </div>
      </div>
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3">
          {logs.length === 0 && (
            <div className="text-slate-500 italic py-8 text-center border border-dashed border-slate-800 rounded-md">
              Aguardando atividades dos agentes...
            </div>
          )}
          {logs.map((log) => (
            <div key={log.id} className="flex gap-3 group animate-in fade-in slide-in-from-left-1 duration-300">
              <span className="text-slate-600 shrink-0 tabular-nums select-none">
                [{new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}]
              </span>
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-slate-900 border-slate-700 text-blue-300 h-5 px-1.5 text-[10px] font-bold">
                    {log.agentName.toUpperCase()}
                  </Badge>
                  {log.type === 'tool' && <Settings className="w-3 h-3 text-amber-400" />}
                  {log.type === 'success' && <CheckCircle2 className="w-3 h-3 text-green-400" />}
                  {log.type === 'error' && <AlertCircle className="w-3 h-3 text-red-400" />}
                  {log.type === 'thinking' && <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />}
                </div>
                <p className={`leading-relaxed ${
                  log.type === 'error' ? 'text-red-300' : 
                  log.type === 'tool' ? 'text-amber-200' : 
                  'text-slate-300'
                }`}>
                  {log.message}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
import type { ReactNode } from "react";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface ThreadHistoryItem {
  id: string;
  title: string;
  timestamp: string;
}

interface ThreadHistoryPanelProps {
  threadsHistory: ThreadHistoryItem[];
  activeThreadId?: string | null;
  onSelectThread: (id: string) => void;
  trigger: ReactNode;
}

export function ThreadHistoryPanel({
  threadsHistory,
  activeThreadId,
  onSelectThread,
  trigger,
}: ThreadHistoryPanelProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 max-h-60">
        <DropdownMenuLabel>Thread History</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {threadsHistory.length === 0 && (
          <DropdownMenuItem disabled className="text-xs italic">
            No previous threads
          </DropdownMenuItem>
        )}
        {threadsHistory.map((t) => (
          <DropdownMenuItem
            key={t.id}
            onSelect={() => onSelectThread(t.id)}
            className={`flex flex-col items-start gap-0.5 text-xs ${
              activeThreadId === t.id ? "bg-primary/10 text-primary" : ""
            }`}
          >
            <div className="w-full truncate font-medium">{t.title}</div>
            <div className="text-[10px] opacity-60">{new Date(t.timestamp).toLocaleDateString()}</div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

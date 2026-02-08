import type { ReactNode } from "react";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import { IconMessagePlus } from "@tabler/icons-react";

interface ThreadHistoryItem {
  id: string;
  title: string;
  timestamp: string;
}

interface ThreadHistoryPanelProps {
  threadsHistory: ThreadHistoryItem[];
  activeThreadId?: string | null;
  onSelectThread: (id: string) => void;
  onNewThread: () => void;
  trigger: ReactNode;
}

export function ThreadHistoryPanel({
  threadsHistory,
  activeThreadId,
  onSelectThread,
  onNewThread,
  trigger,
}: ThreadHistoryPanelProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 max-h-80 overflow-y-auto">
        <DropdownMenuItem onSelect={onNewThread} className="flex items-center gap-2 text-xs font-semibold text-primary">
          <IconMessagePlus size={16} />
          <span>New Thread</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground py-1">Recent Threads</DropdownMenuLabel>
        {threadsHistory.length === 0 && (
          <DropdownMenuItem disabled className="text-xs italic">
            No previous threads
          </DropdownMenuItem>
        )}
        {threadsHistory.map((t) => (
          <DropdownMenuItem
            key={t.id}
            onSelect={() => onSelectThread(t.id)}
            className={`flex flex-col items-start gap-0.5 text-xs ${activeThreadId === t.id ? "bg-primary/10 text-primary" : ""
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

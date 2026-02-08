import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { IconMessagePlus, IconX } from "@tabler/icons-react";

interface ChatHeaderProps {
  threadHistoryMenu: ReactNode;
  onNewChat: () => void;
  onClose?: () => void;
}

export function ChatHeader({ threadHistoryMenu, onNewChat, onClose }: ChatHeaderProps) {
  return (
    <div className="flex shrink-0 items-center justify-between border-b px-3 h-[60px] bg-background/50 backdrop-blur-sm">
      <div className="flex items-center gap-1.5 min-w-0">
        {threadHistoryMenu}
        <div className="flex items-center gap-2">
          <img src="/brilliant.svg" alt="Brilliant Logo" className="size-5 shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground truncate">Brilliant Planner</span>
        </div>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        <Button variant="ghost" size="icon" className="size-7 hover:bg-muted" onClick={onNewChat} title="New Chat">
          <IconMessagePlus size={16} />
        </Button>
        {onClose && (
          <Button variant="ghost" size="icon" className="md:hidden size-7 hover:bg-muted" onClick={onClose}>
            <IconX size={16} />
          </Button>
        )}
      </div>
    </div>
  );
}

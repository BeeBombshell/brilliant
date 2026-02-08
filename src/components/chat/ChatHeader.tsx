import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { IconX } from "@tabler/icons-react";

interface ChatHeaderProps {
  threadHistoryMenu: ReactNode;
  onClose?: () => void;
}

export function ChatHeader({ threadHistoryMenu, onClose }: ChatHeaderProps) {
  return (
    <div className="flex shrink-0 items-center justify-between border-b px-3 h-[60px] bg-background/50 backdrop-blur-sm">
      <div className="flex items-center gap-2 min-w-0">
        <img src="/brilliant.svg" alt="Brilliant Logo" className="size-5 shrink-0" />
        <span className="text-[15px] font-bold tracking-tight text-foreground truncate">
          Brilliant
        </span>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        {threadHistoryMenu}
        {onClose && (
          <Button variant="ghost" size="icon" className="md:hidden size-7 hover:bg-muted" onClick={onClose}>
            <IconX size={16} />
          </Button>
        )}
      </div>
    </div>
  );
}

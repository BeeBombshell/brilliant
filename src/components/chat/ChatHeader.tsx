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
      <div className="flex items-center gap-2.5 min-w-0">
        <img src="/brilliant.svg" alt="Brilliant Logo" className="size-7 shrink-0" />
        <span className="font-semibold text-base">
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

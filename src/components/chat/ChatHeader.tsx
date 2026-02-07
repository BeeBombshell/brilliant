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
    <div className="flex items-center justify-between border-b px-4 py-3">
      <div className="flex items-center gap-2">
        {threadHistoryMenu}
        <span className="text-sm font-semibold">Brilliant Planner</span>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="size-8" onClick={onNewChat} title="New Chat">
          <IconMessagePlus size={18} />
        </Button>
        {onClose && (
          <Button variant="ghost" size="icon" className="md:hidden size-8" onClick={onClose}>
            <IconX size={18} />
          </Button>
        )}
      </div>
    </div>
  );
}

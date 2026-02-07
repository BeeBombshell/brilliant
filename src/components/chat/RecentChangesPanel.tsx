import { Card } from "@/components/ui/card";

interface RecentChangesPanelProps {
  actionLog: string[];
}

export function RecentChangesPanel({ actionLog }: RecentChangesPanelProps) {
  return (
    <Card className="space-y-2 bg-background/80 p-3">
      <div className="text-[0.7rem] font-medium uppercase text-muted-foreground">Recent changes</div>
      <div className="max-h-24 space-y-1 overflow-y-auto text-xs">
        {actionLog.length === 0 && (
          <div className="text-muted-foreground">Actions you take in the calendar will show up here.</div>
        )}
        {actionLog.map((item, index) => (
          <div key={index} className="text-muted-foreground">
            {item}
          </div>
        ))}
      </div>
    </Card>
  );
}

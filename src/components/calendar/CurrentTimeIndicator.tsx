import { useState, useEffect } from "react";

interface CurrentTimeIndicatorProps {
  hourHeight: number;
}

export function CurrentTimeIndicator({ hourHeight }: CurrentTimeIndicatorProps) {
  const [position, setPosition] = useState(0);

  useEffect(() => {
    const updatePosition = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const totalMinutes = hours * 60 + minutes;

      // Calculate position: each hour is hourHeight pixels
      const pos = (totalMinutes / 60) * hourHeight;
      setPosition(pos);
    };

    updatePosition();
    const interval = setInterval(updatePosition, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [hourHeight]);

  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-40 flex items-center"
      style={{ top: `${position}px` }}
    >
      {/* Red circle on the left */}
      <div className="size-3 -translate-x-1/2 rounded-full bg-red-500 shadow-md" />
      {/* Red line across */}
      <div className="h-0.5 flex-1 bg-red-500 shadow-sm" />
    </div>
  );
}

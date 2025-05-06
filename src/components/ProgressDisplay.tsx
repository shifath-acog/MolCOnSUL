import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { PipelineResponse } from "@/lib/types";

interface ProgressDisplayProps {
  jobId: string | null;
  logs: string[];
  onUpdate: (data: PipelineResponse) => void;
}

export default function ProgressDisplay({ jobId, logs, onUpdate }: ProgressDisplayProps) {
  const [isCollapsed, setIsCollapsed] = useState(true); // Track if the log section is collapsed

  // Update progress based on the logs
  useEffect(() => {
    console.log("ProgressDisplay logs:", logs);
  }, [logs, jobId]);

  // Toggle collapse/expand
  const toggleCollapse = () => {
    setIsCollapsed((prevState) => !prevState);
  };

  // Handle card click to toggle collapse/expand
  const handleCardClick = () => {
    toggleCollapse();
  };

  return (
    <Card className="p-4 mb-6 relative cursor-pointer" onClick={handleCardClick}>
      <h2 className="text-lg font-semibold mb-2">Pipeline Progress</h2>

      {/* Collapsible Arrow in Top Right Corner */}
      <div
        className="absolute top-2 right-2 cursor-pointer text-xl"
      >
        {isCollapsed ? "↓" : "↑"} {/* Down arrow for collapsed, Up arrow for expanded */}
      </div>

      {/* Collapsible logs section */}
      {!isCollapsed && (
        <div className="bg-muted p-2 rounded-md max-h-40 overflow-auto">
          {logs.length > 0 ? (
            logs.map((log, index) => (
              <p key={index} className="text-sm">{log}</p>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No logs yet.</p>
          )}
        </div>
      )}
    </Card>
  );
}

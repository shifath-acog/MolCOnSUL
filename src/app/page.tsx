'use client';
import Sidebar from "@/components/Sidebar";
import WorkflowExpander from "@/components/WorkflowExpander";
import ProgressDisplay from "@/components/ProgressDisplay";
import ConformerTabs from "@/components/ConformerTabs";
import { useState } from "react";
import { PipelineResponse } from "@/lib/types";

export default function Home() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [outputFiles, setOutputFiles] = useState<string[]>([]);

  const handlePipelineStart = (newJobId: string) => {
    setJobId(newJobId);
    setLogs([]);
    setOutputFiles([]);
  };

  const handlePipelineUpdate = (data: PipelineResponse | { log: string }) => {
    if ("log" in data) {
      setLogs((prev) => [...prev, data.log]);
    } else {
      setLogs(data.logs);
      setOutputFiles(data.outputFiles || []);
      if (data.status === "completed" || data.status === "failed") {
        setJobId(null);
      }
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar onPipelineStart={handlePipelineStart} onPipelineUpdate={handlePipelineUpdate} />
      <div className="flex-1 p-6 ml-[350px]">
        <WorkflowExpander />
        <ProgressDisplay jobId={jobId} logs={logs} onUpdate={handlePipelineUpdate} />
        {outputFiles.length > 0 ? (
          <ConformerTabs outputFiles={outputFiles} jobId={jobId || ""} />
        ) : (
          <p className="text-center text-gray-500 mt-4">
            {jobId ? "Running pipeline..." : "Run a pipeline to see conformers"}
          </p>
        )}
      </div>
    </div>
  );
}
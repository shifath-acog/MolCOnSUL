import { PipelineResponse } from "./types";

export async function runPipeline(formData: FormData, onUpdate: (data: PipelineResponse | { log: string }) => void): Promise<void> {
  console.log("Initiating pipeline request");
  const response = await fetch("/api/run-pipeline", {
    method: "POST",
    body: formData,
    headers: {
      Accept: "text/event-stream",
    },
  });

  if (!response.body) {
    throw new Error("No response body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = JSON.parse(line.slice(6));
          console.log("SSE event:", data);
          onUpdate(data);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
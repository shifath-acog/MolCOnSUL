import { NextResponse } from "next/server";
import { spawn } from "child_process";
import { v4 as uuidv4 } from "uuid";
import fs from "fs/promises";
import path from "path";

export async function GET(request: Request) {
  console.log("Unexpected GET request to /api/run-pipeline:", {
    url: request.url,
    headers: Object.fromEntries(request.headers),
  });
  return NextResponse.json({ error: "Method GET not allowed. Use POST for pipeline execution." }, { status: 405 });
}

export async function POST(request: Request) {
  try {
    // Define temp directory in project root
    const tempDir = path.join(process.cwd(), "temp");
    await fs.mkdir(tempDir, { recursive: true });

    // Delete all existing subdirectories in ./temp
    const tempContents = await fs.readdir(tempDir, { withFileTypes: true });
    for (const item of tempContents) {
      if (item.isDirectory()) {
        const itemPath = path.join(tempDir, item.name);
        await fs.rm(itemPath, { recursive: true, force: true });
      }
    }

    // Parse form data
    const formData = await request.formData();
    const smiles = formData.get("smiles")?.toString();
    const sampleSize = parseInt(formData.get("sampleSize")?.toString() || "0", 10);
    const maxEnsembleSize = parseInt(formData.get("maxEnsembleSize")?.toString() || "0", 10);
    const dielectric = parseFloat(formData.get("dielectric")?.toString() || "0");
    const geomOpt = formData.get("geomOpt")?.toString() === "true";
    const refConfoFile = formData.get("refConfoFile") as File | null;

    // Validate inputs
    if (!smiles || isNaN(sampleSize) || sampleSize < 1 || isNaN(maxEnsembleSize) || maxEnsembleSize < 1 || isNaN(dielectric) || dielectric < 0) {
      return NextResponse.json({ error: "Invalid input parameters" }, { status: 400 });
    }

    // Generate unique job ID and output directory on host
    const jobId = uuidv4();
    const outputDir = path.join(tempDir, `temp_${jobId}`);
    await fs.mkdir(outputDir, { recursive: true });

    // Clean up old /app/temp_* folders in container
    await new Promise((resolve, reject) => {
      const rm = spawn("docker", ["exec", "satish-molconsul-cli-test", "rm", "-rf", "/app/temp_*"]);
      rm.on("close", (code) => (code === 0 ? resolve(null) : reject(new Error("Failed to clean up old temp folders"))));
    });

    // Copy reference conformer file to container's /app if provided
    let refConfoPath: string | undefined;
    let refConfoFileName: string | undefined;
    if (refConfoFile && refConfoFile.name) {
      refConfoFileName = refConfoFile.name;
      const filePath = path.join(outputDir, refConfoFileName);
      const fileBuffer = Buffer.from(await refConfoFile.arrayBuffer());
      await fs.writeFile(filePath, fileBuffer);
      const containerPath = `/app/${refConfoFileName}`;
      await new Promise((resolve, reject) => {
        const cp = spawn("docker", ["cp", filePath, `satish-molconsul-cli-test:${containerPath}`]);
        cp.on("close", (code) => (code === 0 ? resolve(null) : reject(new Error("Failed to copy reference file"))));
      });
      refConfoPath = containerPath;
    }

    // Build CLI command
    const command = "docker";
    const args = [
      "exec",
      "satish-molconsul-cli-test",
      "bash",
      "-c",
      `rm -rf /app/temp_* && source $(poetry env info --path)/bin/activate && export LD_LIBRARY_PATH=/opt/conda/lib:$LD_LIBRARY_PATH && run_pipeline '${smiles.replace(/'/g, "\\'")}' --num-conf ${sampleSize} --num-clusters ${maxEnsembleSize} --dielectric-value ${dielectric}${geomOpt ? " --geom-opt" : ""}${refConfoPath ? ` --ref-confo-path ${refConfoPath}` : ""}`,
    ];

    // Set up SSE stream
    const headers = {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    };
    const stream = new ReadableStream({
      async start(controller) {
        const logs: string[] = [];
        const process = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });

        process.stdout.on("data", (data) => {
          const log = data.toString();
          logs.push(log);
          controller.enqueue(`data: ${JSON.stringify({ log })}\n\n`);
        });

        process.stderr.on("data", (data) => {
          const log = data.toString();
          logs.push(log);
          controller.enqueue(`data: ${JSON.stringify({ log })}\n\n`);
        });

        const exitCode = await new Promise<number>((resolve) => {
          process.on("close", (code) => resolve(code ?? 1));
        });

        // Copy CLI's temp folder from container
        const outputFiles: string[] = [];
        if (exitCode === 0) {
          // List directories in /app to find temp_* folders
          const lsOutput = await new Promise<string>((resolve, reject) => {
            let output = "";
            const ls = spawn("docker", ["exec", "satish-molconsul-cli-test", "ls", "/app"]);
            ls.stdout.on("data", (data) => (output += data.toString()));
            ls.on("close", (code) => (code === 0 ? resolve(output) : reject(new Error("Failed to list /app"))));
          });

          // Find temp_* directories
          const tempDirs = lsOutput
            .split("\n")
            .filter((dir) => dir.startsWith("temp_"));

          let cliTempDir: string | undefined;
          if (tempDirs.length > 0) {
            cliTempDir = `/app/${tempDirs[0]}`; // Take the only temp_* folder (due to cleanup)
          }

          if (cliTempDir) {
            // Copy the cluster_rep_conformers folder to outputDir
            const clusterDir = `${cliTempDir}/cluster_rep_conformers`;
            const destClusterDir = path.join(outputDir, "cluster_rep_conformers");
            console.log(`Copying ${clusterDir} to ${destClusterDir}`);
            await new Promise((resolve, reject) => {
              const cp = spawn("docker", ["cp", `satish-molconsul-cli-test:${clusterDir}`, outputDir]);
              cp.on("close", (code) => {
                console.log(`Copy cluster_rep_conformers: Exit code ${code}`);
                code === 0 ? resolve(null) : reject(new Error("Failed to copy cluster_rep_conformers folder"));
              });
            });

            // List .sdf and .xyz files in cluster_rep_conformers for outputFiles
            const clusterFiles = await fs.readdir(destClusterDir);
            console.log(`Files in ${destClusterDir}:`, clusterFiles);
            for (const file of clusterFiles) {
              if (file.endsWith(".sdf") || file.endsWith(".xyz")) {
                outputFiles.push(path.join(`temp_${jobId}`, "cluster_rep_conformers", file));
              }
            }

            // Include reference conformer file in outputFiles if uploaded
            if (refConfoFileName) {
              outputFiles.push(path.join(`temp_${jobId}`, refConfoFileName));
            }
          }
        }

        console.log("outputFiles:", outputFiles);
        controller.enqueue(
          `data: ${JSON.stringify({
            status: exitCode === 0 ? "completed" : "failed",
            logs,
            outputFiles,
            jobId,
          })}\n\n`
        );
        controller.close();
      },
    });

    return new NextResponse(stream, { headers });
  } catch (error) {
    console.error("Pipeline error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
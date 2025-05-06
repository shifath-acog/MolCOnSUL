import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  console.log(`Route hit: /api/files/${(await params).filename}`);
  const { filename } = await params;
  try {
    const filePath = filename;
    const fullPath = path.join(process.cwd(), "temp", filePath);
    console.log(`Serving file: ${fullPath}`);

    await fs.access(fullPath);
    const fileContent = await fs.readFile(fullPath);
    const ext = path.extname(fullPath).toLowerCase();

    const contentType =
      ext === ".sdf" ? "chemical/x-sdf" :
      ext === ".xyz" ? "chemical/x-xyz" :
      ext === ".mol2" ? "chemical/x-mol2" :
      ext === ".pdb" ? "chemical/x-pdb" :
      "application/octet-stream";

    return new NextResponse(fileContent, {
      headers: {
        "Content-Type": contentType,
      },
    });
  } catch (error) {
    console.error(`Error serving file ${filename || "unknown"}:`, error);
    return NextResponse.json({ error: "File not found or inaccessible" }, { status: 404 });
  }
}
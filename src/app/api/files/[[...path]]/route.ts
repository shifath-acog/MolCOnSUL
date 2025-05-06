// import { NextResponse } from "next/server";
// import fs from "fs/promises";
// import path from "path";

// export async function GET(
//   request: Request,
//   { params }: { params: Promise<{ path: string[] }> }
// ) {
//   console.log(`Route hit: /api/files/${(await params).path?.join("/") || ""}`);
//   const { path: pathSegments } = await params;
//   try {
//     const filePath = pathSegments ? pathSegments.join("/") : "";
//     const fullPath = path.join(process.cwd(), "temp", filePath);
//     console.log(`Serving file: ${fullPath}`);

//     // Check if file exists
//     await fs.access(fullPath);
//     const fileContent = await fs.readFile(fullPath);
//     const ext = path.extname(fullPath).toLowerCase();

//     // Set content type based on file extension
//     const contentType =
//       ext === ".sdf" ? "chemical/x-sdf" :
//       ext === ".xyz" ? "chemical/x-xyz" :
//       ext === ".mol2" ? "chemical/x-mol2" :
//       ext === ".pdb" ? "chemical/x-pdb" :
//       "application/octet-stream";

//     return new NextResponse(fileContent, {
//       headers: {
//         "Content-Type": contentType,
//       },
//     });
//   } catch (error) {
//     console.error(`Error serving file ${pathSegments?.join("/") || "unknown"}:`, error);
//     return NextResponse.json({ error: "File not found or inaccessible" }, { status: 404 });
//   }
// }
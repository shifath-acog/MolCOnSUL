import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MolecularViewer from "./MolecularViewer";
import Molecule2DViewer from "./Molecule2DViewer";

interface ConformerTabsProps {
  outputFiles: string[];
  jobId: string;
}

export default function ConformerTabs({ outputFiles, jobId }: ConformerTabsProps) {
  const [isJSZipLoaded, setIsJSZipLoaded] = useState(false);

  // Load JSZip dynamically
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
    script.async = true;
    document.body.appendChild(script);

    script.onload = () => {
      setIsJSZipLoaded(true);
      console.log("JSZip loaded successfully");
    };

    script.onerror = () => {
      console.error("Failed to load JSZip");
    };

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Categorize output files inline
  const sdfFiles: string[] = [];
  const xyzFiles: string[] = [];
  let refConformer: string | null = null;

  if (Array.isArray(outputFiles)) {
    outputFiles.forEach((file) => {
      if (file.includes("cluster_rep_conformers")) {
        if (file.endsWith(".sdf")) {
          sdfFiles.push(file);
        } else if (file.endsWith(".xyz")) {
          xyzFiles.push(file);
        }
      } else if (file.endsWith(".sdf") || file.endsWith(".mol2") || file.endsWith(".pdb") || file.endsWith(".xyz")) {
        refConformer = file;
      }
    });
  }

  // Download a single file
  const handleDownloadFile = async (filePath: string) => {
    try {
      const encodedPath = encodeURIComponent(filePath);
      const fetchUrl = `/api/files/${encodedPath}`;
      const response = await fetch(fetchUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${fetchUrl}: ${response.status} ${response.statusText}`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filePath.split("/").pop() || "conformer.sdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error(`Error downloading file ${filePath}:`, error.message);
      alert(`Failed to download file: ${error.message}`);
    }
  };

  // Download all .xyz files as a ZIP
  const handleDownloadAllXyz = async () => {
    if (!isJSZipLoaded || !window.JSZip) {
      alert("JSZip is not loaded. Please try again later.");
      return;
    }

    const zip = new window.JSZip();
    try {
      for (const filePath of xyzFiles) {
        const encodedPath = encodeURIComponent(filePath);
        const fetchUrl = `/api/files/${encodedPath}`;
        const response = await fetch(fetchUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch ${fetchUrl}: ${response.status} ${response.statusText}`);
        }
        const fileContent = await response.text();
        const fileName = filePath.split("/").pop() || "conformer.xyz";
        zip.file(fileName, fileContent);
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `conformers_${jobId}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error("Error creating ZIP file:", error.message);
      alert(`Failed to download ZIP file: ${error.message}`);
    }
  };

  return (
    <Tabs defaultValue="reference" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="reference">Reference Conformer</TabsTrigger>
        <TabsTrigger value="individual">Individual Conformers</TabsTrigger>
        <TabsTrigger value="all">All Conformers</TabsTrigger>
      </TabsList>
      <TabsContent value="reference">
        {refConformer ? (
          <div className="flex flex-row items-start gap-4">
            <Molecule2DViewer filePath={refConformer} />
            <MolecularViewer files={[refConformer]} height="300px" />
          </div>
        ) : (
          <p className="text-center text-gray-500">No conformer found</p>
        )}
      </TabsContent>
      <TabsContent value="individual">
        {sdfFiles.length > 0 ? (
          <Tabs defaultValue={sdfFiles[0]} className="w-full">
            <TabsList>
              {sdfFiles.map((file) => (
                <TabsTrigger key={file} value={file}>
                  {file.split("/").pop()?.replace(".sdf", "")}
                </TabsTrigger>
              ))}
            </TabsList>
            {sdfFiles.map((file) => (
              <TabsContent key={file} value={file}>
                <div className="w-full px-4 ml-16">
                <div className="mx-auto flex flex-wrap md:flex-nowrap items-center gap-12 max-w-5xl">
                {/* 2D Viewer */}
                <div className="w-full md:w-auto">
                {/*<Molecule2DViewer filePath={file} />*/}
                </div>

                {/* 3D Viewer + Button */}
                <div className="flex flex-col items-center gap-3 w-full md:w-[300px] ml-20">
                <div className="w-full h-[300px]">
                <MolecularViewer files={[file]} height="100%" width="100%" />
                </div>
                <button
                onClick={() => handleDownloadFile(file)}
                className="px-4 py-2 bg-black text-white rounded hover:bg-white hover:text-black border border-black transition"
                >
                Download SDF
                </button>
                </div>
                </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <p className="text-center text-gray-500">No individual conformers found</p>
        )}
      </TabsContent>
      <TabsContent value="all">
        {xyzFiles.length > 0 ? (
          <div className="flex flex-col items-center gap-4">
            <MolecularViewer files={xyzFiles} height="400px" />
            <button
              onClick={handleDownloadAllXyz}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              disabled={!isJSZipLoaded}
            >
              {isJSZipLoaded ? "Download All XYZ as ZIP" : "Loading JSZip..."}
            </button>
          </div>
        ) : (
          <p className="text-center text-gray-500">No conformers found</p>
        )}
      </TabsContent>
    </Tabs>
  );
}
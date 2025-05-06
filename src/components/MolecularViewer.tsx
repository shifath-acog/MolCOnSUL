import { useEffect, useRef, useState } from "react";

// Declare 3Dmol.js global to fix TypeScript error
declare global {
  interface Window {
    $3Dmol: any; // Use 'any' for simplicity; no official types available
  }
}

interface MolecularViewerProps {
  files: string[]; // Array of file paths (e.g., ["temp_<UUID>/cluster_rep_conformers/rep_of_cluster_1.sdf"])
  height?: string; // Viewer height (e.g., "400px")
}

export default function MolecularViewer({ files, height = "400px" }: MolecularViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const viewerInstance = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load 3Dmol.js dynamically
    const script = document.createElement("script");
    script.src = "https://3dmol.csb.pitt.edu/build/3Dmol-min.js";
    script.async = true;
    document.body.appendChild(script);

    script.onload = async () => {
      if (!viewerRef.current || !window.$3Dmol) {
        setError("Failed to initialize 3Dmol.js viewer");
        return;
      }

      // Initialize 3Dmol viewer
      viewerInstance.current = window.$3Dmol.createViewer(viewerRef.current, {
        backgroundColor: "white", // Changed to white for better contrast with colorful atoms
      });

      // Load and render each file
      let hasValidModel = false;
      for (let i = 0; i < files.length; i++) {
        const filePath = files[i];
        try {
          const encodedPath = encodeURIComponent(filePath);
          const fetchUrl = `/api/files/${encodedPath}`;
          console.log(`Fetching URL: ${fetchUrl} (original: ${filePath})`);
          const response = await fetch(fetchUrl);
          console.log(`Fetch result for ${filePath}: Status ${response.status} ${response.statusText}`);
          if (!response.ok) {
            throw new Error(`Failed to fetch ${fetchUrl}: ${response.status} ${response.statusText}`);
          }
          const data = await response.text();

          // Determine file format
          const ext = filePath.split(".").pop()?.toLowerCase();
          const format = ext === "xyz" ? "xyz" : "sdf";

          // Add model to viewer
          viewerInstance.current.addModel(data, format);

          // Set style: Color by element with stick and sphere representation
          viewerInstance.current.setStyle(
            { model: i },
            {
              stick: { radius: 0.25, colorscheme: "Jmol", opacity: files.length > 1 ? 0.8 : 1.0 }, // Thicker sticks, color by element, slight transparency for overlays
              sphere: { radius: 0.5, colorscheme: "Jmol", opacity: files.length > 1 ? 0.8 : 1.0 }, // Small spheres at atoms
            }
          );
          hasValidModel = true;
        } catch (error: any) {
          console.error(`Error loading ${filePath}:`, error);
          setError(`Failed to load ${filePath}: ${error.message}`);
        }
      }

      // Render only if at least one model loaded
      if (hasValidModel) {
        viewerInstance.current.zoomTo();
        viewerInstance.current.render();
        setError(null);
      } else {
        setError("No valid molecules loaded");
      }
    };

    script.onerror = () => {
      console.error("Failed to load 3Dmol.js");
      setError("Failed to load 3Dmol.js library");
    };

    return () => {
      document.body.removeChild(script);
      if (viewerInstance.current) {
        viewerInstance.current.clear();
      }
    };
  }, [files]);

  if (error) {
    return (
      <div
        style={{ width: "100%", height, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}
        className="bg-white text-red-500 text-center p-4"
      >
        {error}
      </div>
    );
  }

  return (
    <div
      ref={viewerRef}
      style={{ width: "100%", height, position: "relative" }}
    />
  );
}
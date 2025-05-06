'use client';

import { useState, useEffect, useRef } from 'react';

interface Molecule2DViewerProps {
  filePath: string; // Path to the SDF file (e.g., "temp_<UUID>/cluster_rep_conformers/rep_of_cluster_1.sdf")
}

const Molecule2DViewer = ({ filePath }: Molecule2DViewerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRDKitLoaded, setIsRDKitLoaded] = useState(false);
  const [sdfData, setSdfData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rdKitModule, setRdKitModule] = useState<any>(null); // Store the RDKit module instance

  // Load RDKit.js from unpkg.com
  useEffect(() => {
    const loadRDKit = async () => {
      try {
        if (window.RDKit) {
          setRdKitModule(window.RDKit);
          setIsRDKitLoaded(true);
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://unpkg.com/@rdkit/rdkit/dist/RDKit_minimal.js';
        script.async = true;

        script.onload = () => {
          // Initialize RDKit with locateFile to ensure WASM is loaded correctly
          window.initRDKitModule({
            locateFile: (file: string) => `https://unpkg.com/@rdkit/rdkit/dist/${file}`,
          }).then((RDKit: any) => {
            setRdKitModule(RDKit);
            setIsRDKitLoaded(true);
            console.log("RDKit.js loaded successfully for 2D visualization");
          }).catch((err: Error) => {
            setError('Failed to initialize RDKit: ' + err.message);
          });
        };

        script.onerror = () => {
          setError('Failed to load RDKit script');
        };

        document.body.appendChild(script);

        return () => {
          document.body.removeChild(script);
        };
      } catch (err: any) {
        setError('Error loading RDKit: ' + err.message);
      }
    };

    loadRDKit();
  }, []);

  // Fetch SDF data
  useEffect(() => {
    const fetchSdfData = async () => {
      try {
        const encodedPath = encodeURIComponent(filePath);
        const fetchUrl = `/api/files/${encodedPath}`;
        console.log(`Fetching SDF for 2D visualization: ${fetchUrl} (original: ${filePath})`);
        const response = await fetch(fetchUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch ${fetchUrl}: ${response.status} ${response.statusText}`);
        }
        const data = await response.text();
        setSdfData(data);
      } catch (err: any) {
        setError('Error fetching SDF data: ' + err.message);
      }
    };

    if (filePath) {
      fetchSdfData();
    }
  }, [filePath]);

  // Render the molecule when RDKit is loaded and sdfData is available
  useEffect(() => {
    if (isRDKitLoaded && sdfData && canvasRef.current && rdKitModule) {
      try {
        const mol = rdKitModule.get_mol(sdfData);

        if (!mol || !mol.is_valid()) {
          mol?.delete();
          throw new Error('Could not parse SDF data');
        }

        // Clear previous drawings
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        // Draw the molecule
        const opts = {
            width: canvas.width,
            height: canvas.height,
            bondLineWidth: 2.0, // Thicker lines for better visibility
            backgroundColour: [1, 1, 1, 1], // Solid white background
            drawOptions: {
              addStereoAnnotation: true,
              addAtomIndices: false,
              addBondIndices: false,
              fixedScale: 16,                 // More space between atoms
              padding: 0.5,                   // Extra padding around molecule
              includeAtomTags: false,
              useBWAtomPalette: false,
              includeMetadata: false,
              centreMoleculesBeforeDrawing: true,
              explicitMethyl: true,          // Show methyl groups clearly
              setFontSize: 14,               // Improves atom label legibility
            },
          };
          
          
        mol.draw_to_canvas_with_highlights(canvas, JSON.stringify(opts));

        // Clean up
        mol.delete();
      } catch (err: any) {
        setError('Error rendering molecule: ' + err.message);
      }
    }
  }, [isRDKitLoaded, sdfData, rdKitModule]);

  return (
    <div className="w-[300px] h-[300px] flex flex-col items-center">
      {error && <div className="text-red-500 mb-2 text-sm">{error}</div>}
      {!isRDKitLoaded && !error && (
        <div className="text-gray-500 mb-2 text-sm">Loading RDKit...</div>
      )}
      <canvas
        ref={canvasRef}
        width={300}
        height={300}
        className="border border-gray-300 bg-white"
      />
    </div>
  );
};

export default Molecule2DViewer;
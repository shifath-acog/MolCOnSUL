import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { v4 as uuidv4 } from "uuid";
import { runPipeline } from "@/lib/api";
import { PipelineResponse } from "@/lib/types";

interface FormData {
  smiles: string;
  sampleSize: number;
  maxEnsembleSize: number;
  dielectric: number;
  geomOpt: boolean;
}

interface SidebarProps {
  onPipelineStart: (jobId: string) => void;
  onPipelineUpdate: (data: PipelineResponse | { log: string }) => void;
}

export default function Sidebar({ onPipelineStart, onPipelineUpdate }: SidebarProps) {
  const { register, handleSubmit, setValue, watch } = useForm<FormData>({
    defaultValues: {
      smiles: "",
      sampleSize: 1000,
      maxEnsembleSize: 20,
      dielectric: 1.0,
      geomOpt: false,
    },
  });

  const [refConfoFile, setRefConfoFile] = useState<File | null>(null);
  const [dielectricChoice, setDielectricChoice] = useState<string>("Vacuum (1.0)");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const geomOpt = watch("geomOpt"); // Watch geomOpt for controlled checkbox

  const dielectricOptions = [
    { label: "Vacuum (1.0)", value: 1.0 },
    { label: "Water (78.5)", value: 78.5 },
    { label: "Dimethyl sulfoxide (DMSO) (46.7)", value: 46.7 },
    { label: "Acetone (20.7)", value: 20.7 },
    { label: "Chloroform (4.8)", value: 4.8 },
    { label: "Others", value: null },
  ];

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      "chemical/x-sdf": [".sdf"],
      "chemical/x-mol2": [".mol2"],
      "chemical/x-pdb": [".pdb"],
      "chemical/x-xyz": [".xyz"],
    },
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setRefConfoFile(acceptedFiles[0]);
      }
    },
  });

  const onSubmit = async (data: FormData) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const jobId = uuidv4();
      onPipelineStart(jobId);
      console.log("Pipeline started:", { jobId, ...data });

      const formData = new FormData();
      formData.append("smiles", data.smiles);
      formData.append("sampleSize", data.sampleSize.toString());
      formData.append("maxEnsembleSize", data.maxEnsembleSize.toString());
      formData.append("dielectric", data.dielectric.toString());
      formData.append("geomOpt", data.geomOpt.toString());
      if (refConfoFile) {
        formData.append("refConfoFile", refConfoFile);
      }

      await runPipeline(formData, onPipelineUpdate);
    } catch (err) {
      console.error("Pipeline submission error:", err);
      setError("Failed to run pipeline. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="fixed top-20 left-4 w-[340px] h-[calc(100vh-120px)] p-4 bg-secondary text-foreground shadow-lg overflow-auto">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="smiles" className="block text-sm font-medium">Input SMILES *</label>
          <Input id="smiles" {...register("smiles", { required: true })} placeholder="e.g., CCO" />
        </div>
        <div>
          <label className="block text-sm font-medium">Reference Conformer</label>
          <div {...getRootProps()} className="border-dashed border-2 p-2 rounded-md text-center cursor-pointer">
            <input {...getInputProps()} />
            <p>{refConfoFile ? refConfoFile.name : "Drag or click to upload (.sdf, .mol2, .pdb, .xyz)"}</p>
          </div>
        </div>
        <div>
          <label htmlFor="sampleSize" className="block text-sm font-medium">Sample Size</label>
          <Input
            id="sampleSize"
            type="number"
            {...register("sampleSize", { min: 1, valueAsNumber: true })}
            defaultValue={1000}
          />
        </div>
        <div>
          <label htmlFor="maxEnsembleSize" className="block text-sm font-medium"># Conformers</label>
          <Input
            id="maxEnsembleSize"
            type="number"
            {...register("maxEnsembleSize", { min: 1, valueAsNumber: true })}
            defaultValue={20}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Dielectric Constant</label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                {dielectricChoice}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {dielectricOptions.map((option) => (
                <DropdownMenuItem
                  key={option.label}
                  onSelect={() => {
                    setDielectricChoice(option.label);
                    if (option.value !== null) {
                      setValue("dielectric", option.value);
                    }
                  }}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {dielectricChoice === "Others" && (
            <Input
              type="number"
              step="0.1"
              {...register("dielectric", { min: 0, valueAsNumber: true })}
              placeholder="Custom dielectric value"
              className="mt-2"
            />
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="geomOpt"
            checked={geomOpt}
            onCheckedChange={(checked) => setValue("geomOpt", checked === true)}
          />
          <label htmlFor="geomOpt" className="text-sm">Optimized geometry using DFT</label>
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <div className="flex items-center justify-center">
              <svg
                className="animate-spin h-5 w-5 mr-2 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Processing...
            </div>
          ) : (
            "Generate"
          )}
        </Button>
        {error && <p className="text-destructive text-sm">{error}</p>}
      </form>
      <Button asChild variant="link" className="mt-4 w-full">
        <a href="https://drive.google.com/file/d/136D4uGz6nXkU4fbmSNZj9sTLR-JY7l81/view?usp=sharing" target="_blank" rel="noopener noreferrer">
          More about MolConSUL
        </a>
      </Button>
    </Card>
  );
}
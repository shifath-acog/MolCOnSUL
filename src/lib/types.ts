export interface PipelineFormData {
    smiles: string;
    refConfoFile?: File;
    sampleSize: number;
    maxEnsembleSize: number;
    dielectric: number;
    geomOpt: boolean;
  }
  
  export interface PipelineResponse {
    logs: string[];
    outputFiles?: string[];
    minRmsd?: number;
    status?: "completed" | "failed";
  }

  
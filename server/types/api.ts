export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ProcessResult {
  success: boolean;
  output?: string;
  error?: string;
}

export interface UploadResult {
  id: string;
  filename: string;
  path: string;
}

export interface RandomImageResult {
  filename: string;
  path: string;
}

export interface ErrorResponse {
  error: string;
}

export type OperationArgs = Record<string, unknown>;

export interface ProcessRequest {
  inputPath: string;
  pipelines: import('./operations').Pipeline[];
}

export interface OperationInfo {
  id: string;
  name: string;
  category: string;
  description: string;
  args: import('./operations').Argument[];
}
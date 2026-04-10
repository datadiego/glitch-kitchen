export interface Argument {
  name: string;
  label: string;
  type: 'number' | 'string' | 'select' | 'colors' | 'range';
  default: string | number | string[];
  min?: number;
  max?: number;
  options?: string[];
  maxColors?: number;
}

export interface Operation {
  id: string;
  name: string;
  category: string;
  description: string;
  args: Argument[];
}

export interface OperationRecipe {
  id: string;
  args: Record<string, unknown>;
}

export interface Pipeline {
  recipe: OperationRecipe[];
  repeat?: number;
}
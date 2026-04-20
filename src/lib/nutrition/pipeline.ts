export interface NutritionResult {
  kcalMin: number;
  kcalMax: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export async function runPipeline(_items: string[]): Promise<NutritionResult> {
  return { kcalMin: 0, kcalMax: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
}

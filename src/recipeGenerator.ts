import { googleAI } from '@genkit-ai/google-genai';
import { configure, defineFlow, generate, startFlows } from 'genkit';
import { z } from 'zod';

configure({
  plugins: [
    googleAI(),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});

// Define input schema
const RecipeInputSchema = z.object({
  ingredient: z.string().describe('Main ingredient or cuisine type'),
  dietaryRestrictions: z.string().optional().describe('Any dietary restrictions'),
});

// Define output schema
const RecipeSchema = z.object({
  title: z.string(),
  description: z.string(),
  prepTime: z.string(),
  cookTime: z.string(),
  servings: z.number(),
  ingredients: z.array(z.string()),
  instructions: z.array(z.string()),
  tips: z.array(z.string()).optional(),
});

// Define a recipe generator flow
export const recipeGeneratorFlow = defineFlow(
  {
    name: 'recipeGeneratorFlow',
    inputSchema: RecipeInputSchema,
    outputSchema: RecipeSchema,
  },
  async (input) => {
    // Create a prompt based on the input
    const prompt = `Create a recipe with the following requirements:
      Main ingredient: ${input.ingredient}
      Dietary restrictions: ${input.dietaryRestrictions || 'none'}`;

    // Generate structured recipe data using the same schema
    const { output } = await generate({
        model: 'gemini-pro',
        prompt,
        output: { schema: RecipeSchema },
    });

    if (!output) throw new Error('Failed to generate recipe');

    return output;
  },
);

startFlows();

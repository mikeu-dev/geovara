'use server';

/**
 * @fileOverview This file defines a Genkit flow to generate a brief description of a GeoJSON feature using AI.
 *
 * - generateFeatureDescription - A function that takes a GeoJSON feature as input and returns a description.
 * - GenerateFeatureDescriptionInput - The input type for the generateFeatureDescription function.
 * - GenerateFeatureDescriptionOutput - The return type for the generateFeatureDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {GeoJsonObject} from 'geojson';

const GenerateFeatureDescriptionInputSchema = z.object({
  feature: z
    .object({
      type: z.string(),
      geometry: z.any(),
      properties: z.any(),
    })
    .describe('The GeoJSON feature to describe.'),
});
export type GenerateFeatureDescriptionInput = z.infer<
  typeof GenerateFeatureDescriptionInputSchema
>;

const GenerateFeatureDescriptionOutputSchema = z.object({
  description: z.string().describe('A brief description of the feature.'),
});
export type GenerateFeatureDescriptionOutput = z.infer<
  typeof GenerateFeatureDescriptionOutputSchema
>;

export async function generateFeatureDescription(
  input: GenerateFeatureDescriptionInput
): Promise<GenerateFeatureDescriptionOutput> {
  return generateFeatureDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateFeatureDescriptionPrompt',
  input: {schema: GenerateFeatureDescriptionInputSchema},
  output: {schema: GenerateFeatureDescriptionOutputSchema},
  prompt: `You are a helpful assistant that generates a concise description of a GeoJSON feature.

  Given the following GeoJSON feature, create a short, informative description of what it represents.
  Feature:
  \`\`\`json
  {{{JSON.stringify feature}}}
  \`\`\`
  `,
});

const generateFeatureDescriptionFlow = ai.defineFlow(
  {
    name: 'generateFeatureDescriptionFlow',
    inputSchema: GenerateFeatureDescriptionInputSchema,
    outputSchema: GenerateFeatureDescriptionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

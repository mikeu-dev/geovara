'use server';

/**
 * @fileOverview A GeoJSON validation AI agent.
 *
 * - validateGeoJSON - A function that validates GeoJSON using AI.
 * - ValidateGeoJSONInput - The input type for the validateGeoJSON function.
 * - ValidateGeoJSONOutput - The return type for the validateGeoJSON function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ValidateGeoJSONInputSchema = z.string().describe('The GeoJSON string to validate.');
export type ValidateGeoJSONInput = z.infer<typeof ValidateGeoJSONInputSchema>;

const ValidateGeoJSONOutputSchema = z.object({
  isValid: z.boolean().describe('Whether the GeoJSON is valid or not.'),
  feedback: z.string().describe('Feedback on the GeoJSON, including errors if invalid.'),
});
export type ValidateGeoJSONOutput = z.infer<typeof ValidateGeoJSONOutputSchema>;

export async function validateGeoJSON(input: ValidateGeoJSONInput): Promise<ValidateGeoJSONOutput> {
  return validateGeoJSONFlow(input);
}

const validateGeoJSONPrompt = ai.definePrompt({
  name: 'validateGeoJSONPrompt',
  input: {schema: ValidateGeoJSONInputSchema},
  output: {schema: ValidateGeoJSONOutputSchema},
  prompt: `You are a GeoJSON expert.  Your job is to validate the GeoJSON provided and provide feedback.

  Here is the GeoJSON to validate:
  \`\`\`
  {{{input}}
  \`\`\`

  Respond in JSON format.  Set isValid to true if the GeoJSON is valid, and false otherwise.
  Provide feedback on the GeoJSON, and if it is invalid, describe the errors.
  `,
});

const validateGeoJSONFlow = ai.defineFlow(
  {
    name: 'validateGeoJSONFlow',
    inputSchema: ValidateGeoJSONInputSchema,
    outputSchema: ValidateGeoJSONOutputSchema,
  },
  async input => {
    const {output} = await validateGeoJSONPrompt({input: input});
    return output!;
  }
);

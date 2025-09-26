'use server';

/**
 * @fileOverview A GeoJSON validation AI agent.
 *
 * - validateGeoJSON - A function that validates GeoJSON using AI.
 * - ValidateGeoJSONInput - The input type for the validateGeoJSON function.
 * - ValidateGeoJSONOutput - The return type for the validateGeoJSON function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

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
  input: {schema: ValidateGeoJSONInputSchema },
  output: {schema: ValidateGeoJSONOutputSchema},
  prompt: `You are a strict GeoJSON validator. Your job is to validate the provided text against the GeoJSON specification (RFC 7946).

Here is the GeoJSON to validate:
{{{input}}}

Respond in JSON format.
- Set 'isValid' to true if the GeoJSON is perfectly valid according to RFC 7946.
- Set 'isValid' to false ONLY if there is a clear violation of the GeoJSON specification.
- In the 'feedback' field, provide a concise explanation. If valid, say "The GeoJSON is valid." If invalid, briefly explain the specific error.
  `,
});

const validateGeoJSONFlow = ai.defineFlow(
  {
    name: 'validateGeoJSONFlow',
    inputSchema: ValidateGeoJSONInputSchema,
    outputSchema: ValidateGeoJSONOutputSchema,
  },
  async input => {
    const {output} = await validateGeoJSONPrompt(input);
    return output!;
  }
);

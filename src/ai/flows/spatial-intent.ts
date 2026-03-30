'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

/**
 * @fileOverview AI Flow that translates natural language into actionable GIS intents.
 */

const SpatialIntentInputSchema = z.object({
  prompt: z.string().describe('The user command in natural language.'),
  featureContext: z.string().optional().describe('Brief summary of existing map features (types, count).'),
});
export type SpatialIntentInput = z.infer<typeof SpatialIntentInputSchema>;

const SpatialIntentOutputSchema = z.object({
  action: z.enum([
    'buffer',
    'centroid',
    'simplify',
    'union',
    'flyTo',
    'setBasemap',
    'setProjection',
    'clear',
    'delete',
    'unknown'
  ]).describe('The specific GIS operation inferred from the prompt.'),
  params: z.object({
    radius: z.number().optional().describe('Radius for buffer (default units: km).'),
    units: z.enum(['meters', 'kilometers', 'miles', 'degrees']).optional(),
    query: z.string().optional().describe('Search query for location fly-to.'),
    basemap: z.string().optional().describe('Name of the basemap (osm, satellite, topo, dark).'),
    projection: z.string().optional().describe('Projection code (EPSG:4326, EPSG:3857).'),
    target: z.enum(['all', 'selected', 'last']).optional().describe('Which feature(s) to target.'),
  }).optional(),
  narrative: z.string().describe('A short user-friendly response explaining what the AI is doing.')
});
export type SpatialIntentOutput = z.infer<typeof SpatialIntentOutputSchema>;

const spatialIntentPrompt = ai.definePrompt({
  name: 'spatialIntentPrompt',
  input: { schema: SpatialIntentInputSchema },
  output: { schema: SpatialIntentOutputSchema },
  prompt: `You are the core intelligence of Geovara, a professional GIS platform.
Your job is to translate user natural language commands into structured JSON actions.

**Context of current map:**
{{{input.featureContext}}}

**User Prompt:**
{{{input.prompt}}}

**Rules:**
1. Determine the 'action' and extract relevant 'params'.
2. If the user mentions a location without a specific geometry action (e.g., "Take me to Paris"), use 'flyTo'.
3. If they ask for geometric analysis (e.g., "Buffer this polygon by 1km"), use 'buffer'.
4. Default to 'kilometers' for buffer distances if not specified.
5. Provide a short, polite 'narrative' (max 10 words) describing the action.
6. If the command is unclear, return 'unknown' as the action.

Respond strictly in JSON.`,
});

export async function processSpatialIntent(prompt: string, featureContext?: string): Promise<SpatialIntentOutput> {
  const { output } = await spatialIntentPrompt({ prompt, featureContext });
  return output!;
}

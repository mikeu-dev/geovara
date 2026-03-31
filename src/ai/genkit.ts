import {genkit} from 'genkit';
import {googleAI, gemini20Flash} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY,
    }),
  ],
  model: gemini20Flash,
});

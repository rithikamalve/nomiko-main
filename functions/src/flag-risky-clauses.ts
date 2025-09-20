/**
 * @fileOverview This file defines a Genkit flow for identifying and flagging potentially risky clauses in a document.
 */

import { ai } from './genkit';
import { z } from 'genkit';
import type {
  FlagRiskyClausesInput,
  FlagRiskyClausesOutput,
} from './lib/types';

const FlagRiskyClausesInputSchema = z.object({
  documentText: z
    .string()
    .describe('The complete text of the document to analyze.'),
});

const RiskAssessmentSchema = z.object({
  isRisky: z.boolean().describe('Whether the clause is potentially risky.'),
  riskScore: z
    .enum(['🟢 Low', '🟡 Medium', '🔴 High'])
    .describe(
      'The risk score of the clause: 🟢 Low (Standard), 🟡 Medium (Unfavorable but negotiable), 🔴 High (High risk / predatory).'
    ),
  rationale: z
    .string()
    .describe('The rationale for why the clause is considered risky.'),
});

const ClauseAnalysisSchema = z.object({
  clauseText: z.string().describe('The text of the clause.'),
  riskAssessment: RiskAssessmentSchema.optional().describe(
    'The risk assessment for the clause, if any.'
  ),
});

const FlagRiskyClausesOutputSchema = z.array(ClauseAnalysisSchema);

const flagRiskyClausesPrompt = ai.definePrompt({
  name: 'flagRiskyClausesPrompt',
  input: { schema: FlagRiskyClausesInputSchema },
  output: { schema: FlagRiskyClausesOutputSchema, json: true },
  prompt: `You are an expert legal analyst. Your first task is to act as an OCR/NER system. Read the following document text and split it into a structured list of every individual clause.

Once you have the list of clauses, your second task is to analyze each clause to identify if it is potentially unfavorable or poses a risk to the user.

For each clause you identify from the document:
1.  Include the full, original text of the clause in the 'clauseText' field.
2.  If a clause is risky, add a 'riskAssessment' object with:
    - 'isRisky': true
    - 'riskScore': '🟢 Low', '🟡 Medium', or '🔴 High'.
    - 'rationale': A brief explanation of the risk.
3.  If a clause is standard and not risky, DO NOT include the 'riskAssessment' object.

Document Text:
{{{documentText}}}

IMPORTANT: Your response MUST be a single, valid JSON array containing objects for every clause in the document. Do not include any text or formatting before or after the JSON array.

Example output for a document with two clauses, one risky and one not:
[
  {
    "clauseText": "Tenant agrees to a monthly rent of $2000, due on the 1st of each month."
  },
  {
    "clauseText": "A late fee of 10% of the monthly rent will be applied for any payment received after the 3rd of the month.",
    "riskAssessment": {
      "isRisky": true,
      "riskScore": "🟡 Medium",
      "rationale": "A 10% late fee is steep and may not be legally enforceable in all jurisdictions. A flat fee or a lower percentage is more common."
    }
  }
]
`,
});

export const flagRiskyClausesFlow = ai.defineFlow(
  {
    name: 'flagRiskyClausesFlow',
    inputSchema: FlagRiskyClausesInputSchema,
    outputSchema: FlagRiskyClausesOutputSchema,
  },
  async (input: FlagRiskyClausesInput): Promise<FlagRiskyClausesOutput> => {
    const { output } = await flagRiskyClausesPrompt(input);
    return output!;
  }
);

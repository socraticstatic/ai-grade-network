// The AI-and-workload half of the ILM-7 taxonomy (src/engine/state-intents.ts).
// The AI board surfaces these; the NaaS board surfaces the complement.
export const AI_INTENT_KEYS = [
  'private-inference', 'cap-token-spend', 'optimize-data-gravity', 'ai-flow-prediction',
] as const;

export function isAiIntent(key: string): boolean {
  return (AI_INTENT_KEYS as readonly string[]).includes(key);
}

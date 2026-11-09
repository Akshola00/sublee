import { z } from 'zod';

/** The second-opinion shape Sublee asks every specialist prompt to return. */
export const Opinion = z.object({
  summary: z.string(),
  urgency: z.enum(['routine', 'soon', 'urgent', 'emergency']),
  urgency_reason: z.string().default(''),
  likely_explanations: z
    .array(
      z.object({
        condition: z.string(),
        likelihood: z.enum(['low', 'medium', 'high']),
        reasoning: z.string(),
      }),
    )
    .default([]),
  red_flags: z.array(z.string()).default([]),
  questions_for_your_doctor: z.array(z.string()).default([]),
  suggested_tests: z.array(z.string()).default([]),
  self_care: z.array(z.string()).default([]),
  what_this_does_not_cover: z.string().default(''),
});
export type Opinion = z.infer<typeof Opinion>;

/** Pull the first JSON object out of model text (tolerates ```json fences and stray prose). */
export function parseOpinion(text: string): Opinion | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const r = Opinion.safeParse(JSON.parse(text.slice(start, end + 1)));
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}

/** Case intake, assembled in the browser and encrypted before leaving it. */
export const CaseInput = z.object({
  age: z.string().optional(),
  sex: z.string().optional(),
  concern: z.string().min(10),
  duration: z.string().optional(),
  history: z.string().optional(),
  medications: z.string().optional(),
  allergies: z.string().optional(),
  attachmentsText: z.array(z.object({ name: z.string(), text: z.string() })).default([]),
});
export type CaseInput = z.infer<typeof CaseInput>;

export function caseToMessage(c: CaseInput): string {
  const lines = [
    `Age: ${c.age || 'not given'}`,
    `Sex: ${c.sex || 'not given'}`,
    `Main concern: ${c.concern}`,
    c.duration && `Duration: ${c.duration}`,
    c.history && `Medical history: ${c.history}`,
    c.medications && `Current medications/supplements: ${c.medications}`,
    c.allergies && `Allergies: ${c.allergies}`,
  ].filter(Boolean);
  for (const a of c.attachmentsText) lines.push(`\n--- Attached document: ${a.name} ---\n${a.text.slice(0, 20_000)}`);
  return lines.join('\n');
}

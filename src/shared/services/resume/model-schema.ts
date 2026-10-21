import { z } from 'zod';

import type { ResumeRequestContext } from './types';

export function isPartialResumeRewrite(input: ResumeRequestContext) {
  return (
    input.rewriteScope === 'paragraph' || input.rewriteScope === 'unlocked'
  );
}

// One schema supplies both the provider constraint and the server validation.
export function resumeOptimizationModelSchema(input: ResumeRequestContext) {
  const ids = input.paragraphs!.map((paragraph) => paragraph.id);
  const title = isPartialResumeRewrite(input)
    ? {}
    : { title: z.string().min(1).max(120) };
  return z.object({
    ...title,
    summary: z.string(),
    paragraphs: z
      .array(
        z.object({
          id: z.enum(ids as [string, ...string[]]),
          text: z.string().min(1),
        })
      )
      .length(ids.length),
    slots: z
      .array(
        z.object({
          id: z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,63}$/),
          label: z.string().min(1).max(100),
          prompt: z.string().min(1).max(300),
          fallbackText: z.string().max(200),
        })
      )
      .max(200),
    changes: z
      .array(
        z.object({
          original: z.string(),
          revised: z.string(),
          type: z.enum([
            'expression',
            'structure',
            'keyword',
            'quantification',
            'focus',
            'deletion',
            'risk',
          ]),
          reason: z.string(),
          needsConfirmation: z.boolean(),
        })
      )
      .max(8),
    confirmationItems: z.array(
      z.object({
        category: z.enum([
          'metric',
          'skill',
          'scope',
          'credential',
          'experience',
          'evidence',
        ]),
        item: z.string(),
        reason: z.string(),
      })
    ),
    changeNotes: z.array(z.string()),
  });
}

export type ResumeOptimizationModelOutput = z.infer<
  ReturnType<typeof resumeOptimizationModelSchema>
>;

export function resumeOptimizationResponseFormat(input: ResumeRequestContext) {
  const { $schema: _draft, ...schema } = z.toJSONSchema(
    resumeOptimizationModelSchema(input),
    {
      override: ({ jsonSchema }) => {
        // This provider stalls on the bounded schema. Constrain the structure
        // here; enforce lengths, slot IDs and exact paragraph counts on receipt.
        delete jsonSchema.minLength;
        delete jsonSchema.maxLength;
        delete jsonSchema.pattern;
        delete jsonSchema.minItems;
        delete jsonSchema.maxItems;
      },
    }
  );
  return {
    type: 'json_schema' as const,
    json_schema: { name: 'resume_optimization', strict: true, schema },
  };
}

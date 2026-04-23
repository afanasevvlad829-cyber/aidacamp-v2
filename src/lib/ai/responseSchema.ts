import { z } from 'zod';

const ChipSchema = z.object({
  label: z.string(),
  query: z.string().optional(),
  action: z.enum(['book', 'contact_request']).optional(),
});

export const ResponseSchema = z.object({
  text: z.string(),
  block_type: z.enum([
    'smeny', 'courses', 'day_schedule',
    'conditions', 'prices', 'location', 'gallery',
    'video_player', 'youtube_comment', 'tax_calculator',
  ]).nullable(),
  block_data: z.record(z.string(), z.any()).nullable(),
  chips: z.array(ChipSchema).max(4),
});

export type AskResponse = z.infer<typeof ResponseSchema>;
export type Chip = z.infer<typeof ChipSchema>;
export type BlockType = AskResponse['block_type'];

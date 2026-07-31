/**
 * Must stay in sync with Toonflow-app BurnNextStep / BURN_NEXT_STEPS (contract CI).
 */
export const BURN_NEXT_STEPS = [
  "chat_repair",
  "soft_patch",
  "split_shot",
  "batch_still",
  "retry_shot",
  "burn",
  "raise_duration",
  "regen_storyboard_hq",
  "human_review",
] as const;

export type BurnNextStep = (typeof BURN_NEXT_STEPS)[number];

export function isBurnNextStep(v: unknown): v is BurnNextStep {
  return typeof v === "string" && (BURN_NEXT_STEPS as readonly string[]).includes(v);
}

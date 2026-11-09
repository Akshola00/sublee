export type PromptView = {
  token_id: string;
  owner_id: string;
  creator_id: string;
  metadata: { title?: string; description?: string; media?: string | null; extra?: string } | null;
  specialty: string;
  model: string;
  price_near: string;
  price_usdc: string;
  price_cents: string;
  version: number;
  uses: number;
  rating_sum: number;
  rating_count: number;
  active: boolean;
};

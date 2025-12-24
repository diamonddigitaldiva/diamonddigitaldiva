export interface Question {
  text: string;
  options: Record<string, string>;
}

export const QUESTIONS: Question[] = [
  {
    text: "Where are you actually stuck right now?",
    options: {
      A: "I don't know where to start.",
      B: "My content doesn't sound like me.",
      C: "My message lacks emotion.",
      D: "I blend in too much.",
      E: "My avatar isn't guiding anything.",
      F: "I have no content system.",
      G: "I want real income streams.",
      H: "My backend is messy."
    }
  },
  {
    text: "What feels hardest when you try to work?",
    options: {
      A: "Overwhelm",
      B: "Voice",
      C: "Story",
      D: "Positioning",
      E: "Avatar clarity",
      F: "Structure",
      G: "Monetization",
      H: "Tech"
    }
  }
];

export const STAGE_MAP: Record<string, string> = {
  A: "CFW",
  B: "AICA",
  C: "MPV",
  D: "TACM",
  E: "ATA",
  F: "TSA",
  G: "DWA",
  H: "FOC"
};

export const STAGE_NAMES: Record<string, string> = {
  CFW: "CFW — The Start Line",
  AICA: "AICA — The Brain",
  MPV: "MPV — The Heart",
  TACM: "TACM — The Decoder",
  ATA: "ATA — The Engine",
  TSA: "TSA — The OS",
  DWA: "DWA — The Business",
  FOC: "FOC — The Infrastructure"
};

export const LINKS: Record<string, string> = {
  CFW: "https://stan.store/affiliates/c935ed13-9133-43b2-aaed-80ecc046111d",
  AICA: "https://stan.store/affiliates/4ca38442-fd7d-424e-876a-c6d1bd3666a3",
  MPV: "https://stan.store/affiliates/98b2e074-55af-4525-b916-d2b568899334",
  TACM: "https://stan.store/affiliates/b65c8924-96d7-4b85-bf01-8f7a41c7de7d",
  ATA: "https://stan.store/affiliates/b42f8d5f-d122-45a2-a8fc-8e5a347b95fe",
  TSA: "https://stan.store/affiliates/b6f875c9-80ff-4073-b7c4-4555497ee91a",
  DWA: "https://go.diamonddigitaldiva.com/dwa",
  FOC: "https://funnelsofcourse.com/foc-home?am_id=elleni1987",
  BOUTIQUE: "https://beacons.ai/diamonddigitaldiva"
};

export function computeResults(answers: Record<number, string>): { primary: string; secondary: string | null } {
  const score: Record<string, number> = {};
  
  Object.values(answers).forEach(answer => {
    const stage = STAGE_MAP[answer];
    if (stage) {
      score[stage] = (score[stage] || 0) + 1;
    }
  });

  const sorted = Object.entries(score).sort((a, b) => b[1] - a[1]);
  
  return {
    primary: sorted[0]?.[0] || "CFW",
    secondary: sorted[1]?.[0] || null
  };
}

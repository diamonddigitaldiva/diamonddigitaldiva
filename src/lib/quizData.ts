export interface Question {
  text: string;
  options: Record<string, string>;
}

export const QUESTIONS: Question[] = [
  {
    text: "What's your biggest struggle with getting your message out?",
    options: {
      A: "I don't know where to start.",
      B: "I keep editing myself into something I'm not.",
      C: "It doesn't sound like me at all.",
      D: "It feels bland or boring.",
      E: "I'm not sure who I'm speaking to.",
      F: "I don't have a consistent content plan.",
      G: "I'm creating but it's not making money.",
      H: "I'm doing too much tech just to get seen.",
      I: "I don't feel confident in what I'm sharing."
    }
  },
  {
    text: "How do you feel when you try to sit down and create content?",
    options: {
      A: "Totally overwhelmed.",
      B: "Stuck second-guessing my tone.",
      C: "Disconnected from my story.",
      D: "Unsure what makes me stand out.",
      E: "Confused about my audience.",
      F: "Scattered with no structure.",
      G: "Unclear how this builds income.",
      H: "Frustrated with backend systems.",
      I: "Like I'm missing the 'special' spark."
    }
  },
  {
    text: "What's blocking your message from being clear and powerful?",
    options: {
      A: "Not enough clarity to start.",
      B: "Trying to sound right instead of real.",
      C: "Not expressing what I've actually been through.",
      D: "Not knowing how to position what I do.",
      E: "No clear vision of who I'm talking to.",
      F: "Too many moving pieces to organize.",
      G: "Content isn't converting to sales.",
      H: "I've built a funnel that doesn't feel like me.",
      I: "I don't know what makes me magnetic."
    }
  },
  {
    text: "How well do you know your dream audience?",
    options: {
      A: "I have a loose idea but it's not defined.",
      B: "I worry they won't get me.",
      C: "I'm not sharing what they really need to hear.",
      D: "I don't know what they need most.",
      E: "I haven't clarified who they are.",
      F: "It's not guiding how I show up.",
      G: "I'm unsure what content they'll buy from me.",
      H: "I'm trying to automate without knowing them.",
      I: "I don't know how to resonate with them."
    }
  },
  {
    text: "What happens when you try to write an offer?",
    options: {
      A: "I don't start because I overthink.",
      B: "It doesn't sound like something I'd buy.",
      C: "I'm not sharing the transformation clearly.",
      D: "I can't find the words to differentiate.",
      E: "I'm unsure who I'm writing to.",
      F: "It doesn't fit into any content system.",
      G: "It doesn't lead to actual sales.",
      H: "I get stuck setting up the tech behind it.",
      I: "It feels like it lacks that secret sauce."
    }
  },
  {
    text: "What do you wish was easier in your creative process?",
    options: {
      A: "Knowing where to begin.",
      B: "Letting my real voice lead.",
      C: "Turning my story into content.",
      D: "Crafting unique messaging.",
      E: "Letting my avatar guide me.",
      F: "Building a working content plan.",
      G: "Creating profitable assets.",
      H: "Making tech feel seamless.",
      I: "Tapping into my magic consistently."
    }
  },
  {
    text: "Where do you usually stop or get stuck?",
    options: {
      A: "At the very beginning.",
      B: "When trying to sound authentic.",
      C: "When explaining what I've overcome.",
      D: "When trying to make my offer stand out.",
      E: "When defining my dream client.",
      F: "When planning the content journey.",
      G: "When turning content into cash.",
      H: "When connecting all the tools.",
      I: "When I try to bottle my uniqueness."
    }
  },
  {
    text: "What kind of support would help you most?",
    options: {
      A: "Help getting started.",
      B: "Voice and style clarity.",
      C: "Storytelling frameworks.",
      D: "Strong positioning strategy.",
      E: "Audience alignment.",
      F: "Content structure systems.",
      G: "Revenue-driving ideas.",
      H: "Backend tech clean-up.",
      I: "Uncovering my special edge."
    }
  },
  {
    text: "What do you secretly fear when it comes to messaging?",
    options: {
      A: "I'm not ready to do this.",
      B: "I'll sound like everyone else.",
      C: "My story won't resonate.",
      D: "People won't see my difference.",
      E: "I'm unclear who I serve.",
      F: "I'll stay stuck in a cycle of content chaos.",
      G: "I'll never earn from what I create.",
      H: "My systems will sabotage my growth.",
      I: "I'll never find the 'thing' that makes me unforgettable."
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
  H: "FOC",
  I: "TSS"
};

export const STAGE_NAMES: Record<string, string> = {
  CFW: "CFW – The Start Line",
  AICA: "AICA – The Brain (2.0)",
  MPV: "MPV – Must-Have Production Vault",
  TACM: "TACM – The Decoder",
  ATA: "ATA – The Engine",
  TSA: "TSA – The OS",
  DWA: "DWA – The Business",
  FOC: "FOC – The Infrastructure",
  TSS: "TSS – The Secret Sauce"
};

export const LINKS: Record<string, string> = {
  CFW: "https://stan.store/affiliates/c935ed13-9133-43b2-aaed-80ecc046111d",
  AICA: "https://shop.beacons.ai/diamonddigitaldiva/03ce2f96-f277-4ee0-9486-ed56fdcb9554",
  MPV: "https://shop.beacons.ai/diamonddigitaldiva/fc2e90aa-974a-4250-bba4-4874983c6527",
  TACM: "https://stan.store/affiliates/b65c8924-96d7-4b85-bf01-8f7a41c7de7d",
  ATA: "https://stan.store/affiliates/b42f8d5f-d122-45a2-a8fc-8e5a347b95fe",
  TSA: "https://stan.store/affiliates/b6f875c9-80ff-4073-b7c4-4555497ee91a",
  DWA: "https://go.diamonddigitaldiva.com/dwa",
  FOC: "https://funnelsofcourse.com/foc-home?am_id=elleni1987",
  TSS: "https://shop.beacons.ai/diamonddigitaldiva/4f3e423a-491a-40f2-828b-d46cb1d5abcb",
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

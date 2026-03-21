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
      I: "I don't feel confident in what I'm sharing.",
      J: "I don't have a clear roadmap for my business.",
      K: "I'm not using AI to grow my influence.",
      L: "I need to pivot but don't know how."
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
      I: "Like I'm missing the 'special' spark.",
      J: "Lost without a business blueprint.",
      K: "Like I'm missing out on AI tools.",
      L: "Ready for a fresh start but unsure how."
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
      I: "I don't know what makes me magnetic.",
      J: "No personalized plan to follow.",
      K: "Not leveraging AI for reach and growth.",
      L: "I've outgrown my current approach."
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
      I: "I don't know how to resonate with them.",
      J: "I need a system to map it all out.",
      K: "I want AI to help me reach them.",
      L: "My audience has changed and I need to adapt."
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
      I: "It feels like it lacks that secret sauce.",
      J: "I don't have a blueprint to guide me.",
      K: "I'm not using AI to optimize it.",
      L: "My old offers don't fit who I'm becoming."
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
      I: "Tapping into my magic consistently.",
      J: "Having a step-by-step business map.",
      K: "Using AI to amplify my influence.",
      L: "Reinventing my brand direction."
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
      I: "When I try to bottle my uniqueness.",
      J: "When I realize I don't have a plan.",
      K: "When I see others using AI and I'm not.",
      L: "When my current brand no longer fits."
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
      I: "Uncovering my special edge.",
      J: "A personalized business blueprint.",
      K: "AI-powered growth strategies.",
      L: "A framework for pivoting my brand."
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
      I: "I'll never find the 'thing' that makes me unforgettable.",
      J: "I'll keep going in circles without a plan.",
      K: "I'll fall behind on AI trends.",
      L: "I'll stay stuck in a brand that no longer fits."
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
  I: "TSS",
  J: "TDP",
  K: "AIS",
  L: "CPM"
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
  TSS: "TSS – The Secret Sauce",
  TDP: "TDP – The Decision Point",
  AIS: "AIS – AIfluencer Studio",
  CPM: "CPM – The Pivot Method"
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
  TSS: "https://shop.beacons.ai/diamonddigitaldiva/4f3e423a-491a-40f2-828b-d46cb1d5abcb",
  TDP: "https://thedecisionpoint-diamonddigitaldiva.lovable.app",
  AIS: "https://stan.store/affiliates/32fd0453-745e-46f9-b929-c48aad195517",
  CPM: "https://shop.beacons.ai/diamonddigitaldiva/3fbc71c2-f595-471d-a840-04ea2f5a4204",
  BOUTIQUE: "https://beacons.ai/diamonddigitaldiva"
};

// Upsell configuration
export interface UpsellProduct {
  name: string;
  description: string;
  url: string;
  label?: string; // e.g. "Budget-Friendly Alternative", "Recommended Add-On"
}

// Products that are considered high-ticket (over $150) → FOC upsell
const HIGH_TICKET_STAGES = ["CFW", "DWA", "ATA"];

const UPSELL_PRODUCTS: Record<string, UpsellProduct> = {
  antiCloneDecoder: {
    name: "The Anti-Clone Decoder",
    description: "Decode what makes your brand unique and eliminate copycat energy.",
    url: "https://shop.beacons.ai/diamonddigitaldiva/7e778ca6-ee40-47de-8c70-078e3c0613ac",
  },
  promptBank: {
    name: "PromptBank",
    description: "Curated library of high-converting prompts for AI tools.",
    url: "https://stan.store/affiliates/76fa35b2-b072-4e55-b50a-bc522d34c823",
  },
  afterTheAlgorithm: {
    name: "After The Algorithm",
    description: "Master the algorithm and grow your reach with strategic insights.",
    url: "https://stan.store/affiliates/533fdf9b-b338-4f22-b5fe-a7f7c2637585",
  },
  openArtAI: {
    name: "OpenArt AI",
    description: "Create stunning AI-generated artwork for your content and brand.",
    url: "https://openart.ai/home?ref=kristopher01",
  },
  createLaunchSell: {
    name: "Create Launch Sell",
    description: "The complete blueprint for creating, launching, and selling digital products.",
    url: "https://stan.store/affiliates/73f3347c-ff55-448e-a5ce-916f3421f401",
    label: "Budget-Friendly Alternative",
  },
  funnelsOfCourse: {
    name: "Funnels of Course (FOC)",
    description: "Complete funnel building system — design high-converting funnels that turn visitors into buyers.",
    url: "https://funnelsofcourse.com/foc-home?am_id=elleni1987",
    label: "Recommended Add-On",
  },
  facelessLaunch: {
    name: "The Faceless Launch",
    description: "Complete launch system for faceless creators. Everything you need to launch your digital products without showing your face.",
    url: "https://stan.store/affiliates/fd776c11-5dc2-4102-8291-e10d98729d7d",
    label: "Budget-Friendly Alternative",
  },
  theSecretSauce: {
    name: "The Secret Sauce (TSS)",
    description: "Psychology-based content and conversion system. Build trust and create content that sells without a big following.",
    url: "https://stan.store/affiliates/494d42e8-1d91-44ac-93f4-fd97b9368525",
  },
  tacmProduct: {
    name: "The Anti-Clone Method (TACM)",
    description: "Positioning system that rebuilds your voice, offers, and content into something buyers chase.",
    url: "https://stan.store/affiliates/b65c8924-96d7-4b85-bf01-8f7a41c7de7d",
  },
  tsaProduct: {
    name: "The Story Advantage (TSA)",
    description: "Master storytelling that sells — craft narratives that captivate and convert.",
    url: "https://stan.store/affiliates/b6f875c9-80ff-4073-b7c4-4555497ee91a",
  },
};

// Mapping: which upsells to show for each primary stage result
const STAGE_UPSELLS: Record<string, string[]> = {
  AICA: ["antiCloneDecoder", "promptBank", "afterTheAlgorithm", "openArtAI", "theSecretSauce"],
  AIS: ["antiCloneDecoder", "promptBank", "afterTheAlgorithm", "openArtAI", "theSecretSauce"],
  CFW: ["createLaunchSell", "antiCloneDecoder", "theSecretSauce"],
  DWA: ["createLaunchSell", "antiCloneDecoder", "theSecretSauce"],
  MPV: ["createLaunchSell", "antiCloneDecoder", "theSecretSauce"],
  TACM: ["tsaProduct"],
  TSA: ["tacmProduct"],
  ATA: ["afterTheAlgorithm", "tacmProduct"],
  TSS: ["facelessLaunch"],
};

export function getUpsellsForStage(stageCode: string): UpsellProduct[] {
  const upsells: UpsellProduct[] = [];
  const keys = STAGE_UPSELLS[stageCode] || [];

  keys.forEach(key => {
    const product = UPSELL_PRODUCTS[key];
    if (product) upsells.push(product);
  });

  // Add FOC upsell for high-ticket stages
  if (HIGH_TICKET_STAGES.includes(stageCode)) {
    upsells.push(UPSELL_PRODUCTS.funnelsOfCourse);
  }

  return upsells;
}

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

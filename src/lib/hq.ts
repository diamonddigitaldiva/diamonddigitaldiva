const HQ_URL = "https://ztsortihbrewwnpgfjix.supabase.co/functions/v1/ingest";

export async function hqReport(payload: {
  leads?: any[];
  sales?: any[];
  sessions?: any[];
  activity?: any[];
  signups?: any[];
  tasks?: any[];
}) {
  try {
    await fetch(HQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hq-token": import.meta.env.VITE_HQ_INGEST_TOKEN ?? "",
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.warn("HQ report failed", e);
  }
}

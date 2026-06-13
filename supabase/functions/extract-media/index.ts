// Edge Function: resolve a pasted video link (TikTok / Instagram) to a direct,
// downloadable media URL so the app can extract its audio (WAV-58).
//
// Why server-side: the browser can't fetch TikTok/IG media directly (CORS +
// anti-bot), so the resolve step runs here. It returns JSON the client then
// downloads + decodes: { audioUrl, name, mime }.
//
// Status: TikTok works via the keyless tikwm resolver. Instagram needs an
// authenticated provider (see TODO) — it currently returns a clear error.
//
// Deploy:  supabase functions deploy extract-media --no-verify-jwt
// (or with JWT if you want it gated to signed-in users; the client sends the
// user's access token either way.)

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

// TikTok → tikwm (keyless). Returns the no-watermark MP4 (carries the audio we
// then isolate client-side) plus the clip title for the row name.
async function resolveTikTok(url: string): Promise<{ audioUrl: string; name: string; mime: string }> {
  const api = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`;
  const r = await fetch(api, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!r.ok) throw new Error("TikTok resolver unavailable");
  const j = await r.json();
  const d = j?.data;
  const media = d?.play || d?.wmplay || d?.music; // prefer video (has audio), fall back to the track
  if (!media) throw new Error("Couldn't find media in that TikTok link");
  const audioUrl = String(media).startsWith("http") ? media : `https://www.tikwm.com${media}`;
  const name = (d?.title && String(d.title).trim()) || d?.author?.nickname || "TikTok audio";
  const mime = d?.play || d?.wmplay ? "video/mp4" : "audio/mpeg";
  return { audioUrl, name: name.slice(0, 80), mime };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let url = "";
  try {
    ({ url } = await req.json());
  } catch {
    return json({ error: "Body must be JSON { url }" }, 400);
  }
  if (!url || typeof url !== "string") return json({ error: "Missing url" }, 400);

  const host = hostOf(url);
  try {
    if (host.includes("tiktok")) {
      return json(await resolveTikTok(url));
    }
    if (host.includes("instagram")) {
      // TODO: Instagram needs an authenticated downloader (Graph API or a
      // licensed provider). Wire one here and return { audioUrl, name, mime }.
      return json({ error: "Instagram links aren't supported yet." }, 422);
    }
    return json({ error: "Unsupported link. Paste a TikTok or Instagram URL." }, 422);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Extraction failed" }, 502);
  }
});

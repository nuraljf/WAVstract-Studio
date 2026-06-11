// Supabase client (WAV-27 cloud accounts). The publishable key is safe to ship
// in the bundle — all data access is gated by Row Level Security (each user
// can only touch rows/files under their own auth.uid()).
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://jtekdazyuiwjkdvsrefi.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_SRRg_YG9SyHfykfzmvFacw_oIdEviID";

// supabase-js defaults to navigator.locks for auth concurrency; a zombie tab
// holding that lock deadlocks EVERY auth call in new tabs (observed in dev —
// the OAuth button just hung). A simple per-tab promise chain keeps calls
// ordered within this tab without the cross-tab lock.
let chain: Promise<unknown> = Promise.resolve();
function tabLock<R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> {
  const run = chain.then(fn);
  chain = run.catch(() => {});
  return run;
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    // web: session persists in localStorage and the OAuth redirect is parsed
    // out of the URL automatically when the user lands back on the app.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    lock: tabLock,
  },
});

// Cloud library data layer (WAV-27). Thin, promise-based helpers over the
// `sounds` table + private `audio` storage bucket. All calls assume a signed-in
// session (RLS rejects them otherwise) — use-studio decides WHEN to call.
import { supabase } from "./supabase";

export type CloudSound = {
  id: string; // db uuid
  name: string;
  duration: number;
  peaks: number[];
  favorite: boolean;
  cover: string | null;
  file_path: string;
  mime: string | null;
  created_at: string;
};

/** Upload the original media file + insert its metadata row. Returns the row. */
export async function uploadSound(opts: {
  userId: string;
  file: Blob;
  mime: string;
  name: string;
  duration: number;
  peaks: number[];
  cover: string | null;
  favorite: boolean;
}): Promise<CloudSound> {
  const id = crypto.randomUUID();
  const filePath = `${opts.userId}/${id}`;

  const { error: upErr } = await supabase.storage
    .from("audio")
    .upload(filePath, opts.file, {
      contentType: opts.mime || "application/octet-stream",
      upsert: false,
    });
  if (upErr) throw upErr;

  const { data, error } = await supabase
    .from("sounds")
    .insert({
      id,
      name: opts.name,
      duration: opts.duration,
      peaks: opts.peaks,
      favorite: opts.favorite,
      cover: opts.cover,
      file_path: filePath,
      mime: opts.mime || null,
    })
    .select()
    .single();
  if (error) {
    // metadata failed — don't leave an orphaned file behind
    void supabase.storage.from("audio").remove([filePath]);
    throw error;
  }
  return data as CloudSound;
}

/** The user's library metadata, newest first. Fast — no audio bytes. */
export async function listSounds(): Promise<CloudSound[]> {
  const { data, error } = await supabase
    .from("sounds")
    .select()
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CloudSound[];
}

/** Download the original media bytes for a sound (first play on this device). */
export async function downloadSound(filePath: string, mime: string | null): Promise<Blob> {
  const { data, error } = await supabase.storage.from("audio").download(filePath);
  if (error) throw error;
  // Re-wrap so the blob carries the original MIME (iOS <video> cares).
  return mime ? new Blob([data], { type: mime }) : data;
}

export async function setFavorite(id: string, favorite: boolean): Promise<void> {
  const { error } = await supabase.from("sounds").update({ favorite }).eq("id", id);
  if (error) throw error;
}

export async function deleteSound(id: string, filePath: string): Promise<void> {
  const { error } = await supabase.from("sounds").delete().eq("id", id);
  if (error) throw error;
  void supabase.storage.from("audio").remove([filePath]);
}

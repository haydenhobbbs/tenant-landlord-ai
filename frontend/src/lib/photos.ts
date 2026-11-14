import { supabase as db } from "./store";

// Tenant photos arrive as small data: URLs (the browser shrinks them first).
// With Supabase they're uploaded to the public "request-photos" bucket and we
// keep the URLs. Without Supabase (or if the upload fails) we keep the data
// URLs as they are, which is fine for a demo.

const BUCKET = "request-photos";
export const MAX_PHOTOS = 4;
const MAX_BYTES = 1_500_000; // per photo, after shrinking

export async function savePhotos(requestId: string, photos: unknown): Promise<string[]> {
  if (!Array.isArray(photos)) return [];
  const valid = photos
    .filter((p): p is string => typeof p === "string" && /^data:image\/(jpeg|png|webp);base64,/.test(p))
    .slice(0, MAX_PHOTOS);

  const saved: string[] = [];
  for (const [i, dataUrl] of valid.entries()) {
    const [meta, b64] = dataUrl.split(",");
    const bytes = Buffer.from(b64, "base64");
    if (bytes.length > MAX_BYTES) continue;
    const type = meta.slice(5, meta.indexOf(";"));

    if (db) {
      const path = `${requestId}/${i + 1}.${type.split("/")[1]}`;
      const { error } = await db.storage.from(BUCKET).upload(path, bytes, { contentType: type, upsert: true });
      if (!error) {
        saved.push(db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
        continue;
      }
      console.warn("Photo upload failed, keeping it inline:", error.message);
    }
    saved.push(dataUrl);
  }
  return saved;
}

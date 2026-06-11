// Image storage seam. For the demo, images are kept inline as data URLs and returned as-is.
// Production would upload to object storage (Supabase Storage / S3) here and return a URL,
// without any caller changes.

export const MAX_IMAGE_BYTES = 1_500_000; // ~1.5MB

export async function saveImage(dataUrl: string): Promise<string> {
  // Demo: the data URL *is* the stored reference.
  // Prod: const { data } = await supabase.storage.from("designs").upload(path, blob); return data.publicUrl;
  return dataUrl;
}

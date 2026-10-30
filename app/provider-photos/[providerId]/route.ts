import { getPhotoPersistenceForRuntime } from "../../../src/photos/runtimePhotoPersistence.ts";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ providerId: string }> }) {
  const { providerId } = await params;
  if (!providerId || providerId.length > 160) return new Response(null, { status: 404 });
  try {
    const photo = await getPhotoPersistenceForRuntime().downloadPublicPhoto(providerId);
    if (!photo) return new Response(null, { status: 404 });
    const body = new Uint8Array(photo.bytes.byteLength);
    body.set(photo.bytes);
    return new Response(body.buffer, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, no-store",
        "Content-Disposition": "inline",
        "ETag": `"${photo.digest}"`,
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}

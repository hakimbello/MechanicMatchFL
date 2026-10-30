import { getAdminAuthorization } from "../../../../src/admin/adminAuth.ts";
import { getPhotoPersistenceForRuntime } from "../../../../src/photos/runtimePhotoPersistence.ts";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ photoId: string }> }) {
  const authorization = await getAdminAuthorization();
  if (!authorization.ok) return new Response(null, { status: 404 });
  const { photoId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(photoId)) return new Response(null, { status: 404 });
  try {
    const photo = await getPhotoPersistenceForRuntime().downloadAdminPhoto(photoId);
    if (!photo) return new Response(null, { status: 404 });
    const body = new Uint8Array(photo.bytes.byteLength);
    body.set(photo.bytes);
    return new Response(body.buffer, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, no-store",
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}

import { UploadForm } from "~/app/upload/upload-form";
import { requireUser } from "~/server/auth";
import { ALLOWED_VIDEO_TYPES, MAX_UPLOAD_BYTES } from "~/server/storage";

export const metadata = { title: "Upload" };

export default async function UploadPage() {
  await requireUser("/upload");
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Upload a video</h1>
      <UploadForm accept={ALLOWED_VIDEO_TYPES} maxBytes={MAX_UPLOAD_BYTES} />
    </div>
  );
}

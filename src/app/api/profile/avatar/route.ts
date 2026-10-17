import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "avatars";
const MAX_BYTES = 2 * 1024 * 1024;
const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function migrationHint(message: string) {
  if (/avatar_url|bucket not found|not found/i.test(message)) {
    return `${message}. Run supabase/migrations/004_notifications_avatars_attachments.sql in the Supabase SQL editor.`;
  }
  return message;
}

/** Upload or replace the signed-in user's profile picture. */
export async function POST(request: Request) {
  const { supabase, user } = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose an image to upload" }, { status: 400 });
  }
  const ext = TYPES[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "Use a JPG, PNG, WebP or GIF image" },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image is larger than 2 MB" }, { status: 400 });
  }

  const path = `${user.id}/avatar-${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, Buffer.from(await file.arrayBuffer()), {
      contentType: file.type,
      upsert: false,
      cacheControl: "31536000",
    });
  if (uploadError) {
    return NextResponse.json(
      { error: migrationHint(uploadError.message) },
      { status: 500 }
    );
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", user.id);
  if (profileError) {
    await supabase.storage.from(BUCKET).remove([path]);
    return NextResponse.json(
      { error: migrationHint(profileError.message) },
      { status: 500 }
    );
  }

  // Clean up older pictures in the user's folder (best effort)
  const { data: existing } = await supabase.storage.from(BUCKET).list(user.id);
  const stale = (existing || [])
    .map((o) => `${user.id}/${o.name}`)
    .filter((p) => p !== path);
  if (stale.length) await supabase.storage.from(BUCKET).remove(stale);

  return NextResponse.json({ avatar_url: publicUrl });
}

/** Remove the profile picture and fall back to initials. */
export async function DELETE() {
  const { supabase, user } = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", user.id);
  if (error) {
    return NextResponse.json({ error: migrationHint(error.message) }, { status: 500 });
  }

  const { data: existing } = await supabase.storage.from(BUCKET).list(user.id);
  const paths = (existing || []).map((o) => `${user.id}/${o.name}`);
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths);

  return NextResponse.json({ avatar_url: null });
}

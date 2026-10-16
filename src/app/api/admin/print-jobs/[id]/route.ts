import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";

const ACTIVE = ["queued", "printing"];

async function loadJob(id: string) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth;
  const { data: job } = await auth.supabase
    .from("print_jobs")
    .select("id, order_id, status")
    .eq("id", id)
    .maybeSingle();
  if (!job) {
    return { error: NextResponse.json({ error: "Print job not found" }, { status: 404 }) };
  }
  return { ...auth, job };
}

/** Body: { action: "retry" } puts the job back in the queue; { action: "cancel" } cancels a waiting job. */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const loaded = await loadJob(id);
  if ("error" in loaded) return loaded.error;
  const { supabase, job } = loaded;

  const body = await request.json().catch(() => ({}));
  const now = new Date().toISOString();
  let patch: Record<string, unknown>;

  if (body.action === "retry") {
    if (ACTIVE.includes(job.status)) {
      return NextResponse.json({ error: "This job is already in the queue." }, { status: 409 });
    }
    patch = {
      status: "queued",
      attempts: 0,
      last_error: null,
      locked_by: null,
      locked_at: null,
      completed_at: null,
      updated_at: now,
    };
  } else if (body.action === "cancel") {
    if (job.status === "printing") {
      return NextResponse.json(
        { error: "This job is printing right now and can't be cancelled from here." },
        { status: 409 }
      );
    }
    if (job.status !== "queued") {
      return NextResponse.json({ error: "Only waiting jobs can be cancelled." }, { status: 409 });
    }
    patch = { status: "cancelled", locked_by: null, locked_at: null, updated_at: now };
  } else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("print_jobs")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    const msg =
      error.code === "23505"
        ? "This order already has another job waiting or printing."
        : error.message;
    return NextResponse.json({ error: msg }, { status: 409 });
  }
  if (!data) {
    return NextResponse.json(
      { error: "Job wasn't updated. Run migration 004 to let admins manage print jobs." },
      { status: 409 }
    );
  }
  return NextResponse.json({ job: data });
}

/** Delete a finished, failed or cancelled job from the queue history. */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const loaded = await loadJob(id);
  if ("error" in loaded) return loaded.error;
  const { supabase, job } = loaded;

  if (ACTIVE.includes(job.status)) {
    return NextResponse.json(
      { error: "Cancel the job first. Waiting or printing jobs can't be deleted." },
      { status: 409 }
    );
  }

  const { error, count } = await supabase
    .from("print_jobs")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!count) {
    return NextResponse.json(
      { error: "Job wasn't deleted. Run migration 004 to let admins manage print jobs." },
      { status: 409 }
    );
  }
  return NextResponse.json({ deleted: true });
}

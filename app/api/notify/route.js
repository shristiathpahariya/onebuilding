import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM =
  process.env.RESEND_FROM_EMAIL ??
  "OneBuildingForever <onboarding@resend.dev>";

/** Resend test mode only delivers to your account email — set this in .env.local until you verify a domain. */
const DEV_TO = process.env.RESEND_DEV_TO;

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(request) {
  if (!process.env.RESEND_API_KEY) {
    return Response.json({ error: "Email not configured" }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    ownerEmail,
    roomNumber,
    visitorEmail,
    message,
    type = "guestbook",
  } = body;

  if (!ownerEmail || roomNumber == null) {
    return Response.json({ error: "Missing ownerEmail or roomNumber" }, {
      status: 400,
    });
  }

  const subject =
    type === "claim"
      ? `Welcome to Room ${roomNumber}`
      : `Someone visited Room ${roomNumber}`;

  let html =
    type === "claim"
      ? `<p>You claimed Room <strong>${escapeHtml(roomNumber)}</strong> in One Building Forever. Your room is live.</p>`
      : `<p>A visitor stopped by your room.</p>
<blockquote>${escapeHtml(message ?? "")}</blockquote>
<p>— ${escapeHtml(visitorEmail ?? "A visitor")}</p>`;

  const intendedTo = ownerEmail;
  const to = DEV_TO ?? intendedTo;

  if (DEV_TO && DEV_TO !== intendedTo) {
    html = `<p style="color:#666;font-size:13px;margin:0 0 1em;">[Dev] Would have been sent to <strong>${escapeHtml(intendedTo)}</strong></p>${html}`;
  }

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: DEV_TO && DEV_TO !== intendedTo ? `[Dev] ${subject}` : subject,
    html,
  });

  if (error) {
    console.error("Resend error:", error);
    const hint =
      error.message?.includes("testing emails") && !DEV_TO
        ? " Add RESEND_DEV_TO=your-resend-account@gmail.com to .env.local, or verify a domain at resend.com/domains."
        : "";
    return Response.json({ error: error.message + hint }, { status: 500 });
  }

  return Response.json({ ok: true, to, intendedTo });
}

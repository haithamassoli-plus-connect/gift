import { v } from "convex/values";
import { internalAction } from "./_generated/server";

// Module-scoped so process.env typechecks under both the Convex (node) build and
// the frontend app build, which pulls this file in via the generated api types.
declare const process: { env: Record<string, string | undefined> };

// ponytail: read the key from process.env directly; the guidelines' typed-env
// (defineApp({ env }) in convex.config.ts + `env` from ./_generated/server) is
// the upgrade path if we ever want compile-time env validation.
export const sendOpened = internalAction({
  args: {
    email: v.string(),
    recipientName: v.string(),
    statusKey: v.string(),
    lang: v.string(),
  },
  handler: async (_ctx, args) => {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      console.error("sendOpened: RESEND_API_KEY is not set; skipping email");
      return null;
    }

    const link = "https://gift.assoli.site/sent/" + args.statusKey;

    // Escape the user-supplied name before interpolating it into HTML (trust
    // boundary). The regex only matches these 4 chars; `?? c` keeps it type-safe.
    const esc = (s: string) =>
      s.replace(
        /[&<>"]/g,
        (c) =>
          ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c,
      );
    const name = esc(args.recipientName);
    const wrap = (dir: string, inner: string) =>
      `<div dir="${dir}" style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1a1a1a">${inner}</div>`;
    const button = (label: string) =>
      `<p style="margin:24px 0"><a href="${link}" style="background:#111;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block;font-size:15px">${label}</a></p>`;

    let subject: string;
    let text: string;
    let html: string;
    if (args.lang === "ar") {
      subject = args.recipientName + " فتح هديتك 🎁";
      text = args.recipientName + " فتح هديتك 🎁\n\n" + link;
      html = wrap(
        "rtl",
        `<p style="font-size:16px;line-height:1.5"><strong>${name}</strong> فتح الهدية التي أرسلتها 🎁</p>` +
          `<p style="font-size:16px;line-height:1.5">يمكنك العودة إلى ما صنعته ومتابعة حالته في أي وقت:</p>` +
          button("عرض هديتك") +
          `<p style="font-size:13px;color:#666;line-height:1.5">وصلتك هذه الرسالة لأنك طلبت إشعارك عند فتح هذه الهدية.</p>`,
      );
    } else {
      subject = args.recipientName + " opened your gift 🎁";
      text = args.recipientName + " opened your gift 🎁\n\n" + link;
      html = wrap(
        "ltr",
        `<p style="font-size:16px;line-height:1.5"><strong>${name}</strong> just opened the gift you sent them 🎁</p>` +
          `<p style="font-size:16px;line-height:1.5">Revisit what you made and see its status any time:</p>` +
          button("View your gift") +
          `<p style="font-size:13px;color:#666;line-height:1.5">You're getting this because you asked to be notified when this gift was opened.</p>`,
      );
    }

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Gift <gift@mail.assoli.site>",
          to: args.email,
          subject,
          text,
          html,
        }),
      });
      if (!res.ok) {
        console.error(
          "sendOpened: Resend returned " + res.status,
          await res.text(),
        );
      }
    } catch (err) {
      console.error("sendOpened: failed to send email", err);
    }
    return null;
  },
});

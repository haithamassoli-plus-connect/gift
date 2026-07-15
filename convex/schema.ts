import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  gifts: defineTable({
    giftType: v.string(),
    senderName: v.string(),
    recipientName: v.string(),
    message: v.string(),
    variants: v.record(v.string(), v.string()),
    // Language the sender created the gift in — optional for back-compat with
    // rows written before i18n (read as "en").
    lang: v.optional(v.union(v.literal("en"), v.literal("ar"))),
    slug: v.string(),
    statusKey: v.string(),
    openedAt: v.optional(v.number()),
    // Epoch ms before which the gift stays sealed. Absent = openable immediately.
    // ponytail: presentational gate — getGift still returns the message; the
    // recipient can't see it in the UI early but could in the network response.
    // Upgrade path if that matters: withhold message/variants server-side until now >= openAfter.
    openAfter: v.optional(v.number()),
  })
    .index("by_slug", ["slug"])
    .index("by_statusKey", ["statusKey"]),
});

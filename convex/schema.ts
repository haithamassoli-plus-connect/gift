import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  gifts: defineTable({
    giftType: v.string(),
    senderName: v.string(),
    recipientName: v.string(),
    message: v.string(),
    variants: v.record(v.string(), v.string()),
    slug: v.string(),
    statusKey: v.string(),
    openedAt: v.optional(v.number()),
  })
    .index("by_slug", ["slug"])
    .index("by_statusKey", ["statusKey"]),
});

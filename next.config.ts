import type { NextConfig } from "next";

// Link-preview crawlers get per-gift OG tags from the Convex HTTP action
// (convex/http.ts); everyone else gets the app shell.
const CRAWLER_UA =
  ".*(facebookexternalhit|Facebot|WhatsApp|Twitterbot|TelegramBot|Slackbot|Discordbot|LinkedInBot|Applebot|Pinterestbot|redditbot|SkypeUriPreview|Googlebot|bingbot).*";

const nextConfig: NextConfig = {
  reactCompiler: true,
  async rewrites() {
    return {
      // beforeFiles so crawlers win over the app/g/[slug] filesystem route.
      beforeFiles: [
        {
          source: "/g/:slug",
          has: [{ type: "header", key: "user-agent", value: CRAWLER_UA }],
          destination:
            "https://enchanted-cardinal-983.eu-west-1.convex.site/g/:slug",
        },
      ],
    };
  },
};

export default nextConfig;

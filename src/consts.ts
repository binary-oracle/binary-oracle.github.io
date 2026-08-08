// Core site information used by the Header, SEO, RSS, sitemap, and footer.
export const SITE_TITLE = "binary-oracle";
export const SITE_DESCRIPTION = "Oracle database administration insights.";
export const SITE_URL = "https://example.com";
export const COPYRIGHT_NAME = "binary-oracle";

// Static page titles and summaries, also used for SEO descriptions.
export const PAGE_COPY = {
  blog: {
    title: "Blog",
    description: "Browse all posts by date.",
    descriptionItalic: false,
  },
  collections: {
    title: "Collections",
    description: "Browse related posts by collection.",
    descriptionItalic: false,
  },
  tags: {
    title: "Tags",
    description: "Browse all posts by topic.",
    descriptionItalic: false,
  },
  years: {
    title: "Archive",
    description: "Browse all posts by publication date.",
    descriptionItalic: false,
  },
  friends: {
    title: "Links",
    description: "A collection of personal websites that are worth visiting.",
    descriptionItalic: false,
  },
  about: {
    title: "About Me",
    descriptionItalic: false,
  },
} as const;

// Header navigation links.
export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/blog", label: "Blog" },
  { href: "/links", label: "Links" },
  { href: "/about", label: "About" },
] as const;

// Footer social links; icon maps to a built-in SocialIcon key.
export const SOCIAL_LINKS = [
  {
    label: "GitHub",
    href: "https://github.com/binary-oracle",
    icon: "social/github",
  },
] as const;

// Home-page profile information and content limits.
export const HOME = {
  avatar: {
    src: "/favicon.png",
    alt: "Binary-Oracle",
  },
  motto: "Every outage teaches something.",
  description: "Real-world Oracle DBA insights.",
  recentPostsLimit: 6,
} as const;

// Home-page GitHub contribution graph.
export const GH_CONTRIBUTE = {
  title: "GitHub Activity",
  description: "Open-source contributions over the past year",
  username: "binary-oracle",
  profileUrl: "https://github.com/binary-oracle",
  errorMessage: "The GitHub contribution graph is temporarily unavailable.",
} as const;

// Static site search; disabling it hides the Header search control.
export const SEARCH = {
  enabled: true,
  maxResults: 8,
} as const;

// Friend-link data is maintained in a separate file.
export { FRIEND_LINKS } from "./config/friend-links";

// Comment-system configuration; the current provider is Giscus.
export const COMMENTS = {
  enabled: false,
  provider: "giscus",
  repo: "owner/repository",
  repoId: "",
  category: "Announcements",
  categoryId: "",
  mapping: "pathname",
  themeLight: "light_protanopia",
  themeDark: "transparent_dark",
  lang: "en",
} as const;

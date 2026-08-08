---
title: consts.ts Configuration Reference
description: A grouped reference for site, page, navigation, home, friend-link, and comment settings.
pubDate: 2026-03-14
collection: LogFlow Theme
collectionDescription: Design, implementation, and iteration notes for LogFlow Theme
tags:
  - Astro
  - Config
  - Template
---

Reusable site-wide configuration lives in `src/consts.ts`. Post content belongs in `src/content/`, while colors, typography, spacing, and other visual tokens live in `src/styles/global.css`.

## Core site information

### SITE_TITLE

The site name used by the Header, home page, browser title, and RSS.

```ts
export const SITE_TITLE = "LogFlow Theme";
```

### SITE_DESCRIPTION

The default site-level description used by the home page and RSS. Individual static-page summaries are managed by `PAGE_COPY`.

```ts
export const SITE_DESCRIPTION = "A compact Astro theme for writing and publishing.";
```

### SITE_URL

The full production URL used by Astro's `site` setting, canonical URLs, sitemap, RSS, and friend-link exchange information. Do not include a trailing slash.

```ts
export const SITE_URL = "https://example.com";
```

### COPYRIGHT_NAME

The copyright name shown in the footer. This can be a person, organization, or brand.

```ts
export const COPYRIGHT_NAME = "Your Name";
```

## Page titles and summaries

`PAGE_COPY` centralizes titles and descriptions for static pages. The same copy is used in page headers and SEO descriptions.

```ts
export const PAGE_COPY = {
  blog: { title: "Posts", description: "Browse all posts by date.", descriptionItalic: false },
  collections: { title: "Collections", description: "Browse related posts by collection.", descriptionItalic: false },
  tags: { title: "Tags", description: "Browse all posts by topic.", descriptionItalic: false },
  years: { title: "Archive", description: "Browse all posts by publication date.", descriptionItalic: false },
  friends: { title: "Friends", description: "A collection of personal sites worth revisiting.", descriptionItalic: false },
  about: { title: "About", description: "About the author, this site, and content licensing.", descriptionItalic: false },
} as const;
```

Tag detail descriptions are generated dynamically from the tag name. Collection detail pages prefer `collectionDescription` from post frontmatter and fall back to the default collection-page description.

## Header navigation

`NAV_LINKS` controls desktop and mobile navigation. `href` values are site-root paths and Astro's `base` path is handled automatically during builds.

```ts
export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/blog", label: "Posts" },
  { href: "/friends", label: "Friends" },
  { href: "/about", label: "About" },
] as const;
```

## Footer social links

`SOCIAL_LINKS` controls icon links in the footer. `icon` maps to a key supported by `SocialIcon.astro`, including `social/github`, `social/twitter`, and `social/bilibili`.

## Home page

`HOME` contains home-page profile information and the recent-post limit.

```ts
export const HOME = {
  avatar: { src: "/favicon.svg", alt: "LogFlow Theme avatar" },
  motto: "Build in public.",
  description: "A narrow, compact Astro blog theme.",
  recentPostsLimit: 6,
} as const;
```

## GitHub activity

`GH_CONTRIBUTE` controls the GitHub contribution section on the home page.

```ts
export const GH_CONTRIBUTE = {
  title: "GitHub Activity",
  description: "Open-source contributions over the past year",
  username: "withastro",
  profileUrl: "https://github.com/withastro",
  errorMessage: "The GitHub contribution graph is temporarily unavailable.",
} as const;
```

## Friend links

`FRIEND_LINKS` is exported from `src/config/friend-links.ts` so larger lists do not make the main configuration file unwieldy.

```ts
export const FRIEND_LINKS = [
  {
    name: "Example Blog",
    link: "https://example.com",
    avatar: "https://example.com/avatar.png",
    desc: "A short description of this site.",
  },
];
```

## Comments

`COMMENTS` configures Giscus, including repository IDs, Discussion category, mapping, themes, and interface language.

```ts
export const COMMENTS = {
  enabled: true,
  provider: "giscus",
  repo: "owner/repository",
  repoId: "R_...",
  category: "Announcements",
  categoryId: "DIC_...",
  mapping: "pathname",
  themeLight: "light_protanopia",
  themeDark: "transparent_dark",
  lang: "en",
} as const;
```

Repository and category IDs can be obtained from the [Giscus configuration page](https://giscus.app/).

## Recommended setup order

1. Update `SITE_TITLE`, `SITE_DESCRIPTION`, `SITE_URL`, and `COPYRIGHT_NAME`.
2. Update `PAGE_COPY`, `NAV_LINKS`, and `HOME`.
3. Configure `SOCIAL_LINKS`, `GH_CONTRIBUTE`, and `FRIEND_LINKS`.
4. Enable GitHub Discussions and configure `COMMENTS` if you want comments.
5. Run `npx astro check` and `npm run build` to validate the project.

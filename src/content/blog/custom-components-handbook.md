---
title: Custom Components Handbook
description: Responsibilities, usage, related configuration, and optional parameters for LogFlow Theme components.
pubDate: 2026-03-14
collection: LogFlow Theme
collectionDescription: Design, implementation, and iteration notes for LogFlow Theme
tags:
  - Astro
  - Components
  - Template
---

This guide gives a quick overview of the theme's built-in components so you can customize the site without changing its core structure.

## BaseHead.astro

Adds base SEO metadata, Open Graph/Twitter metadata, the RSS link, and the theme initialization script.

```astro
<BaseHead title="Post title" description="Page description" image={heroImage} />
```

It uses `SITE_TITLE`, `SITE_DESCRIPTION`, and `SITE_URL`. Optional props include `image?: ImageMetadata` and `type?: 'website' | 'article'`.

## Header.astro

Renders the site title, `NAV_LINKS`, theme toggle, search control, and mobile navigation.

```astro
<Header />
```

Configuration comes from `SITE_TITLE`, `NAV_LINKS`, and `SEARCH`.

## HeaderLink.astro

Creates navigation links with an active-route state.

```astro
<HeaderLink href="/blog">Posts</HeaderLink>
```

It accepts normal anchor attributes such as `class` and `target`.

## ThemeToggle.astro

Switches between light and dark modes and synchronizes the state with the document root.

```astro
<ThemeToggle />
```

## SocialIcon.astro

Renders an SVG social icon from an `icon` key.

```astro
<SocialIcon icon="social/github" size={20} />
```

`size` is optional and defaults to `20`.

## Footer.astro

Renders copyright information, the current year, and social links. It uses `COPYRIGHT_NAME` and `SOCIAL_LINKS`.

```astro
<Footer />
```

## PageHeader.astro

Provides a consistent page title, description, count/meta value, and an optional action area.

```astro
<PageHeader title="Posts" description="Browse all posts by date." meta="6 posts" />
```

Static pages usually get their text from `PAGE_COPY`.

## PostList.astro

Renders post lists used by the home page, blog index, collections, tags, and year archive.

```astro
<PostList posts={posts} showDescription={true} showReadingTime={true} />
```

Use `showDescription` and `showReadingTime` to control optional list details.

## ContentSection.astro and PageContainer.astro

These layout components provide the narrow page container and consistent section spacing. Prefer composing them instead of duplicating widths, padding, and vertical spacing.

## CodeCopy.astro

Adds copy buttons to Markdown/MDX code blocks. Copy failures do not affect the original code block.

## FormattedDate.astro

Formats dates consistently and outputs a `<time>` element.

```astro
<FormattedDate date={post.data.pubDate} />
```

## GitHubContribute.astro

Displays the GitHub activity section and contribution calendar. It is configured by `GH_CONTRIBUTE`.

```astro
<GitHubContribute />
```

## GitHubCalendar.astro

Renders a static SVG contribution heatmap from build-time data and follows the site's light/dark theme.

```astro
<GitHubCalendar contributions={contributions} totalCount={totalCount} />
```

Both props are required.

## CommentSection.astro

Loads Giscus from the `COMMENTS` configuration and synchronizes its theme with the site.

```astro
<CommentSection />
```

Important settings include `enabled`, `repo`, `repoId`, `category`, `categoryId`, `mapping`, `themeLight`, `themeDark`, and `lang`.

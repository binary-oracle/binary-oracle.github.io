---
title: "Giscus Quick Start: Enable Comments in 5 Steps"
description: The shortest path from a GitHub repository to working Giscus comments in LogFlow Theme.
pubDate: 2026-03-14
collection: LogFlow Theme
collectionDescription: Design, implementation, and iteration notes for LogFlow Theme
tags:
  - Giscus
  - Comments
  - Astro
---

This guide focuses only on configuring Giscus comments.

## Step 1: Prepare the repository

- Make sure the repository is public.
- Enable Discussions in the GitHub repository settings.
- Create or choose a Discussion category such as `Announcements` or `General`.

## Step 2: Install the Giscus app

- Install Giscus from <https://github.com/apps/giscus> for the target repository.
- Open <https://giscus.app/> and select the repository and Discussion category.

You will receive values for `repo`, `repoId`, `category`, and `categoryId`.

## Step 3: Configure consts.ts

Add the values to `COMMENTS` in `src/consts.ts`:

```ts
export const COMMENTS = {
  enabled: true,
  provider: 'giscus',
  repo: 'owner/repository',
  repoId: 'your repoId',
  category: 'Announcements',
  categoryId: 'your categoryId',
  mapping: 'pathname',
  themeLight: 'light_protanopia',
  themeDark: 'transparent_dark',
  lang: 'en',
};
```

## Step 4: Control comments per post

Use `enableComments` in post frontmatter:

```yaml
---
title: My Post
enableComments: false
---
```

If it is `false`, that post will not render comments even when `COMMENTS.enabled` is `true`.

## Step 5: Troubleshoot

- If the page says the comment system is not configured, check `repo`, `repoId`, and `categoryId`.
- If comments fail to load, verify the repository is public, Discussions are enabled, and the category matches.
- If colors do not follow the site theme, verify `themeLight` and `themeDark` use supported Giscus theme names.

For `mapping`, `pathname` is a good default. For `lang`, use `en` for an English interface.

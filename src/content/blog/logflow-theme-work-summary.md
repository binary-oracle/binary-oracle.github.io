---
title: "LogFlow Theme: Why I Built Another Blog Theme"
description: Notes on the ideas and tradeoffs behind LogFlow Theme.
pubDate: 2026-03-14
collection: LogFlow Theme
collectionDescription: Design, implementation, and iteration notes for LogFlow Theme
tags:
  - Astro
  - Theme
  - Engineering
  - Open Source
---

This theme started from Astro's minimal blog template and adds a focused set of custom components and pages, including:

- Home-page profile information, a compact post list, and GitHub activity.
- A GitHub contribution graph fetched at build time and rendered statically.
- Configurable social links and friend links.
- Collection, tag, and year archive pages.
- Optional Giscus comments.

The theme is open source in the [LogFlow Theme](https://github.com/kevynf/logflow-theme) repository.

I wanted a theme that could be installed and used for writing quickly, with centralized configuration that stays easy to maintain. That became LogFlow Theme.

## Design approach

### Centralized configuration

Common settings are kept in `src/consts.ts`, including site metadata, page copy, home-page settings, social links, GitHub activity, friend links, and Giscus settings. Most customization should not require editing components.

### Posts

Frontmatter stays intentionally small. `title`, `description`, and `pubDate` are required; fields such as `updatedDate`, `collection`, `collectionDescription`, and `tags` are optional.

The goal is to keep attention on writing while making the project easy to return to after a long break.

### Small details

The theme avoids adding features for their own sake. It includes light/dark mode, a compact Header, readable colors and layouts, and optional comments. None of these are complicated, but together they noticeably improve the experience.

## If you want to use it

Visit the [LogFlow Theme](https://github.com/kevynf/logflow-theme) repository and use **Use this template** to create your own copy. The bundled example posts also serve as lightweight documentation.

> For me, this theme turns lessons from tools such as Hexo and VuePress into a reusable Astro template focused on long-term writing.
>
> Contributions and pull requests are welcome.

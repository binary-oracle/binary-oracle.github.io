---
title: "Frontmatter Guide: Metadata for Every Post"
description: Required and optional frontmatter fields in LogFlow Theme, with examples and troubleshooting notes.
pubDate: 2026-03-14
collection: LogFlow Theme
collectionDescription: Design, implementation, and iteration notes for LogFlow Theme
tags:
  - Astro
  - Frontmatter
  - Content
---

Frontmatter is the YAML block at the top of each Markdown or MDX post. In LogFlow Theme it is validated by `src/content.config.ts`.

## Minimal example

```yaml
---
title: My First Post
description: A short example post used to demonstrate frontmatter.
pubDate: 2026-03-14
---
```

These three fields are required: `title`, `description`, and `pubDate`.

## Full example

```yaml
---
title: Frontmatter in Practice
description: A complete example with required and optional fields.
pubDate: 2026-03-14
updatedDate: 2026-03-15
collection: LogFlow Theme
collectionDescription: Design, implementation, and iteration notes for LogFlow Theme
tags:
  - Astro
  - Frontmatter
heroImage: ./cover.png
enableComments: true
---
```

## Field reference

### title

A required `string`. It appears in the post page, post lists, RSS, HTML title metadata, Open Graph, and Twitter metadata.

### description

A required `string`. It is used as the post summary and SEO/social description.

### pubDate

A required date value used for sorting, display, and archive grouping. `YYYY-MM-DD` is recommended.

### updatedDate

An optional date shown as the last-updated date. Use it only when the post has received a meaningful update.

### collection

An optional `string` that groups posts into a collection.

### collectionDescription

An optional `string` used to describe a collection on collection pages and in SEO metadata. Keep it consistent across posts in the same collection.

### tags

An optional `string[]` used to build the tag index and tag detail pages. Two to five focused tags per post is a useful default.

### heroImage

An optional relative path to a local image. Astro resolves it to image metadata for the post header and social metadata.

### enableComments

An optional `boolean` that controls comments for an individual post. It defaults to enabled, but global `COMMENTS.enabled` must also be `true`.

## Common errors

- Invalid dates: verify `pubDate` and `updatedDate` are valid date strings.
- Misspelled fields: `publishDate` will not replace the required `pubDate` field.
- Incorrect tag type: `tags` must be an array, not a single string.

## Markdown and MDX

Both `.md` and `.mdx` files under `src/content/blog/` use the same frontmatter schema.

## Starter template

```yaml
---
title:
description:
pubDate:
updatedDate:
collection:
collectionDescription:
tags:
  -
heroImage: ./cover.png
enableComments: true
---
```

# Blog Writing Guide

A concise guide for creating blog posts on the Bondery website.

---

## 1. Create the MDX file

Place your file in the correct category folder:

```
apps/website/content/blog/<category>/<slug>.mdx
```

- **Slug** = URL-safe filename, lowercase, hyphens only (e.g. `my-new-feature.mdx`)
- **Category** must match an existing folder: `product` or `bonds`
- To add a new category, add an entry to `BLOG_CATEGORY_CONFIGS` in `src/app/blog/_lib/categories.ts` (includes the label, icon, and Discord thread name), then add the slug to the `PostCategory` union in `src/app/blog/_lib/types.ts`

## 2. Add the metadata sidecar

Create a companion `<slug>.meta.ts` file alongside the MDX file:

```
apps/website/content/blog/<category>/<slug>.meta.ts
```

This file contains the `postMeta` object as plain TypeScript (no Markdown). Keeping it separate from the MDX allows the announce script to import it via `tsx` — which cannot parse `.mdx` files:

```ts
import type { PostMeta } from "../../../src/app/blog/_lib/types";
import { productCategoryConfig } from "../../../src/app/blog/_lib/categories";
import { sveetya } from "../../../src/data/team";

export const postMeta: PostMeta = {
  title: "Your Post Title",
  slug: "your-post-slug",
  date: "2026-04-15",
  description: "A one-sentence summary under 160 characters for SEO and blog cards.",
  category: productCategoryConfig.slug,
  author: sveetya.name,
  tags: ["tag1", "tag2", "tag3"],
};
```

Then import and re-export `postMeta` at the top of the MDX file:

```mdx
import { SOCIAL_LINKS } from "@bondery/helpers";

export { postMeta } from "./your-post-slug.meta";
```

### Field reference

| Field | Required | Notes |
|---|---|---|
| `title` | Yes | H1 of the post and `<title>` tag. Keep concise and descriptive. |
| `slug` | Yes | Must match the filename (without `.mdx`). |
| `date` | Yes | ISO format `YYYY-MM-DD`. |
| `modifiedDate` | No | Set when substantially updating a post. Falls back to `date`. |
| `description` | Yes | Max 160 chars. Used in meta description, OG, and blog cards. |
| `category` | Yes | Use `productCategoryConfig.slug` or `bondsCategoryConfig.slug` imported from `categories.ts`. |
| `author` | No | Use `sveetya.name` or `martin.name` imported from `src/data/team.ts`. |
| `tags` | No | Array of keywords for OG `article:tag` and meta keywords. 3–7 tags recommended. |
| `announce` | No | Controls whether and where this post is announced. See below. |

#### Announce fields

Set `announce` when you want the post published on Discord and/or Reddit via the release pipeline.

| Field | Type | Default | Notes |
|---|---|---|---|
| `announce.enabled` | `boolean` | — | **Required to be `true`** for any announcement to happen. |
| `announce.discord` | `boolean` | `true` | Set `false` to skip Discord for this post. |
| `announce.reddit` | `boolean` | `true` | Set `false` to skip Reddit for this post. |
| `announce.subreddit` | `string` | `"bondery"` | Subreddit to post to (no `r/` prefix). Override for category-specific communities. |
| `announce.redditTitle` | `string` | Post title | Custom title for the Reddit submission if different from the post title. |
| `announce.redditFlair` | `string` | — | Optional flair text for the subreddit (requires the subreddit to have flairs set up). |

Example:

```ts
announce: {
  enabled: true,
  subreddit: "bondery",          // default, can be omitted
  redditTitle: "We just launched Bondery — open-source PRM",
},
```

To announce after publishing: `npm run announce -w apps/website -- your-post-slug simulate`

## 3. Register the post

Open **both** registry files and add your import:

**`apps/website/content/blog/posts.ts`** (for the Next.js app):

```ts
import MyNewPost, { postMeta as myNewPost } from "./product/my-new-post.mdx";

export const allPosts: PostMeta[] = [
  introducingBondery,
  myNewPost,              // ← add here (newest first)
];

export const postComponents: Record<string, ComponentType> = {
  [`${introducingBondery.category}/${introducingBondery.slug}`]: IntroducingBondery,
  [`${myNewPost.category}/${myNewPost.slug}`]: MyNewPost,    // ← add here
};
```

**`apps/website/content/blog/metadata.ts`** (for the announce script):

```ts
import { postMeta as myNewPost } from "./product/my-new-post.meta";

export const allPostMeta: PostMeta[] = [introducingBondery, myNewPost];
```

That's all the wiring needed. The sitemap, category filters, and listing pages pick it up automatically.

## 4. Write the content

Write standard MDX (Markdown + JSX) below the metadata block. No frontmatter — metadata is a JS export.

### Structure

Follow this general pattern:

```
## Opening hook / story (grab attention)
## Problem statement (why this matters)
## What we built / the solution
## How it works (details, screenshots)
## What's next / call to action
```

Not every post needs all sections. A changelog-style post can be a flat list of `##` features. A deep-dive can be a narrative. Match structure to content.

### Heading rules

- **Never use `# H1`** — the page template renders the title from `postMeta.title`.
- Start with `## H2` for each top-level section.
- Use `### H3` for subsections within a section.

### Images

Place images in `public/images/blog/<slug>/` and reference them:

```mdx
![Alt text describing the image](/images/blog/my-new-post/feature-screenshot.webp)
```

- Use `.webp` format for best performance.
- Always provide meaningful alt text for accessibility and SEO.

#### Mascot illustrations

Bondery has a fun animal mascot that can be used to illustrate articles. The mascot can hold objects, perform actions, appear in groups, or interact with UI elements — be creative. Use mascot illustrations to break up long sections, highlight key features, or add personality.

**Workflow:** After drafting the article, list all the images that need to be generated at the bottom of the MDX file in a comment block. The author will create the illustrations after writing. Use this format:

```mdx
{/* 
## Images to generate

1. Hero: Mascot holding a Rolodex, looking excited — used below the title
2. Feature section: Two mascots exchanging a contact card — used in "How it works"
3. CTA: Mascot waving, with a Discord speech bubble — used in the closing section
*/}
```

Once the images are ready, remove the comment block and replace placeholders with real paths.

### Links

Import shared URLs from helpers instead of hardcoding:

```mdx
import { SOCIAL_LINKS } from "@bondery/helpers";

Check out the <a href={SOCIAL_LINKS.github} target="_blank" rel="noopener noreferrer">GitHub repository</a>.
```

For internal links, use plain Markdown links with relative paths:

```mdx
Read [our guide on relationships](/blog/bonds/relationship-tips).
```

### Code blocks

Use fenced code blocks with language hints:

````mdx
```ts
const result = await doSomething();
```
````

## 5. Writing style

Study how Ente writes their blog — this is the tone and quality to aim for.

### Tone

- **Conversational but not sloppy.** Write like you're explaining something to a smart friend. No jargon walls, no corporate fluff.
- **Confident and direct.** Say what the thing does. Don't hedge with "we think this might help" — say "this helps."
- **Short sentences.** If a sentence has a comma, consider splitting it. Paragraphs should be 2–4 sentences max.

### Opening

- Start with a hook that gives the reader a reason to care — a relatable problem, a surprising fact, or a bold statement.
- Don't start with "We're excited to announce..." — get to the point.
- The first paragraph should make the reader understand what they'll learn or what's new.

**Good:** *"When David Rockefeller passed away in 2017, one of his most prized possessions wasn't a painting — it was his Rolodex."*

**Bad:** *"We are thrilled to announce the release of our new product that we've been working on for a long time."*

### Feature descriptions

For each feature or section:
1. **What it is** — one sentence.
2. **Why it matters** — one sentence connecting it to the reader's life.
3. **How it works** — brief explanation or screenshot. Don't over-explain.

**Good (Ente style):**
> *Rituals lets you start a habit and track your progress through photos. Take a photo every day or start a new workout ritual.*

**Bad:**
> *We have implemented a new feature called Rituals which is designed to help users build habits through the use of photographic documentation of their daily activities.*

### Closing

- End with a clear call to action: try the feature, join Discord, give feedback.
- Optionally look forward briefly — what's coming next.
- A closing quote or one-liner can work well, but don't force it.

### General rules

- **No fluff.** Every sentence should add information or move the reader forward.
- **Use "you" and "your"** to address the reader directly.
- **Bold** key phrases sparingly for scanners.
- **Use bullet lists** for multiple items or features instead of long paragraphs.
- **Numbers and specifics** beat vague claims. "Over 100,000 cards" is better than "many cards."
- **One idea per paragraph.** If you switch topics, start a new paragraph.

## 6. SEO checklist

Before publishing, verify:

- [ ] `description` is under 160 characters and contains a primary keyword
- [ ] `title` is descriptive and under 60 characters
- [ ] `tags` array includes 3–7 relevant keywords
- [ ] All images have meaningful `alt` text
- [ ] Internal links point to existing pages
- [ ] External links use `target="_blank" rel="noopener noreferrer"`
  - [ ] Post is registered in `posts.ts` **and** `metadata.ts`, and sidecar `<slug>.meta.ts` is created
- [ ] No `# H1` headings in the content (title comes from metadata)
- [ ] `slug` matches the filename exactly

## 7. Quick-start template

For each new post, create two files.

**`content/blog/<category>/<slug>.meta.ts`:**

```ts
import type { PostMeta } from "../../../src/app/blog/_lib/types";
import { productCategoryConfig } from "../../../src/app/blog/_lib/categories";
import { sveetya } from "../../../src/data/team";

export const postMeta: PostMeta = {
  title: "",
  slug: "",
  date: "",
  description: "",
  category: productCategoryConfig.slug,
  author: sveetya.name,
  tags: [],
  announce: {
    enabled: false, // set to true when ready to announce on Discord & Reddit
  },
};
```

**`content/blog/<category>/<slug>.mdx`:**

```mdx
import { SOCIAL_LINKS } from "@bondery/helpers";

export { postMeta } from "./<slug>.meta";

## Section title

Your content here.

## What's next?

Tell us what you think — join us on <a href={SOCIAL_LINKS.discord} target="_blank" rel="noopener noreferrer">Discord</a>.
```

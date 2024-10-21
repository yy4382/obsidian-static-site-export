# Static Site MD Exporter for Obsidian

Integrate Obsidian into your blog writing process!

Export notes with the `published: true` front matter into plain Markdown (and upload them), so that you can use them for static site generators!

Meanwhile, wiki links`[[]]`  and many other Obsidian features can be used normally. This plugin does the work of converting `[[]]` style into `[]()` style automatically in exported markdown, leaving the links inside Obsidian untouched.

Handling images that stores in the assets folder and linked by posts is kind of tricky. This plugin has 2 builtin options: embed image in output markdown via base64, or abort the export process if there any image of this kind (which means you need to upload them manually, or find another plugin to do this for you). Using a custom handler via the CustomJS plugin will also be supported in the future.

## Features (How it Works?)

> This plugin will not modify your files in the vault! (Since v2.0.0). It only reads the files and generate new files to upload.

The "All validate files - Static Site MD Export" button on panel (Ribbon) does:

1. Get all the notes in vault with front matter "published" and the value is true (bool value).
1. For `[[]]` or `![[]]` links (also `[]()` that doesn't point to an URL, or say, those obsidian thinks is a wiki link) in notes, it finds the target note, and transform them into standard markdown format. See [Transformation Details](#transformation-details) for more details.
1. Change tags in front matter into 1-depth format (discarding content before /), removing tags in the content and merge them into the front matter.
1. Upload the markdown files via git. You can also choose which folder in git repo to upload to. More upload methods will be supported in the future.

The "Current file - Static Site MD Export" does similar staff, but only validate the current note, not all the notes.

If you delete a file in your vault, your file in S3 or git won't be deleted. You need to go there to delete them. Similarly, if you change the slug of a post, you need to delete the markdown file in s3 or git with the original slug as name.

## Usage

1. Install the plugin in Obsidian.
2. Configure the plugin settings in Obsidian's settings panel. See [Settings.ts](src/Settings.ts) for more details on what can be configured.
3. Click the "Static Site MD Export" and it will automatically process and deploy md files to s3.
4. Use whatever you like to generate these files into a static site. Hexo or Hugo are good choice for static site generation.
5. If you use GitHub actions to build/deploy, try using the "Trigger GitHub Action deploy" button to simplify workflow: update your site without leaving obsidian!

## Transformation Details

### Links

#### Which links will be transformed?

Every link that obsidian thinks is a wiki link. Basically, any link that doesn't target to an URL is a wiki link.

It may either in form of `[[Note]]`, `![[Embedded]]`, or `[title](not/a/url)`, `![alt](/not/a/url)`.

#### How will they be transformed?

Say that we have the following files in vault:

Ref.md:
```markdown
---
title: Ref
slug: ref-slug
published: true
---

Note to be linked.

## Section example
```

Note.md:
```markdown
<!-- frontmatter omitted -->
## Sec 1
[[Ref]]
[[Ref|Display Name]]
## Sec 2
[[Ref#section-example]]
[[Ref#section-example|Display Name]]
[[#Sec 1]]
[[#Sec 2|Display Name]]
[[NoteThatNotExist]]
## Sec 3
![[image.png]]
![[imageThatDoesNotExist.png]]
```

An options "Post prefix" is set to "/post/" in this example. This is used to generate path in the URL.

When using "Abort" option for image, the plugin refused to export Note.md. If use base64, the transform result will be:

```markdown
<!-- frontmatter omitted -->
## Sec 1
[Ref](/post/ref-slug)
[Display Name](/post/ref-slug)
## Sec 2
[Ref > section-example](/post/ref-slug#section-example)
[Display Name](/post/ref-slug#section-example)
[Sec 1](#sec-1)
[Display Name](#sec-2)
[[NoteThatNotExist]]
## Sec 3
![image.png][img1]
![[imageThatDoesNotExist]]

[img1]:
data: image/png;base64, omitted
```

### Tags

Tags in frontmatter and content will be merged into frontmatter, then remove "#" and anything before the last "/".

## Roadmap

- [ ] Support more upload methods (add back the S3 method that v1 supports).
- [ ] Support custom handler for image.

## Contributing

Contributions are welcome! Please submit a pull request with your changes.

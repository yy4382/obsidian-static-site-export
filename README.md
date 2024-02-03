# Static Site MD Exporter for Obsidian

Integrate Obsidian into your blog writing process!

Export notes with the `published: true` front matter into plain Markdown, so that you can use them for static site generators!

Meanwhile, wiki links`[[]]`  and many other Obsidian features can be used normally. This plugin does the work of converting `[[]]` style into `[]()` style automatically in exported markdown, leaving the links inside Obsidian untouched.

Images will be automatically uploaded to a image hosting service. More choices will be added in future.

## Features (How it Works?)

> Wiki links to non-image files won't be changed!

The "Static Site MD Export" button on panel (Ribbon) does:

1. Get all the notes in vault with front matter "published" and the value is true (bool value).
2. Transform them into general markdown format:
3. For [[]] or ![[]] links (wiki links) in notes, it finds the target note. There are three cases:
   1. Target note is also "published": change `[[target note's filename]]` into `[target note's title](target note's slug)`[^1] format (if link has a `#` or `|` or is a `![[]]` link, this plugin can smartly handle them)
   2. Target note is not "published": remove the [[]] and leave the content in it untouched.
   3. Target note is image file: upload it to a image hosting site, and replace the image link. The image file won't be modified. Currently only Easyimage is supported.
4. Change tags in front matter into 1-depth format (discarding content before /)
5. Upload the markdown files onto S3 (or S3 compatible services). Other choices such as uploading to git repo or downloading to local machine is currently being developed.

The “Trigger GitHub Action deploy” button does:

- Send a webhook to Github so that it knows it's time to build.

[^1]: currently only support front matter key "slug" as slug. Making this configurable is in process.

## Usage

1. Install the plugin in Obsidian.
2. Configure the plugin settings in Obsidian's settings panel. See [Settings.ts](src/Settings.ts) for more details on what can be configured.
3. Click the "Static Site MD Export" and it will automatically process and deploy md files to s3.
4. Use whatever you like to generate these files into a static site. Hexo or Hugo are good choice for static site generation.
5. If you use GitHub actions to build/deploy, try using the "Trigger GitHub Action deploy" button to simplify workflow: update your site without leaving obsidian!

## Roadmap

### feature

- [ ] enable upload with git
- [ ] enable export to local file
- [ ] put obsidian format tags into front matter
- [x] more setting choices
- [x] modify image links
- [ ] handle slug: support customize slug (? maybe not)
- [ ] support for other image hosting service (? maybe not)

### enhance

- [ ] Better notice system
- [ ] Use modal to confirm modify image links

### docs

- [x] write a readme
- [ ] usage example of github actions

### publish

- [x] create PR to release plugin to community plugins

## Contributing

Contributions are welcome! Please submit a pull request with your changes.

# Static Site MD Exporter for Obsidian

This project is a plugin for Obsidian that exports your notes with a specific frontmatter into a general markdown format for static site generation.

Hexo or Hugo is good choices to generate site if you want to use obsidian as your blog editor (and take advantage of obsidian's wiki links).

## Features (How it Works?)

> In no case this plugin changes the content of files in vault! (It doesn't have a single line of code modifying notes)

The "Static Site MD Export" button on panel (Ribbon) does:

1. Get all the notes in vault with frontmatter "published" and the value is true (bool value).
2. Transfrom them into general markdown format:
3. For [[]] or ![[]] links (wiki links) in notes, it finds the target note. There are three cases:
   1. Target note is also "published": change `[[target note's filename]]` into `[target note's title](target note's slug)`[^1] format (if link has a `#` or `|` or is a `![[]]` link, this plugin can smartly handle them)
   2. Target note is not "published": remove the [[]] and leave the content in it untouched.
   3. Target note is image file: upload it to a image hosting site. The image with same content hash will not be uploaded twice. Currently only Easyimage is supported.
4. Change tags in frontmatter into 1-depth format (discarding content before /)
5. Upload the markdown files onto S3 (or S3 compatible services)

The “Trigger GitHub Action deploy” button does:

- Send a webhook to Github so that it knows it's time to build.

[^1]: currently only support frontmatter key "plink" as slug. Making this configurable is in process.

## Usage

1. Install the plugin in Obsidian.
2. Configure the plugin settings in Obsidian's settings panel. See [Settings.ts](src/Settings.ts) for more details on what can be configured.
3. Click the "Static Site MD Export" and it will automaticaly process and deploy md files to s3.
4. Use whatever you like to gererate these files into a static site. Hexo or Hugo are good choice for static site generation. A hexo example may be uploaded in the near future.
5. If you use GitHub actions to build/deploy, try using the "Trigger GitHub Action deploy" button to simplify workflow: update your site without leaving obsidian!

## Roadmap

### feature

- [ ] only get articles that are modified or deleted
- [ ] put obsidian format tags into front matter
- [ ] more setting choices
- [ ] handle slug: support customize slug
- [ ] support for other image hosting service (? maybe not)

### enhance

- [ ] Better notice system

### docs

- [x] write a readme
- [ ] auto generate changelog
- [ ] usage example of github actions

### publish

- [ ] release plugin to community plugins

## Contributing

Contributions are welcome! Please submit a pull request with your changes.

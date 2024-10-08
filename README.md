# Static Site MD Exporter for Obsidian

> [!WARNING]
> Undergoing large refactor. v2.0 may come soon, which remove some features in v1, and will enable more configurations! 

Integrate Obsidian into your blog writing process!

Export notes with the `published: true` front matter into plain Markdown, so that you can use them for static site generators!

Meanwhile, wiki links`[[]]`  and many other Obsidian features can be used normally. This plugin does the work of converting `[[]]` style into `[]()` style automatically in exported markdown, leaving the links inside Obsidian untouched.

Images will be automatically uploaded to an image hosting service. More choices will be added in the future.

## Features (How it Works?)

> Wiki links to non-image files won't be changed!

The "All validate files - Static Site MD Export" button on panel (Ribbon) does:

1. Get all the notes in vault with front matter "published" and the value is true (bool value).
2. Transform them into general Markdown format:
3. For [[]] or ![[]] links (wiki links) in notes, it finds the target note. There are three cases:
   1. Target note is also "published": change `[[target note's filename]]` into `[target note's title](target note's slug)`[^1] format (if link has a `#` or `|` or is a `![[]]` link, this plugin can smartly handle them)
   2. Target note is not "published": remove the [[]] and leave the content in it untouched.
   3. Target note is image file: upload it to an image hosting site, and replace the image link. The image file won't be modified. Currently only Easyimage is supported.
4. Change tags in front matter into 1-depth format (discarding content before /)
5. Upload the markdown files onto S3 or commit via git. A setting item controls the behavior.

The "Current file - Static Site MD Export" does similar staff, but only validate the current note, not all the notes.

The “Trigger GitHub Action deploy” button does:

- Send a webhook to GitHub so that it knows it's time to build.

If you delete a file in your vault, your file in S3 or git won't be deleted. You need to go there to delete them. Similarly, if you change the slug of a post, you need to delete the markdown file in s3 or git with the original slug as name.

[^1]: currently only support front matter key "slug" as slug. Making this configurable is in process.

## Usage

1. Install the plugin in Obsidian.
2. Configure the plugin settings in Obsidian's settings panel. See [Settings.ts](src/Settings.ts) for more details on what can be configured.
3. Click the "Static Site MD Export" and it will automatically process and deploy md files to s3.
4. Use whatever you like to generate these files into a static site. Hexo or Hugo are good choice for static site generation.
5. If you use GitHub actions to build/deploy, try using the "Trigger GitHub Action deploy" button to simplify workflow: update your site without leaving obsidian!

## Known Issues

- Not working on Obsidian on iOS: Probably caused by the `lighting-fs` library, which is used for git upload.

## Contributing

Contributions are welcome! Please submit a pull request with your changes.

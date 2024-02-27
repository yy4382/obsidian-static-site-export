import { Notice, TFile, Vault, stringifyYaml } from "obsidian";
import { Frontmatter, Post, StaticExporterSettings } from "@/type";
import ImageHandler from "@/Image";

export default class PostHandler {
	private settings: StaticExporterSettings;
	private readonly postsOb: Post[];
	private readonly allFiles: TFile[];
	private imgHandler: ImageHandler;
	private vault: Vault;

	constructor(
		allFiles: TFile[],
		postsOb: Post[],
		settings: StaticExporterSettings,
		vault: Vault
	) {
		this.settings = settings;
		this.allFiles = allFiles;
		this.vault = vault;
		this.postsOb = postsOb;
	}

	async normalize(): Promise<Post[]> {
		this.imgHandler = new ImageHandler(this.settings, this.vault);

		const postsHexo: Post[] = await Promise.all(
			this.postsOb.map((postOb: Post) => this.normalizePost(postOb))
		);

		return postsHexo;
	}

	private async normalizePost(postOb: Post): Promise<Post> {
		const ProcessedArticle = (await this.handleContent(postOb)).trim() + "\n";
		const ProcessedFrontmatter = this.handleTags(postOb.frontmatter);
		return {
			tFile: postOb.tFile,
			frontmatter: ProcessedFrontmatter,
			article: ProcessedArticle,
		} as Post;
	}

	private async handleContent(post: Post): Promise<string> {
		const normalizedLink = await this.handleLinks(post);
		return normalizedLink.replace(/^\n*# .*\n*/, "");
	}

	private async handleLinks(post: Post): Promise<string> {
		const regex = /(!?)\[\[([^\]]+)\]\]/g;
		/**
		 * obLink[0]: [[abc]] or ![[abc]]
		 *
		 * obLink[1]: "" or "!"
		 *
		 * obLink[2]: "abc"
		 */
		const obLinks = [...post.article.matchAll(regex)];

		const stdLinks: string[] = await Promise.all(
			obLinks.map(async (obLink) => {
				const pattern = /^([^#|]*)(?:#([^|]*))?(?:\|(.+))?$/;
				/**
				 * matches[0]: "abc#ee|ff"
				 *
				 * matches[1]: abc | undefined
				 *
				 * matches[2]: ee | undefined
				 *
				 * matches[3]: ff | undefined
				 */
				const matches = obLink[2].match(pattern);
				if (matches === null) {
					// actually this should never happen
					// because match[1] always has value
					console.warn(
						"Invalid link " + obLink[0] + " in " + post.tFile.basename
					);
					new Notice("Invalid link " + obLink[0]);
					throw new Error("Invalid link " + obLink[0]);
				}
				if (!matches[1]) {
					// link to the same file
					const encodedTitle = encodeURIComponent(matches[2]);
					const linkPrefix = `${this.settings.post_prefix}${post.frontmatter.slug}/`;
					const linkTitle = matches[3] ? matches[3] : matches[2];
					return `[${linkTitle}](/${linkPrefix}#${encodedTitle})`;
				}
				const linkNote = this.findNote(matches[1]);
				if (linkNote === undefined) {
					// link to a file that does not exist
					const error = `file not found for link ${obLink[0]} in ${post.tFile.basename},\nusing ${obLink[2]} as plain text`;
					console.warn(error);
					new Notice(error);
					return obLink[0];
				} else if (linkNote === null) {
					// link to a file that neither a post nor an image
					return matches[3] ? matches[3] : matches[0];
				} else if (linkNote instanceof TFile) {
					// link to an image
					const image_url = await this.imgHandler.handleImage(linkNote);
					return `![image](${image_url})`;
				} else {
					const linkFrontmatter = linkNote.frontmatter;
					const encodedTitle = encodeURIComponent(matches[2]);
					const slug =
						linkFrontmatter.slug + (matches[2] ? `#${encodedTitle}` : "");
					const linkTitle = matches[3]
						? matches[3]
						: matches[2]
							? linkFrontmatter.title + "#" + matches[2]
							: linkFrontmatter.title;
					return `[${linkTitle}](/${this.settings.post_prefix}${slug})`;
				}
			})
		);

		let article = post.article;
		const imgReplacedArt = this.replaceImageLinks(post, obLinks, stdLinks);
		this.modifyImageLinks(post.tFile, imgReplacedArt);
		obLinks.forEach((link, i) => {
			article = article.replace(link[0], stdLinks[i]);
		});

		return article;
	}

	private replaceImageLinks(
		post: Post,
		obLinks: RegExpMatchArray[],
		stdLinks: string[]
	): string {
		let article = post.article;
		obLinks.forEach((obLink, i) => {
			if (stdLinks[i].startsWith("![image]")) {
				article = article.replace(obLink[0], stdLinks[i]);
			}
		});
		return (
			`---\n` +
			stringifyYaml(post.frontmatter) +
			`---\n\n` +
			article.trim() +
			`\n`
		);
	}

	private modifyImageLinks(file: TFile, replaced_article: string): void {
		this.vault.modify(file, replaced_article);
	}

	private handleTags(frontmatter: Frontmatter): Frontmatter {
		if (!("tags" in frontmatter)) return frontmatter;
		const tags = frontmatter.tags;
		if (typeof tags === "string") {
			if (tags.indexOf("/") == 0) return frontmatter;
			frontmatter.tags = tags.split("/")[-1];
			return frontmatter;
		} else if (Array.isArray(tags)) {
			const newTags: string[] = [];
			for (const tag of tags) {
				newTags.push(tag.split("/")[tag.split("/").length - 1]);
			}
			frontmatter.tags = newTags;
		}
		return frontmatter;
	}

	private findNote(link: string): Post | TFile | null | undefined {
		for (const post of this.postsOb) {
			if (post.tFile.basename === link) return post;
		}
		const imgExt = ["png", "jpg", "jpeg", "gif", "svg", "webp"];
		for (const file of this.allFiles) {
			if (link.split(".")[0] === file.basename) {
				if (imgExt.includes(file.extension)) return file;
				else return null;
			}
		}
		return undefined;
	}
}

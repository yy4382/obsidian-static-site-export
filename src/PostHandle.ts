import {Frontmatter, Post, StaticExporterSettings} from "src/type";
import {Notice, TFile, Vault} from "obsidian";
import {ImageHandler} from "./Image";
import {S3Client} from "@aws-sdk/client-s3";

export class PostHandler {
	private settings: StaticExporterSettings;
	private postsOb: Post[];
	private readonly allFiles: TFile[];
	private imgHandler: ImageHandler;
	private client: S3Client;
	private vault: Vault;

	constructor(settings: StaticExporterSettings, allFiles: TFile[], client: S3Client, vault: Vault) {
		this.settings = settings;
		this.allFiles = allFiles;
		this.client = client;
		this.vault = vault;
	}

	async normalize(postsOb: Post[]) {
		this.imgHandler = new ImageHandler(this.client, this.settings, this.vault);
		await this.imgHandler.init();

		this.postsOb = postsOb;
		const postsHexo: Post[] = await Promise.all(
			postsOb.map((post: Post) => this.normalizePost(post))
		);

		await this.imgHandler.finish();

		return postsHexo;
	}

	private async normalizePost(postOb: Post): Promise<Post> {
		const ProcessedArticle = await this.handleContent(postOb);
		const ProcessedFrontmatter = await this.handleTags(postOb.frontmatter);
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

	private async handleLinks(post: Post) {
		const regex = /(!?)\[\[([^\]]+)\]\]/g;
		/**
		 * obLink[0]: [[abc]] or ![[abc]]
		 *
		 * obLink[1]: "" or "!"
		 *
		 * obLink[2]: "abc"
		 */
		const obLinks = [...post.article.matchAll(regex)];
		// console.log(obLinks);

		let stdLinks: string[] = await Promise.all(
			obLinks.map(async (link) => {
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
				const matches = link[2].match(pattern);
				if (matches === null) {
					// actually this should never happen
					// because match[1] always has value
					console.log(
						"Invalid link " + link[0] + " in " + post.tFile.basename
					);
					new Notice("Invalid link " + link[0]);
					throw new Error("Invalid link " + link[0]);
				}
				if (!matches[1]) {
					// link to the same file
					const linkPrefix = `post/${post.frontmatter.slug}/`;
					const linkTitle = matches[3] ? matches[3] : matches[2];
					return `[${linkTitle}](/${linkPrefix}#${matches[2]})`;
				}
				const linkNote = await this.findNote(matches[1]);
				if (linkNote === undefined) {
					// link to a file that does not exist
					const error = `file not found for link ${link[0]} in ${post.tFile.basename},\nusing ${link[2]} as plain text`;
					console.log(error);
					new Notice(error);
					return link[0];
				} else if (linkNote === null) {
					// link to a file that neither a post nor an image
					return matches[3] ? matches[3] : matches[0];
				} else if (linkNote instanceof TFile) {
					// link to an image
					let image_url = await this.imgHandler.handleImage(linkNote);
					return `![image](${image_url})`;
				} else {
					const linkFrontmatter = linkNote.frontmatter;
					const slug =
						linkFrontmatter.slug +
						(matches[2] ? `#${matches[2]}` : "");
					const linkTitle = matches[3]
						? matches[3]
						: matches[2]
							? linkFrontmatter.title + "#" + matches[2]
							: linkFrontmatter.title;
					return `[${linkTitle}](/post/${slug})`;
				}
			})
		);

		let article = post.article;
		obLinks.forEach((link, i) => {
			article = article.replace(link[0], stdLinks[i]);
		});

		return article;
	}

	private async handleTags(frontmatter: Frontmatter) {
		if (!("tags" in frontmatter)) return frontmatter;
		let tags = frontmatter.tags;
		if (typeof tags === "string") {
			if (tags.indexOf("/") == 0) return frontmatter;
			frontmatter.tags = tags.split("/")[-1];
			return frontmatter;
		} else if (Array.isArray(tags)) {
			let newTags: string[] = [];
			for (let tag of tags) {
				// console.log(tag.split("/")[tag.split("/").length-1])
				newTags.push(tag.split("/")[tag.split("/").length - 1]);
			}
			// console.log(newTags)
			frontmatter.tags = newTags;
		}
		return frontmatter;
	}

	private async findNote(link: string): Promise<Post | TFile | null | undefined> {
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

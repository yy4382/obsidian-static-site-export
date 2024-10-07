import { TFile, App, CachedMetadata, ReferenceCache, Pos } from "obsidian";
import { Base64Transformer } from "./Image/base64";
import { ImageTransformer } from "./Image/base";
import { slug as slugger } from "github-slugger";

export interface Entry {
	tFile: TFile;
	content: string;
	meta: CachedMetadata | null;
}

type CachedMetadataPost = Omit<
	CachedMetadata,
	"frontmatter" | "frontmatterPosition"
> & {
	frontmatter: NonNullable<CachedMetadata["frontmatter"]>;
	frontmatterPosition: NonNullable<CachedMetadata["frontmatterPosition"]>;
};

export interface Post extends Entry {
	meta: CachedMetadataPost;
}

type ReplaceAction = [Pos, string];
type TransformAction = ReplaceAction | ((post: Post) => Post | Promise<Post>);

export async function normalize(posts: Post[], app: App): Promise<Post[]> {
	return Promise.all(
		posts.map((post) => new PostNormalizer(app).normalizePost(post)),
	);
}

export async function readAndFilterValidPosts(
	postFiles: TFile[],
	app: App,
): Promise<Post[]> {
	return (
		await Promise.all(
			postFiles.map(async (tFile: TFile) => ({
				tFile: tFile,
				content: await app.vault.cachedRead(tFile),
				meta: app.metadataCache.getFileCache(tFile),
			})),
		)
	)
		.map(validateEntry)
		.filter((post) => post !== undefined);
}

function validateEntry(post: Entry): Post | undefined {
	if (!post.meta) return undefined;
	if (!post.meta.frontmatterPosition) return undefined;
	if (!post.meta.frontmatter) return undefined;
	return post as Post;
}

class PostNormalizer {
	private app: App;

	constructor(app: App) {
		this.app = app;
	}

	async normalizePost(post: Post): Promise<Post> {
		const actions: TransformAction[] = [[post.meta.frontmatterPosition, ""]];
		actions.push(...(await this.processLinks(post)));
		actions.push(...this.transformTag(post));
		console.log(actions);
		return this.postProcess(post, actions);
	}

	private async postProcess(
		post: Post,
		actions: TransformAction[],
	): Promise<Post> {
		const replaceActions = actions.filter((act) => typeof act !== "function");
		const funcActions = actions.filter((act) => typeof act === "function");

		let postResult = this.replace(post, replaceActions);
		for (const func of funcActions) {
			postResult = await func(postResult);
		}
		return postResult;
	}

	private replace(post: Post, replaceList: ReplaceAction[]): Post {
		replaceList.sort((a, b) => b[0].start.offset - a[0].start.offset);

		checkOverlap(replaceList.map(([pos]) => pos));
		for (const [pos, str] of replaceList) {
			post.content =
				post.content.slice(0, pos.start.offset) +
				str +
				post.content.slice(pos.end.offset);
		}
		return post;
	}

	private async processLinks(post: Post): Promise<TransformAction[]> {
		const links = [...(post.meta?.embeds ?? []), ...(post.meta?.links ?? [])];
		if (!links) return [];

		const imageTransformer = new Base64Transformer(this.app);
		imageTransformer.onBeforeTransform();

		const actions: TransformAction[] = await Promise.all(
			links.map(async (link) => {
				const newLink = await this.transformLink(
					link,
					post.tFile,
					imageTransformer,
				);
				return [link.position, newLink] satisfies TransformAction;
			}),
		);
		actions.push((arg: Post) => {
			imageTransformer.onAfterTransform(arg);
			return arg;
		});
		return actions;
	}

	private async transformLink(
		link: ReferenceCache,
		sourceTFile: TFile,
		imageTransformer: ImageTransformer,
	): Promise<string> {
		const targetFile = this.app.metadataCache.getFirstLinkpathDest(
			link.link.split("#")[0],
			sourceTFile.path,
		);
		if (targetFile == null) {
			return link.displayText ?? link.link;
		}
		const imgExt = ["png", "jpg", "jpeg", "gif", "svg", "webp"];
		switch (true) {
			case imgExt.includes(targetFile.extension): {
				return await imageTransformer.onTransform(
					link,
					sourceTFile,
					targetFile,
				);
			}
			case targetFile.extension === "md": {
				const slug = this.getSlug(targetFile);
				if (slug)
					return `[${link.displayText ?? link.link}](${slugToPath(slug)}${link.link.includes("#") ? "#" + slugger(link.link.split("#")[1]) : ""})`;
				else {
					return link.displayText ?? link.link;
				}
			}
			default: {
				console.error(
					`unknown ext ${targetFile.extension} for ${targetFile.name}`,
				);

				return link.displayText ?? link.link;
			}
		}
	}

	private getSlug(file: TFile): string | null {
		const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
		if (!frontmatter?.published) return null;

		const slug = frontmatter.slug;
		return slug ?? null;
	}

	private transformTag(post: Post): TransformAction[] {
		const tagsInContent = post.meta?.tags ?? [];
		const replaceActions: TransformAction[] = tagsInContent.map((tag) => {
			return [tag.position, ""];
		});

		const tags = tagsInContent.map((tag) => tag.tag);
		const tagsInFrontmatter = post.meta?.frontmatter?.tags ?? [];
		const tagsInPost = [...new Set([...tagsInFrontmatter, ...tags])];
		const tagsInPostWithoutSlash = tagsInPost.map((tag) => {
			if (tag.indexOf("/") !== -1) {
				tag = tag.split("/").at(-1);
			}
			return tag;
		});
		const tagsInPostWithoutSlashSet = new Set(tagsInPostWithoutSlash);
		const tagsInPostWithoutSlashArray = Array.from(
			tagsInPostWithoutSlashSet,
		).map((tag) => {
			if (tag.startsWith("#")) {
				tag = tag.slice(1);
			}
			return tag;
		});

		const appendToFrontmatterActions = (p: Post) => {
			p.meta.frontmatter.tags = tagsInPostWithoutSlashArray;
			return p;
		};
		return [...replaceActions, appendToFrontmatterActions];
	}
}

function slugToPath(slug: string): string {
	console.warn("No impl: SlugToPath");
	return slug;
}

function checkOverlap(replacements: Pos[]): void {
	replacements.sort((a, b) => a.start.offset - b.start.offset);

	for (let i = 0; i < replacements.length - 1; i++) {
		if (replacements[i].end.offset > replacements[i + 1].start.offset) {
			throw new Error(
				`检测到重叠的替换区域: ${JSON.stringify(replacements[i])} 和 ${JSON.stringify(replacements[i + 1])}`,
			);
		}
	}
}

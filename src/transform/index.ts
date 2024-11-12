import type {
	TFile,
	Pos,
	CachedMetadata,
	FrontMatterCache,
	App,
	Notice,
} from "obsidian";
import { ImageTransformer } from "@/Image/base";
import { processLinks } from "./link";
import { transformTag } from "./tag";
import { getImageTransformer } from "@/Image";
import { validateMeta } from "./validate";
import { z } from "zod";
import { SSSettings } from "@/type";

/*
Transform pipeline:

1. Read all files and filter out valid posts
2. Check wiki links, push replacement as "actions" into context
	- If link to markdown file, replace with []() link
	- If link to image, replace with ![]() link
		- requires a image transformer, which has some callbacks to use in the process
3. Check tags, push replacement as "actions" into context
(Note that the post array is not modified in above steps)
4. Apply all actions to the post array
	- Replace all actions in "actions" array
	- Run all functions in "actions" array
*/

export type CachedMetadataPost = Omit<
	CachedMetadata,
	"frontmatter" | "frontmatterPosition"
> & {
	frontmatter: z.infer<typeof frontmatterSchema> & FrontMatterCache;
	frontmatterPosition: NonNullable<CachedMetadata["frontmatterPosition"]>;
};
export const frontmatterSchema = z
	.object({
		slug: z.string(),
	})
	.passthrough();

export interface TransformCtx {
	cachedRead: App["vault"]["cachedRead"];
	readBinary: App["vault"]["readBinary"];
	getFileMetadata: App["metadataCache"]["getFileCache"];
	resolveLink: App["metadataCache"]["getFirstLinkpathDest"];
	notice: (...args: ConstructorParameters<typeof Notice>) => void;
	settings: SSSettings;
}

export interface Post {
	tFile: TFile;
	content: string;
	meta: CachedMetadataPost;
}
export type TransformCtxWithImage = TransformCtx & {
	imageTf: ImageTransformer;
};

type ReplaceAction = [Pos, string];
export type TransformAction =
	| ReplaceAction
	| ((post: Post) => Post | Promise<Post>);

/**
 * The main function to transform all posts
 * @param files All files, including non-post files
 * @param ctx context
 * @returns transformed posts
 */
export async function transform(
	files: TFile[],
	ctx: TransformCtx,
): Promise<Post[]> {
	const originalPosts = await readAndFilterValidPosts(ctx, files);

	const imageTf = new (getImageTransformer(
		ctx.settings.transformer.imageTransformer,
	))(ctx);
	await imageTf.onBeforeTransform();
	const ctxWithImage: TransformCtxWithImage = { ...ctx, imageTf };

	const transformedPosts = await Promise.all(
		originalPosts.map((post) => normalizePost(post, ctxWithImage)),
	);

	await imageTf.onFinish();
	return transformedPosts;
}

/**
 * Reads and filters valid posts from the given list of files.
 *
 * @param ctx - The transformation context containing the application instance.
 * @param postFiles - An array of TFile objects representing the files to be processed.
 * @returns An array of valid Post objects.
 */
const readAndFilterValidPosts = async (
	ctx: TransformCtx,
	postFiles: TFile[],
): Promise<Post[]> =>
	(
		await Promise.all(
			postFiles.map(async (tFile: TFile) => ({
				tFile: tFile,
				content: await ctx.cachedRead(tFile),
				meta: validateMeta(tFile, ctx),
			})),
		)
	).filter((post): post is Post => {
		if (post.meta instanceof Error) {
			if (postFiles.length === 1) {
				ctx.notice(`Error in file "${post.tFile.name}": ${post.meta.message}`);
			}
			return false;
		}
		return true;
	});

async function normalizePost(
	post: Post,
	ctx: TransformCtxWithImage,
): Promise<Post> {
	const actions: TransformAction[] = [
		[post.meta.frontmatterPosition, ""],
		...(await processLinks(post, ctx)),
		...(ctx.settings.transformer.transformTags ? transformTag(post) : []),
	];
	return applyActions(post, actions);
}

async function applyActions(
	post: Post,
	actions: TransformAction[],
): Promise<Post> {
	const replaceActions = actions.filter((act) => typeof act !== "function");
	const funcActions = actions.filter((act) => typeof act === "function");

	let postResult = replace(post, replaceActions);
	for (const func of funcActions) {
		postResult = await func(postResult);
	}
	return postResult;
}

function replace(post: Post, replaceList: ReplaceAction[]): Post {
	replaceList.sort((a, b) => b[0].start.offset - a[0].start.offset);

	for (const [pos, str] of replaceList) {
		post.content =
			post.content.slice(0, pos.start.offset) +
			str +
			post.content.slice(pos.end.offset);
	}
	return post;
}

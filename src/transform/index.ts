import { TFile, Pos } from "obsidian";
import { ImageTransformer } from "@/Image/base";
import * as R from "ramda";
import type { TransformCtx, Entry, Post } from "@/type";
import { processLinks } from "./link";
import { transformTag } from "./tag";
import { getImageTransfomer } from "@/Image";

export type TransformCtxWithImage = TransformCtx & {
	imageTf: ImageTransformer;
};

type ReplaceAction = [Pos, string];
export type TransformAction =
	| ReplaceAction
	| ((post: Post) => Post | Promise<Post>);

export async function transform(
	files: TFile[],
	ctx: TransformCtx,
): Promise<Post[]> {
	const originalPosts = await readAndFilterValidPosts(ctx, files);

	const imageTf = new (getImageTransfomer(
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

const readAndFilterValidPosts = async (
	ctx: TransformCtx,
	postFiles: TFile[],
): Promise<Post[]> =>
	(
		await Promise.all(
			postFiles.map(async (tFile: TFile) => ({
				tFile: tFile,
				content: await ctx.app.vault.cachedRead(tFile),
				meta: ctx.app.metadataCache.getFileCache(tFile),
			})),
		)
	)
		.map(validateEntry)
		.filter(R.complement(R.isNil));

function validateEntry(post: Entry): Post | undefined {
	if (!post.meta) return undefined;
	if (!post.meta.frontmatterPosition) return undefined;
	if (!post.meta.frontmatter) return undefined;
	return post as Post;
}

async function normalizePost(
	post: Post,
	ctx: TransformCtxWithImage,
): Promise<Post> {
	const actions: TransformAction[] = [
		[post.meta.frontmatterPosition, ""],
		...(await processLinks(post, ctx)),
		...transformTag(post),
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

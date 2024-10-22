import type { Post } from "@/type";
import type { ReferenceCache, TFile } from "obsidian";
import { slug as slugger } from "github-slugger";
import type { TransformAction, TransformCtxWithImage } from "@/transform/index";
import { validateMeta } from "./validate";

const IMAGE_EXT = ["png", "jpg", "jpeg", "gif", "svg", "webp"];

export async function processLinks(
	post: Post,
	ctx: TransformCtxWithImage,
): Promise<TransformAction[]> {
	const links = [...(post.meta?.embeds ?? []), ...(post.meta?.links ?? [])];
	if (!links) return [];

	const actions: TransformAction[] = await Promise.all(
		links.map(async (link) => {
			const newLink = await transformLink(link, post.tFile, ctx);
			return [link.position, newLink] satisfies TransformAction;
		}),
	);

	return [
		...actions,
		(arg: Post) => {
			ctx.imageTf.onAfterTransform(arg);
			return arg;
		},
	];
}
/**
 * Case 1: target not found / target is not md nor image / target not valid post (not published)
 *   - link.original
 * Case 2: target is image
 *   - imageTf.onTransform
 * Case 3: target is another post
 *  - normal link
 * @param link
 * @param sourceTFile
 * @param ctx
 * @returns
 */
async function transformLink(
	link: ReferenceCache,
	sourceTFile: TFile,
	ctx: TransformCtxWithImage,
): Promise<string> {
	const targetFile = ctx.resolveLink(link.link.split("#")[0], sourceTFile.path);

	if (targetFile == null) {
		console.warn(`link not found:`, link.original);
		return link.original;
	}

	if (IMAGE_EXT.includes(targetFile.extension))
		return await ctx.imageTf.onTransform(link, sourceTFile, targetFile);

	if (targetFile.extension === "md") {
		const slug = getSlug(targetFile, ctx);

		// target not published
		if (!slug) {
			console.warn(
				`link target not published: "${targetFile.name}" from "${sourceTFile.name}"`,
			);
			return link.original;
		}

		const displayText = link.displayText ?? link.link;
		const fragment = link.link.includes("#")
			? "#" + slugger(link.link.split("#").slice(1).join("#"))
			: "";
		if (targetFile.path === sourceTFile.path && fragment) {
			return `[${displayText}](${fragment})`;
		} else {
			return `[${displayText}](${slugToPath(slug, ctx)}${fragment})`;
		}
	}

	console.error(`unknown ext ${targetFile.extension} for ${targetFile.name}`);
	return link.original;
}

function getSlug(file: TFile, ctx: TransformCtxWithImage): string | null {
	const meta = validateMeta(file, ctx);
	if (meta instanceof Error) return null;
	return meta.frontmatter.slug;
}

function slugToPath(slug: string, ctx: TransformCtxWithImage): string {
	return ctx.settings.transformer.post_prefix + slug;
}

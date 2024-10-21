import type { Post } from "@/type";
import type { ReferenceCache, TFile } from "obsidian";
import { slug as slugger } from "github-slugger";
import type { TransformAction, TransformCtxWithImage } from "@/transform/index";

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
	const imgExt = ["png", "jpg", "jpeg", "gif", "svg", "webp"];
	if (imgExt.includes(targetFile.extension)) {
		{
			return await ctx.imageTf.onTransform(link, sourceTFile, targetFile);
		}
	} else if (targetFile.extension === "md") {
		{
			const slug = getSlug(targetFile, ctx);
			const displayText = link.displayText ?? link.link;
			if (slug) {
				const fragment = link.link.includes("#")
					? slugger(link.link.split("#")[1])
					: undefined;
				if (targetFile.path === sourceTFile.path && fragment) {
					return `[${displayText}](#${fragment})`;
				} else {
					return `[${displayText}](${slugToPath(slug, ctx) + (fragment ? "#" + fragment : "")})`;
				}
			} else {
				console.warn(
					`link target not published: ${targetFile.name} from ${sourceTFile.name}`,
				);
				return link.original;
			}
		}
	} else {
		{
			console.error(
				`unknown ext ${targetFile.extension} for ${targetFile.name}`,
			);

			return link.original;
		}
	}
}

function getSlug(file: TFile, ctx: TransformCtxWithImage): string | null {
	const { published, slug } = ctx.getFileMetadata(file)?.frontmatter ?? {};

	if (!published) return null;
	return slug ?? null;
}

function slugToPath(slug: string, ctx: TransformCtxWithImage): string {
	return ctx.settings.transformer.post_prefix + slug;
}

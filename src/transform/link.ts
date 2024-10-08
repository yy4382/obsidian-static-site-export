import type { Post } from "@/type";
import { ReferenceCache, TFile } from "obsidian";
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
	const targetFile = ctx.app.metadataCache.getFirstLinkpathDest(
		link.link.split("#")[0],
		sourceTFile.path,
	);
	if (targetFile == null) {
		return link.displayText ?? link.link;
	}
	const imgExt = ["png", "jpg", "jpeg", "gif", "svg", "webp"];
	if (imgExt.includes(targetFile.extension)) {
		{
			return await ctx.imageTf.onTransform(link, sourceTFile, targetFile);
		}
	} else if (targetFile.extension === "md") {
		{
			const slug = getSlug(targetFile, ctx);
			if (slug)
				return `[${link.displayText ?? link.link}](${slugToPath(slug)}${link.link.includes("#") ? "#" + slugger(link.link.split("#")[1]) : ""})`;
			else {
				return link.displayText ?? link.link;
			}
		}
	} else {
		{
			console.error(
				`unknown ext ${targetFile.extension} for ${targetFile.name}`,
			);

			return link.displayText ?? link.link;
		}
	}
}

function getSlug(file: TFile, ctx: TransformCtxWithImage): string | null {
	const { published, slug } =
		ctx.app.metadataCache.getFileCache(file)?.frontmatter ?? {};

	if (!published) return null;
	return slug ?? null;
}

function slugToPath(slug: string): string {
	console.warn("No impl: SlugToPath");
	return slug;
}

import type { Post } from "@/type";
import * as R from "ramda";
import { TransformAction } from "@/transform/index";

export function transformTag(post: Post): TransformAction[] {
	const tagCachesInContent = post.meta.tags ?? [];

	const tagsInContent = tagCachesInContent.map((tag) => tag.tag);
	const tagsInFrontmatter = post.meta.frontmatter.tags ?? [];

	const replaceActions: TransformAction[] = tagCachesInContent.map((tag) => {
		return [tag.position, ""];
	});

	const tagPurifier = (tag: string) =>
		tag.split("/").at(-1)!.split("#").at(-1)!;

	const tags = R.pipe(
		R.map(tagPurifier),
		R.uniq,
	)([...tagsInContent, ...tagsInFrontmatter]);

	return [
		...replaceActions,
		(p: Post) => R.assocPath(["meta", "frontmatter", "tags"], tags, p),
	];
}

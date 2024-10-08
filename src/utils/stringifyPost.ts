import { Post } from "@/type";
import { stringifyYaml } from "obsidian";

export const stringifyPost = (
	post: Post,
): { filename: string; content: string } => {
	const filename: string =
		(post.meta.frontmatter.slug ?? post.tFile.basename) + ".md";

	const frontmatter = stringifyYaml(post.meta.frontmatter);
	const content = `---\n${frontmatter}---\n\n` + post.content;
	return { filename, content };
};

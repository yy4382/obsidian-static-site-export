import { Post } from "@/type";
import { stringify } from "yaml";

export const stringifyPost = (
	post: Post,
): { filename: string; content: string } => {
	const filename: string =
		(post.meta.frontmatter.slug ?? post.tFile.basename) + ".md";

	const frontmatter = stringify(post.meta.frontmatter);
	const content = `---\n${frontmatter}---\n\n` + post.content.trim() + "\n";
	return { filename, content };
};

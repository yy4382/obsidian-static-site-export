import { SSSettings } from "@/type";
import { CachedMetadataPost, frontmatterSchema } from ".";
import { App, TFile } from "obsidian";
export class PostValidationError extends Error {
	tFile: TFile;
	constructor(message: string, tFile: TFile) {
		super(message);
		this.tFile = tFile;
	}
}

function formatZodError(
	error: NonNullable<
		ReturnType<(typeof frontmatterSchema)["safeParse"]>["error"]
	>,
) {
	const formattedError = error.issues.reduce((acc, issue) => {
		const message = `"${issue.path.join(".")}": ${issue.message}`;
		return acc + message + "\n";
	}, "\n");
	return formattedError;
}

export function validateMeta(
	file: TFile,
	ctx: {
		settings: SSSettings;
		getFileMetadata: App["metadataCache"]["getFileCache"];
	},
): CachedMetadataPost | PostValidationError {
	if (file.extension !== "md")
		return new PostValidationError("Not a markdown file", file);

	const meta = ctx.getFileMetadata(file);
	if (!meta || !meta.frontmatter || !meta.frontmatterPosition)
		return new PostValidationError("No frontmatter", file);

	if (meta.frontmatter[ctx.settings.transformer.publishedFlag] !== true)
		return new PostValidationError("Not published", file);

	const { error } = frontmatterSchema.safeParse(meta.frontmatter);
	if (error) return new PostValidationError(formatZodError(error), file);

	return meta as CachedMetadataPost;
}

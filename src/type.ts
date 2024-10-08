import { App, CachedMetadata, TFile } from "obsidian";

export interface Entry {
	tFile: TFile;
	content: string;
	meta: CachedMetadata | null;
}

export interface TransformCtx {
	app: App;
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

export interface StaticExporterSettings {
	post_prefix: string;
	uploader: {
		type: string;
		git: {
			repo: string;
			branch: string;
			username: string;
			pat: string;
			author: {
				name: string;
				email: string;
			};
			commit_message: string;
		};
	};
}

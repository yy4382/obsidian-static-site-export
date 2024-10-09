import { App, CachedMetadata, TFile } from "obsidian";
import { SSSettings } from "@/Settings";

export interface Entry {
	tFile: TFile;
	content: string;
	meta: CachedMetadata | null;
}

export interface TransformCtx {
	app: App;
	settings: SSSettings;
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

export type { SSSettings } from "./Settings";

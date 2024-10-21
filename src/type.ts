import { App, CachedMetadata, TFile, Notice } from "obsidian";
import { SSSettings } from "@/Settings";

export interface Entry {
	tFile: TFile;
	content: string;
	meta: CachedMetadata | null;
}

export interface TransformCtx {
	cachedRead: App["vault"]["cachedRead"];
	readBinary: App["vault"]["readBinary"];
	getFileMetadata: App["metadataCache"]["getFileCache"];
	resolveLink: App["metadataCache"]["getFirstLinkpathDest"];
	notice: (...args: ConstructorParameters<typeof Notice>) => void;
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

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-empty-function */
import { Post } from "@/post";
import { App, ReferenceCache, TFile } from "obsidian";

export class ImageTransformer {
	app: App;
	constructor(app: App) {
		this.app = app;
	}
	async onBeforeTransform() {}
	/**
	 *
	 * @param link
	 * @param sourceTFile
	 * @param targetTFile
	 * @returns string of the transformed link (in standard markdown)
	 */
	async onTransform(
		link: ReferenceCache,
		sourceTFile: TFile,
		targetTFile: TFile,
	): Promise<string> {
		throw new Error("Using base image transformer");
	}
	/**
	 * Will be called after each post is transformed
	 * @param post context, if need to modify, modify in place
	 */
	async onAfterTransform(post: Post) {}
}

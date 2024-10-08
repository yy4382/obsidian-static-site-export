/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-empty-function */
import { Post } from "@/type";
import { App, ReferenceCache, TFile } from "obsidian";
import type { TransformCtx } from "@/type";

export class ImageTransformer {
	ctx: TransformCtx;
	constructor(ctx: TransformCtx) {
		this.ctx = ctx;
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

	/**
	 * After all files are processed.
	 */
	async onFinish() {}
}

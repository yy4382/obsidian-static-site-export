import type { Post, TransformCtx } from "@/type";
import type { ReferenceCache, TFile } from "obsidian";

export class ImageTransformer {
	ctx: TransformCtx;
	constructor(ctx: TransformCtx) {
		this.ctx = ctx;
	}
	async onBeforeTransform() {}
	/**
	 *
	 * @param _link
	 * @param _sourceTFile
	 * @param _targetTFile
	 * @returns string of the transformed link (in standard markdown)
	 */
	async onTransform(
		_link: ReferenceCache,
		_sourceTFile: TFile,
		_targetTFile: TFile,
	): Promise<string> {
		throw new Error("Using base image transformer");
	}
	/**
	 * Will be called after each post is transformed
	 * @param _post context, if need to modify, modify in place
	 */
	async onAfterTransform(_post: Post) {}

	/**
	 * After all files are processed.
	 */
	async onFinish() {}
}

import type { Reference, TFile } from "obsidian";
import { ImageTransformer } from "./base";
import type { Post, TransformCtx } from "@/type";

export class Base64Transformer extends ImageTransformer {
	fileMap: Map<string, string>;
	contentMap: Map<string, [string, string]>;
	constructor(ctx: TransformCtx) {
		super(ctx);
		this.fileMap = new Map<string, string>();
		this.contentMap = new Map<string, [string, string]>();
	}
	async onTransform(
		link: Reference,
		_sourceTFile: TFile,
		targetTFile: TFile,
	): Promise<string> {
		let tagName = this.fileMap.get(targetTFile.path);
		if (!tagName) {
			tagName = `img${this.fileMap.size + 1}`;
			this.fileMap.set(targetTFile.path, tagName);
		}

		if (!this.contentMap.has(tagName)) {
			const arraybuffer = await this.ctx.readBinary(targetTFile);
			// Convert arraybuffer to base64
			const base64 = btoa(
				new Uint8Array(arraybuffer).reduce(
					(data, byte) => data + String.fromCharCode(byte),
					"",
				),
			);
			this.contentMap.set(tagName, [base64, targetTFile.extension]);
		}
		// Return the tag name to be used as a placeholder
		return `![${link.displayText ?? link.link}][${tagName}]`;
	}
	async onAfterTransform(post: Post): Promise<void> {
		let appendContent = "\n\n";
		this.contentMap.forEach(([base64, ext], tagName) => {
			appendContent += `[${tagName}]: data:image/${ext};base64,${base64}\n`;
		});
		post.content += appendContent;
	}
}

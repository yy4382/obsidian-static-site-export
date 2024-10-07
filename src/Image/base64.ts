import { App, Reference, TFile } from "obsidian";
import { ImageTransformer } from "./base";
import type { Post } from "@/post";

export class Base64Transformer extends ImageTransformer {
	fileMap: Map<string, [string, string, TFile]>;
	constructor(app: App) {
		super(app);
		this.fileMap = new Map<string, [string, string, TFile]>();
	}
	async onTransform(
		link: Reference,
		sourceTFile: TFile,
		targetTFile: TFile,
	): Promise<string> {
		if (this.fileMap.has(targetTFile.path)) {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			const tagName = this.fileMap.get(targetTFile.path)![0];
			return `![${link.displayText ?? link.link}][${tagName}]`;
		}
		const tagName = `img${this.fileMap.size + 1}`;
		const arraybuffer = await this.app.vault.readBinary(targetTFile);

		// Convert arraybuffer to base64
		const base64 = btoa(
			new Uint8Array(arraybuffer).reduce(
				(data, byte) => data + String.fromCharCode(byte),
				"",
			),
		);

		// Store the base64 data in the fileMap
		this.fileMap.set(targetTFile.path, [tagName, base64, targetTFile]);

		// Return the tag name to be used as a placeholder
		return `![${link.displayText ?? link.link}][${tagName}]`;
	}
	async onAfterTransform(post: Post): Promise<void> {
		let appendContent = "\n\n";
		this.fileMap.forEach(([tagName, base64, file]) => {
			appendContent += `[${tagName}]: data:image/${file.extension};base64,${base64}\n`;
		});
		post.content += appendContent;
	}
}

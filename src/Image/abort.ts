import { Notice, ReferenceCache, TFile } from "obsidian";
import { ImageTransformer } from "@/Image/base";

export class AbortImageTransfromer extends ImageTransformer {
	async onTransform(
		_link: ReferenceCache,
		_sourceTFile: TFile,
		_targetTFile: TFile,
	): Promise<string> {
		new Notice(
			"Having image, abort. Use other image transformer or use non-wiki link syntax. " +
				`at ${_sourceTFile.path}, ${_link.position.start.line}, ${_link.position.start.col} linked to ${_targetTFile.path}`,
		);
		throw new Error("Have image, abort");
	}
}

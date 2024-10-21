import type { SSSettings, TransformCtx } from "@/type";
import type { TFile } from "obsidian";
export type MockData = {
	input: {
		files: {
			tFile: TFile;
			content: string;
			meta: string;
		}[];
		settings: SSSettings["transformer"];
	};
	output: {
		content: string;
		filename: string;
		error?: string;
	};
};

export const makeData = (data: MockData): [TFile, TransformCtx] => {
	const files = data.input.files;
	const ctx: TransformCtx = {
		//@ts-expect-error mock for testing
		settings: {
			uploader: undefined,
			transformer: data.input.settings,
		} as SSSettings,
		cachedRead: async (tf: TFile) => {
			for (const file of files) {
				if (tf.path === file.tFile.path) {
					return file.content;
				}
			}
			throw new Error("unexpected file");
		},
		getFileMetadata: (tf: TFile) => {
			for (const file of files) {
				if (tf.path === file.tFile.path) {
					return JSON.parse(file.meta);
				}
			}
			throw new Error("unexpected file");
		},
		resolveLink: (linkPath) => {
			if (!linkPath) return files[0].tFile;
			for (const file of files) {
				if (file.tFile.name === linkPath || file.tFile.basename === linkPath)
					return file.tFile;
			}
			return null;
		},
		readBinary: async (tf: TFile) => {
			for (const file of files) {
				if (tf.path === file.tFile.path) {
					return stringToArrayBuffer(file.content);
				}
			}
			throw new Error("unexpected file");
		},
		notice: (msg) => {
			if (typeof msg === "string") {
				console.log(`[NOTICE] ${msg}`);
			}
			console.log(`[NOTICE]`, msg);
		},
	} satisfies TransformCtx;
	return [files[0].tFile, ctx];
};

function stringToArrayBuffer(str: string) {
	const buf = new ArrayBuffer(str.length * 2); // 每个字符2字节
	const bufView = new Uint16Array(buf);
	for (let i = 0; i < str.length; i++) {
		bufView[i] = str.charCodeAt(i);
	}
	return buf;
}

/*
const app: App = undefined;

// Paste into Obsidian console
async function getFile() {
	const tFile = app.workspace.getActiveFile();
	if (tFile === null) return "null";
	const partial = {
		basename: tFile.basename,
		extension: tFile.extension,
		name: tFile.name,
		path: tFile.path,
	};
	const content = await app.vault.cachedRead(tFile);
	const meta = JSON.stringify(app.metadataCache.getFileCache(tFile));
	return JSON.stringify({ tFile: partial, content, meta });
}
*/

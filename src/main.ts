import { type App, Modal, Notice, Plugin, type TFile } from "obsidian";
import type { SSSettings, TransformCtx } from "@/type";
import { DEFAULT_SETTINGS, Ob2StaticSettingTab } from "@/Settings";
import { transform } from "./transform";
import { defu } from "defu";
import { TransformConfirmModal } from "./confirm-modal";
import { gitUpload } from "./upload/git";
import { createPromiseWithResolver } from "./utils/createPromise";

export default class Ob2StaticPlugin extends Plugin {
	settings: SSSettings;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.addRibbonIcon(
			"file-up",
			"Current file - Static Site MD Export",
			async () => {
				new Notice("Starting process");
				const tFile = this.app.workspace.getActiveFile();
				if (tFile === null) {
					new Notice("No file active");
					return;
				}
				await this.process([tFile]);
			},
		);

		this.addRibbonIcon(
			"folder-up",
			"All files - Static Site MD Export",
			async () => {
				new Notice("Starting process");
				const tFiles = this.app.vault.getMarkdownFiles();
				if (tFiles === null) {
					new Notice("No file active");
					return;
				}
				await this.process(tFiles);
			},
		);

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new Ob2StaticSettingTab(this.app, this));
	}

	onunload(): void {}

	async loadSettings(): Promise<void> {
		this.settings = defu(await this.loadData(), DEFAULT_SETTINGS);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	async process(tFiles: TFile[]): Promise<void> {
		const posts = await transform(tFiles, {
			// Doing these ugly things to avoid losing "this"
			cachedRead: (...args: Parameters<TransformCtx["cachedRead"]>) =>
				this.app.vault.cachedRead(...args),
			readBinary: (...args: Parameters<TransformCtx["readBinary"]>) =>
				this.app.vault.readBinary(...args),
			getFileMetadata: (...args: Parameters<TransformCtx["getFileMetadata"]>) =>
				this.app.metadataCache.getFileCache(...args),
			resolveLink: (...args: Parameters<TransformCtx["resolveLink"]>) =>
				this.app.metadataCache.getFirstLinkpathDest(...args),
			notice: (...args) => new Notice(...args),
			settings: this.settings,
		});

		// Confirm modal
		const { promise: confirmPromise, handler } = createPromiseWithResolver();
		new TransformConfirmModal(this.app, posts, handler).open();
		try {
			await confirmPromise;
		} catch {
			return;
		}

		const error = await gitUpload(posts, this.settings.uploader.git, this.app);
		if (error) {
			new ErrorModal(error, this.app).open();
		}

		console.log("process complete");
	}
}

export type AbortErrorParams = {
	title: string;
	content: string;
	stage: "upload" | "transform";
	error?: Error;
};

export class ErrorModal extends Modal {
	title: string;
	content: string;
	stage: "upload" | "transform";
	constructor(params: AbortErrorParams, app: App) {
		super(app);
		this.title = params.title;
		this.content = params.content;
		this.stage = params.stage;
		console.error(params.error);
	}

	onOpen(): void {
		this.setTitle(`Error: ${this.title}`);
		this.contentEl.createEl("p", {
			text: `Error occurred in ${this.stage} process.`,
		});
		this.contentEl.createEl("p", { text: this.content });
	}
}

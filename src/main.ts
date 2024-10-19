import { Notice, Plugin, TFile } from "obsidian";
import { SSSettings } from "@/type";
import { DEFAULT_SETTINGS, Ob2StaticSettingTab } from "@/Settings";
import { transform } from "./transform";
import { defu } from "defu";
import { ConfirmModal } from "./confirm-modal";
import { gitUpload } from "./upload/git";

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
				const tFiles = this.app.vault.getFiles();
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
			app: this.app,
			settings: this.settings,
		});

		new ConfirmModal(this.app, posts, async () => {
			new Notice("Start to upload...");
			await gitUpload(posts, this.settings.uploader.git, this.app);
		}).open();
		console.log("process complete");
	}
}

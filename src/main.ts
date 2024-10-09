import { Notice, Plugin, TFile } from "obsidian";
import { SSSettings } from "@/type";
import { DEFAULT_SETTINGS, Ob2StaticSettingTab } from "@/Settings";
import { transform } from "./transform";

import { gitUpload } from "@/upload/git";
import { defu } from "defu";

export default class Ob2StaticPlugin extends Plugin {
	settings: SSSettings;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.addRibbonIcon(
			"file-up",
			"Current file - Static Site MD Export",
			async () => {
				// Called when the user clicks the icon.
				new Notice("Starting process");
				const tFiles = [this.app.workspace.getActiveFile() as TFile];
				if (tFiles[0] === null) {
					new Notice("No file active");
					return;
				}
				const posts = await transform(tFiles, {
					app: this.app,
					settings: this.settings,
				});

				console.log(posts[0].content, posts[0].meta);
				await gitUpload(posts, this.settings.uploader.git);
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
}

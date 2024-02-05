import { Notice, Plugin, TFile } from "obsidian";
import * as YAML from "yaml";
import { Frontmatter, Post, StaticExporterSettings } from "@/type";
import { DEFAULT_SETTINGS, Ob2StaticSettingTab } from "@/Settings";
import { triggerGitHubDispatchEvent } from "@/trigger";
import PostHandler from "@/PostHandle";
import Uploader from "@/Upload";

export default class Ob2StaticPlugin extends Plugin {
	settings: StaticExporterSettings;
	allTFiles: TFile[];
	postsOb: Post[];
	uploader: Uploader;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		this.addRibbonIcon(
			"file-up",
			"Static Site MD Export",
			async (evt: MouseEvent) => {
				// Called when the user clicks the icon.
				new Notice("Starting process");
				await this.process();
			}
		);
		if (this.settings.build.enable) {
			this.addRibbonIcon(
				"play-square",
				"Trigger GitHub Action deploy",
				(evt: MouseEvent) => {
					// Called when the user clicks the icon.
					triggerGitHubDispatchEvent(
						this.settings.build.webhook_token,
						this.settings.build.user,
						this.settings.build.repo,
						this.settings.build.event_type
					);
					new Notice("Sent GitHub Action deploy Webhook");
				}
			);
		}

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: "trigger-static-export",
			name: "Trigger Static Export",
			callback: () => {
				this.process();
			},
		});
		if (this.settings.build.enable) {
			this.addCommand({
				id: "trigger-github-dispatch-event",
				name: "Trigger GitHub Action build",
				callback: () => {
					triggerGitHubDispatchEvent(
						this.settings.build.webhook_token,
						this.settings.build.user,
						this.settings.build.repo,
						this.settings.build.event_type
					);
				},
			});
		}

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new Ob2StaticSettingTab(this.app, this));
	}

	onunload() {}

	/**
	 * Processes the notes and uploads them to the specified S3 bucket.
	 */
	async process() {
		this.uploader = new Uploader(this.settings);

		this.allTFiles = this.app.vault.getFiles();
		const validRe = await Promise.all(
			this.allTFiles.map((post) => this.ValidatePost(post))
		);
		this.postsOb = validRe.filter((post) => post !== null) as Post[];
		const postHandler = new PostHandler(
			this.allTFiles,
			this.postsOb,
			this.settings,
			this.app.vault
		);
		const postsHexo = await postHandler.normalize();

		new Notice(`Process complete,\n Start uploading (${postsHexo.length})`);

		await this.uploader.upload(postsHexo);
		new Notice("Upload complete");
	}

	async ValidatePost(tFile: TFile): Promise<Post | null> {
		if (tFile.extension !== "md") return null;
		let noteContent = await this.app.vault.cachedRead(tFile);
		const frontmatter = await this.getFrontmatter(noteContent);
		if (frontmatter?.published === true) {
			return {
				tFile: tFile,
				frontmatter: frontmatter,
				article: noteContent.split("---").slice(2).join("---"),
			};
		}
		return null;
	}

	async getFrontmatter(noteContent: string): Promise<Frontmatter | null> {
		if (!noteContent.startsWith("---")) return null;

		const frontmatterText = noteContent.split("---")[1];
		return YAML.parse(frontmatterText) as Frontmatter;
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

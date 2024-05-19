import { Notice, Plugin, TFile } from "obsidian";
import { Frontmatter, Post, StaticExporterSettings } from "@/type";
import { DEFAULT_SETTINGS, Ob2StaticSettingTab } from "@/Settings";
import { triggerGitHubDispatchEvent } from "@/trigger";
import PostHandler from "@/PostHandle";
import Uploader from "@/Upload";

export default class Ob2StaticPlugin extends Plugin {
	settings: StaticExporterSettings;

	async onload(): Promise<void> {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
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
				await this.process(tFiles);
			},
		);
		this.addRibbonIcon(
			"folder-up",
			"All validate files - Static Site MD Export",
			async () => {
				// Called when the user clicks the icon.
				new Notice("Starting process");
				const tFiles = this.app.vault.getFiles();
				await this.process(tFiles);
			},
		);
		this.addRibbonIcon("play-square", "Trigger GitHub Action deploy", () => {
			// Called when the user clicks the icon.
			triggerGitHubDispatchEvent(
				this.settings.build.webhook_token,
				this.settings.build.user,
				this.settings.build.repo,
				this.settings.build.event_type,
			);
			new Notice("Sent GitHub Action deploy Webhook");
		}).setAttribute("id", "rb-sse-deploy-icon");

		if (!this.settings.build.enable) {
			// Don't know why i need to use setTimeout to remove the icon
			setTimeout(() => {
				document.getElementById("rb-sse-deploy-icon")?.remove();
			}, 100);
		}

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new Ob2StaticSettingTab(this.app, this));
	}

	// eslint-disable-next-line @typescript-eslint/no-empty-function -- This is a required function
	onunload(): void {}

	/**
	 * Processes the notes and uploads them to the specified S3 bucket.
	 */
	async process(tFiles: TFile[]): Promise<void> {
		const uploader = new Uploader(this.app, this.settings);

		const validRe = await Promise.all(
			tFiles.map((post) => this.ValidatePost(post)),
		);
		const postsOb = validRe.filter((post) => post !== null) as Post[];
		if (postsOb.length === 0) {
			new Notice("No valid posts found");
			return;
		}
		const postHandler = new PostHandler(
			tFiles,
			postsOb,
			this.settings,
			this.app.vault,
		);
		const postsHexo = await postHandler.normalize();

		new Notice(`Process complete,\n Start uploading (${postsHexo.length})`);

		await uploader.upload(postsHexo);
		new Notice("Upload complete");
	}

	async ValidatePost(tFile: TFile): Promise<Post | null> {
		if (tFile.extension !== "md") return null;
		const noteContent = await this.app.vault.cachedRead(tFile);
		const frontmatter = this.app.metadataCache.getFileCache(tFile)
			?.frontmatter as Frontmatter;
		if (frontmatter?.published === true) {
			return {
				tFile: tFile,
				frontmatter: frontmatter,
				article: noteContent.split("---").slice(2).join("---"),
			};
		}
		return null;
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}

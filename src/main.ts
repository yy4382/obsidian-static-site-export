import { Notice, Plugin, TFile } from "obsidian";
import { StaticExporterSettings } from "@/type";
import { DEFAULT_SETTINGS, Ob2StaticSettingTab } from "@/Settings";

// import Uploader from "@/Upload";
import { transform } from "./transform";

import { gitUpload } from "@/upload/git";

export default class Ob2StaticPlugin extends Plugin {
	settings: StaticExporterSettings;

	async onload(): Promise<void> {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		// this.addRibbonIcon(
		// 	"file-up",
		// 	"Current file - Static Site MD Export",
		// 	async () => {
		// 		// Called when the user clicks the icon.
		// 		new Notice("Starting process");
		// 		const tFiles = [this.app.workspace.getActiveFile() as TFile];
		// 		if (tFiles[0] === null) {
		// 			new Notice("No file active");
		// 			return;
		// 		}
		// 		await this.process(tFiles);
		// 	},
		// );
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
				const posts = await transform(tFiles, { app: this.app });

				console.log(posts[0].content, posts[0].meta);
				await gitUpload(posts, this.settings.uploader.git);
			},
		);
		// this.addRibbonIcon(
		// 	"folder-up",
		// 	"All validate files - Static Site MD Export",
		// 	async () => {
		// 		// Called when the user clicks the icon.
		// 		new Notice("Starting process");
		// 		const tFiles = this.app.vault.getFiles();
		// 		await this.process(tFiles);
		// 	},
		// );

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new Ob2StaticSettingTab(this.app, this));
	}

	onunload(): void {}

	/**
	 * Processes the notes and uploads them to the specified S3 bucket.
	 */
	// async process(tFiles: TFile[]): Promise<void> {
	// 	const uploader = new Uploader(this.app, this.settings);

	// 	const validRe = await Promise.all(
	// 		tFiles.map((post) => this.ValidatePost(post)),
	// 	);
	// 	const postsOb = validRe.filter((post) => post !== null) as Post[];
	// 	if (postsOb.length === 0) {
	// 		new Notice("No valid posts found");
	// 		return;
	// 	}
	// 	const postHandler = new PostHandler(
	// 		tFiles,
	// 		postsOb,
	// 		this.settings,
	// 		this.app.vault,
	// 	);
	// 	const postsHexo = await postHandler.normalize();

	// 	new Notice(`Process complete,\n Start uploading (${postsHexo.length})`);

	// 	await uploader.upload(postsHexo);
	// 	new Notice("Upload complete");
	// }

	// async ValidatePost(tFile: TFile): Promise<Post | null> {
	// 	if (tFile.extension !== "md") return null;
	// 	const noteContent = await this.app.vault.cachedRead(tFile);
	// 	const frontmatter = this.app.metadataCache.getFileCache(tFile)
	// 		?.frontmatter as Frontmatter;
	// 	if (frontmatter?.published === true) {
	// 		return {
	// 			tFile: tFile,
	// 			frontmatter: frontmatter,
	// 			article: noteContent.split("---").slice(2).join("---"),
	// 		};
	// 	}
	// 	return null;
	// }

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}

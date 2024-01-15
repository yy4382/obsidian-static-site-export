import {Notice, Plugin, TFile} from "obsidian";
import * as YAML from "yaml";
import {PutObjectCommand, S3Client,} from "@aws-sdk/client-s3";
import {DEFAULT_SETTINGS, Ob2StaticSettingTab} from "src/Settings";
import {triggerGitHubDispatchEvent} from "src/trigger";
import {Frontmatter, Post, StaticExporterSettings} from "src/type";
import {PostHandler} from "./PostHandle";


export default class Ob2StaticPlugin extends Plugin {
	settings: StaticExporterSettings;
	allTFiles: TFile[];
	client: S3Client;
	postsOb: Post[];

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
				// triggerGitHubDispatchEvent(this.settings.webhook_token, this.settings.user, this.settings.repo, this.settings.event_type)
			}
		);
		this.addRibbonIcon(
			"play-square",
			"Trigger GitHub Action deploy",
			(evt: MouseEvent) => {
				// Called when the user clicks the icon.
				triggerGitHubDispatchEvent(
					this.settings.webhook_token,
					this.settings.user,
					this.settings.repo,
					this.settings.event_type
				);
				new Notice("Sent GitHub Action deploy Webhook");
			}
		);

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: "trigger-static-export",
			name: "Trigger Static Export",
			callback: () => {
				this.process();
			},
		});

		this.addCommand({
			id: "trigger-github-dispatch-event",
			name: "Trigger GitHub Action build",
			callback: () => {
				triggerGitHubDispatchEvent(
					this.settings.webhook_token,
					this.settings.user,
					this.settings.repo,
					this.settings.event_type
				);
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new Ob2StaticSettingTab(this.app, this));
	}

	onunload() {
	}

	/**
	 * Processes the notes and uploads them to the specified S3 bucket.
	 */
	async process() {
		this.client = new S3Client({
			endpoint: this.settings.endpoint,
			// forcePathStyle: true,
			region: this.settings.region,
			credentials: {
				accessKeyId: this.settings.access_key_id,
				secretAccessKey: this.settings.secret_access_key,
			},
		});


		this.allTFiles = this.app.vault.getFiles();
		const validRe = await Promise.all(
			this.allTFiles.map((post) => this.ValidatePost(post))
		);
		this.postsOb = validRe.filter((post) => post !== null) as Post[];
		const postHandler = new PostHandler(this.settings, this.allTFiles, this.client, this.app.vault);
		const postsHexo = await postHandler.normalize(this.postsOb);
		console.log(postsHexo);


		new Notice(
			`Process complete,\n Start uploading (${postsHexo.length})`
		);

		await Promise.all(postsHexo.map((post) => this.upload(post)));
		new Notice("Upload complete");

		this.client.destroy();
	}

	/**
	 * Uploads a post to the specified bucket.
	 * @param post - The post object containing the file, frontmatter, and article content.
	 * @throws Error if there is an error while uploading the post.
	 */
	async upload(post: Post) {
		const postContent =
			`---\n` +
			YAML.stringify(post.frontmatter) +
			`---\n\n` +
			post.article;
		const filename =
			"slug" in post.frontmatter
				? post.frontmatter.slug
				: post.tFile.basename;
		const config = {
			Bucket: this.settings.bucket,
			Key: `posts/${filename}.md`,
			Body: postContent,
			ContentType: "text/markdown",
		};
		try {
			const data = await this.client.send(new PutObjectCommand(config));
			if (
				data.$metadata.httpStatusCode &&
				data.$metadata.httpStatusCode >= 200 &&
				data.$metadata.httpStatusCode < 300
			) {
			} else {
				// HTTP status code is not in the 2xx range, indicating an error
				console.log(data.$metadata.httpStatusCode);
				new Notice("Error while uploading post");
				throw new Error("Error while uploading post");
			}
		} catch (err) {
			console.log(err);
			new Notice("Error while uploading post");
			throw new Error("Error while uploading post");
		}
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
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

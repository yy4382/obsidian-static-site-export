import { Notice, Plugin, TFile } from 'obsidian';
import * as YAML from 'yaml';
import { S3Client, GetObjectCommand, NoSuchKey, PutObjectCommand, ListObjectsCommand } from "@aws-sdk/client-s3";
import * as crypto from 'crypto';
import axios from 'axios';
import { StaticExporterSettings, DEFAULT_SETTINGS, Ob2StaticSettingTab } from 'src/Settings';
import {triggerGitHubDispatchEvent} from 'src/trigger'

function hashArrayBuffer(arrayBuffer: ArrayBuffer) {
	const hash = crypto.createHash('sha256');
	hash.update(Buffer.from(arrayBuffer));
	return hash.digest('hex');
}



export default class Ob2StaticPlugin extends Plugin {
	settings: PostProcessSettings;
	postsTFiles: TFile[];
	allTFiles: TFile[];
	client: S3Client;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		this.addRibbonIcon('file-up', 'Static Site MD Export', async (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('Starting process');
			await this.process();
			// triggerGitHubDispatchEvent(this.settings.webhook_token, this.settings.user, this.settings.repo, this.settings.event_type)
		});
		this.addRibbonIcon('play-square', 'Trigger GitHub Action deploy', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			triggerGitHubDispatchEvent(this.settings.webhook_token, this.settings.user, this.settings.repo, this.settings.event_type)
			new Notice('Sended GitHub Action deploy Webhook');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		// const statusBarItemEl = this.addStatusBarItem();
		// statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'trigger-static-export',
			name: 'Trigger Static Export',
			callback: () => {
				this.process();
			}
		});

		this.addCommand({
			id: 'trigger-github-dispatch-event',
			name: 'Trigger GitHub Action deploy',
			callback: () => {
				triggerGitHubDispatchEvent(this.settings.webhook_token, this.settings.user, this.settings.repo, this.settings.event_type)
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		// this.addCommand({
		// 	id: 'sample-editor-command',
		// 	name: 'Sample editor command',
		// 	editorCallback: (editor: Editor, view: MarkdownView) => {
		// 		console.log(editor.getSelection());
		// 		editor.replaceSelection('Sample Editor Command');
		// 	}
		// });
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		// this.addCommand({
		// 	id: 'open-sample-modal-complex',
		// 	name: 'Open sample modal (complex)',
		// 	checkCallback: (checking: boolean) => {
		// 		// Conditions to check
		// 		const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
		// 		if (markdownView) {
		// 			// If checking is true, we're simply "checking" if the command can be run.
		// 			// If checking is false, then we want to actually perform the operation.
		// 			if (!checking) {
		// 				new SampleModal(this.app).open();
		// 			}

		// 			// This command will only show up in Command Palette when the check function returns true
		// 			return true;
		// 		}
		// 	}
		// });

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new Ob2StaticSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		// this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
		// 	console.log('click', evt);
		// });

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		// this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async process() {
		this.client = new S3Client({
			endpoint: this.settings.endpoint,
			// forcePathStyle: true,
			region: this.settings.region,
			credentials: {
				accessKeyId: this.settings.access_key_id,
				secretAccessKey: this.settings.secret_access_key
			}
		});
		this.allTFiles = this.app.vault.getFiles();
		let posts_ob = await this.validateNote();
		let posts_hexo: { tFile: TFile; frontmatter: { tags: string[] | string, plink: string, title: string }; article: string; }[] = [];

		// Parallel processing of each element in posts_ob
		await Promise.all(posts_ob.map(async (post) => {
			const processedPost = await this.handlings(post);
			posts_hexo.push(processedPost);
		}));

		console.log(posts_hexo);
		new Notice("Process complete, Start uploading (" + posts_hexo.length + ")")
		await Promise.all(posts_hexo.map(async post => {
			await this.upload(post)
		}))
		new Notice("Upload complete")

		this.client.destroy();
	}
	async upload(post: { tFile: TFile; frontmatter: { tags: string[] | string, plink: string, title: string }; article: string; }) {
		const postContent = `---\n` + YAML.stringify(post.frontmatter) + `---\n\n` + post.article
		const filename = 'plink' in post.frontmatter ? post.frontmatter.plink : post.tFile.basename
		const config = {
			Bucket: this.settings.bucket,
			Key: `posts/${filename}.md`,
			Body: postContent,
			ContentType: 'text/markdown'
		}
		try {
			const data = await this.client.send(new PutObjectCommand(config))
			if (data.$metadata.httpStatusCode && data.$metadata.httpStatusCode >= 200 && data.$metadata.httpStatusCode < 300) {
			} else {
				// HTTP status code is not in the 2xx range, indicating an error
				console.log(data.$metadata.httpStatusCode);
				new Notice("Error while uploading post")
				throw new Error("Error while uploading post")
			}
		} catch (err) {
			console.log(err)
			new Notice("Error while uploading post")
			throw new Error("Error while uploading post")
		}
	}

	async handlings(post: { tFile: TFile; frontmatter: { tags: string[] | string, plink: string, title: string }; article: string; }) {
		post.article = await this.handleLinks(post);
		post.frontmatter = await this.handleTags(post.frontmatter);
		return post;
	}
	async handleLinks(post: { tFile: TFile; frontmatter: {}; article: string; }) {
		let article = post.article.replace(/^\n*# .*\n*/, '');
		// article = article.replace(/(?:\s|^)(#\S+)(?:\s|$)/g,'');
		const regex = /(!?)\[\[([^\]]+)\]\]/g;
		/*
		link[0]: [[abc]] or ![[abc]]
		link[1]: "" or "!"
		link[2]: "abc"
		*/
		const links = [...article.matchAll(regex)];

		for (const link of links) {
			const pattern = /^([^#|]*)(?:#([^|]*))?(?:\|(.+))?$/;
			/*
			matches[0]: "abc#ee|ff"
			matches[1]: abc | undefined
			matches[2]: ee | undefined
			matches[3]: ff | undefined
			*/
			const matches = link[2].match(pattern);


			if (matches === null) {
				new Notice("Invalid link " + link[0])
				throw new Error("Invalid link " + link[0])
			}

			const linkNote = await this.findNote(matches[1])
			if (!linkNote) {
				new Notice(`file not found for ${link[0]}`);
				continue;
			}
			const file = linkNote.file;
			if (linkNote.type === 2) {

				const linkContent = await this.app.vault.cachedRead(file);
				const linkFrontmatter = await this.getYaml(linkContent);
				const plink = linkFrontmatter.plink + (matches[2] ? `#${matches[2]}` : '');
				const linkTitle = matches[3] ? matches[3] : (matches[2] ? linkFrontmatter.title + "#" + matches[2] : linkFrontmatter.title);
				article = article.replace(link[0], `[${linkTitle}](/post/${plink})`);
			} else if (linkNote.type === 1) {
				const linkTitle = matches[3] ? matches[3] : link[2];
				article = article.replace(link[0], link[2]);
			} else if (linkNote.type === 0) {
				let image_url = await this.handleImage(linkNote.file);
				article = article.replace(link[0], `![image](${image_url})`)
			}

		}

		return article;
	}
	async handleTags(frontmatter: { tags: string[] | string, plink: string, title: string }) {
		if (!("tags" in frontmatter)) return frontmatter
		let tags = frontmatter.tags
		if (typeof tags === 'string') {
			if (tags.indexOf("/") == 0) return frontmatter
			frontmatter.tags = tags.split("/")[-1]
			return frontmatter
		} else if (Array.isArray(tags)) {
			let newTags: string[] = []
			for (let tag of tags) {
				// console.log(tag.split("/")[tag.split("/").length-1])
				newTags.push(tag.split("/")[tag.split("/").length - 1])
			}
			// console.log(newTags)
			frontmatter.tags = newTags
		}
		return frontmatter
	}

	async validateNote(): Promise<{ tFile: TFile; frontmatter: { tags: string[] | string, plink: string, title: string }; article: string; }[]> {
		let posts: { tFile: TFile; frontmatter: { tags: string[] | string, plink: string, title: string }; article: string; }[] = [];
		this.postsTFiles = []; // Initialize the postsTFiles array
		await Promise.all(
			this.allTFiles.map(async (note) => {
				if (note.extension !== "md") return;
				let noteContent = await this.app.vault.cachedRead(note);
				const frontmatter = await this.getYaml(noteContent);
				if (frontmatter?.published === true) {
					this.postsTFiles.push(note);
					posts.push({ tFile: note, frontmatter: frontmatter, article: noteContent.split("---").slice(2).join("---") });
				}
			})
		);
		return posts;
	}

	async getYaml(noteContent: string) {
		if (noteContent.indexOf("---") != 0) return null;

		const frontmatterText = noteContent.split("---")[1];
		const frontmatter = YAML.parse(frontmatterText);
		return frontmatter;
	}
	async handleImage(file: TFile) {
		// return ""
		let images: { hash: string, url: string }[] = []
		const params = {
			Bucket: this.settings.bucket,
			Key: "images.json",
		}
		try {
			const data = await this.client.send(new GetObjectCommand(params))
			const dataBody = await data.Body?.transformToString()
			if (dataBody) {

				images = JSON.parse(dataBody)
			}

		} catch (err) {
			console.log(err);
			if (!(err instanceof NoSuchKey)) {
				new Notice("Error while fetching images.json")
				throw new Error("Error while fetching images.json")
			}

		}

		let fileContent = await this.app.vault.readBinary(file);
		let image_hash = hashArrayBuffer(fileContent);


		for (let image of images) {
			if (image.hash === image_hash) {
				return image.url;
			}
		}

		const image_url = await this.uploadEasyImage(file);
		images.push({ hash: image_hash, url: image_url });
		const updateParams = {
			Bucket: this.settings.bucket,
			Key: "images.json",
			Body: JSON.stringify(images),
			ContentType: 'application/json'
		}
		this.client.send(new PutObjectCommand(updateParams)).catch(err => {
			new Notice("Error while updating images.json")
			throw new Error("Error while updating images.json")
		})
		return image_url
	}
	async uploadEasyImage(tfile: TFile): Promise<string> {
		let imgBuf = await this.app.vault.readBinary(tfile);
		const blob = new Blob([imgBuf], { type: `image/${tfile.extension}` });

		const form = new FormData();
		form.append('token', this.settings.easyimage_api_key);
		form.append('image', blob, tfile.basename);

		try {
			const response = await axios.post("https://i.yfi.moe/api/index.php", form)
			return response.data.url;
		} catch (err) {
			throw new Error("Error while uploading image")
		};
	}
	async findNote(link: string): Promise<{ file: TFile; type: number } | null> {
		for (const post of this.postsTFiles) {
			if (post.basename === link)
				return { file: post, type: 2 };
		}
		for (const file of this.allTFiles) {
			if (link.split(".")[0] === file.basename) {
				if (file.extension === "md") return { file: file, type: 1 };
				else return { file: file, type: 0 };
			}
		}
		return null;
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

// class SampleModal extends Modal {
// 	constructor(app: App) {
// 		super(app);
// 	}

// 	onOpen() {
// 		const { contentEl } = this;
// 		contentEl.setText('Woah!');
// 	}

// 	onClose() {
// 		const { contentEl } = this;
// 		contentEl.empty();
// 	}
// }


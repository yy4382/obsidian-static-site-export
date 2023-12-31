import { get } from 'http';
import { App, Editor, FileManager, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, getLinkpath } from 'obsidian';
import * as YAML from 'yaml';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	postsTFiles: TFile[];
	allTFiles: TFile[];

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!111');
			this.process();
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		// const statusBarItemEl = this.addStatusBarItem();
		// statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		// this.addCommand({
		// 	id: 'open-sample-modal-simple',
		// 	name: 'Open sample modal (simple)',
		// 	callback: () => {
		// 		new SampleModal(this.app).open();
		// 	}
		// });
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
		// this.addSettingTab(new SampleSettingTab(this.app, this));

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
		this.allTFiles = this.app.vault.getFiles();
		let posts_ob = await this.validateNote();
		let posts_hexo = []
		for (let post of posts_ob) {
			posts_hexo.push(await this.handlings(post));
		}

		console.log(posts_hexo);
	}
	async handlings(post: { tFile: TFile; frontmatter: {}; article: string; }) {
		post.article = await this.handleLinks(post);
		return post;
	}
	async handleLinks(post: { tFile: TFile; frontmatter: {}; article: string; }) {
		let noteContent = post.article
		const regex = /(!?)\[\[([^\]]+)\]\]/g;
		// link[0]: [[abc]] or ![[abc]]
		// link[1]: "" or "!"
		// link[2]: "abc"
		const links = [...noteContent.split("---")[2].matchAll(regex)];

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
			console.log(matches[1])
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
				noteContent = noteContent.replace(link[0], `[${linkTitle}](/post/${plink})`);
			} else if (linkNote.type === 1) {
				const linkTitle = matches[3] ? matches[3] : link[2];
				noteContent = noteContent.replace(link[0], link[2]);
			} else if (linkNote.type === 0) {
				let image_url = await this.handleImage(linkNote.file);
				noteContent = noteContent.replace(link[0], `![image](${image_url})`)
			}

		}

		return noteContent;
	}

	async validateNote(): Promise<{ tFile: TFile; frontmatter: {}; article: string; }[]> {
		let posts = [];
		this.postsTFiles = []; // Initialize the postsTFiles array
		for (let note of this.allTFiles) {
			if (note.extension !== "md") continue;
			let noteContent = await this.app.vault.cachedRead(note);
			const frontmatter = await this.getYaml(noteContent);
			if (frontmatter?.published === true) {
				this.postsTFiles.push(note);
				posts.push({ tFile: note, frontmatter: frontmatter, article: noteContent });
			}
		}
		return posts;
	}

	async getYaml(noteContent: string) {
		if (noteContent.indexOf("---") != 0) return null;

		const frontmatterText = noteContent.split("---")[1];
		const frontmatter = YAML.parse(frontmatterText);
		return frontmatter;
	}
	async handleImage(file: TFile) {
		//!TODO
		return ""
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

// class SampleSettingTab extends PluginSettingTab {
// 	plugin: MyPlugin;

// 	constructor(app: App, plugin: MyPlugin) {
// 		super(app, plugin);
// 		this.plugin = plugin;
// 	}

// 	display(): void {
// 		const { containerEl } = this;

// 		containerEl.empty();

// 		new Setting(containerEl)
// 			.setName('Setting #1')
// 			.setDesc('It\'s a secret')
// 			.addText(text => text
// 				.setPlaceholder('Enter your secret')
// 				.setValue(this.plugin.settings.mySetting)
// 				.onChange(async (value) => {
// 					this.plugin.settings.mySetting = value;
// 					await this.plugin.saveSettings();
// 				}));
// 	}
// }

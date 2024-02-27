import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import { S3Client, ListObjectsCommand } from "@aws-sdk/client-s3";
import Ob2StaticPlugin from "@/main";
import { StaticExporterSettings } from "@/type";
import { triggerGitHubDispatchEvent } from "./trigger";
import Uploader from "./Upload";

export const DEFAULT_SETTINGS: StaticExporterSettings = {
	post_prefix: "post/",
	easyimage_api_endpoint: "",
	easyimage_api_key: "",
	build: {
		enable: false,
		repo: "",
		user: "",
		webhook_token: "",
		event_type: "",
	},
	uploader: {
		type: "git",
		git: {
			repo: "",
			branch: "",
			username: "",
			pat: "",
			author: {
				name: "Obsidian Exporter",
				email: "",
			},
			commit_message: "upd",
		},
		s3: {
			endpoint: "",
			region: "",
			bucket: "",
			access_key_id: "",
			secret_access_key: "",
		},
	},
};

export class Ob2StaticSettingTab extends PluginSettingTab {
	plugin: Ob2StaticPlugin;
	settings: StaticExporterSettings;

	constructor(app: App, plugin: Ob2StaticPlugin) {
		super(app, plugin);
		this.plugin = plugin;
		this.settings = plugin.settings;
	}

	display(): void {
		const settings = this.plugin.settings;
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl).setHeading().setName("Post Uploader");

		new Setting(containerEl)
			.setName("Uploader type")
			.addDropdown((dropdown) => {
				dropdown
					.addOption("git", "Git")
					.addOption("s3", "S3 or S3 capable")
					.setValue(settings.uploader.type)
					.onChange(async (value) => {
						settings.uploader.type = value;
						await this.plugin.saveSettings();
						this.display();
					});
			});

		if (settings.uploader.type === "s3") {
			new Setting(containerEl)
				// .setDisabled(settings.uploader.type !== "s3")
				.setName("Endpoint")
				.setDesc("Don't put bucket name in it.")
				.addText((text) =>
					text
						.setPlaceholder("endpoint")
						.setValue(settings.uploader.s3.endpoint)
						.onChange(async (value) => {
							settings.uploader.s3.endpoint = value;
							await this.plugin.saveSettings();
						})
				);

			new Setting(containerEl)
				.setName("Region")
				.setDesc("Try us-east-1 if you don't know.")
				.addText((text) =>
					text
						.setPlaceholder("endpoint")
						.setValue(settings.uploader.s3.region)
						.onChange(async (value) => {
							settings.uploader.s3.region = value;
							await this.plugin.saveSettings();
						})
				);
			new Setting(containerEl)
				.setName("Bucket")
				.setDesc("Bucket name")
				.addText((text) =>
					text
						.setPlaceholder("bucket")
						.setValue(settings.uploader.s3.bucket)
						.onChange(async (value) => {
							settings.uploader.s3.bucket = value;
							await this.plugin.saveSettings();
						})
				);
			new Setting(containerEl)
				.setName("Access key ID")
				.addText((text) =>
					text
						.setPlaceholder("access_key_id")
						.setValue(settings.uploader.s3.access_key_id)
						.onChange(async (value) => {
							settings.uploader.s3.access_key_id = value;
							await this.plugin.saveSettings();
						})
				);
			new Setting(containerEl)
				.setName("Secret access key")
				.addText((text) =>
					text
						.setPlaceholder("secret_access_key")
						.setValue(settings.uploader.s3.secret_access_key)
						.onChange(async (value) => {
							settings.uploader.s3.secret_access_key = value;
							await this.plugin.saveSettings();
						})
				);
			new Setting(containerEl)
				.setName("Test")
				.setDesc("Test S3 API connection.")
				.addButton((button) =>
					button.setButtonText("Test").onClick(async () => {
						const client = new S3Client({
							endpoint: settings.uploader.s3.endpoint,
							// forcePathStyle: true,
							region: settings.uploader.s3.region,
							credentials: {
								accessKeyId: settings.uploader.s3.access_key_id,
								secretAccessKey: settings.uploader.s3.secret_access_key,
							},
						});
						try {
							const data = await client.send(
								new ListObjectsCommand({ Bucket: settings.uploader.s3.bucket })
							);
							if (
								data.$metadata.httpStatusCode &&
								data.$metadata.httpStatusCode >= 200 &&
								data.$metadata.httpStatusCode < 300
							) {
								new Notice("Test success");
							} else {
								// HTTP status code is not in the 2xx range, indicating an error
								console.error(
									"HTTP status code is not in the 2xx range, but" +
										data.$metadata.httpStatusCode
								);
								new Notice("Test failed");
							}
						} catch (err) {
							console.error(err);
							new Notice("Test failed");
						}
					})
				);
		}
		if (settings.uploader.type === "git") {
			new Setting(containerEl)
				.setName("Repo link")
				.setDesc("Full URL of the git repository")
				.addText((text) =>
					text.setValue(settings.uploader.git.repo).onChange(async (value) => {
						settings.uploader.git.repo = value;
						await this.plugin.saveSettings();
					})
				);

			new Setting(containerEl)
				.setName("Branch")
				.setDesc("Branch name")
				.addText((text) =>
					text
						.setValue(settings.uploader.git.branch)
						.onChange(async (value) => {
							settings.uploader.git.branch = value;
							await this.plugin.saveSettings();
						})
				);

			new Setting(containerEl).setName("GitHub username").addText((text) =>
				text
					.setValue(settings.uploader.git.username)
					.onChange(async (value) => {
						settings.uploader.git.username = value;
						await this.plugin.saveSettings();
					})
			);
			new Setting(containerEl)
				.setName("GitHub personal access token")
				.setDesc("Password when 'git login'")
				.addText((text) =>
					text.setValue(settings.uploader.git.pat).onChange(async (value) => {
						settings.uploader.git.pat = value;
						await this.plugin.saveSettings();
					})
				);
			new Setting(containerEl).setName("Git commit message").addText((text) =>
				text
					.setValue(settings.uploader.git.commit_message)
					.onChange(async (value) => {
						settings.uploader.git.commit_message = value;
						await this.plugin.saveSettings();
					})
			);
			new Setting(containerEl)
				.setName("Author name")
				.setDesc("Used as 'git config user.name'")
				.addText((text) =>
					text
						.setValue(settings.uploader.git.author.name)
						.onChange(async (value) => {
							settings.uploader.git.author.name = value;
							await this.plugin.saveSettings();
						})
				);
			new Setting(containerEl)
				.setName("Author email")
				.setDesc("Used as 'git config user.email'")
				.addText((text) =>
					text
						.setValue(settings.uploader.git.author.email)
						.onChange(async (value) => {
							settings.uploader.git.author.email = value;
							await this.plugin.saveSettings();
						})
				);

			new Setting(containerEl)
				.setName("Delete cache")
				.setDesc("Delete the local cache database used by git")
				.addButton((button) => {
					button.setButtonText("Delete").onClick(() => {
						Uploader.clearIndexedDB();
					});
				});
		}
		new Setting(containerEl).setHeading().setName("Post settings");
		new Setting(containerEl)
			.setName("Post prefix")
			.setDesc(
				`The prefix of the post URL with trailing slash. Default to 'post/'.
				e.g. A link to a note with slug 'abc' will be rendered as '/post/abc'.`
			)
			.addText((text) =>
				text
					.setPlaceholder("post/")
					.setValue(settings.post_prefix)
					.onChange(async (value) => {
						settings.post_prefix = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl).setHeading().setName("Easyimage API");

		new Setting(containerEl)
			.setName("Easyimage API endpoint")
			.setDesc("Should look like https://example.com/api/index.php")
			.addText((text) =>
				text
					.setPlaceholder("https://example.com/api/index.php")
					.setValue(settings.easyimage_api_endpoint)
					.onChange(async (value) => {
						settings.easyimage_api_endpoint = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl).setName("Easyimage API key").addText((text) =>
			text
				.setPlaceholder("easyimage_api_key")
				.setValue(settings.easyimage_api_key)
				.onChange(async (value) => {
					settings.easyimage_api_key = value;
					await this.plugin.saveSettings();
				})
		);

		new Setting(containerEl)
			.setHeading()
			.setName("Deploy webhook")
			.setDesc("Trigger a GitHub Action to run.");

		new Setting(containerEl)
			.setName("Enable webhook deploy")
			.addToggle((toggle) =>
				toggle.setValue(settings.build.enable).onChange(async (value) => {
					settings.build.enable = value;
					await this.plugin.saveSettings();
					if (settings.build.enable) {
						this.plugin
							.addRibbonIcon(
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
									new Notice("Sent GitHub Action deploy webhook");
								}
							)
							.setAttribute("id", "rb-sse-deploy-icon");
					} else {
						document.getElementById("rb-sse-deploy-icon")?.remove();
					}
					this.display();
				})
			);
		if (settings.build.enable) {
			new Setting(containerEl).setName("Github username").addText((text) =>
				text
					.setPlaceholder("username")
					.setValue(settings.build.user)
					.onChange(async (value) => {
						settings.build.user = value;
						await this.plugin.saveSettings();
					})
			);
			new Setting(containerEl).setName("Github repo").addText((text) =>
				text
					.setPlaceholder("easyimage_api_key")
					.setValue(settings.build.repo)
					.onChange(async (value) => {
						settings.build.repo = value;
						await this.plugin.saveSettings();
					})
			);
			new Setting(containerEl).setName("Github webhook token").addText((text) =>
				text
					.setPlaceholder("github_webhook_token")
					.setValue(settings.build.webhook_token)
					.onChange(async (value) => {
						settings.build.webhook_token = value;
						await this.plugin.saveSettings();
					})
			);
			new Setting(containerEl)
				.setName("Github webhook event type")
				.addText((text) =>
					text
						.setPlaceholder("github_webhook_event_type")
						.setValue(settings.build.event_type)
						.onChange(async (value) => {
							settings.build.event_type = value;
							await this.plugin.saveSettings();
						})
				);
		}
	}
}

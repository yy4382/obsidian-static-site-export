import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import { S3Client, ListObjectsCommand } from "@aws-sdk/client-s3";
import Ob2StaticPlugin from "@/main";
import { StaticExporterSettings } from "@/type";

export const DEFAULT_SETTINGS: StaticExporterSettings = {
	easyimage_api_endpoint: "https://yourdomain/api/index.php",
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
			.setName("Uploader Type")
			.addDropdown((dropdown) => {
				dropdown
					.addOption("git", "Git")
					.addOption("s3", "S3")
					.setValue(settings.uploader.type)
					.onChange(async (value) => {
						settings.uploader.type = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setHeading()
			.setName("S3 Post Uploader")
			.setDesc("Or S3 compatible API");

		console.log(settings.uploader.s3.endpoint);
		new Setting(containerEl)
			// .setDisabled(settings.uploader.type !== "s3")
			.setName("S3 API ENDPOINT")
			.setDesc("no bucket name in it")
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
			.setName("S3 API Region")
			.setDesc("us-east-1")
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
			.setName("S3 API Bucket")
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
			.setName("S3 API Access Key ID")
			.setDesc("Access Key ID")
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
			.setName("S3 API Secret Access Key")
			.setDesc("Secret Access Key")
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
			.setName("S3 API Test")
			.setDesc("Test S3 API")
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
							console.log(data.$metadata.httpStatusCode);
							new Notice("Test failed");
						}
					} catch (err) {
						console.log(err);
						new Notice("Test failed");
					}
				})
			);

		new Setting(containerEl).setHeading().setName("Git Post Uploader");

		new Setting(containerEl)
			.setName("Git Repo")
			.setDesc("Full URL of the git repository")
			.addText((text) =>
				text.setValue(settings.uploader.git.repo).onChange(async (value) => {
					settings.uploader.git.repo = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Git Branch")
			.setDesc("Branch name")
			.addText((text) =>
				text.setValue(settings.uploader.git.branch).onChange(async (value) => {
					settings.uploader.git.branch = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl).setName("Git Username").addText((text) =>
			text.setValue(settings.uploader.git.username).onChange(async (value) => {
				settings.uploader.git.username = value;
				await this.plugin.saveSettings();
			})
		);
		new Setting(containerEl)
			.setName("Git Personal Access Token")
			.setDesc("Password when 'git login'")
			.addText((text) =>
				text.setValue(settings.uploader.git.pat).onChange(async (value) => {
					settings.uploader.git.pat = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl).setHeading().setName("Easyimage API");

		new Setting(containerEl)
			.setName("Easyimage API endpoint")
			.setDesc("https://yourdomain/api/index.php")
			.addText((text) =>
				text
					.setPlaceholder("https://yourdomain/api/index.php")
					.setValue(settings.easyimage_api_endpoint)
					.onChange(async (value) => {
						settings.easyimage_api_endpoint = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl).setName("Easyimage API Key").addText((text) =>
			text
				.setPlaceholder("easyimage_api_key")
				.setValue(settings.easyimage_api_key)
				.onChange(async (value) => {
					settings.easyimage_api_key = value;
					await this.plugin.saveSettings();
				})
		);

		new Setting(containerEl).setHeading().setName("Deploy Webhook");

		new Setting(containerEl)
			.setName("Enable Webhook Deploy")
			.setDesc("Reload this plugin to take effect")
			.addToggle((toggle) =>
				toggle.setValue(settings.build.enable).onChange(async (value) => {
					settings.build.enable = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl).setName("Github User").addText((text) =>
			text
				.setPlaceholder("username")
				.setValue(settings.build.user)
				.onChange(async (value) => {
					settings.build.user = value;
					await this.plugin.saveSettings();
				})
		);
		new Setting(containerEl).setName("Github Repo").addText((text) =>
			text
				.setPlaceholder("easyimage_api_key")
				.setValue(settings.build.repo)
				.onChange(async (value) => {
					settings.build.repo = value;
					await this.plugin.saveSettings();
				})
		);
		new Setting(containerEl).setName("Github Webhook Token").addText((text) =>
			text
				.setPlaceholder("github_webhook_token")
				.setValue(settings.build.webhook_token)
				.onChange(async (value) => {
					settings.build.webhook_token = value;
					await this.plugin.saveSettings();
				})
		);
		new Setting(containerEl)
			.setName("Github Webhook Event Type")
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

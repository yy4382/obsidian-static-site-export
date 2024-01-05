import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import { S3Client, GetObjectCommand, NoSuchKey, PutObjectCommand, ListObjectsCommand } from "@aws-sdk/client-s3";
import Ob2StaticPlugin from 'src/main';


export interface PostProcessSettings {
    endpoint: string;
    region: string;
    bucket: string;
    access_key_id: string;
    secret_access_key: string;
    easyimage_api_endpoint: string;
    easyimage_api_key: string;
    repo: string;
    user: string;
    webhook_token: string;
    event_type: string;
}

export const DEFAULT_SETTINGS: StaticExporterSettings = {
    endpoint: '',
    region: 'us-east-1',
    bucket: '',
    access_key_id: '',
    secret_access_key: '',
    easyimage_api_endpoint: 'https://yourdomain/api/index.php',
    easyimage_api_key: '',
    repo: '',
    user: '',
    webhook_token: '',
    event_type: '',
}

export class Ob2StaticSettingTab extends PluginSettingTab {
    plugin: Ob2StaticPlugin;

    constructor(app: App, plugin: Ob2StaticPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        new Setting(containerEl)
            .setName('S3 API ENDPOINT')
            .setDesc('no bucket name in it')
            .addText(text => text
                .setPlaceholder('endpoint')
                .setValue(this.plugin.settings.endpoint)
                .onChange(async (value) => {
                    this.plugin.settings.endpoint = value;
                    await this.plugin.saveSettings();
                }));
        new Setting(containerEl)
            .setName('S3 API Region')
            .setDesc('us-east-1')
            .addText(text => text
                .setPlaceholder('endpoint')
                .setValue(this.plugin.settings.region)
                .onChange(async (value) => {
                    this.plugin.settings.endpoint = value;
                    await this.plugin.saveSettings();
                }));
        new Setting(containerEl)
            .setName('S3 API Bucket')
            .setDesc('Bucket name')
            .addText(text => text
                .setPlaceholder('bucket')
                .setValue(this.plugin.settings.bucket)
                .onChange(async (value) => {
                    this.plugin.settings.bucket = value;
                    await this.plugin.saveSettings();
                }));
        new Setting(containerEl)
            .setName('S3 API Access Key ID')
            .setDesc('Access Key ID')
            .addText(text => text
                .setPlaceholder('access_key_id')
                .setValue(this.plugin.settings.access_key_id)
                .onChange(async (value) => {
                    this.plugin.settings.access_key_id = value;
                    await this.plugin.saveSettings();
                }));
        new Setting(containerEl)
            .setName('S3 API Secret Access Key')
            .setDesc('Secret Access Key')
            .addText(text => text
                .setPlaceholder('secret_access_key')
                .setValue(this.plugin.settings.secret_access_key)
                .onChange(async (value) => {
                    this.plugin.settings.secret_access_key = value;
                    await this.plugin.saveSettings();
                }));
        new Setting(containerEl)
            .setName('S3 API Test')
            .setDesc('Test S3 API')
            .addButton(button => button
                .setButtonText('Test')
                .onClick(async () => {
                    const client = new S3Client({
                        endpoint: this.plugin.settings.endpoint,
                        // forcePathStyle: true,
                        region: this.plugin.settings.region,
                        credentials: {
                            accessKeyId: this.plugin.settings.access_key_id,
                            secretAccessKey: this.plugin.settings.secret_access_key
                        }
                    });
                    try {
                        const data = await client.send(new ListObjectsCommand({ Bucket: this.plugin.settings.bucket }));
                        if (data.$metadata.httpStatusCode && data.$metadata.httpStatusCode >= 200 && data.$metadata.httpStatusCode < 300) {
                            new Notice("Test success")
                        } else {
                            // HTTP status code is not in the 2xx range, indicating an error
                            console.log(data.$metadata.httpStatusCode);
                            new Notice("Test failed")
                        }
                    } catch (err) {
                        console.log(err)
                        new Notice("Test failed")
                    }
                }));
        new Setting(containerEl)
            .setHeading()
            .setName('Easyimage API')

        new Setting(containerEl)
            .setName('Easyimage API endpoint')
            .setDesc('https://yourdomain/api/index.php')
            .addText(text => text
                .setPlaceholder('https://yourdomain/api/index.php')
                .setValue(this.plugin.settings.easyimage_api_endpoint)
                .onChange(async (value) => {
                    this.plugin.settings.easyimage_api_endpoint = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Easyimage API Key')
            .addText(text => text
                .setPlaceholder('easyimage_api_key')
                .setValue(this.plugin.settings.easyimage_api_key)
                .onChange(async (value) => {
                    this.plugin.settings.easyimage_api_key = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setHeading()
            .setName('Deploy Webhook')

        new Setting(containerEl)
            .setName('Github User')
            .addText(text => text
                .setPlaceholder('username')
                .setValue(this.plugin.settings.user)
                .onChange(async (value) => {
                    this.plugin.settings.user = value;
                    await this.plugin.saveSettings();
                }));
        new Setting(containerEl)
            .setName('Github Repo')
            .addText(text => text
                .setPlaceholder('easyimage_api_key')
                .setValue(this.plugin.settings.repo)
                .onChange(async (value) => {
                    this.plugin.settings.repo = value;
                    await this.plugin.saveSettings();
                }));
        new Setting(containerEl)
            .setName('Github Webhook Token')
            .addText(text => text
                .setPlaceholder('github_webhook_token')
                .setValue(this.plugin.settings.webhook_token)
                .onChange(async (value) => {
                    this.plugin.settings.webhook_token = value;
                    await this.plugin.saveSettings();
                }));
        new Setting(containerEl)
            .setName('Github Webhook Event Type')
            .addText(text => text
                .setPlaceholder('github_webhook_event_type')
                .setValue(this.plugin.settings.event_type)
                .onChange(async (value) => {
                    this.plugin.settings.event_type = value;
                    await this.plugin.saveSettings();
                }));

    }
}

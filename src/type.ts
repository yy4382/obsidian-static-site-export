import {TFile} from "obsidian";

export interface Frontmatter {
	tags?: string[] | string;
	slug: string;
	title: string;
	published?: boolean;
}

export interface Post {
	tFile: TFile;
	frontmatter: Frontmatter;
	article: string;
}

export interface StaticExporterSettings {
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
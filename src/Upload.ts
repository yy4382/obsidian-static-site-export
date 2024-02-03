// import { clone, commit, push } from "isomorphic-git";
// import http from "isomorphic-git/http/web/";
// import { FS } from "@isomorphic-git/lightning-fs";
import * as YAML from "yaml";
import { Notice } from "obsidian";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Post, StaticExporterSettings } from "@/type";

/**
 * Every batch of upload need a uploader instance.
 *
 * Call the upload method to upload the posts.
 *
 * @param settings - The settings of the plugin.
 */
export default class Uploader {
	// private fs: FS;
	private settings: StaticExporterSettings;
	private client: S3Client;

	constructor(settings: StaticExporterSettings) {
		this.settings = settings;
		if (settings.uploader.type === "s3") {
			this.client = new S3Client({
				endpoint: settings.uploader.s3.endpoint,
				region: settings.uploader.s3.region,
				credentials: {
					accessKeyId: settings.uploader.s3.access_key_id,
					secretAccessKey: settings.uploader.s3.secret_access_key,
				},
			});
		} else if (settings.uploader.type === "git") {
			console.log("git");
			// this.fs = new FS();
		}
	}

	/**
	 * Uploads the posts to the specified destination based on the uploader type.
	 * If the uploader type is "git", it saves the posts to the file system and pushes them to the git repository.
	 * If the uploader type is "s3", it uploads each post to an S3 bucket.
	 * @param posts - The array of posts to be uploaded.
	 * @returns A Promise that resolves when the upload is complete.
	 */
	async upload(posts: Post[]): Promise<void> {
		if (this.settings.uploader.type === "git") {
			await this.save_to_fs();
			// await this.push_to_git();
		} else if (this.settings.uploader.type === "s3") {
			await Promise.all(posts.map((post) => this.upload_to_s3(post)));
		}
	}

	private async upload_to_s3(post: Post): Promise<void> {
		const postContent =
			`---\n` + YAML.stringify(post.frontmatter) + `---\n\n` + post.article;
		const filename =
			"slug" in post.frontmatter ? post.frontmatter.slug : post.tFile.basename;
		const config = {
			Bucket: this.settings.uploader.s3.bucket,
			Key: `posts/${filename}.md`,
			Body: postContent,
			ContentType: "text/markdown",
		};
		try {
			const data = await this.client.send(new PutObjectCommand(config));
			if (
				!(
					data.$metadata.httpStatusCode &&
					data.$metadata.httpStatusCode >= 200 &&
					data.$metadata.httpStatusCode < 300
				)
			) {
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
	private async save_to_fs(): Promise<void> {
		// const fs = this.fs;
		// await clone({
		// 	fs,
		// 	http,
		// 	dir: "/posts",
		// 	corsProxy: "https://cors.isomorphic-git.org",
		// 	url: this.settings.uploader.git!.repo,
		// 	ref: this.settings.uploader.git!.branch,
		// 	singleBranch: true,
		// 	depth: 1,
		// 	onAuth: () => ({
		// 		username: this.settings.uploader.git!.username,
		// 		password: this.settings.uploader.git!.pat,
		// 	}),
		// });
	}
}

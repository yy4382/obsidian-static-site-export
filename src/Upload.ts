import * as git from "isomorphic-git";
import http from "isomorphic-git/http/web/";
import FS from "@isomorphic-git/lightning-fs";
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
			await this.fs_upload(posts);
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
				console.error(
					"HTTP status code is not in the 2xx range, but " +
						data.$metadata.httpStatusCode
				);
				new Notice("Error while uploading post");
				throw new Error("Error while uploading post");
			}
		} catch (err) {
			new Notice("Error while uploading post");
			throw new Error("Error while uploading post");
		}
	}
	private async fs_upload(posts: Post[]): Promise<void> {
		const fs = new FS("fs");
		const config = this.settings.uploader.git;
		const dir = "/posts";

		new Notice("Cloning from remote...");
		await git.clone({
			fs,
			http,
			dir: dir,
			corsProxy: "https://cors.isomorphic-git.org",
			url: config.repo,
			ref: config.branch,
			singleBranch: true,
			depth: 1,
			onAuth: () => ({
				username: config.username,
				password: config.pat,
			}),
		});
		new Notice("Cloning complete");

		for (const post of posts) {
			const postContent =
				`---\n` + YAML.stringify(post.frontmatter) + `---\n\n` + post.article;
			const filename =
				"slug" in post.frontmatter
					? post.frontmatter.slug
					: post.tFile.basename;
			fs.writeFile(`${dir}/${filename}.md`, postContent, undefined, () => {});
			git.add({ fs, dir: dir, filepath: `${filename}.md` });
		}
		const sha = await git.commit({
			fs,
			dir: dir,
			message: config.commit_message,
			author: {
				name: config.author.name,
				email: config.author.email,
			},
		});
		new Notice(`New commit SHA: ${sha.slice(0, 7)}, start pushing...`);

		await git.push({
			fs,
			http,
			dir: dir,
			corsProxy: "https://cors.isomorphic-git.org",
			url: config.repo,
			ref: config.branch,
			onAuth: () => ({
				username: config.username,
				password: config.pat,
			}),
		});
		new Notice("Push complete, cleaning up...");
		fs.readdir(dir, undefined, (err, files) => {
			if (err) {
				throw err;
			}
			for (const file of files) {
				fs.unlink(`${dir}/${file}`, undefined, () => {});
			}
		});
	}
}

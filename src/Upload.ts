import * as git from "isomorphic-git";
import http from "isomorphic-git/http/web/";
import FS from "@isomorphic-git/lightning-fs";
import { App, Notice, Modal, stringifyYaml } from "obsidian";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Post, StaticExporterSettings } from "@/type";

export class GitFinishModal extends Modal {
	branch: string;
	link: string;
	constructor(app: App, config: { branch: string; repo: string }) {
		super(app);
		this.branch = config.branch;
		if (config.repo.endsWith(".git")) {
			this.link = config.repo.slice(0, -4) + "/tree/" + this.branch;
		} else {
			this.link = config.repo + "/tree/" + this.branch;
		}
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.createEl("h2", { text: "Exporter: Upload Complete" });
		contentEl.createEl("p", {
			text: `The posts have been uploaded to "${this.branch}" branch.`,
		});
		contentEl.createEl("a", {
			text: "View on GitHub",
			cls: "button",
			attr: { href: this.link },
		});
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}

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
	static indexedDBName = "ssMdExporter";
	app: App;

	constructor(app: App, settings: StaticExporterSettings) {
		this.settings = settings;
		this.app = app;
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
			`---\n` + stringifyYaml(post.frontmatter) + `---\n\n` + post.article;
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
	/**
	 * Clears the IndexedDB used by the uploader.
	 */
	static clearIndexedDB(): void {
		const request = indexedDB.deleteDatabase(Uploader.indexedDBName);
		request.onsuccess = (e: IDBVersionChangeEvent): void => {
			if (e.oldVersion === 0) {
				new Notice("DB already cleared");
			} else {
				new Notice("Database (used by git upload) cleared");
			}
		};
		request.onerror = (e): void => {
			console.error("Couldn't delete database", e);
			new Notice("Couldn't delete database; see console for details");
		};
	}

	private async fs_upload(posts: Post[]): Promise<void> {
		const fs = new FS(Uploader.indexedDBName);
		const config = this.settings.uploader.git;
		const dir = "/posts";

		enum RepoStat {
			NOT_EXIST,
			NOT_UP_TO_DATE,
			UP_TO_DATE,
		}

		let repoStat: RepoStat | undefined = undefined;

		new Notice("Start uploading to git, try using locally cached repo...");
		// Check if the repo is already cloned and up to date
		let localSha = "";
		try {
			localSha = await git.resolveRef({
				fs,
				dir: dir,
				ref: "refs/heads/" + config.branch,
			});
		} catch (e) {
			repoStat = RepoStat.NOT_EXIST;
		}

		if (repoStat === undefined) {
			// repo already exists. Check if the remote is up to date
			const remoteRef = await git.listServerRefs({
				http,
				corsProxy: "https://cors.isomorphic-git.org",
				url: config.repo,
				prefix: "refs/heads/" + config.branch,
				onAuth: () => ({
					username: config.username,
					password: config.pat,
				}),
			});

			const remoteSha = remoteRef[0]?.oid;

			if (remoteSha === localSha) {
				new Notice("Up to date, skip cloning");
				repoStat = RepoStat.UP_TO_DATE;
			} else {
				repoStat = RepoStat.NOT_UP_TO_DATE;
			}
		}

		if (repoStat !== RepoStat.UP_TO_DATE) {
			// Don't exist/Not up to date. Clean up and clone the repo.
			if (repoStat === RepoStat.NOT_EXIST)
				new Notice("Repo not found, cloning..."); // Not exist
			else new Notice("Repo not up to date, cleaning up and cloning..."); // Not up to date

			Uploader.clearIndexedDB();
			fs.init(Uploader.indexedDBName);
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
			new Notice("Clone complete");
		}

		// Write the posts to the file system and commit them
		for (const post of posts) {
			const postContent =
				`---\n` + stringifyYaml(post.frontmatter) + `---\n\n` + post.article;
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

		// Push the changes to the remote
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
		new GitFinishModal(this.app, config).open();
	}
}

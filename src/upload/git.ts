import * as git from "isomorphic-git";
import LightningFs from "@isomorphic-git/lightning-fs";
import http from "isomorphic-git/http/web/";
import type { Post, SSSettings } from "@/type";
import { App, Modal, Notice, Setting } from "obsidian";
import { stringifyPost } from "@/utils/stringifyPost";
import { AbortErrorParams } from "@/main";
import {
	createPromiseWithResolver,
	type PromiseHandler,
} from "@/utils/createPromise";
import { ConfirmModal } from "@/confirm-modal";

type GitUploadSettings = SSSettings["uploader"]["git"];

const INDEX_DB_NAME = "ssMdExporter";
const LOCAL_REPO_DIR = "/posts";

type GitOps = ReturnType<typeof getGitOps>;

export const gitUpload = async (
	posts: Post[],
	config: GitUploadSettings,
	app: App,
): Promise<AbortErrorParams | undefined> => {
	const g = getGitOps(config);

	try {
		await syncLocalRepo(g);
	} catch (e) {
		return {
			title: "Failed to read remote repo",
			content: e.message,
			stage: "upload",
			error: e,
		};
	}

	const pathMap = new Map<string, string>();

	for (const post of posts) {
		const { filename, content } = stringifyPost(post);
		const filepath =
			config.targetPath.replace(/^\/+|\/+$/g, "") + "/" + filename;
		pathMap.set(filepath, content);
		await writeFileWithCheck(`${LOCAL_REPO_DIR}/${filepath}`, content, g.fs);
		await g.add(filepath);
	}

	const changedFilePaths = (await g.changedFiles()).map((row) => row[0]);
	if (changedFilePaths.length === 0) {
		console.warn("Nothing to commit, worktree clean.");
		return {
			title: "Nothing to commit",
			content: "worktree clean",
			stage: "upload",
		};
	}

	const changedFiles = changedFilePaths
		.map((filepath) => ({
			title: filepath,
			content: pathMap.get(filepath),
		}))
		.filter((x) => x.content !== undefined) as {
		title: string;
		content: string;
	}[];

	const { promise: confirmPromise, handler } = createPromiseWithResolver();

	const commitAndPush = async () => {
		const sha = await g.commit();
		new Notice(`New commit SHA: ${sha.slice(0, 7)}, start pushing...`);
		const result = await g.push();
		if (!result.ok) {
			console.error(result);
			throw new Error(result.error ?? "Unknown error");
		}
	};

	new GitConfirmModal(app, changedFiles, handler).open();

	try {
		await confirmPromise;
	} catch {
		return;
	}

	try {
		await commitAndPush();
	} catch (e) {
		return {
			title: "Failed to push",
			content: e.message,
			stage: "upload",
			error: e,
		};
	}
	new GitSuccessModal(app, config).open();
};

const getGitOps = (config: GitUploadSettings) => {
	const fs = new LightningFs(INDEX_DB_NAME);
	const dir = LOCAL_REPO_DIR;

	const resolveRef = async () =>
		git.resolveRef({
			fs,
			dir: dir,
			ref: "refs/heads/" + config.branch,
		});

	const listServerRefs = async () =>
		git.listServerRefs({
			http,
			corsProxy: "https://cors.isomorphic-git.org",
			url: config.repo,
			prefix: "refs/heads/" + config.branch,
			onAuth: () => ({
				username: config.username,
				password: config.pat,
			}),
		});

	const clone = async () =>
		git.clone({
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

	const changedFiles = async () => {
		const matrix = await git.statusMatrix({ fs, dir });

		const changedFiles = matrix.filter((row) => {
			const [_filepath, headStatus, workdirStatus, stageStatus] = row;
			return headStatus !== workdirStatus || headStatus !== stageStatus;
		});

		return changedFiles;
	};

	const add = async (filepath: string) => git.add({ fs, dir, filepath });
	const commit = async () =>
		git.commit({
			fs,
			dir: dir,
			message: config.commit_message,
			author: {
				name: config.author.name,
				email: config.author.email,
			},
		});
	const push = async () =>
		git.push({
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
	return {
		fs,
		dir,
		resolveRef,
		listServerRefs,
		add,
		clone,
		push,
		commit,
		changedFiles,
	};
};

async function syncLocalRepo(g: GitOps) {
	const needClone = async () => {
		let localSha = "";
		try {
			localSha = await g.resolveRef();
		} catch {
			return true;
		}
		const remoteSha = (await g.listServerRefs())[0]?.oid;
		return remoteSha !== localSha;
	};

	if (!(await needClone())) return;
	clearIndexedDB();
	g.fs.init(INDEX_DB_NAME);
	await g.clone();
}

export function clearIndexedDB(): void {
	const request = indexedDB.deleteDatabase(INDEX_DB_NAME);
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

async function writeFileWithCheck(
	filepath: string,
	content: string,
	fs: LightningFs,
): Promise<void> {
	const dir = filepath.substring(0, filepath.lastIndexOf("/"));

	try {
		await fs.promises.stat(dir);
	} catch (err) {
		console.debug(err, "dir not exist yet");
		await fs.promises.mkdir(dir);
	}

	await fs.promises.writeFile(filepath, content);
}

class GitConfirmModal extends ConfirmModal {
	private posts: { title: string; content: string }[];
	constructor(
		app: App,
		posts: { title: string; content: string }[],
		handler: PromiseHandler,
	) {
		super(app, handler);
		this.posts = posts;
	}

	onOpen(): void {
		const { contentEl } = this;

		this.setTitle("Git: Changed files");

		const innerContentEl = contentEl.createDiv({ cls: "cfm-inner-content" });
		this.posts.forEach((post) => {
			const { title, content } = post;

			const postEl = innerContentEl.createEl("details");

			postEl.createEl("summary", { text: title });
			postEl.createEl("pre", { text: content, cls: "cfm-post" });
		});

		new Setting(contentEl).addButton((button) => {
			button.setButtonText("Commit & Push").onClick(() => {
				this.confirm();
			});
		});
	}
}

class GitSuccessModal extends Modal {
	config: GitUploadSettings;
	constructor(app: App, config: GitUploadSettings) {
		super(app);
		this.config = config;
	}
	onOpen(): void {
		this.setTitle("Git: Success");
		const div = this.contentEl.createDiv();
		div.createEl("p", { text: "Successfully committed and pushed" });
		div.createEl("p").createEl("a", {
			text: "Open Repository",
			href: this.config.repo,
		});
	}
}

import * as git from "isomorphic-git";
import LightningFs from "@isomorphic-git/lightning-fs";
import http from "isomorphic-git/http/web/";
import type { Post, StaticExporterSettings } from "@/type";
import { Notice } from "obsidian";
import { stringifyPost } from "@/utils/stringifyPost";

type GitUploadSettings = StaticExporterSettings["uploader"]["git"];

const INDEX_DB_NAME = "ssMdExporter";
const LOCAL_REPO_DIR = "/posts";

type GitOps = ReturnType<typeof getGitOps>;

export const gitUpload = async (posts: Post[], config: GitUploadSettings) => {
	const g = getGitOps(config);
	await syncLocalRepo(g);

	// Write the posts to the file system and commit them
	for (const post of posts) {
		const { filename, content } = stringifyPost(post);
		g.fs.writeFile(
			`${LOCAL_REPO_DIR}/${filename}`,
			content,
			undefined,
			(err) => {
				new Notice(err.message);
			},
		);
		await g.add(filename);
	}
	if (!(await g.haveChanges())) {
		console.warn("Nothing to commit, worktree clean.");
		return;
	}
	const sha = await g.commit();
	console.log(sha);
	new Notice(`New commit SHA: ${sha.slice(0, 7)}, start pushing...`);
	await g.push();
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

	const haveChanges = async () => {
		const matrix = await git.statusMatrix({ fs, dir });

		const changedFiles = matrix.filter((row) => {
			const [_filepath, headStatus, workdirStatus, stageStatus] = row;
			return headStatus !== workdirStatus || headStatus !== stageStatus;
		});

		return changedFiles.length > 0;
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
		haveChanges,
	};
};

async function syncLocalRepo(g: GitOps) {
	if (!(await needClone(g))) return;
	clearIndexedDB();
	await g.clone();
}

const needClone = async (g: GitOps) => {
	let localSha = "";
	try {
		localSha = await g.resolveRef();
	} catch {
		return true;
	}
	const remoteSha = (await g.listServerRefs())[0]?.oid;
	return remoteSha !== localSha;
};

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

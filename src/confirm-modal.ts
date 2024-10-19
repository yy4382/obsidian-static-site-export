import { Modal, Setting, type App } from "obsidian";

import { Post } from "@/type";
import { stringifyPost } from "./utils/stringifyPost";
import { PromiseHandler } from "./utils/createPromise";

export class ConfirmModal extends Modal {
	private handler: PromiseHandler;
	private needReject: boolean;
	constructor(app: App, handler: PromiseHandler) {
		super(app);
		this.handler = handler;
		this.needReject = true;
	}

	confirm(value?: unknown): void {
		this.handler.resolver(value);
		this.close();
	}
	cancel(reason?: Error): void {
		if (this.needReject) {
			this.handler.rejecter(reason ?? new Error("User aborted"));
		}
		this.needReject = false;
	}
}

export class TransformConfirmModal extends ConfirmModal {
	private posts: Post[];
	constructor(app: App, posts: Post[], handler: PromiseHandler) {
		super(app, handler);
		this.posts = posts;
	}

	onOpen(): void {
		const { contentEl } = this;

		this.setTitle("Confirm Export");

		const innerContentEl = contentEl.createDiv({ cls: "cfm-inner-content" });
		this.posts.forEach((post) => {
			const { filename, content } = stringifyPost(post);

			const postEl = innerContentEl.createEl("details");

			postEl.createEl("summary", { text: filename });
			postEl.createEl("pre", { text: content, cls: "cfm-post" });
		});

		new Setting(contentEl).addButton((button) => {
			button.setButtonText("Confirm Export").onClick(() => {
				this.confirm();
			});
		});
	}
	onClose(): void {
		this.cancel();
	}
}

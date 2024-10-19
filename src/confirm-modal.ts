import { Modal, Setting, type App } from "obsidian";

import { Post } from "@/type";
import { stringifyPost } from "./utils/stringifyPost";

export class ConfirmModal extends Modal {
	private posts: Post[];
	private confirmCallback: () => void;
	constructor(app: App, posts: Post[], confirmCallback: () => void) {
		super(app);
		this.posts = posts;
		this.confirmCallback = confirmCallback;
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
				this.confirmCallback();
				this.close();
			});
		});
	}
}

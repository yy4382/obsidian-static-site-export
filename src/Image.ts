import { StaticExporterSettings } from "./type";
import { TFile, Vault, requestUrl } from "obsidian";
import form2buffer from "@/utils/Form2buffer";

export default class ImageHandler {
	private settings: StaticExporterSettings;
	private readonly vault: Vault;

	constructor(settings: StaticExporterSettings, vault: Vault) {
		this.settings = settings;
		this.vault = vault;
	}

	/**
	 * Handles an image file.
	 *
	 * @param file - The image file to handle.
	 * @returns The URL of the image.
	 */
	async handleImage(file: TFile): Promise<string> {
		const image_url = await this.uploadEasyImage(file);
		return image_url;
	}

	private async uploadEasyImage(tFile: TFile): Promise<string> {
		const imgBuf = await this.vault.readBinary(tFile);
		const file = new File([imgBuf], tFile.name, {
			type: `image/${tFile.extension}`,
		});

		const form = new FormData();
		form.append("token", this.settings.easyimage_api_key);
		form.append("image", file);

		const buffer = await form2buffer(form);

		const response = (
			await requestUrl({
				url: this.settings.easyimage_api_endpoint,
				method: "POST",
				body: buffer.body,
				headers: {
					"Content-Type": buffer.contentType,
				},
			})
		).json;

		if (response.result === "success") {
			return response.url as string;
		} else {
			throw new Error(response.message as string);
		}
	}
}

// test commit
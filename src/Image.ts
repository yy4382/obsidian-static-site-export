import { StaticExporterSettings } from "./type";
import { TFile, Vault } from "obsidian";
import axios from "axios";

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
		const blob = new Blob([imgBuf], { type: `image/${tFile.extension}` });

		const form = new FormData();
		form.append("token", this.settings.easyimage_api_key);
		form.append("image", blob, tFile.basename);

		try {
			const response = await axios.post(
				this.settings.easyimage_api_endpoint,
				form
			);
			return response.data.url;
		} catch (err) {
			throw new Error("Error while uploading image");
		}
	}
}

import * as crypto from "crypto";
import {GetObjectCommand, NoSuchKey, PutObjectCommand, S3Client,} from "@aws-sdk/client-s3";
import {StaticExporterSettings} from "./type";
import {Notice, TFile, Vault} from "obsidian";
import axios from "axios";

function hashArrayBuffer(arrayBuffer: ArrayBuffer) {
	const hash = crypto.createHash("sha256");
	hash.update(Buffer.from(arrayBuffer));
	return hash.digest("hex");
}

export class ImageHandler {
	private s3Client: S3Client;
	private settings: StaticExporterSettings;
	private readonly vault: Vault;
	private imgMap: { url: string, hash: string }[];

	constructor(s3Client: S3Client, settings: StaticExporterSettings, vault: Vault) {
		this.s3Client = s3Client;
		this.settings = settings;
		this.vault = vault;
	}

	async init() {
		this.imgMap = await this.getImgMap();
		if (!this.imgMap) {
			this.imgMap = [];
		}
	}

	async finish() {
		await this.updateImgMap(this.imgMap);
	}

	private async getImgMap() {
		const getImgMapParams = {
			Bucket: this.settings.bucket,
			Key: "images.json",
		};
		try {
			const data = await this.s3Client.send(
				new GetObjectCommand(getImgMapParams)
			);
			const dataBody = await data.Body?.transformToString();
			if (dataBody) {
				return JSON.parse(dataBody);
			}
		} catch (err) {
			console.log(err);
			if (!(err instanceof NoSuchKey)) {
				new Notice("Error while fetching images.json");
				throw new Error("Error while fetching images.json");
			}
		}
	}


	private async updateImgMap(imgMap: object) {
		const updateParams = {
			Bucket: this.settings.bucket,
			Key: "images.json",
			Body: JSON.stringify(imgMap),
			ContentType: "application/json",
		};
		this.s3Client.send(new PutObjectCommand(updateParams)).catch((err: string) => {
			new Notice("Error while updating images.json");
			throw new Error("Error while updating images.json" + err);
		});
	}

	async handleImage(file: TFile) {
		console.log(this.imgMap)
		let fileContent = await this.vault.readBinary(file);
		let image_hash = hashArrayBuffer(fileContent);

		for (let image of this.imgMap) {
			if (image.hash === image_hash) {
				return image.url;
			}
		}

		const image_url = await this.uploadEasyImage(file);
		this.imgMap.push({hash: image_hash, url: image_url});

		return image_url;
	}

	private async uploadEasyImage(tFile: TFile): Promise<string> {
		let imgBuf = await this.vault.readBinary(tFile);
		const blob = new Blob([imgBuf], {type: `image/${tFile.extension}`});

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
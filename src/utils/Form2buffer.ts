export default async function form2buffer(
	requestData: FormData
): Promise<{ contentType: string; body: ArrayBuffer }> {
	const boundary = `----formdata-0${`${Math.floor(Math.random() * 1e11)}`.padStart(11, "0")}`;

	return {
		contentType: `multipart/form-data; boundary=${boundary}`,
		body: await buildMultipartBody(requestData, boundary).arrayBuffer(),
	};
}

function buildMultipartBody(formData: FormData, boundary: string): Blob {
	const multipartPieces: Array<string | Blob> = multipartPiecesFrom(formData);
	return composeMultipartBodyFrom(multipartPieces, boundary);
}

function multipartPiecesFrom(formData: FormData): Array<string | Blob> {
	const pieces: Array<string | Blob> = [];
	formData.forEach((content, name) => {
		if (typeof content === "string") {
			pieces.push(stringToFormDataSection(name, content));
		} else if (content instanceof File) {
			pieces.push(fileToFormDataSection(name, content));
		}
	});
	return pieces;
}

const MIME_LINE_BREAK = "\r\n";
const DOUBLE_LINE_BREAK = `${MIME_LINE_BREAK}${MIME_LINE_BREAK}`;

function stringToFormDataSection(formName: string, strValue: string): string {
	return `Content-Disposition: form-data; name="${formName}"${DOUBLE_LINE_BREAK}${strValue}`;
}

function fileToFormDataSection(formName: string, file: File): Blob {
	const firstLine = `Content-Disposition: form-data; name="${formName}"; filename="${file.name}"`;
	const contentType = file.type
		? [MIME_LINE_BREAK, `Content-Type: ${file.type}`]
		: [""];
	return new Blob([firstLine, ...contentType, DOUBLE_LINE_BREAK, file]);
}

function composeMultipartBodyFrom(
	multipartPieces: (string | Blob)[],
	boundaryLine: string
): Blob {
	const allPieces = addMultipartBoundaries(multipartPieces, boundaryLine);
	const singleBlob = new Blob(addLineBreaks(allPieces));
	return singleBlob;
}

function addMultipartBoundaries(
	multipartPieces: BlobPart[],
	boundary: string
): BlobPart[] {
	const boundaryLine = `--${boundary}`;
	const allPieces = multipartPieces.flatMap((p) => [boundaryLine, p]);
	const finalBoundaryLine = `--${boundary}--`;
	allPieces.push(finalBoundaryLine);
	return allPieces;
}

function addLineBreaks(allPieces: BlobPart[]): BlobPart[] {
	const result = [];
	for (let i = 0; i < allPieces.length; i++) {
		result.push(allPieces[i]);
		if (i !== allPieces.length - 1) {
			result.push(MIME_LINE_BREAK);
		}
	}
	return result;
}

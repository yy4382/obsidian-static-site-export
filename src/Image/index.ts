import { SSSettings } from "@/Settings";
import { Base64Transformer } from "@/Image/base64";
import { AbortImageTransfromer } from "@/Image/abort";

const nameMap = {
	base64: Base64Transformer,
	abort: AbortImageTransfromer,
};
export function getImageTransfomer(
	name: SSSettings["transformer"]["imageTransformer"],
) {
	return nameMap[name];
}

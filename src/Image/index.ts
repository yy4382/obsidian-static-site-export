import { SSSettings } from "@/Settings";
import { Base64Transformer } from "@/Image/base64";
import { AbortImageTransformer } from "@/Image/abort";

const nameMap = {
	base64: Base64Transformer,
	abort: AbortImageTransformer,
};
export function getImageTransformer(
	name: SSSettings["transformer"]["imageTransformer"],
) {
	return nameMap[name];
}

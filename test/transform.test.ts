import { test, describe, assert } from "vitest";
import { transform } from "../src/transform";
import { MockData, makeData } from "./mock-data";

import dataJson from "./mock-data.json";
import { stringifyPost } from "@/utils/stringifyPost";

//@ts-expect-error mock for testing
const data = dataJson as Record<string, Record<string, MockData>>;

for (const [name, testData] of Object.entries(data)) {
	describe(name, () => {
		for (const [caseName, mockData] of Object.entries(testData)) {
			test(caseName, async () => {
				const [tFile, ctx] = makeData(mockData);
				const output = await transform([tFile], ctx);
				const { filename, content } = stringifyPost(output[0]);
				assert.equal(content, mockData.output.content);
				assert.equal(filename, mockData.output.filename);
			});
		}
	});
}

import { test, describe, assert, expect } from "vitest";
import { transform } from "../src/transform";
import { MockData, makeData } from "./mock-data";

import { stringifyPost } from "@/utils/stringifyPost";
import { parse } from "yaml";
import fs from "fs/promises";

const data = parse(
	await fs.readFile("./test/mock-data.yaml", "utf-8"),
) as Record<string, Record<string, MockData>>;

for (const [name, testData] of Object.entries(data)) {
	if (name.startsWith(".")) continue;
	describe(name, () => {
		for (const [caseName, mockData] of Object.entries(testData)) {
			test(caseName, async () => {
				const [tFile, ctx] = makeData(mockData);

				if (mockData.output && mockData.output.error) {
					expect(() => transform([tFile], ctx)).rejects.toThrowError(
						mockData.output.error,
					);
					return;
				}

				const output = await transform([tFile], ctx);
				if (mockData.output === null) {
					expect(output).length(0);
					return;
				}
				const { filename, content } = stringifyPost(output[0]);
				assert.equal(content, mockData.output.content);
				assert.equal(filename, mockData.output.filename);
			});
		}
	});
}

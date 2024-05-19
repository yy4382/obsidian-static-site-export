/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { GitHttpRequest, GitHttpResponse, HttpClient } from "isomorphic-git";
import { requestUrl } from "obsidian";
export const http: HttpClient = {
	async request({
		url,
		method,
		headers,
		body,
	}: GitHttpRequest): Promise<GitHttpResponse> {
		// We can't stream yet, so collect body and set it to the ArrayBuffer
		// because that's what requestUrl expects
		if (body) {
			body = await collect(body);
			body = body.buffer;
		}

		const res = await requestUrl({
			url,
			method,
			headers,
			body,
			throw: false,
		});
		return {
			url,
			method,
			headers: res.headers,
			body: [new Uint8Array(res.arrayBuffer)],
			statusCode: res.status,
			statusMessage: res.status.toString(),
		};
	},
};
function fromValue(value: any) {
	let queue = [value];
	return {
		next() {
			return Promise.resolve({
				done: queue.length === 0,
				value: queue.pop(),
			});
		},
		return() {
			queue = [];
			return {};
		},
		[Symbol.asyncIterator]() {
			return this;
		},
	};
}
function getIterator(iterable: any) {
	if (iterable[Symbol.asyncIterator]) {
		return iterable[Symbol.asyncIterator]();
	}
	if (iterable[Symbol.iterator]) {
		return iterable[Symbol.iterator]();
	}
	if (iterable.next) {
		return iterable;
	}
	return fromValue(iterable);
}
async function forAwait(iterable: any, cb: any) {
	const iter = getIterator(iterable);
	while (true) {
		const { value, done } = await iter.next();
		if (value) await cb(value);
		if (done) break;
	}
	if (iter.return) iter.return();
}
async function collect(iterable: any): Promise<Uint8Array> {
	let size = 0;
	const buffers: Uint8Array[] = [];
	// This will be easier once `for await ... of` loops are available.
	await forAwait(iterable, (value: any) => {
		buffers.push(value);
		size += value.byteLength;
	});
	const result = new Uint8Array(size);
	let nextIndex = 0;
	for (const buffer of buffers) {
		result.set(buffer, nextIndex);
		nextIndex += buffer.byteLength;
	}
	return result;
}

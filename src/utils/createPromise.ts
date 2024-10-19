export function createPromiseWithResolver() {
	let resolvePromise: (value: unknown) => void,
		rejectPromise: (reason: unknown) => void;

	const promise = new Promise((resolve, reject) => {
		resolvePromise = resolve;
		rejectPromise = reject;
	});

	const resolver = (value: unknown) => {
		resolvePromise(value);
	};

	const rejecter = (reason: unknown) => {
		rejectPromise(reason);
	};

	return { promise, handler: { resolver, rejecter } };
}

export type PromiseHandler = ReturnType<
	typeof createPromiseWithResolver
>["handler"];

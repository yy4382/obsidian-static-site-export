// https://github.com/Vinzent03/obsidian-git/blob/master/polyfill_buffer.js
/*
MIT License

Copyright (c) 2020 Vinzent03, Denis Olehov

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
*/

import { Platform } from "obsidian";
let buffer;
if (Platform.isMobileApp) {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	buffer = require("buffer/index.js").Buffer;
} else {
	buffer = global.Buffer;
}

export const Buffer = buffer;

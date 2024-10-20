import { Platform } from 'obsidian';
let buffer;
if (Platform.isMobileApp) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    buffer = require('buffer/index.js').Buffer
} else {
    buffer = global.Buffer
}

export const Buffer = buffer;

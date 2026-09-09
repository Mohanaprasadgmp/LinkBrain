import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Builds a Chrome-Web-Store-ready `.zip` from `extension/`, run via
 * `npm run package:extension` (from the repo root) or `node
 * extension/scripts/package.mjs` (from `extension/`).
 *
 * Two things this automates that are easy to get wrong by hand:
 *
 * 1. Chrome Web Store **rejects** a manifest containing a `"key"` field on
 *    an extension's first upload (it assigns its own id at that point — see
 *    `README.md`'s "Chrome Web Store publishing" section). The packaged
 *    manifest here has `key` stripped; the source `manifest.json` used for
 *    local `Load unpacked` testing is untouched, so nothing about local dev
 *    changes.
 * 2. Only the files Chrome actually needs ship — no `src/*.ts`, no
 *    `scripts/`, no `README.md`.
 *
 * A hand-rolled, dependency-free ZIP writer (STORE method — no compression)
 * rather than a new npm package or shelling out to a platform-specific `zip`/
 * `Compress-Archive` binary that might not exist on every machine this runs
 * on. The handful of files here are a few KB total, so skipping compression
 * costs nothing that matters.
 */

const extensionDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const distDir = path.join(extensionDir, "dist");
const outputZip = path.join(extensionDir, "linkbrain-extension.zip");

function build() {
  console.log("Building extension TypeScript...");
  execFileSync("npx", ["tsc", "-p", path.join(extensionDir, "tsconfig.json")], {
    stdio: "inherit",
    shell: true,
  });
}

function packagedManifest() {
  const manifest = JSON.parse(readFileSync(path.join(extensionDir, "manifest.json"), "utf8"));
  if ("key" in manifest) {
    console.log('Stripping "key" from the packaged manifest (see this script\'s doc comment).');
    delete manifest.key;
  }
  return JSON.stringify(manifest, null, 2);
}

function collectFiles() {
  const files = [
    { name: "manifest.json", data: Buffer.from(packagedManifest(), "utf8") },
    { name: "popup.html", data: readFileSync(path.join(extensionDir, "popup.html")) },
    { name: "popup.css", data: readFileSync(path.join(extensionDir, "popup.css")) },
  ];

  for (const icon of readdirSync(path.join(extensionDir, "icons"))) {
    files.push({ name: `icons/${icon}`, data: readFileSync(path.join(extensionDir, "icons", icon)) });
  }

  if (!existsSync(distDir)) {
    throw new Error(`${distDir} doesn't exist — the build step above should have created it.`);
  }
  for (const file of readdirSync(distDir)) {
    if (!file.endsWith(".js")) continue;
    files.push({ name: `dist/${file}`, data: readFileSync(path.join(distDir, file)) });
  }

  return files;
}

// --- Minimal ZIP writer (STORE method, no compression) ---

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const byte of buf) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** DOS date/time, fixed rather than "now" — packaging is deterministic, not timestamp-sensitive. */
const DOS_TIME = (12 << 11) | (0 << 5) | 0;
const DOS_DATE = ((2026 - 1980) << 9) | (9 << 5) | 9;

function buildZip(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const { name, data } of files) {
    const nameBuf = Buffer.from(name, "utf8");
    const crc = crc32(data);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4); // version needed
    localHeader.writeUInt16LE(0, 6); // flags
    localHeader.writeUInt16LE(0, 8); // method: store
    localHeader.writeUInt16LE(DOS_TIME, 10);
    localHeader.writeUInt16LE(DOS_DATE, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(data.length, 18); // compressed size
    localHeader.writeUInt32LE(data.length, 22); // uncompressed size
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28); // extra length

    localParts.push(localHeader, nameBuf, data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4); // version made by
    centralHeader.writeUInt16LE(20, 6); // version needed
    centralHeader.writeUInt16LE(0, 8); // flags
    centralHeader.writeUInt16LE(0, 10); // method: store
    centralHeader.writeUInt16LE(DOS_TIME, 12);
    centralHeader.writeUInt16LE(DOS_DATE, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(data.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30); // extra length
    centralHeader.writeUInt16LE(0, 32); // comment length
    centralHeader.writeUInt16LE(0, 34); // disk number
    centralHeader.writeUInt16LE(0, 36); // internal attrs
    centralHeader.writeUInt32LE(0, 38); // external attrs
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, nameBuf);

    offset += localHeader.length + nameBuf.length + data.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const localSection = Buffer.concat(localParts);

  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4); // disk number
  end.writeUInt16LE(0, 6); // disk with central directory
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(localSection.length, 16);
  end.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([localSection, centralDirectory, end]);
}

function main() {
  build();
  const files = collectFiles();
  const zip = buildZip(files);
  writeFileSync(outputZip, zip);
  console.log(`\nWrote ${path.relative(process.cwd(), outputZip)} (${files.length} files, ${zip.length} bytes).`);
  console.log("Verify before uploading: unzip -l, and confirm manifest.json has no \"key\" field.");
}

main();

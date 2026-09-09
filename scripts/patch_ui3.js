const fs = require("fs");
const t = fs.readFileSync("components/ui.tsx", "utf8");

// Find the first declaration after Button that is malformed/unclosed.
const needle = "export function Container";

const start = t.indexOf(needle);
if (start === -1) {
  console.log("NOT_FOUND");
  process.exit(1);
}

// The malformed block continues until a safe stable cut point:
// the next "export function" (the real next top-level component export).
const nextExportMarker = "export function";
const afterStart = t.substring(start + needle.length).trimStart();
const end = t.indexOf("export function", start + needle.length);
if (end === -1) {
  console.log("END_NOT_FOUND");
  process.exit(1);
}

// Build a clean Container. It must be valid JSX and close itself.
const fixed =
  'export function Container({children,className}){ return (<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">{children}</div>); }';

// Replace the entire broken region with the fixed one.
const out = t.substring(0, start) + fixed + "\n" + t.substring(end);
fs.writeFileSync("components/ui.tsx", out);
console.log("PATCHED");

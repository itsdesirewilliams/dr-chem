const fs = require("fs");
const t = fs.readFileSync("components/ui.tsx", "utf8");

// 1) Remove the malformed Container and everything after it up to the next top-level export
const start = t.indexOf("export function Container");
if (start === -1) {
  console.log("NOT_FOUND");
  process.exit(1);
}
const importMarker = "\n\nimport";
const end = t.indexOf(importMarker, start + 10);
if (end === -1) {
  console.log("END_NOT_FOUND");
  process.exit(1);
}

// 2) Inject a clean Container immediately before the
//    next import block (kept after Button section).
const fixed =
  'export function Container({children,className}){ return (<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">{children}</div>); }' +
  "\n\n";
const out = t.substring(0, start) + fixed + t.substring(end);
fs.writeFileSync("components/ui.tsx", out);
console.log("PATCHED");

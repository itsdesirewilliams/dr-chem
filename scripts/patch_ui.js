const fs = require("fs");
const t = fs.readFileSync("components/ui.tsx", "utf8");
const start = t.indexOf("export function Container");
if (start === -1) {
  console.log("NOT_FOUND");
  process.exit(1);
}
const end = t.indexOf("};", start) + 2;
if (end === 1) {
  console.log("END_NOT_FOUND");
  process.exit(1);
}
const fixed =
  'export function Container({children,className}){ return (<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">{children}</div>); }';
const out = t.substring(0, start) + fixed + "\n" + t.substring(end);
fs.writeFileSync("components/ui.tsx", out);
console.log("PATCHED");

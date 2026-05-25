const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");

function copyFile(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

copyFile(path.join(root, "index.html"), path.join(dist, "index.html"));
copyFile(path.join(root, "gesture.html"), path.join(dist, "gesture.html"));
copyFile(path.join(root, "mark-composer.html"), path.join(dist, "mark-composer.html"));
copyFile(path.join(root, "src", "gesture.css"), path.join(dist, "src", "gesture.css"));
copyFile(path.join(root, "src", "gesture.js"), path.join(dist, "src", "gesture.js"));
copyFile(path.join(root, "src", "mark-composer.css"), path.join(dist, "src", "mark-composer.css"));
copyFile(path.join(root, "src", "mark-composer.js"), path.join(dist, "src", "mark-composer.js"));

fs.writeFileSync(
  path.join(dist, "_headers"),
  [
    "/*",
    "  X-Frame-Options: DENY",
    "  X-Content-Type-Options: nosniff",
    "  Referrer-Policy: strict-origin-when-cross-origin",
    "",
    "/src/*",
    "  Cache-Control: public, max-age=3600",
    "",
  ].join("\n"),
);

console.log(`Built public Sorting Hat demo in ${dist}`);

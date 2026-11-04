// tsc does not copy stylesheets: mirror every src/**/*.css into dist/.
import { cpSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

for (const file of walk("src").filter((f) => f.endsWith(".css"))) {
  cpSync(file, file.replace(/^src/, "dist"));
}

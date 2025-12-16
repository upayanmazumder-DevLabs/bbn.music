import { createClient } from "@hey-api/openapi-ts";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

let input = "https://bbn.music/openapi";

await fetch("http://localhost:8443/openapi")
    .then(() => (input = "http://localhost:8443/openapi"))
    .catch(() => { });

console.log(`Generating API from: ${input}`);

await createClient({
    input,
    output: {
        path: "src/lib/api",
        indexFile: false,
    },
    plugins: [
        "zod",
        {
            name: "@hey-api/sdk",
            validator: true,
        },
    ],
});

console.log("API generation complete! Running post-processing...");

const apiDir = "src/lib/api";
const files = await readdir(apiDir);

for (const file of files) {
    if (!file.endsWith(".ts")) continue;

    const filePath = join(apiDir, file);
    let contents = await readFile(filePath, "utf-8");

    contents = contents.replace(
        /(import|export) ([\s\S]+?)from '\.(.*?)';/gs,
        "$1 $2from '.$3.ts';"
    );

    contents = contents.replaceAll(
        "export { createClient } from './client/index.ts';",
        "export { createClient } from './client.ts';"
    );

    // Fix validator type annotations (arrow functions without block body)
    contents = contents.replaceAll(
        "requestValidator: async (data) =>",
        "requestValidator: async (data: any) =>"
    );
    contents = contents.replaceAll(
        "responseValidator: async (data) =>",
        "responseValidator: async (data: any) =>"
    );

    // Fix client imports - replace ./client.ts with ./client/index.ts
    contents = contents.replaceAll(
        "from './client.ts'",
        "from './client/index.ts'"
    );

    contents = contents.replaceAll(
        "query: z.optional(z.never())",
        "query: z.optional(z.any())"
    );

    await writeFile(filePath, contents);
}

console.log("Post-processing complete!");

// Regenerates src/assets/languageAliases.json from GitHub's own list of languages, the
// languages.yml of GitHub Linguist (the library GitHub uses to detect a repository's languages).
// Usage: npm run build:language-aliases [-- <Linguist release tag>]
//
// The card's ignore_languages parameter names languages the way GitHub search does
// (`language:csharp`), by Linguist's aliases:
// - every language's default alias, its name in lower case with hyphens for spaces: `html`,
//   `jupyter-notebook`. src/cards/github/languages.js derives these from the language names, so
//   they also work for languages newer than this table.
// - the aliases languages.yml lists: `csharp` for C#, `cpp` for C++. These are what this script
//   collects, as { alias: name }.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputFile = path.join(__dirname, '../src/assets/languageAliases.json'); // read by src/cards/github/languages.js

const DEFAULT_RELEASE = 'v9.7.0';
const release = process.argv[2] ?? DEFAULT_RELEASE;
const source = `https://raw.githubusercontent.com/github-linguist/linguist/${release}/lib/linguist/languages.yml`;

const response = await fetch(source);
if (!response.ok) {
  console.error(`Could not download ${source}: HTTP ${response.status}`);
  process.exit(1);
}
const languages = parse(await response.text());

// Must match defaultAlias in src/cards/github/languages.js (and Linguist's Language#default_alias).
const defaultAlias = (name) => name.toLowerCase().replace(/\s/g, '-');

// An alias must name one language only, and must not be another language's default alias.
const defaults = new Map(Object.keys(languages).map((name) => [defaultAlias(name), name]));
const aliases = {};
for (const [name, { aliases: listed = [] }] of Object.entries(languages)) {
  for (const alias of listed.map((a) => String(a).toLowerCase())) {
    if (alias === defaultAlias(name)) continue;
    const other = defaults.get(alias) ?? (aliases[alias] !== name ? aliases[alias] : undefined);
    if (other) {
      console.error(`"${alias}" would name both ${other} and ${name}`);
      process.exit(1);
    }
    aliases[alias] = name;
  }
}

const sorted = Object.fromEntries(Object.entries(aliases).sort(([a], [b]) => (a < b ? -1 : 1)));
fs.writeFileSync(outputFile, `${JSON.stringify({ source, aliases: sorted }, null, 1)}\n`);
console.log(`${Object.keys(sorted).length} aliases of ${defaults.size} languages, from Linguist ${release} -> ${path.relative(process.cwd(), outputFile)}`);

#!/usr/bin/env node
// Usage: node compose-schema.mjs <header.prisma> <shipped-fragment.prisma> <output.prisma>
// Writes a schema with the generator/datasource blocks of <header> and every model of the
// shipped fragment, so tests and examples run against the models users actually copy.
import { readFileSync, writeFileSync } from "node:fs";

const FIRST_MODEL = /^model /m;

function splitAtFirstModel(schemaText, label) {
  const index = schemaText.search(FIRST_MODEL);
  if (index === -1) throw new Error(`compose-schema: ${label} contains no model block`);
  return { header: schemaText.slice(0, index), models: schemaText.slice(index) };
}

export function composeSchema(headerText, fragmentText) {
  const header = headerText.search(FIRST_MODEL) === -1 ? headerText : splitAtFirstModel(headerText, "header").header;
  return `${header.trimEnd()}\n\n${splitAtFirstModel(fragmentText, "fragment").models}`;
}

const [headerPath, fragmentPath, outputPath] = process.argv.slice(2);
if (outputPath === undefined) {
  console.error("usage: compose-schema.mjs <header.prisma> <shipped-fragment.prisma> <output.prisma>");
  process.exit(2);
}
writeFileSync(outputPath, composeSchema(readFileSync(headerPath, "utf8"), readFileSync(fragmentPath, "utf8")));

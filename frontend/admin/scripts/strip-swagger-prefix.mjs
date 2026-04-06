#!/usr/bin/env node
// Strips Go package prefix (e.g. "http.") from swagger.json definitions
// Usage: node scripts/strip-swagger-prefix.mjs <input> [output]

import { readFileSync, writeFileSync } from 'fs'

const input = process.argv[2] || '../../backend/docs/swagger.json'
const output = process.argv[3] || input

const spec = JSON.parse(readFileSync(input, 'utf-8'))

if (spec.definitions) {
  // Rename definition keys: "http.TenantResp" -> "TenantResp"
  const renamed = {}
  for (const [key, val] of Object.entries(spec.definitions)) {
    renamed[key.replace(/^[a-z]+\./, '')] = val
  }
  // Fix all $ref pointers in the whole spec
  let raw = JSON.stringify({ ...spec, definitions: renamed })
  raw = raw.replace(/"#\/definitions\/[a-z]+\./g, '"#/definitions/')
  writeFileSync(output, raw)
  console.log(`✅ Stripped package prefix from ${Object.keys(spec.definitions).length} definitions`)
}

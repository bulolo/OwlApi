import { NextRequest, NextResponse } from "next/server"
import * as prettier from "prettier"
import parserBabel from "prettier/plugins/babel"
import pluginEstree from "prettier/plugins/estree"

export async function POST(req: NextRequest) {
  const { code } = await req.json()
  if (typeof code !== "string") {
    return NextResponse.json({ error: "invalid input" }, { status: 400 })
  }
  try {
    const formatted = await prettier.format(code, {
      parser: "babel",
      plugins: [parserBabel, pluginEstree],
      semi: true,
      singleQuote: false,
      tabWidth: 2,
      printWidth: 100,
    })
    return NextResponse.json({ formatted })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 422 })
  }
}

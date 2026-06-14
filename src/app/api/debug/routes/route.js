import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  const routes = [];
  function walk(dir, basePath = "") {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath, path.join(basePath, file));
      } else if (file === "route.js") {
        routes.push(`/api${basePath.replace(/\\/g, "/")}`);
      }
    }
  }
  walk(path.join(process.cwd(), "app/api"), "");
  return NextResponse.json({ routes });
}
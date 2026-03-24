import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import path from "path";
import { randomBytes } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "ファイルがありません" }, { status: 400 });
    }

    const ext = path.extname(file.name) || ".jpg";
    const filename = `thumbnails/${Date.now()}-${randomBytes(4).toString("hex")}${ext}`;

    const blob = await put(filename, file, { access: "public" });

    return NextResponse.json({ path: blob.url });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "アップロードに失敗しました" }, { status: 500 });
  }
}

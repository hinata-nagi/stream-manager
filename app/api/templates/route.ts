import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getTemplates, saveTemplates, Template } from "@/lib/db";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  try {
    const templates = await getTemplates(userId);
    return NextResponse.json(templates);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  try {
    const template = (await request.json()) as Template;
    if (!template.id || !template.name || !template.title || !template.type) {
      return NextResponse.json({ error: "不正なリクエストです" }, { status: 400 });
    }
    const templates = await getTemplates(userId);
    templates.push(template);
    await saveTemplates(templates, userId);
    return NextResponse.json(templates);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to save template" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  try {
    const { id } = await request.json();
    const templates = await getTemplates(userId);
    const updated = templates.filter((t) => t.id !== id);
    await saveTemplates(updated, userId);
    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete template" }, { status: 500 });
  }
}

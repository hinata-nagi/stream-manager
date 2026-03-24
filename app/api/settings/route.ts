import { NextRequest, NextResponse } from "next/server";
import { getSetting, setSetting } from "@/lib/db";

export async function GET() {
  try {
    const webhookUrl = await getSetting("discord_webhook_url") ?? "";
    return NextResponse.json({ discord_webhook_url: webhookUrl });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { discord_webhook_url } = body;
    if (typeof discord_webhook_url !== "string") {
      return NextResponse.json({ error: "不正なリクエストです" }, { status: 400 });
    }
    await setSetting("discord_webhook_url", discord_webhook_url);
    return NextResponse.json({ discord_webhook_url });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}

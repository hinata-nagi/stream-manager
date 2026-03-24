import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getUpcomingStreamNotifications,
  getUpcomingPrepNotifications,
  getStartupPrepNotifications,
  addNotification,
  getSetting,
  Activity,
} from "@/lib/db";

const PLATFORM_LABEL: Record<string, string> = {
  Twitch: "Twitch",
  YouTube: "YouTube",
  両方: "Twitch + YouTube",
};

async function sendEmbed(webhookUrl: string, embed: object): Promise<boolean> {
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function buildPrestreamEmbed(a: Activity): object {
  const platform = a.stream_platform
    ? (PLATFORM_LABEL[a.stream_platform] ?? a.stream_platform)
    : "未設定";
  return {
    title: "🔴 配信開始30分前",
    color: 0xe74c3c,
    fields: [
      { name: "タイトル", value: a.title, inline: false },
      { name: "日付", value: a.date, inline: true },
      { name: "開始時間", value: `${a.start_time} 〜 ${a.end_time}`, inline: true },
      { name: "配信先", value: platform, inline: true },
      { name: "告知", value: a.announced ? "済 ✓" : "未", inline: true },
      { name: "サムネ", value: a.thumbnail_ready ? "済 ✓" : "未", inline: true },
    ],
  };
}

function buildStartupEmbed(a: Activity): object {
  const platform = a.stream_platform
    ? (PLATFORM_LABEL[a.stream_platform] ?? a.stream_platform)
    : "未設定";
  const warnings: string[] = [];
  if (!a.announced) warnings.push("⚠️ 告知が未完了です");
  if (!a.thumbnail_ready) warnings.push("⚠️ サムネ作成が未完了です");

  return {
    title: "🚨 準備未完了の配信があります",
    color: 0xe67e22,
    fields: [
      { name: "タイトル", value: a.title, inline: false },
      { name: "日付", value: a.date, inline: true },
      { name: "開始時間", value: `${a.start_time} 〜 ${a.end_time}`, inline: true },
      { name: "配信先", value: platform, inline: true },
      { name: "告知", value: a.announced ? "済 ✓" : "**未 ✗**", inline: true },
      { name: "サムネ", value: a.thumbnail_ready ? "済 ✓" : "**未 ✗**", inline: true },
      { name: "確認事項", value: warnings.join("\n"), inline: false },
    ],
  };
}

function buildPrepEmbed(a: Activity): object {
  const platform = a.stream_platform
    ? (PLATFORM_LABEL[a.stream_platform] ?? a.stream_platform)
    : "未設定";
  const warnings: string[] = [];
  if (!a.announced) warnings.push("⚠️ 告知が未完了です");
  if (!a.thumbnail_ready) warnings.push("⚠️ サムネ作成が未完了です");

  return {
    title: "📋 明日の配信 準備チェック",
    color: 0xf39c12,
    fields: [
      { name: "タイトル", value: a.title, inline: false },
      { name: "日付", value: a.date, inline: true },
      { name: "開始時間", value: `${a.start_time} 〜 ${a.end_time}`, inline: true },
      { name: "配信先", value: platform, inline: true },
      { name: "告知", value: a.announced ? "済 ✓" : "**未 ✗**", inline: true },
      { name: "サムネ", value: a.thumbnail_ready ? "済 ✓" : "**未 ✗**", inline: true },
      { name: "確認事項", value: warnings.join("\n"), inline: false },
    ],
  };
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  try {
    const webhookUrl = await getSetting("discord_webhook_url", userId);
    if (!webhookUrl) {
      return NextResponse.json({ skipped: true, reason: "webhook URL未設定" });
    }

    const body = await request.json().catch(() => ({})) as { startup?: boolean };
    const isStartup = !!body.startup;

    // 起動時通知（24時間以内・prep未完了）
    const startupNotified: number[] = [];
    if (isStartup) {
      for (const a of await getStartupPrepNotifications()) {
        const ok = await sendEmbed(webhookUrl, buildStartupEmbed(a));
        if (ok) {
          await addNotification(a.id, "startup");
          startupNotified.push(a.id);
        } else {
          console.error(`Discord startup notification failed for activity ${a.id}`);
        }
      }
    }

    // 準備通知（1日前・prep未完了）
    const prepNotified: number[] = [];
    for (const a of await getUpcomingPrepNotifications()) {
      const ok = await sendEmbed(webhookUrl, buildPrepEmbed(a));
      if (ok) {
        await addNotification(a.id, "prep");
        prepNotified.push(a.id);
      } else {
        console.error(`Discord prep notification failed for activity ${a.id}`);
      }
    }

    // 配信開始前通知（30分前）
    const prestreamNotified: number[] = [];
    for (const a of await getUpcomingStreamNotifications()) {
      const ok = await sendEmbed(webhookUrl, buildPrestreamEmbed(a));
      if (ok) {
        await addNotification(a.id, "prestream");
        prestreamNotified.push(a.id);
      } else {
        console.error(`Discord prestream notification failed for activity ${a.id}`);
      }
    }

    return NextResponse.json({ startup: startupNotified, prep: prepNotified, prestream: prestreamNotified });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "通知処理に失敗しました" }, { status: 500 });
  }
}

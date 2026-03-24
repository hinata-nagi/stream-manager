import { NextRequest, NextResponse } from "next/server";
import { getAllActivities, createActivity, ActivityInput, ActivityType, StreamPlatform } from "@/lib/db";

export async function GET() {
  try {
    const activities = await getAllActivities();
    return NextResponse.json(activities);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch activities" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, start_time, end_time, title, type, memo, stream_platform, twitch_url, youtube_url, collab_partner, announced, thumbnail_ready, thumbnail_path } = body;

    const isRest = type === "休み";
    if (!date || !title || !type || (!isRest && (!start_time || !end_time))) {
      return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
    }

    const validTypes: ActivityType[] = ["配信", "作業", "休み"];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "種別が不正です" }, { status: 400 });
    }

    const validPlatforms: StreamPlatform[] = ["Twitch", "YouTube", "両方"];
    if (type === "配信" && stream_platform && !validPlatforms.includes(stream_platform)) {
      return NextResponse.json({ error: "配信先が不正です" }, { status: 400 });
    }

    const isStream = type === "配信";
    const input: ActivityInput = {
      date,
      start_time: isRest ? "" : start_time,
      end_time: isRest ? "" : end_time,
      title,
      type,
      memo,
      stream_platform: isStream ? stream_platform : undefined,
      twitch_url: isStream ? twitch_url : undefined,
      youtube_url: isStream ? youtube_url : undefined,
      collab_partner: isStream ? collab_partner : undefined,
      announced: isStream ? !!announced : false,
      thumbnail_ready: isStream ? !!thumbnail_ready : false,
      thumbnail_path: isStream ? (thumbnail_path || undefined) : undefined,
    };
    const activity = await createActivity(input);
    return NextResponse.json(activity, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create activity" }, { status: 500 });
  }
}

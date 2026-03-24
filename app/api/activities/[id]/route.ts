import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { updateActivity, deleteActivity, patchActivity, ActivityInput, ActivityType, StreamPlatform } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  try {
    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "不正なIDです" }, { status: 400 });
    }

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
    const activity = await updateActivity(id, input, userId);
    if (!activity) {
      return NextResponse.json({ error: "見つかりません" }, { status: 404 });
    }
    return NextResponse.json(activity);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update activity" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  try {
    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "不正なIDです" }, { status: 400 });
    }
    const body = await request.json();
    const patch: Record<string, boolean> = {};
    if (typeof body.announced === "boolean") patch.announced = body.announced;
    if (typeof body.thumbnail_ready === "boolean") patch.thumbnail_ready = body.thumbnail_ready;
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "更新するフィールドがありません" }, { status: 400 });
    }
    const activity = await patchActivity(id, patch, userId);
    if (!activity) {
      return NextResponse.json({ error: "見つかりません" }, { status: 404 });
    }
    return NextResponse.json(activity);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to patch activity" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  try {
    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "不正なIDです" }, { status: 400 });
    }

    const deleted = await deleteActivity(id, userId);
    if (!deleted) {
      return NextResponse.json({ error: "見つかりません" }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete activity" }, { status: 500 });
  }
}

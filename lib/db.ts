import { createClient, Row, InValue } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

let initialized = false;

async function ensureDb() {
  if (initialized) return;
  initialized = true;

  await client.execute(`
    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      title TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('配信', '作業', '休み')),
      memo TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    )
  `);
  await client.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
  await client.execute(`
    CREATE TABLE IF NOT EXISTS notifications (
      activity_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      sent_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      PRIMARY KEY (activity_id, type)
    )
  `);

  // 既存DBへのカラム追加（エラーは無視）
  for (const sql of [
    "ALTER TABLE activities ADD COLUMN stream_url TEXT",
    "ALTER TABLE activities ADD COLUMN collab_partner TEXT",
    "ALTER TABLE activities ADD COLUMN announced INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE activities ADD COLUMN thumbnail_ready INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE activities ADD COLUMN stream_platform TEXT",
    "ALTER TABLE activities ADD COLUMN twitch_url TEXT",
    "ALTER TABLE activities ADD COLUMN youtube_url TEXT",
    "ALTER TABLE activities ADD COLUMN thumbnail_path TEXT",
    "ALTER TABLE activities ADD COLUMN notified_at TEXT",
    "ALTER TABLE activities ADD COLUMN user_id TEXT NOT NULL DEFAULT ''",
  ]) {
    try { await client.execute(sql); } catch { /* column already exists */ }
  }
}

export type ActivityType = "配信" | "作業" | "休み";
export type StreamPlatform = "Twitch" | "YouTube" | "両方";

export interface Activity {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  title: string;
  type: ActivityType;
  memo: string | null;
  stream_platform: StreamPlatform | null;
  twitch_url: string | null;
  youtube_url: string | null;
  collab_partner: string | null;
  announced: boolean;
  thumbnail_ready: boolean;
  thumbnail_path: string | null;
  created_at: string;
}

export interface ActivityInput {
  date: string;
  start_time: string;
  end_time: string;
  title: string;
  type: ActivityType;
  memo?: string;
  stream_platform?: StreamPlatform;
  twitch_url?: string;
  youtube_url?: string;
  collab_partner?: string;
  announced?: boolean;
  thumbnail_ready?: boolean;
  thumbnail_path?: string;
}

function mapRow(row: Row): Activity {
  return {
    id: row.id as number,
    date: row.date as string,
    start_time: row.start_time as string,
    end_time: row.end_time as string,
    title: row.title as string,
    type: row.type as ActivityType,
    memo: row.memo as string | null,
    stream_platform: row.stream_platform as StreamPlatform | null,
    twitch_url: row.twitch_url as string | null,
    youtube_url: row.youtube_url as string | null,
    collab_partner: row.collab_partner as string | null,
    announced: !!(row.announced as number),
    thumbnail_ready: !!(row.thumbnail_ready as number),
    thumbnail_path: row.thumbnail_path as string | null,
    created_at: row.created_at as string,
  };
}

function inputArgs(input: ActivityInput, extra: Record<string, unknown> = {}) {
  return {
    date: input.date,
    start_time: input.start_time,
    end_time: input.end_time,
    title: input.title,
    type: input.type,
    memo: input.memo ?? null,
    stream_platform: input.stream_platform ?? null,
    twitch_url: input.twitch_url ?? null,
    youtube_url: input.youtube_url ?? null,
    collab_partner: input.collab_partner ?? null,
    announced: input.announced ? 1 : 0,
    thumbnail_ready: input.thumbnail_ready ? 1 : 0,
    thumbnail_path: input.thumbnail_path ?? null,
    ...extra,
  };
}

export async function getAllActivities(userId: string): Promise<Activity[]> {
  await ensureDb();
  const result = await client.execute({
    sql: "SELECT * FROM activities WHERE user_id = ? ORDER BY date DESC, start_time DESC",
    args: [userId],
  });
  return result.rows.map(mapRow);
}

export async function createActivity(input: ActivityInput, userId: string): Promise<Activity> {
  await ensureDb();
  const result = await client.execute({
    sql: `INSERT INTO activities (date, start_time, end_time, title, type, memo, stream_platform, twitch_url, youtube_url, collab_partner, announced, thumbnail_ready, thumbnail_path, user_id)
          VALUES (:date, :start_time, :end_time, :title, :type, :memo, :stream_platform, :twitch_url, :youtube_url, :collab_partner, :announced, :thumbnail_ready, :thumbnail_path, :user_id)`,
    args: { ...inputArgs(input), user_id: userId },
  });
  const row = await client.execute({
    sql: "SELECT * FROM activities WHERE id = ? AND user_id = ?",
    args: [Number(result.lastInsertRowid), userId],
  });
  return mapRow(row.rows[0]);
}

export async function updateActivity(id: number, input: ActivityInput, userId: string): Promise<Activity | null> {
  await ensureDb();
  await client.execute({
    sql: `UPDATE activities
          SET date = :date, start_time = :start_time, end_time = :end_time,
              title = :title, type = :type, memo = :memo,
              stream_platform = :stream_platform, twitch_url = :twitch_url, youtube_url = :youtube_url,
              collab_partner = :collab_partner, announced = :announced, thumbnail_ready = :thumbnail_ready,
              thumbnail_path = :thumbnail_path
          WHERE id = :id AND user_id = :user_id`,
    args: inputArgs(input, { id, user_id: userId }),
  });
  const result = await client.execute({ sql: "SELECT * FROM activities WHERE id = ? AND user_id = ?", args: [id, userId] });
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

export async function patchActivity(
  id: number,
  patch: Partial<Pick<Activity, "announced" | "thumbnail_ready">>,
  userId: string
): Promise<Activity | null> {
  await ensureDb();
  const fields: string[] = [];
  const args: Record<string, InValue> = { id, user_id: userId };
  if (patch.announced !== undefined) {
    fields.push("announced = :announced");
    args.announced = patch.announced ? 1 : 0;
  }
  if (patch.thumbnail_ready !== undefined) {
    fields.push("thumbnail_ready = :thumbnail_ready");
    args.thumbnail_ready = patch.thumbnail_ready ? 1 : 0;
  }
  if (fields.length === 0) return null;
  await client.execute({ sql: `UPDATE activities SET ${fields.join(", ")} WHERE id = :id AND user_id = :user_id`, args });
  const result = await client.execute({ sql: "SELECT * FROM activities WHERE id = ? AND user_id = ?", args: [id, userId] });
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

export type NotificationType = "prep" | "prestream" | "startup";

export async function addNotification(activityId: number, type: NotificationType): Promise<void> {
  await ensureDb();
  await client.execute({
    sql: "INSERT OR IGNORE INTO notifications (activity_id, type) VALUES (?, ?)",
    args: [activityId, type],
  });
}

export async function getUpcomingStreamNotifications(): Promise<Activity[]> {
  await ensureDb();
  const result = await client.execute(`
    SELECT * FROM activities
    WHERE type = '配信'
      AND start_time != ''
      AND datetime(date || ' ' || start_time) >= datetime('now', 'localtime', '+25 minutes')
      AND datetime(date || ' ' || start_time) <= datetime('now', 'localtime', '+35 minutes')
      AND id NOT IN (SELECT activity_id FROM notifications WHERE type = 'prestream')
  `);
  return result.rows.map(mapRow);
}

export async function getUpcomingPrepNotifications(): Promise<Activity[]> {
  await ensureDb();
  const result = await client.execute(`
    SELECT * FROM activities
    WHERE type = '配信'
      AND date = date('now', 'localtime', '+1 day')
      AND (announced = 0 OR thumbnail_ready = 0)
      AND id NOT IN (SELECT activity_id FROM notifications WHERE type = 'prep')
  `);
  return result.rows.map(mapRow);
}

export async function getStartupPrepNotifications(): Promise<Activity[]> {
  await ensureDb();
  const result = await client.execute(`
    SELECT * FROM activities
    WHERE type = '配信'
      AND start_time != ''
      AND datetime(date || ' ' || start_time) >= datetime('now', 'localtime')
      AND datetime(date || ' ' || start_time) <= datetime('now', 'localtime', '+24 hours')
      AND (announced = 0 OR thumbnail_ready = 0)
      AND id NOT IN (SELECT activity_id FROM notifications WHERE type = 'startup')
  `);
  return result.rows.map(mapRow);
}

export async function getSetting(key: string, userId: string): Promise<string | null> {
  await ensureDb();
  const result = await client.execute({
    sql: "SELECT value FROM settings WHERE key = ?",
    args: [`${userId}:${key}`],
  });
  return result.rows[0] ? (result.rows[0].value as string) : null;
}

export async function setSetting(key: string, value: string, userId: string): Promise<void> {
  await ensureDb();
  await client.execute({
    sql: "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
    args: [`${userId}:${key}`, value],
  });
}

export interface Template {
  id: string;
  name: string;
  title: string;
  memo: string;
  type: ActivityType;
  stream_platform: StreamPlatform;
  twitch_url: string;
  youtube_url: string;
  collab_partner: string;
  announced: boolean;
  thumbnail_ready: boolean;
}

export async function getTemplates(userId: string): Promise<Template[]> {
  const raw = await getSetting("templates", userId);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Template[];
  } catch {
    return [];
  }
}

export async function saveTemplates(templates: Template[], userId: string): Promise<void> {
  await setSetting("templates", JSON.stringify(templates), userId);
}

export async function deleteActivity(id: number, userId: string): Promise<boolean> {
  await ensureDb();
  const result = await client.execute({
    sql: "DELETE FROM activities WHERE id = ? AND user_id = ?",
    args: [id, userId],
  });
  return result.rowsAffected > 0;
}

"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { useUser, SignInButton, UserButton } from "@clerk/nextjs";

type ActivityType = "配信" | "動画" | "休み";
type StreamPlatform = "Twitch" | "YouTube" | "両方";

interface Activity {
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

const TYPE_COLORS: Record<string, string> = {
  配信: "bg-red-100 text-red-700",
  動画: "bg-blue-100 text-blue-700",
  作業: "bg-blue-100 text-blue-700",
  休み: "bg-green-100 text-green-700",
};

const today = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const emptyForm = () => ({
  date: today(),
  start_time: "",
  end_time: "",
  title: "",
  type: "動画" as ActivityType,
  memo: "",
  stream_platform: "Twitch" as StreamPlatform,
  twitch_url: "",
  youtube_url: "",
  collab_partner: "",
  announced: false,
  thumbnail_ready: false,
  thumbnail_path: "",
});

const APP_VERSION = "v1.2";

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTE_OPTIONS = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

const splitTime = (t: string) => {
  const [h = "", m = ""] = t.split(":");
  return { h, m };
};
const joinTime = (h: string, m: string) => {
  if (!h && !m) return "";
  return `${h}:${m}`;
};

const formatDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

function getWeekDates(offsetWeeks: number): string[] {
  const d = new Date();
  const dow = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1) + offsetWeeks * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    return formatDate(day);
  });
}

const TYPE_RANK: Record<string, number> = { 配信: 0, 動画: 1, 作業: 1, 休み: 2 };

function pickForDay(activities: Activity[], dateStr: string): Activity | null {
  return (
    activities
      .filter((a) => a.date === dateStr)
      .sort(
        (a, b) =>
          TYPE_RANK[a.type] - TYPE_RANK[b.type] ||
          (a.start_time || "").localeCompare(b.start_time || "")
      )[0] ?? null
  );
}


interface ScheduleTemplate {
  id: string;
  name: string;
  description: string;
  previewImage: string;
  author: { name: string; url: string };
  font: string;
  textColor: string;
  fontSizes: { time: number; title: number; empty: number };
  layout: {
    canvasWidth: number;
    canvasHeight: number;
    backgroundImage: string;
    days: {
      x: number;
      y: number;
      width: number;
      height: number;
      paddingLeft: number;
      paddingRight: number;
      timeOffsetX: number;
      textBaseline: number;
      dateX?: number;
      dateY?: number;
      dateFontSize?: number;
      titleCenterX?: number;
      titleLeftLimit?: number;
      titleRightLimit?: number;
    }[];
    mainImage: { x: number; y: number; width: number; height: number };
  };
}

const SCHEDULE_TEMPLATES: ScheduleTemplate[] = [
  {
    id: "default",
    name: "デフォルト",
    description: "",
    previewImage: "",
    author: { name: "", url: "" },
    font: "sans-serif",
    textColor: "#f1f5f9",
    fontSizes: { time: 12, title: 15, empty: 14 },
    layout: {
      canvasWidth: 1200,
      canvasHeight: 630,
      backgroundImage: "",
      mainImage: { x: 580, y: 0, width: 620, height: 630 },
      days: [
        { x: 0, y:  72, width: 580, height: 80, paddingLeft: 148, paddingRight: 16, timeOffsetX: 62, textBaseline: 50 },
        { x: 0, y: 152, width: 580, height: 80, paddingLeft: 148, paddingRight: 16, timeOffsetX: 62, textBaseline: 50 },
        { x: 0, y: 231, width: 580, height: 80, paddingLeft: 148, paddingRight: 16, timeOffsetX: 62, textBaseline: 50 },
        { x: 0, y: 311, width: 580, height: 80, paddingLeft: 148, paddingRight: 16, timeOffsetX: 62, textBaseline: 50 },
        { x: 0, y: 391, width: 580, height: 80, paddingLeft: 148, paddingRight: 16, timeOffsetX: 62, textBaseline: 50 },
        { x: 0, y: 471, width: 580, height: 80, paddingLeft: 148, paddingRight: 16, timeOffsetX: 62, textBaseline: 50 },
        { x: 0, y: 550, width: 580, height: 80, paddingLeft: 148, paddingRight: 16, timeOffsetX: 62, textBaseline: 50 },
      ],
    },
  },
  {
    id: "black-red",
    name: "黒赤テンプレ",
    description: "",
    previewImage: "",
    author: { name: "", url: "" },
    font: "sans-serif",
    textColor: "#000000ff",
    fontSizes: { time: 36, title: 30, empty: 26 },
    layout: {
      canvasWidth: 1920,
      canvasHeight: 1080,
      // /public/templates/ に置いた画像のファイル名に合わせて変更する
      backgroundImage: "/templates/template_01.png",
      mainImage: { x: 960, y: 0, width: 960, height: 1080 },
      days: [
        { x: 0, y: 140, width: 960, height: 134, paddingLeft: 260, paddingRight: 12, timeOffsetX: 180, textBaseline: 92, dateX: 108, dateY: 88, dateFontSize: 36, titleCenterX: 670, titleLeftLimit: 260, titleRightLimit: 860 },
        { x: 0, y: 270, width: 960, height: 134, paddingLeft: 260, paddingRight: 12, timeOffsetX: 180, textBaseline: 92, dateX: 108, dateY: 88, dateFontSize: 36, titleCenterX: 670, titleLeftLimit: 260, titleRightLimit: 860 },
        { x: 0, y: 400, width: 960, height: 134, paddingLeft: 260, paddingRight: 12, timeOffsetX: 180, textBaseline: 92, dateX: 108, dateY: 88, dateFontSize: 36, titleCenterX: 670, titleLeftLimit: 260, titleRightLimit: 860 },
        { x: 0, y: 530, width: 960, height: 134, paddingLeft: 260, paddingRight: 12, timeOffsetX: 180, textBaseline: 92, dateX: 108, dateY: 88, dateFontSize: 36, titleCenterX: 670, titleLeftLimit: 260, titleRightLimit: 860 },
        { x: 0, y: 663, width: 960, height: 134, paddingLeft: 260, paddingRight: 12, timeOffsetX: 180, textBaseline: 92, dateX: 108, dateY: 88, dateFontSize: 36, titleCenterX: 670, titleLeftLimit: 260, titleRightLimit: 860 },
        { x: 0, y: 792, width: 960, height: 134, paddingLeft: 260, paddingRight: 12, timeOffsetX: 180, textBaseline: 92, dateX: 108, dateY: 88, dateFontSize: 36, titleCenterX: 670, titleLeftLimit: 260, titleRightLimit: 860 },
        { x: 0, y: 925, width: 960, height: 134, paddingLeft: 260, paddingRight: 12, timeOffsetX: 180, textBaseline: 92, dateX: 108, dateY: 88, dateFontSize: 36, titleCenterX: 670, titleLeftLimit: 260, titleRightLimit: 860 },
      ],
    },
  },
];

interface Template {
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

type FilterType = "すべて" | ActivityType;

export default function Home() {
  const { isLoaded, isSignedIn } = useUser();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<FilterType>("すべて");
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSaved, setWebhookSaved] = useState(false);
  const [showScheduleGen, setShowScheduleGen] = useState(false);
  const [scheduleWeekOffset, setScheduleWeekOffset] = useState<0 | 1>(0);
  const [scheduleMainImageFile, setScheduleMainImageFile] = useState<File | null>(null);
  const [scheduleCanvasReady, setScheduleCanvasReady] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState(SCHEDULE_TEMPLATES[0].id);
  const [scheduleFont, setScheduleFont] = useState(SCHEDULE_TEMPLATES[0].font);
  const [scheduleDebug, setScheduleDebug] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);

  const [form, setForm] = useState(emptyForm());
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

  async function fetchActivities() {
    const res = await fetch("/api/activities");
    if (res.ok) {
      const data = await res.json();
      setActivities(data);
    }
  }

  async function fetchTemplates() {
    const res = await fetch("/api/templates");
    if (res.ok) setTemplates(await res.json());
  }

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    fetchActivities();
    fetchTemplates();
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setWebhookUrl(d.discord_webhook_url ?? ""))
      .catch(() => { });
    // 起動時通知（24時間以内の準備未完了チェック）
    fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startup: true }),
    }).catch(() => { });
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    const id = setInterval(() => {
      fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }).catch(() => { });
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  async function saveWebhook() {
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discord_webhook_url: webhookUrl }),
    });
    setWebhookSaved(true);
    setTimeout(() => setWebhookSaved(false), 2000);
  }

  function startEdit(a: Activity) {
    setEditingId(a.id);
    setForm({
      date: a.date,
      start_time: a.start_time,
      end_time: a.end_time,
      title: a.title,
      type: a.type,
      memo: a.memo ?? "",
      stream_platform: a.stream_platform ?? "Twitch",
      twitch_url: a.twitch_url ?? "",
      youtube_url: a.youtube_url ?? "",
      collab_partner: a.collab_partner ?? "",
      announced: a.announced,
      thumbnail_ready: a.thumbnail_ready,
      thumbnail_path: a.thumbnail_path ?? "",
    });
    setThumbnailFile(null);
    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startDuplicate(a: Activity) {
    setEditingId(null);
    setIsDuplicating(true);
    setForm({
      date: a.date,
      start_time: a.start_time,
      end_time: a.end_time,
      title: a.title,
      type: a.type,
      memo: a.memo ?? "",
      stream_platform: a.stream_platform ?? "Twitch",
      twitch_url: a.twitch_url ?? "",
      youtube_url: a.youtube_url ?? "",
      collab_partner: a.collab_partner ?? "",
      announced: a.announced,
      thumbnail_ready: a.thumbnail_ready,
      thumbnail_path: "",
    });
    setThumbnailFile(null);
    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setIsDuplicating(false);
    setForm(emptyForm());
    setThumbnailFile(null);
    setError("");
    setSuccess("");
  }

  function loadTemplate(t: Template) {
    setForm({
      date: today(),
      start_time: "",
      end_time: "",
      title: t.title,
      type: t.type,
      memo: t.memo,
      stream_platform: t.stream_platform,
      twitch_url: t.twitch_url,
      youtube_url: t.youtube_url,
      collab_partner: t.collab_partner,
      announced: t.announced,
      thumbnail_ready: t.thumbnail_ready,
      thumbnail_path: "",
    });
    setEditingId(null);
    setIsDuplicating(false);
    setThumbnailFile(null);
    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveTemplate() {
    if (!templateName.trim()) return;
    const t: Template = {
      id: crypto.randomUUID(),
      name: templateName.trim(),
      title: form.title,
      memo: form.memo,
      type: form.type,
      stream_platform: form.stream_platform,
      twitch_url: form.twitch_url,
      youtube_url: form.youtube_url,
      collab_partner: form.collab_partner,
      announced: form.announced,
      thumbnail_ready: form.thumbnail_ready,
    };
    const res = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(t),
    });
    if (res.ok) {
      setTemplates(await res.json());
      setTemplateName("");
    }
  }

  async function deleteTemplate(id: string) {
    const res = await fetch("/api/templates", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) setTemplates(await res.json());
  }

  function selectTemplate(id: string) {
    setSelectedTemplateId(id);
    const t = SCHEDULE_TEMPLATES.find((t) => t.id === id) ?? SCHEDULE_TEMPLATES[0];
    setScheduleFont(t.font);
    setScheduleCanvasReady(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (form.type !== "休み") {
        const { h: sh, m: sm } = splitTime(form.start_time);
        const { h: eh, m: em } = splitTime(form.end_time);
        const toNum = (s: string) => parseInt(s, 10);
        const invalid =
          !sh || !sm || !eh || !em ||
          isNaN(toNum(sh)) || toNum(sh) < 0 || toNum(sh) > 23 ||
          isNaN(toNum(sm)) || toNum(sm) < 0 || toNum(sm) > 59 ||
          isNaN(toNum(eh)) || toNum(eh) < 0 || toNum(eh) > 23 ||
          isNaN(toNum(em)) || toNum(em) < 0 || toNum(em) > 59;
        if (invalid) {
          setError("時間の入力値が正しくありません（時: 00〜23、分: 00〜59）");
          setLoading(false);
          return;
        }
      }

      let uploadedPath = form.thumbnail_path;
      if (thumbnailFile) {
        const fd = new FormData();
        fd.append("file", thumbnailFile);
        const upRes = await fetch("/api/upload", { method: "POST", body: fd });
        if (!upRes.ok) {
          setError("画像のアップロードに失敗しました");
          return;
        }
        const { path } = await upRes.json();
        uploadedPath = path;
      }

      const url = editingId ? `/api/activities/${editingId}` : "/api/activities";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, thumbnail_path: uploadedPath }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "エラーが発生しました");
        return;
      }

      setSuccess(editingId ? "更新しました" : "保存しました");
      setEditingId(null);
      setIsDuplicating(false);
      setForm(emptyForm());
      setThumbnailFile(null);
      await fetchActivities();
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  async function toggleField(id: number, field: "announced" | "thumbnail_ready", current: boolean) {
    try {
      const res = await fetch(`/api/activities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: !current }),
      });
      if (!res.ok) return;
      const updated: Activity = await res.json();
      setActivities((prev) => prev.map((a) => (a.id === id ? updated : a)));
    } catch {
      // silent — non-critical toggle
    }
  }

  async function handleDelete(id: number) {
    try {
      const res = await fetch(`/api/activities/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "削除に失敗しました");
        return;
      }
      if (editingId === id) cancelEdit();
      await fetchActivities();
    } catch {
      alert("通信エラーが発生しました");
    } finally {
      setDeleteTargetId(null);
    }
  }

  async function generateScheduleImage() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const tmpl = SCHEDULE_TEMPLATES.find((t) => t.id === selectedTemplateId) ?? SCHEDULE_TEMPLATES[0];
    const { layout, textColor, fontSizes } = tmpl;
    const font = scheduleFont;
    const W = layout.canvasWidth;
    const H = layout.canvasHeight;
    const SPLIT = layout.mainImage.x;

    canvas.width = W;
    canvas.height = H;

    const weekDates = getWeekDates(scheduleWeekOffset);
    const DAYS_JA = ["月", "火", "水", "木", "金", "土", "日"];

    // ① 背景：テンプレ画像 or プログラム描画（フォールバック）
    if (layout.backgroundImage) {
      const bgImg = new Image();
      bgImg.src = layout.backgroundImage;
      await new Promise<void>((resolve) => { bgImg.onload = () => resolve(); });
      ctx.drawImage(bgImg, 0, 0, W, H);
    } else {
      const HEADER_H = layout.days[0].y;
      const BADGE_COLORS: Record<string, string> = {
        配信: "#ef4444", 動画: "#3b82f6", 作業: "#3b82f6", 休み: "#22c55e",
      };

      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, W, H);

      // ヘッダー
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, 0, SPLIT, HEADER_H);
      ctx.fillStyle = "#f8fafc";
      ctx.font = "bold 24px sans-serif";
      ctx.fillText("週間スケジュール", 24, 40);
      ctx.fillStyle = "#94a3b8";
      ctx.font = "13px sans-serif";
      ctx.fillText(
        `${weekDates[0].slice(5).replace("-", "/")} 〜 ${weekDates[6].slice(5).replace("-", "/")}`,
        24, 60
      );

      // 行背景・区切り・曜日・日付・バッジ
      for (let i = 0; i < 7; i++) {
        const slot = layout.days[i];
        const activity = pickForDay(activities, weekDates[i]);
        const { x, y, width, height, textBaseline } = slot;
        const midY = y + textBaseline;

        ctx.fillStyle = i % 2 === 0 ? "#111827" : "#0d1526";
        ctx.fillRect(x, y, width, height);

        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y + height);
        ctx.lineTo(x + width, y + height);
        ctx.stroke();

        const dayColor = i === 5 ? "#60a5fa" : i === 6 ? "#f87171" : "#e2e8f0";
        ctx.fillStyle = dayColor;
        ctx.font = "bold 20px sans-serif";
        ctx.fillText(DAYS_JA[i], 16, midY);

        ctx.fillStyle = "#64748b";
        ctx.font = "13px sans-serif";
        ctx.fillText(weekDates[i].slice(5).replace("-", "/"), 42, midY);

        if (activity) {
          const badgeColor = BADGE_COLORS[activity.type] ?? "#6b7280";
          ctx.fillStyle = badgeColor;
          ctx.fillRect(96, Math.round(y + height * 0.22), 44, 22);
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 11px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(activity.type, 118, Math.round(y + height * 0.22) + 15);
          ctx.textAlign = "left";
        }
      }

      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(SPLIT, 0);
      ctx.lineTo(SPLIT, H);
      ctx.stroke();
    }

    // ② メイン画像（clip + cover fit）
    if (scheduleMainImageFile) {
      const img = new Image();
      img.src = URL.createObjectURL(scheduleMainImageFile);
      await new Promise<void>((resolve) => { img.onload = () => resolve(); });
      const { x, y, width, height } = layout.mainImage;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, width, height);
      ctx.clip();
      const scale = Math.max(width / img.width, height / img.height);
      const dw = img.width * scale, dh = img.height * scale;
      ctx.drawImage(img, x + (width - dw) / 2, y + (height - dh) / 2, dw, dh);
      ctx.restore();
      if (!layout.backgroundImage) {
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.fillRect(layout.mainImage.x, 0, W - SPLIT, H);
      }
    } else if (!layout.backgroundImage) {
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(SPLIT, 0, W - SPLIT, H);
      ctx.fillStyle = "#475569";
      ctx.font = "16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("画像未選択", SPLIT + (W - SPLIT) / 2, H / 2);
      ctx.textAlign = "left";
    }

    // デバッグ枠線（scheduleDebug が true のときのみ描画）
    if (scheduleDebug) {
      ctx.lineWidth = 2;
      for (let i = 0; i < 7; i++) {
        const { x, y, width, height } = layout.days[i];
        ctx.strokeStyle = "rgba(255, 60, 60, 0.8)";
        ctx.strokeRect(x, y, width, height);
        ctx.fillStyle = "rgba(255, 60, 60, 0.6)";
        ctx.font = "bold 16px sans-serif";
        ctx.fillText(`days[${i}] y=${y} h=${height}`, x + 4, y + 18);
      }
      const mi = layout.mainImage;
      ctx.strokeStyle = "rgba(0, 210, 255, 0.9)";
      ctx.lineWidth = 3;
      ctx.strokeRect(mi.x, mi.y, mi.width, mi.height);
      ctx.fillStyle = "rgba(0, 210, 255, 0.8)";
      ctx.font = "bold 16px sans-serif";
      ctx.fillText(`mainImage x=${mi.x} y=${mi.y} w=${mi.width} h=${mi.height}`, mi.x + 4, mi.y + 20);
    }

    // ③ テキストオーバーレイ（テンプレ座標ベース）
    ctx.fillStyle = textColor;
    for (let i = 0; i < 7; i++) {
      const { x, y, width, paddingLeft, paddingRight, timeOffsetX, textBaseline, dateX, dateY, dateFontSize, titleCenterX, titleLeftLimit, titleRightLimit } = layout.days[i];
      const activity = pickForDay(activities, weekDates[i]);
      const textY = y + textBaseline;

      if (dateX !== undefined && dateY !== undefined) {
        const dateStr = weekDates[i].slice(5).replace("-", "/");
        const dateDrawX = x + dateX;
        const dateDrawY = y + dateY;
        ctx.font = `bold ${dateFontSize ?? fontSizes.time}px ${font}`;
        ctx.textAlign = "center";
        ctx.lineWidth = 4;
        ctx.strokeStyle = "#ffffff";
        ctx.strokeText(dateStr, dateDrawX, dateDrawY);
        ctx.fillStyle = "#000000";
        ctx.fillText(dateStr, dateDrawX, dateDrawY);
        ctx.textAlign = "left";
      }

      const textCenterX = x + paddingLeft + (width - paddingLeft - paddingRight) / 2;

      if (!activity) {
        ctx.font = `${fontSizes.empty}px ${font}`;
        ctx.textAlign = "center";
        ctx.fillText("予定なし", textCenterX + 20, textY);
        ctx.textAlign = "left";
        continue;
      }

      let titleX = x + paddingLeft;
      if (activity.type === "休み" || ((activity.type === "作業" || activity.type === "動画") && selectedTemplateId !== "black-red")) {
        ctx.font = `bold ${fontSizes.time}px ${font}`;
        ctx.textAlign = "left";
        if (selectedTemplateId === "black-red") {
          ctx.fillText("OFF", x + paddingLeft - 20, textY);
        } else {
          ctx.fillText("OFF", x + paddingLeft, textY);
        }
        titleX = x + paddingLeft + timeOffsetX;
      } else if (activity.start_time) {
        ctx.font = `bold ${fontSizes.time}px ${font}`;
        ctx.textAlign = "left";
        const time = activity.start_time;
        const colonIndex = time.indexOf(":");
        const beforeColon = colonIndex >= 0 ? time.slice(0, colonIndex) : "";
        const colonOffset = ctx.measureText(beforeColon).width;
        ctx.fillText(time, x + paddingLeft - colonOffset + 10, textY);
        titleX = x + paddingLeft + timeOffsetX;
      }

      const maxW = (x + width - paddingRight) - titleX;
      ctx.font = `bold ${fontSizes.title}px ${font}`;

      if (selectedTemplateId === "black-red" && titleCenterX != null && titleLeftLimit != null && titleRightLimit != null) {
        const availableW = titleRightLimit - titleLeftLimit;
        let title = activity.title;
        while (ctx.measureText(title + "…").width > availableW && title.length > 0) {
          title = title.slice(0, -1);
        }
        const displayTitle = title.length < activity.title.length ? title + "…" : title;
        ctx.textAlign = "center";
        ctx.fillText(displayTitle, titleCenterX, textY);
        ctx.textAlign = "left";
      } else {
        let title = activity.title;
        while (ctx.measureText(title + "…").width > maxW && title.length > 0) {
          title = title.slice(0, -1);
        }
        const displayTitle = title.length < activity.title.length ? title + "…" : title;
        if (selectedTemplateId === "black-red") {
          ctx.textAlign = "center";
          ctx.fillText(displayTitle, textCenterX + 60, textY);
          ctx.textAlign = "left";
        } else {
          ctx.textAlign = "left";
          ctx.fillText(displayTitle, titleX, textY);
        }
      }
    }

    setScheduleCanvasReady(true);
  }

  function downloadSchedule() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const weekDates = getWeekDates(scheduleWeekOffset);
    const link = document.createElement("a");
    link.download = `schedule-${weekDates[0]}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  const todayStr = today();

  const todayActivities = activities
    .filter((a) => {
      if (filterType !== "すべて" && a.type !== filterType) return false;
      return a.date === todayStr;
    })
    .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));

  const otherActivities = activities
    .filter((a) => {
      if (filterType !== "すべて" && a.type !== filterType) return false;
      return a.date !== todayStr;
    })
    .sort((a, b) => {
      const dateOrder = b.date.localeCompare(a.date);
      if (dateOrder !== 0) return dateOrder;
      return (a.start_time || "").localeCompare(b.start_time || "");
    });

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">読み込み中...</p>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center max-w-sm w-full mx-4">
          <h1 className="text-xl font-semibold text-gray-800 mb-2">活動管理</h1>
          <p className="text-sm text-gray-500 mb-6">ログインしてご利用ください</p>
          <SignInButton mode="modal">
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-md transition-colors">
              ログイン
            </button>
          </SignInButton>
        </div>
      </div>
    );
  }

  const renderCard = (a: Activity) => (
    <li
      key={a.id}
      className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-start gap-3"
    >
      {a.thumbnail_path && (
        <img
          src={a.thumbnail_path}
          alt="サムネ"
          onClick={() => setPreviewSrc(a.thumbnail_path)}
          className="w-20 h-14 object-cover rounded shrink-0 border border-gray-100 cursor-zoom-in"
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-800">{a.title}</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[a.type]}`}>
            {a.type === "作業" ? "動画" : a.type}
          </span>
        </div>
        <div className="text-xs text-gray-500 mt-0.5">
          {a.date}
          {a.start_time && ` \u00a0 ${a.start_time} – ${a.end_time}`}
        </div>
        {a.type === "配信" && (
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
            {a.stream_platform && (
              <span className="text-xs text-gray-500">{a.stream_platform}</span>
            )}
            {a.twitch_url && (
              <a href={a.twitch_url} target="_blank" rel="noopener noreferrer"
                className="text-xs text-purple-600 hover:underline">
                Twitch
              </a>
            )}
            {a.youtube_url && (
              <a href={a.youtube_url} target="_blank" rel="noopener noreferrer"
                className="text-xs text-red-500 hover:underline">
                YouTube
              </a>
            )}
            {a.collab_partner && (
              <span className="text-xs text-gray-500">コラボ: {a.collab_partner}</span>
            )}
            <button
              onClick={() => toggleField(a.id, "announced", a.announced)}
              className={`text-xs px-1.5 py-0.5 rounded border transition-colors ${a.announced
                ? "border-green-400 bg-green-50 text-green-700 hover:bg-green-100"
                : "border-gray-300 bg-white text-gray-400 hover:bg-gray-50"
                }`}
            >
              告知{a.announced ? "済✓" : "未"}
            </button>
            <button
              onClick={() => toggleField(a.id, "thumbnail_ready", a.thumbnail_ready)}
              className={`text-xs px-1.5 py-0.5 rounded border transition-colors ${a.thumbnail_ready
                ? "border-green-400 bg-green-50 text-green-700 hover:bg-green-100"
                : "border-gray-300 bg-white text-gray-400 hover:bg-gray-50"
                }`}
            >
              サムネ{a.thumbnail_ready ? "済✓" : "未"}
            </button>
          </div>
        )}
        {a.memo && (
          <p className="text-xs text-gray-500 mt-1 whitespace-pre-wrap">{a.memo}</p>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => startEdit(a)}
          className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
        >
          編集
        </button>
        <button
          onClick={() => startDuplicate(a)}
          className="text-xs text-emerald-600 hover:text-emerald-800 px-2 py-1 rounded hover:bg-emerald-50 transition-colors"
        >
          複製
        </button>
        <button
          onClick={() => setDeleteTargetId(a.id)}
          className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors"
        >
          削除
        </button>
      </div>
    </li>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">
          活動管理
          <span className="ml-1.5 text-sm font-normal text-gray-400">{APP_VERSION}</span>
        </h1>
        <div>
          {isSignedIn ? (
            <UserButton />
          ) : (
            <SignInButton mode="modal">
              <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                ログイン
              </button>
            </SignInButton>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Templates */}
        <section className="bg-white rounded-lg border border-gray-200">
          <button
            type="button"
            onClick={() => setShowTemplates((v) => !v)}
            className="w-full flex items-center justify-between px-6 py-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors rounded-lg"
          >
            <span>テンプレート</span>
            <span className="text-gray-400 text-xs">{showTemplates ? "▲" : "▼"}</span>
          </button>
          {showTemplates && (
            <div className="px-6 pb-5 border-t border-gray-100 space-y-3">
              {templates.length === 0 ? (
                <p className="text-sm text-gray-400 pt-3">テンプレートがありません</p>
              ) : (
                <ul className="space-y-2 pt-3">
                  {templates.map((t) => (
                    <li key={t.id} className="flex items-center gap-2">
                      <span className="flex-1 text-sm text-gray-700 truncate">{t.name}</span>
                      <button
                        type="button"
                        onClick={() => loadTemplate(t)}
                        className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50 transition-colors shrink-0"
                      >
                        読み込み
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteTemplate(t.id)}
                        className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors shrink-0"
                      >
                        削除
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="テンプレート名を入力して保存"
                  className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={saveTemplate}
                  disabled={!templateName.trim()}
                  className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-800 disabled:opacity-40 text-white rounded-md transition-colors shrink-0"
                >
                  保存
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Form */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">
            {editingId ? "予定を編集" : isDuplicating ? "複製して追加" : "予定を追加"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">日付 *</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">種別 *</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as ActivityType })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>配信</option>
                  <option>動画</option>
                  <option>休み</option>
                </select>
              </div>
            </div>

            {form.type !== "休み" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">開始時間 *</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      inputMode="numeric"
                      list="start-hour-candidates"
                      value={splitTime(form.start_time).h}
                      onChange={(e) => setForm({ ...form, start_time: joinTime(e.target.value, splitTime(form.start_time).m) })}
                      onBlur={(e) => {
                        const v = e.target.value;
                        if (/^\d$/.test(v)) setForm({ ...form, start_time: joinTime(v.padStart(2, "0"), splitTime(form.start_time).m) });
                      }}
                      placeholder="00"
                      maxLength={2}
                      className="w-14 border border-gray-300 rounded-md px-2 py-2 text-sm text-gray-900 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <datalist id="start-hour-candidates">
                      {HOUR_OPTIONS.map((h) => <option key={h} value={h} />)}
                    </datalist>
                    <span className="text-gray-400 text-sm select-none">:</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      list="start-minute-candidates"
                      value={splitTime(form.start_time).m}
                      onChange={(e) => setForm({ ...form, start_time: joinTime(splitTime(form.start_time).h, e.target.value) })}
                      onBlur={(e) => {
                        const v = e.target.value;
                        if (/^\d$/.test(v)) setForm({ ...form, start_time: joinTime(splitTime(form.start_time).h, v.padStart(2, "0")) });
                      }}
                      placeholder="00"
                      maxLength={2}
                      className="w-14 border border-gray-300 rounded-md px-2 py-2 text-sm text-gray-900 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <datalist id="start-minute-candidates">
                      {MINUTE_OPTIONS.map((m) => <option key={m} value={m} />)}
                    </datalist>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">終了時間 *</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      inputMode="numeric"
                      list="end-hour-candidates"
                      value={splitTime(form.end_time).h}
                      onChange={(e) => setForm({ ...form, end_time: joinTime(e.target.value, splitTime(form.end_time).m) })}
                      onBlur={(e) => {
                        const v = e.target.value;
                        if (/^\d$/.test(v)) setForm({ ...form, end_time: joinTime(v.padStart(2, "0"), splitTime(form.end_time).m) });
                      }}
                      placeholder="00"
                      maxLength={2}
                      className="w-14 border border-gray-300 rounded-md px-2 py-2 text-sm text-gray-900 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <datalist id="end-hour-candidates">
                      {HOUR_OPTIONS.map((h) => <option key={h} value={h} />)}
                    </datalist>
                    <span className="text-gray-400 text-sm select-none">:</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      list="end-minute-candidates"
                      value={splitTime(form.end_time).m}
                      onChange={(e) => setForm({ ...form, end_time: joinTime(splitTime(form.end_time).h, e.target.value) })}
                      onBlur={(e) => {
                        const v = e.target.value;
                        if (/^\d$/.test(v)) setForm({ ...form, end_time: joinTime(splitTime(form.end_time).h, v.padStart(2, "0")) });
                      }}
                      placeholder="00"
                      maxLength={2}
                      className="w-14 border border-gray-300 rounded-md px-2 py-2 text-sm text-gray-900 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <datalist id="end-minute-candidates">
                      {MINUTE_OPTIONS.map((m) => <option key={m} value={m} />)}
                    </datalist>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm text-gray-600 mb-1">タイトル *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                placeholder="例: 朝配信"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {form.type === "配信" && (
              <>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">配信先 *</label>
                  <div className="flex gap-3">
                    {(["Twitch", "YouTube", "両方"] as StreamPlatform[]).map((p) => (
                      <label key={p} className="flex items-center gap-1.5 cursor-pointer select-none">
                        <input
                          type="radio"
                          name="stream_platform"
                          value={p}
                          checked={form.stream_platform === p}
                          onChange={() => setForm({ ...form, stream_platform: p })}
                          className="accent-blue-600"
                        />
                        <span className="text-sm text-gray-700">{p}</span>
                      </label>
                    ))}
                  </div>
                </div>
                {(form.stream_platform === "Twitch" || form.stream_platform === "両方") && (
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Twitch URL</label>
                    <input
                      type="url"
                      value={form.twitch_url}
                      onChange={(e) => setForm({ ...form, twitch_url: e.target.value })}
                      placeholder="任意"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
                {(form.stream_platform === "YouTube" || form.stream_platform === "両方") && (
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">YouTube URL</label>
                    <input
                      type="url"
                      value={form.youtube_url}
                      onChange={(e) => setForm({ ...form, youtube_url: e.target.value })}
                      placeholder="任意"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm text-gray-600 mb-1">コラボ相手</label>
                  <input
                    type="text"
                    value={form.collab_partner}
                    onChange={(e) => setForm({ ...form, collab_partner: e.target.value })}
                    placeholder="任意"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.announced}
                      onChange={(e) => setForm({ ...form, announced: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">告知済み</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.thumbnail_ready}
                      onChange={(e) => setForm({ ...form, thumbnail_ready: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">サムネ作成済み</span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">サムネ画像</label>
                  {form.thumbnail_path && !thumbnailFile && (
                    <div className="mb-2">
                      <img
                        src={form.thumbnail_path}
                        alt="現在のサムネ"
                        className="w-32 h-20 object-cover rounded border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, thumbnail_path: "" })}
                        className="mt-1 text-xs text-red-500 hover:text-red-700"
                      >
                        画像を削除
                      </button>
                    </div>
                  )}
                  {thumbnailFile && (
                    <div className="mb-2">
                      <img
                        src={URL.createObjectURL(thumbnailFile)}
                        alt="プレビュー"
                        className="w-32 h-20 object-cover rounded border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => setThumbnailFile(null)}
                        className="mt-1 text-xs text-red-500 hover:text-red-700"
                      >
                        選択解除
                      </button>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setThumbnailFile(e.target.files?.[0] ?? null)}
                    className="text-sm text-gray-600 file:mr-3 file:py-1 file:px-3 file:rounded file:border file:border-gray-300 file:text-sm file:bg-white file:text-gray-600 hover:file:bg-gray-50"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm text-gray-600 mb-1">メモ</label>
              <textarea
                value={form.memo}
                onChange={(e) => setForm({ ...form, memo: e.target.value })}
                rows={3}
                placeholder="任意"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm text-green-600">{success}</p>}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-md transition-colors"
              >
                {loading ? "保存中..." : editingId ? "更新" : "保存"}
              </button>
              {(editingId || isDuplicating) && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-4 border border-gray-300 text-gray-600 text-sm font-medium py-2 rounded-md hover:bg-gray-50 transition-colors"
                >
                  キャンセル
                </button>
              )}
            </div>
          </form>
        </section>

        {/* Today */}
        <section>
          <h2 className="text-base font-semibold text-gray-700 mb-3">今日の予定</h2>
          {todayActivities.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">今日の予定はありません</p>
          ) : (
            <ul className="space-y-2">{todayActivities.map(renderCard)}</ul>
          )}
        </section>

        {/* All (excluding today) */}
        <section>
          <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
            <h2 className="text-base font-semibold text-gray-700">すべての予定</h2>
            <div className="flex rounded-md overflow-hidden border border-gray-300 text-sm">
              {(["すべて", "配信", "動画", "休み"] as FilterType[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterType(f)}
                  className={`px-3 py-1 transition-colors ${filterType === f
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          {otherActivities.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              {activities.length === 0 ? "まだ予定がありません" : "該当する予定がありません"}
            </p>
          ) : (
            <ul className="space-y-2">{otherActivities.map(renderCard)}</ul>
          )}
        </section>

        {/* Settings */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">設定</h2>
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Discord Webhook URL
              <span className="ml-2 text-xs text-gray-400">（配信開始30分前に自動通知）</span>
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://discord.com/api/webhooks/..."
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={saveWebhook}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
              >
                {webhookSaved ? "保存済み ✓" : "保存"}
              </button>
            </div>
          </div>
        </section>

        {/* Schedule Generator */}
        <section className="bg-white rounded-lg border border-gray-200">
          <button
            type="button"
            onClick={() => setShowScheduleGen((v) => !v)}
            className="w-full flex items-center justify-between px-6 py-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors rounded-lg"
          >
            <span>スケジュール画像</span>
            <span className="text-gray-400 text-xs">{showScheduleGen ? "▲" : "▼"}</span>
          </button>
          {showScheduleGen && (
            <div className="px-6 pb-6 border-t border-gray-100 space-y-4 pt-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">テンプレート</label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => selectTemplate(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {SCHEDULE_TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                {(() => {
                  const t = SCHEDULE_TEMPLATES.find((t) => t.id === selectedTemplateId) ?? SCHEDULE_TEMPLATES[0];
                  if (t.id === "black-red") {
                    return <p className="mt-1.5 text-xs text-amber-600">黒赤テンプレは長いタイトルだと重なって見えることがあります。18文字前後を目安にしてください。</p>;
                  }
                  if (!t.layout.backgroundImage) {
                    return <p className="mt-1.5 text-xs text-amber-600">テンプレ画像未設定</p>;
                  }
                  if (t.author.name) {
                    return (
                      <p className="mt-1.5 text-xs text-gray-500">
                        テンプレ作者:{" "}
                        {t.author.url ? (
                          <a
                            href={t.author.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {t.author.name}
                          </a>
                        ) : (
                          t.author.name
                        )}
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">フォント</label>
                <select
                  value={scheduleFont}
                  onChange={(e) => { setScheduleFont(e.target.value); setScheduleCanvasReady(false); }}
                  className="border border-gray-300 rounded-md px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="sans-serif">sans-serif</option>
                  <option value="serif">serif</option>
                  <option value="monospace">monospace</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">対象週</label>
                <div className="flex rounded-md overflow-hidden border border-gray-300 text-sm w-fit">
                  {([0, 1] as const).map((offset) => (
                    <button
                      key={offset}
                      type="button"
                      onClick={() => { setScheduleWeekOffset(offset); setScheduleCanvasReady(false); }}
                      className={`px-4 py-1.5 transition-colors ${scheduleWeekOffset === offset
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-600 hover:bg-gray-50"
                        }`}
                    >
                      {offset === 0 ? "今週" : "来週"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">メイン画像（右側）</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    setScheduleMainImageFile(e.target.files?.[0] ?? null);
                    setScheduleCanvasReady(false);
                  }}
                  className="text-sm text-gray-600 file:mr-3 file:py-1 file:px-3 file:rounded file:border file:border-gray-300 file:text-sm file:bg-white file:text-gray-600 hover:file:bg-gray-50"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-600 select-none cursor-pointer w-fit">
                <input
                  type="checkbox"
                  checked={scheduleDebug}
                  onChange={(e) => setScheduleDebug(e.target.checked)}
                  className="accent-red-500"
                />
                デバッグ枠線を表示（座標確認用）
              </label>
              <button
                type="button"
                onClick={generateScheduleImage}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
              >
                プレビュー生成
              </button>
              <div className="overflow-x-auto">
                <canvas
                  ref={canvasRef}
                  className="rounded border border-gray-200 max-w-full"
                  style={{ display: scheduleCanvasReady ? "block" : "none" }}
                />
              </div>
              {scheduleCanvasReady && (
                <button
                  type="button"
                  onClick={downloadSchedule}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white text-sm font-medium rounded-md transition-colors"
                >
                  ダウンロード
                </button>
              )}
            </div>
          )}
        </section>
      </main>

      {/* Image preview modal */}
      {previewSrc && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewSrc(null)}
        >
          <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewSrc(null)}
              className="absolute -top-8 right-0 text-white text-sm hover:text-gray-300"
            >
              閉じる ✕
            </button>
            <img
              src={previewSrc}
              alt="プレビュー"
              className="w-full h-auto rounded shadow-lg"
            />
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {deleteTargetId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-gray-200 shadow-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-base font-semibold text-gray-800 mb-2">削除の確認</h3>
            <p className="text-sm text-gray-600 mb-6">この予定を削除しますか？この操作は取り消せません。</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteTargetId(null)}
                className="px-4 py-2 text-sm border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={() => handleDelete(deleteTargetId)}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

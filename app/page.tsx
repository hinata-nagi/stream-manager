"use client";

import { useState, useEffect, FormEvent } from "react";
import { useUser, SignInButton, UserButton } from "@clerk/nextjs";

type ActivityType = "配信" | "作業" | "休み";
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

const TYPE_COLORS: Record<ActivityType, string> = {
  配信: "bg-red-100 text-red-700",
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
  type: "作業" as ActivityType,
  memo: "",
  stream_platform: "Twitch" as StreamPlatform,
  twitch_url: "",
  youtube_url: "",
  collab_partner: "",
  announced: false,
  thumbnail_ready: false,
  thumbnail_path: "",
});

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
      .catch(() => {});
    // 起動時通知（24時間以内の準備未完了チェック）
    fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startup: true }),
    }).catch(() => {});
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    const id = setInterval(() => {
      fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }).catch(() => {});
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
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
            {a.type}
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
              className={`text-xs px-1.5 py-0.5 rounded border transition-colors ${
                a.announced
                  ? "border-green-400 bg-green-50 text-green-700 hover:bg-green-100"
                  : "border-gray-300 bg-white text-gray-400 hover:bg-gray-50"
              }`}
            >
              告知{a.announced ? "済✓" : "未"}
            </button>
            <button
              onClick={() => toggleField(a.id, "thumbnail_ready", a.thumbnail_ready)}
              className={`text-xs px-1.5 py-0.5 rounded border transition-colors ${
                a.thumbnail_ready
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
        <h1 className="text-xl font-semibold text-gray-800">活動管理</h1>
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
                  <option>作業</option>
                  <option>休み</option>
                </select>
              </div>
            </div>

            {form.type !== "休み" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">開始時間 *</label>
                  <input
                    type="time"
                    value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">終了時間 *</label>
                  <input
                    type="time"
                    value={form.end_time}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
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
              {(["すべて", "配信", "作業", "休み"] as FilterType[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterType(f)}
                  className={`px-3 py-1 transition-colors ${
                    filterType === f
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

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import type { Video } from "@/types/game";

export default function AdminPage() {
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchVideos = async () => {
    const res = await fetch("/api/admin/videos");
    if (res.ok) setVideos(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchVideos(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this video?")) return;
    setDeleting(id);
    await fetch("/api/admin/videos", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setDeleting(null);
    fetchVideos();
  };

  const handleToggle = async (video: Video) => {
    setToggling(video.id);
    await fetch("/api/admin/videos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: video.id, is_active: !video.is_active }),
    });
    setToggling(null);
    fetchVideos();
  };

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-white">SUBZ Admin</h1>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => router.push("/admin/videos/upload")}>
            Upload video
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : videos.length === 0 ? (
        <p className="text-white/40 text-center py-12">No videos yet. Upload one to get started.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {videos.map((video) => (
            <div key={video.id} className="flex items-start gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-white font-semibold truncate">{video.title}</p>
                <p className="text-white/40 text-sm font-mono">
                  {(video.subtitle_start_ms / 1000).toFixed(2)}s →{" "}
                  {(video.subtitle_end_ms / 1000).toFixed(2)}s
                  &nbsp;·&nbsp;
                  {(video.duration_ms / 1000).toFixed(0)}s total
                </p>
                <span
                  className={`inline-block text-xs px-2 py-0.5 rounded-full ${
                    video.is_active
                      ? "bg-green-500/20 text-green-400"
                      : "bg-white/10 text-white/40"
                  }`}
                >
                  {video.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  loading={toggling === video.id}
                  onClick={() => handleToggle(video)}
                >
                  {video.is_active ? "Deactivate" : "Activate"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`/admin/videos/${video.id}`)}
                >
                  Edit
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  loading={deleting === video.id}
                  onClick={() => handleDelete(video.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-white/20 text-xs text-center">
        {videos.length} video{videos.length !== 1 ? "s" : ""} in library
      </p>
    </div>
  );
}

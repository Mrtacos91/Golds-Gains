"use client";

import { useState, useEffect } from "react";
import {
  Heart,
  Music,
  Lightbulb,
  Flag,
  Dumbbell,
  FileText,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

type Tab = "playlists" | "suggestions" | "reports" | "routines" | "notes";

interface PlaylistShared {
  id: number;
  user_id: string;
  playlist_url: string;
  likes: number;
  shared_at: string;
  users?: { name: string };
  // optional metadata resolved from Spotify oEmbed
  playlist_title?: string | null;
  playlist_image?: string | null;
}

interface FeatureSuggested {
  id: number;
  user_id: string;
  suggestion: string;
  likes: number;
  suggested_at: string;
  users?: { name: string };
}

interface Report {
  id: number;
  user_id: string;
  report_text: string;
  reported_at: string;
  section: string;
  likes?: number;
  users?: { name: string };
}

interface SharedRoutine {
  id: number;
  user_id: string;
  description: string;
  difficulty: string;
  duration: string;
  shared_at: string;
  likes?: number;
  users?: { name: string };
}

export default function CommunitySection() {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<Tab>("playlists");
  const [userId, setUserId] = useState<string>("");
  const [userName, setUserName] = useState<string>("");

  // Data states
  const [playlists, setPlaylists] = useState<PlaylistShared[]>([]);
  const [suggestions, setSuggestions] = useState<FeatureSuggested[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [routines, setRoutines] = useState<SharedRoutine[]>([]);

  // Form states
  const [newPlaylistUrl, setNewPlaylistUrl] = useState("");
  const [newSuggestion, setNewSuggestion] = useState("");
  const [newReportText, setNewReportText] = useState("");
  const [newReportSection, setNewReportSection] = useState("general");
  const [newRoutineDesc, setNewRoutineDesc] = useState("");
  const [newRoutineDifficulty, setNewRoutineDifficulty] =
    useState("intermedio");
  const [newRoutineDuration, setNewRoutineDuration] = useState("60");

  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [animatingLikes, setAnimatingLikes] = useState<number[]>([]);
  const [animatingUnlikes, setAnimatingUnlikes] = useState<number[]>([]);
  const [likedPlaylists, setLikedPlaylists] = useState<number[]>([]);
  const [likedSuggestions, setLikedSuggestions] = useState<number[]>([]);
  const [likedReports, setLikedReports] = useState<number[]>([]);
  const [likedRoutines, setLikedRoutines] = useState<number[]>([]);

  useEffect(() => {
    // Ensure we load user first, then data (so we can fetch user-specific likes)
    (async () => {
      await loadUser();
      await loadData();
      await loadPatchNotes();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  async function loadUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      const { data: userData } = await supabase
        .from("users")
        .select("name")
        .eq("id", user.id)
        .single();
      if (userData) setUserName(userData.name);
    }
  }

  async function loadData() {
    setLoading(true);
    if (activeTab === "playlists") {
      const { data } = await supabase
        .from("playlist_shared")
        .select("*, users(name)")
        .order("shared_at", { ascending: false });
      const raw = data || [];

      // Enrich playlists with Spotify oEmbed (title + thumbnail) when possible
      async function fetchOembed(url: string) {
        try {
          const res = await fetch(
            `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`
          );
          if (!res.ok) return null;
          const json = await res.json();
          return {
            title: json.title as string | undefined,
            thumbnail: (json.thumbnail_url as string) || null,
          };
        } catch (err) {
          return null;
        }
      }

      const enriched = await Promise.all(
        raw.map(async (p: any) => {
          const meta = await fetchOembed(p.playlist_url);
          return {
            ...p,
            playlist_title: meta?.title || null,
            playlist_image: meta?.thumbnail || null,
          };
        })
      );

      setPlaylists(enriched as PlaylistShared[]);

      // Load which playlists the current user has liked (if authenticated)
      await loadUserLikes("playlist");
    } else if (activeTab === "suggestions") {
      const { data } = await supabase
        .from("feature_suggested")
        .select("*, users(name)")
        .order("likes", { ascending: false });
      setSuggestions(data || []);
      await loadUserLikes("suggestion");
    } else if (activeTab === "reports") {
      const { data } = await supabase
        .from("reports")
        .select("*, users(name)")
        .order("reported_at", { ascending: false });
      setReports(data || []);
      await loadUserLikes("report");
    } else if (activeTab === "routines") {
      const { data } = await supabase
        .from("shared_routines")
        .select("*, users(name)")
        .order("shared_at", { ascending: false });
      setRoutines(data || []);
      await loadUserLikes("routine");
    }
    setLoading(false);
  }

  async function loadUserLikes(
    type: "playlist" | "suggestion" | "report" | "routine"
  ) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (type === "playlist") setLikedPlaylists([]);
        if (type === "suggestion") setLikedSuggestions([]);
        if (type === "report") setLikedReports([]);
        if (type === "routine") setLikedRoutines([]);
        return;
      }

      if (type === "playlist") {
        // Playlist likes use playlist_likes table
        const { data: likesData, error: likesError } = await supabase
          .from("playlist_likes")
          .select("playlist_id, like")
          .eq("user_id", user.id)
          .eq("like", true);

        if (!likesError && Array.isArray(likesData)) {
          setLikedPlaylists(likesData.map((l: any) => l.playlist_id));
        } else {
          setLikedPlaylists([]);
        }
      } else {
        // Other types use the unified likes table
        const column =
          type === "suggestion"
            ? "suggestion_id"
            : type === "report"
            ? "report_id"
            : "routine_id";

        const { data: likesData, error: likesError } = await supabase
          .from("likes")
          .select(`${column}, like`)
          .eq("user_id", user.id)
          .eq("like", true)
          .not(column, "is", null);

        if (!likesError && Array.isArray(likesData)) {
          const ids = likesData.map((l: any) => l[column]).filter(Boolean);
          if (type === "suggestion") setLikedSuggestions(ids);
          if (type === "report") setLikedReports(ids);
          if (type === "routine") setLikedRoutines(ids);
        } else {
          if (type === "suggestion") setLikedSuggestions([]);
          if (type === "report") setLikedReports([]);
          if (type === "routine") setLikedRoutines([]);
        }
      }
    } catch (err) {
      if (type === "playlist") setLikedPlaylists([]);
      if (type === "suggestion") setLikedSuggestions([]);
      if (type === "report") setLikedReports([]);
      if (type === "routine") setLikedRoutines([]);
    }
  }

  async function handleLike(
    type: "playlist" | "suggestion" | "report" | "routine",
    id: number
  ) {
    const tableMap = {
      playlist: "playlist_shared",
      suggestion: "feature_suggested",
      report: "reports",
      routine: "shared_routines",
    };
    const table = tableMap[type];

    const currentDataMap = {
      playlist: playlists,
      suggestion: suggestions,
      report: reports,
      routine: routines,
    };
    const currentData = currentDataMap[type];
    const item = currentData.find((i) => i.id === id);
    if (!item) return;

    const likedMap = {
      playlist: likedPlaylists,
      suggestion: likedSuggestions,
      report: likedReports,
      routine: likedRoutines,
    };
    const isLiked = likedMap[type].includes(id);

    // Trigger animation (optimistic)
    if (isLiked) {
      setAnimatingUnlikes((s) => [...s, id]);
      setTimeout(
        () => setAnimatingUnlikes((s) => s.filter((x) => x !== id)),
        300
      );
    } else {
      setAnimatingLikes((s) => [...s, id]);
      setTimeout(
        () => setAnimatingLikes((s) => s.filter((x) => x !== id)),
        350
      );
    }

    // Toggle behavior: if already liked -> unlike (set like=false), else like
    if (isLiked) {
      // Unlike flow
      let shouldDecrement = false;
      try {
        if (userId) {
          if (type === "playlist") {
            // Playlist uses playlist_likes table
            const { data: existing, error: existingErr } = await supabase
              .from("playlist_likes")
              .select("id, like")
              .eq("user_id", userId)
              .eq("playlist_id", id)
              .maybeSingle();

            if (existingErr) {
              shouldDecrement = true;
            } else if (existing && existing.like) {
              const { error: updateErr } = await supabase
                .from("playlist_likes")
                .update({ like: false })
                .eq("id", existing.id);
              if (!updateErr) shouldDecrement = true;
            } else {
              shouldDecrement = true;
            }
          } else {
            // Other types use unified likes table
            const column =
              type === "suggestion"
                ? "suggestion_id"
                : type === "report"
                ? "report_id"
                : "routine_id";

            const { data: existing, error: existingErr } = await supabase
              .from("likes")
              .select("id, like")
              .eq("user_id", userId)
              .eq(column, id)
              .maybeSingle();

            if (existingErr) {
              shouldDecrement = true;
            } else if (existing && existing.like) {
              const { error: updateErr } = await supabase
                .from("likes")
                .update({ like: false })
                .eq("id", existing.id);
              if (!updateErr) shouldDecrement = true;
            } else {
              shouldDecrement = true;
            }
          }
        } else {
          shouldDecrement = true;
        }
      } catch (e) {
        shouldDecrement = true;
      }

      if (shouldDecrement) {
        // Decrement count (guard at zero)
        const newLikes = Math.max((item.likes || 0) - 1, 0);
        await supabase.from(table).update({ likes: newLikes }).eq("id", id);

        // Update local state
        if (type === "playlist") {
          setLikedPlaylists((s) => s.filter((x) => x !== id));
          setPlaylists((prev) =>
            prev.map((p) => (p.id === id ? { ...p, likes: newLikes } : p))
          );
        } else if (type === "suggestion") {
          setLikedSuggestions((s) => s.filter((x) => x !== id));
          setSuggestions((prev) =>
            prev.map((p) => (p.id === id ? { ...p, likes: newLikes } : p))
          );
        } else if (type === "report") {
          setLikedReports((s) => s.filter((x) => x !== id));
          setReports((prev) =>
            prev.map((p) => (p.id === id ? { ...p, likes: newLikes } : p))
          );
        } else if (type === "routine") {
          setLikedRoutines((s) => s.filter((x) => x !== id));
          setRoutines((prev) =>
            prev.map((p) => (p.id === id ? { ...p, likes: newLikes } : p))
          );
        }
      }

      return;
    }

    // Like flow (not previously liked)
    let opError: any = null;
    try {
      if (userId) {
        if (type === "playlist") {
          // Playlist uses playlist_likes table
          const { data: existing, error: existingErr } = await supabase
            .from("playlist_likes")
            .select("id, like")
            .eq("user_id", userId)
            .eq("playlist_id", id)
            .maybeSingle();

          if (existingErr) {
            opError = existingErr;
          } else if (existing) {
            if (!existing.like) {
              const { error: updateErr } = await supabase
                .from("playlist_likes")
                .update({ like: true, liked_at: new Date().toISOString() })
                .eq("id", existing.id);
              if (updateErr) opError = updateErr;
            }
          } else {
            const { error: insertErr } = await supabase
              .from("playlist_likes")
              .insert({
                user_id: userId,
                playlist_id: id,
                like: true,
              });
            if (insertErr) opError = insertErr;
          }
        } else {
          // Other types use unified likes table
          const column =
            type === "suggestion"
              ? "suggestion_id"
              : type === "report"
              ? "report_id"
              : "routine_id";

          const { data: existing, error: existingErr } = await supabase
            .from("likes")
            .select("id, like")
            .eq("user_id", userId)
            .eq(column, id)
            .maybeSingle();

          if (existingErr) {
            opError = existingErr;
          } else if (existing) {
            if (!existing.like) {
              const { error: updateErr } = await supabase
                .from("likes")
                .update({ like: true, liked_at: new Date().toISOString() })
                .eq("id", existing.id);
              if (updateErr) opError = updateErr;
            }
          } else {
            const insertData: any = {
              user_id: userId,
              like: true,
            };
            insertData[column] = id;

            const { error: insertErr } = await supabase
              .from("likes")
              .insert(insertData);
            if (insertErr) opError = insertErr;
          }
        }
      }
    } catch (e) {
      opError = e;
    }

    // Increment count
    const { error } = await supabase
      .from(table)
      .update({ likes: (item.likes || 0) + 1 })
      .eq("id", id);

    // Update local state
    if (type === "playlist") {
      setLikedPlaylists((s) => Array.from(new Set([...s, id])));
    } else if (type === "suggestion") {
      setLikedSuggestions((s) => Array.from(new Set([...s, id])));
    } else if (type === "report") {
      setLikedReports((s) => Array.from(new Set([...s, id])));
    } else if (type === "routine") {
      setLikedRoutines((s) => Array.from(new Set([...s, id])));
    }

    loadData();
  }

  async function handleSubmitPlaylist() {
    if (!newPlaylistUrl.trim() || !userId) return;
    setSubmitLoading(true);
    const { error } = await supabase.from("playlist_shared").insert({
      user_id: userId,
      playlist_url: newPlaylistUrl.trim(),
      likes: 0,
    });
    if (!error) {
      setNewPlaylistUrl("");
      loadData();
    }
    setSubmitLoading(false);
  }

  async function handleSubmitSuggestion() {
    if (!newSuggestion.trim() || !userId) return;
    setSubmitLoading(true);
    const { error } = await supabase.from("feature_suggested").insert({
      user_id: userId,
      suggestion: newSuggestion.trim(),
      likes: 0,
    });
    if (!error) {
      setNewSuggestion("");
      loadData();
    }
    setSubmitLoading(false);
  }

  async function handleSubmitReport() {
    if (!newReportText.trim() || !userId) return;
    setSubmitLoading(true);
    const { error } = await supabase.from("reports").insert({
      user_id: userId,
      report_text: newReportText.trim(),
      section: newReportSection,
    });
    if (!error) {
      setNewReportText("");
      setNewReportSection("general");
      loadData();
    }
    setSubmitLoading(false);
  }

  async function handleSubmitRoutine() {
    if (!newRoutineDesc.trim() || !userId) return;
    setSubmitLoading(true);
    const { error } = await supabase.from("shared_routines").insert({
      user_id: userId,
      description: newRoutineDesc.trim(),
      difficulty: newRoutineDifficulty,
      duration: `${newRoutineDuration} minutes`,
    });
    if (!error) {
      setNewRoutineDesc("");
      setNewRoutineDifficulty("intermedio");
      setNewRoutineDuration("60");
      loadData();
    }
    setSubmitLoading(false);
  }

  const tabs = [
    { id: "playlists" as Tab, label: "Playlists", Icon: Music },
    { id: "suggestions" as Tab, label: "Sugerencias", Icon: Lightbulb },
    { id: "reports" as Tab, label: "Reportes", Icon: Flag },
    { id: "routines" as Tab, label: "Rutinas", Icon: Dumbbell },
    { id: "notes" as Tab, label: "Notas", Icon: FileText },
  ];

  // Patch notes (loaded from public/patch-notes.json). Edit that file in code to change notes.
  const [patchNotes, setPatchNotes] = useState<
    Array<{ version: string; date: string; items: string[] }>
  >([]);

  async function loadPatchNotes() {
    try {
      const res = await fetch("/patch-notes.json", { cache: "no-store" });
      if (!res.ok) return setPatchNotes([]);
      const data = await res.json();
      setPatchNotes(data || []);
    } catch (err) {
      setPatchNotes([]);
    }
  }

  // Realtime subscriptions: listen for changes across all community tables
  useEffect(() => {
    const channels: any[] = [];

    // playlist_shared channel
    const playlistChannel = supabase
      .channel("public-playlist_shared")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "playlist_shared" },
        (payload: any) => {
          const rec = payload.new ?? payload.old;
          if (!rec) return;
          setPlaylists((prev) => {
            if (payload.eventType === "DELETE") {
              return prev.filter((p) => p.id !== rec.id);
            }
            if (payload.eventType === "INSERT") {
              return [
                { ...rec, playlist_title: null, playlist_image: null },
                ...prev,
              ];
            }
            return prev.map((p) => (p.id === rec.id ? { ...p, ...rec } : p));
          });
        }
      )
      .subscribe();
    channels.push(playlistChannel);

    // feature_suggested channel
    const suggestionsChannel = supabase
      .channel("public-feature_suggested")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "feature_suggested" },
        (payload: any) => {
          const rec = payload.new ?? payload.old;
          if (!rec) return;
          setSuggestions((prev) => {
            if (payload.eventType === "DELETE") {
              return prev.filter((s) => s.id !== rec.id);
            }
            if (payload.eventType === "INSERT") {
              return [...prev, rec];
            }
            return prev.map((s) => (s.id === rec.id ? { ...s, ...rec } : s));
          });
        }
      )
      .subscribe();
    channels.push(suggestionsChannel);

    // reports channel
    const reportsChannel = supabase
      .channel("public-reports")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reports" },
        (payload: any) => {
          const rec = payload.new ?? payload.old;
          if (!rec) return;
          setReports((prev) => {
            if (payload.eventType === "DELETE") {
              return prev.filter((r) => r.id !== rec.id);
            }
            if (payload.eventType === "INSERT") {
              return [...prev, rec];
            }
            return prev.map((r) => (r.id === rec.id ? { ...r, ...rec } : r));
          });
        }
      )
      .subscribe();
    channels.push(reportsChannel);

    // shared_routines channel
    const routinesChannel = supabase
      .channel("public-shared_routines")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shared_routines" },
        (payload: any) => {
          const rec = payload.new ?? payload.old;
          if (!rec) return;
          setRoutines((prev) => {
            if (payload.eventType === "DELETE") {
              return prev.filter((r) => r.id !== rec.id);
            }
            if (payload.eventType === "INSERT") {
              return [...prev, rec];
            }
            return prev.map((r) => (r.id === rec.id ? { ...r, ...rec } : r));
          });
        }
      )
      .subscribe();
    channels.push(routinesChannel);

    // playlist_likes channel (filtered by current user)
    if (userId) {
      const playlistLikesChannel = supabase
        .channel(`user-playlist-likes-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "playlist_likes",
            filter: `user_id=eq.${userId}`,
          },
          (payload: any) => {
            if (payload.eventType === "INSERT" && payload.new?.like) {
              setLikedPlaylists((s) =>
                Array.from(new Set([...s, payload.new.playlist_id]))
              );
            } else if (payload.eventType === "UPDATE") {
              if (payload.new?.like) {
                setLikedPlaylists((s) =>
                  Array.from(new Set([...s, payload.new.playlist_id]))
                );
              } else {
                setLikedPlaylists((s) =>
                  s.filter((x) => x !== payload.new.playlist_id)
                );
              }
            } else if (
              payload.eventType === "DELETE" &&
              payload.old?.playlist_id
            ) {
              setLikedPlaylists((s) =>
                s.filter((x) => x !== payload.old.playlist_id)
              );
            }
          }
        )
        .subscribe();
      channels.push(playlistLikesChannel);

      // unified likes channel (for suggestions, reports, routines)
      const likesChannel = supabase
        .channel(`user-likes-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "likes",
            filter: `user_id=eq.${userId}`,
          },
          (payload: any) => {
            if (payload.eventType === "INSERT" && payload.new?.like) {
              if (payload.new.suggestion_id) {
                setLikedSuggestions((s) =>
                  Array.from(new Set([...s, payload.new.suggestion_id]))
                );
              }
              if (payload.new.report_id) {
                setLikedReports((s) =>
                  Array.from(new Set([...s, payload.new.report_id]))
                );
              }
              if (payload.new.routine_id) {
                setLikedRoutines((s) =>
                  Array.from(new Set([...s, payload.new.routine_id]))
                );
              }
            } else if (payload.eventType === "UPDATE") {
              if (payload.new?.like) {
                if (payload.new.suggestion_id) {
                  setLikedSuggestions((s) =>
                    Array.from(new Set([...s, payload.new.suggestion_id]))
                  );
                }
                if (payload.new.report_id) {
                  setLikedReports((s) =>
                    Array.from(new Set([...s, payload.new.report_id]))
                  );
                }
                if (payload.new.routine_id) {
                  setLikedRoutines((s) =>
                    Array.from(new Set([...s, payload.new.routine_id]))
                  );
                }
              } else {
                if (payload.new.suggestion_id) {
                  setLikedSuggestions((s) =>
                    s.filter((x) => x !== payload.new.suggestion_id)
                  );
                }
                if (payload.new.report_id) {
                  setLikedReports((s) =>
                    s.filter((x) => x !== payload.new.report_id)
                  );
                }
                if (payload.new.routine_id) {
                  setLikedRoutines((s) =>
                    s.filter((x) => x !== payload.new.routine_id)
                  );
                }
              }
            } else if (payload.eventType === "DELETE") {
              if (payload.old?.suggestion_id) {
                setLikedSuggestions((s) =>
                  s.filter((x) => x !== payload.old.suggestion_id)
                );
              }
              if (payload.old?.report_id) {
                setLikedReports((s) =>
                  s.filter((x) => x !== payload.old.report_id)
                );
              }
              if (payload.old?.routine_id) {
                setLikedRoutines((s) =>
                  s.filter((x) => x !== payload.old.routine_id)
                );
              }
            }
          }
        )
        .subscribe();
      channels.push(likesChannel);
    }

    return () => {
      try {
        channels.forEach((ch) => {
          if (ch) supabase.removeChannel(ch);
        });
      } catch (e) {
        // ignore cleanup errors
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return (
    <div className="space-y-4 sm:space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-linear-to-br from-[#0a0a0a] via-[#1a1a1a] to-gray-900 rounded-xl p-4 sm:p-6 border border-gray-800/50 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
            <svg
              className="w-5 h-5 sm:w-6 sm:h-6 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a4 4 0 00-4-4h-1M9 20H4v-2a4 4 0 014-4h1m0-4a4 4 0 100-8 4 4 0 000 8zm8 0a4 4 0 100-8 4 4 0 000 8z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              Community Hub
            </h2>
            <p className="text-xs sm:text-sm text-gray-400">
              Comparte, sugiere y conecta con la comunidad
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = (tab as any).Icon as any;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                aria-pressed={isActive}
                aria-label={tab.label}
                className={`flex-1 flex items-center justify-center sm:justify-start gap-2 px-3 py-3 sm:px-4 sm:py-2 rounded-lg font-medium transition-all whitespace-nowrap text-xs sm:text-sm min-w-[72px] ${
                  isActive
                    ? "bg-green-500 text-white shadow-lg shadow-green-500/30"
                    : "bg-[#0f0f0f] text-gray-400 hover:text-white hover:bg-[#1a1a1a]"
                }`}
              >
                {/* Icon visible on small screens for quick identification */}
                {Icon && (
                  <Icon
                    className={`block sm:hidden w-5 h-5 ${
                      isActive ? "text-white" : "text-gray-400"
                    }`}
                  />
                )}

                {/* Label hidden on very small screens, visible on sm+ */}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="bg-linear-to-br from-[#0a0a0a] via-[#1a1a1a] to-gray-900 rounded-xl p-4 sm:p-6 border border-gray-800/50 shadow-xl">
        {/* Playlists Tab */}
        {activeTab === "playlists" && (
          <div className="space-y-4">
            <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
              Playlists de Entrenamiento
            </h3>

            {/* Add playlist form */}
            <div className="bg-[#0f0f0f] rounded-lg p-3 sm:p-4 border border-gray-800/50">
              <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-2">
                Compartir playlist de Spotify
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={newPlaylistUrl}
                  onChange={(e) => setNewPlaylistUrl(e.target.value)}
                  placeholder="https://open.spotify.com/playlist/..."
                  className="flex-1 px-3 py-2 bg-[#0a0a0a] border border-gray-800/50 rounded-lg text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button
                  onClick={handleSubmitPlaylist}
                  disabled={submitLoading || !newPlaylistUrl.trim()}
                  className="px-3 sm:px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all disabled:opacity-50 text-xs sm:text-sm font-medium"
                >
                  {submitLoading ? "..." : "Compartir"}
                </button>
              </div>
            </div>

            {/* Playlists list */}
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
              </div>
            ) : (
              <div className="space-y-3">
                {playlists.length === 0 ? (
                  <p className="text-center text-gray-500 py-8 text-sm">
                    No hay playlists compartidas aún. ¡Sé el primero!
                  </p>
                ) : (
                  playlists.map((playlist) => (
                    <div
                      key={playlist.id}
                      className="bg-[#0f0f0f] rounded-lg p-3 sm:p-4 border border-gray-800/50 hover:border-green-500/50 transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0 flex items-center gap-3">
                          {playlist.playlist_image ? (
                            <img
                              src={playlist.playlist_image}
                              alt={playlist.playlist_title || "playlist"}
                              className="w-12 h-12 sm:w-14 sm:h-14 rounded-md object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-md bg-gray-800 flex items-center justify-center text-gray-400 text-xs sm:text-sm shrink-0">
                              IMG
                            </div>
                          )}

                          <div className="min-w-0">
                            <a
                              href={playlist.playlist_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-400 hover:text-green-300 text-xs sm:text-sm font-medium wrap-break-word hover:underline"
                            >
                              {playlist.playlist_title || playlist.playlist_url}
                            </a>
                            <p className="text-xs text-gray-500 mt-1">
                              Por {playlist.users?.name || "Usuario"} •{" "}
                              {new Date(
                                playlist.shared_at
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <a
                            href={playlist.playlist_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 bg-[#0a0a0a] hover:bg-green-500/20 rounded-lg transition-all shrink-0 text-xs sm:text-sm text-green-400 font-medium"
                          >
                            Abrir
                          </a>

                          <button
                            onClick={() => handleLike("playlist", playlist.id)}
                            aria-label="Me gusta playlist"
                            aria-pressed={likedPlaylists.includes(playlist.id)}
                            className={`flex items-center gap-2 px-2 sm:px-3 py-1 bg-[#0a0a0a] rounded-lg transition-all shrink-0 transform duration-200 ease-out hover:bg-green-500/20 ${
                              likedPlaylists.includes(playlist.id)
                                ? "opacity-90"
                                : ""
                            }`}
                          >
                            <span
                              className={`flex items-center justify-center transform transition-transform duration-200 ${
                                animatingLikes.includes(playlist.id)
                                  ? "scale-110 text-red-500"
                                  : animatingUnlikes.includes(playlist.id)
                                  ? "scale-90 text-gray-400/80"
                                  : likedPlaylists.includes(playlist.id)
                                  ? "scale-100 text-red-500"
                                  : "scale-100 text-gray-300"
                              }`}
                            >
                              <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
                            </span>
                            <span className="text-xs sm:text-sm text-gray-400">
                              {playlist.likes || 0}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Suggestions Tab */}
        {activeTab === "suggestions" && (
          <div className="space-y-4">
            <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
              Sugerencias de Funcionalidades
            </h3>
            <p className="text-xs sm:text-sm text-gray-400">
              La sugerencia con más likes se implementará próximamente
            </p>

            {/* Add suggestion form */}
            <div className="bg-[#0f0f0f] rounded-lg p-3 sm:p-4 border border-gray-800/50">
              <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-2">
                Proponer una nueva funcionalidad
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <textarea
                  value={newSuggestion}
                  onChange={(e) => setNewSuggestion(e.target.value)}
                  placeholder="Describe tu idea para mejorar la app..."
                  rows={3}
                  className="flex-1 px-3 py-2 bg-[#0a0a0a] border border-gray-800/50 rounded-lg text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                />
                <button
                  onClick={handleSubmitSuggestion}
                  disabled={submitLoading || !newSuggestion.trim()}
                  className="px-3 sm:px-4 py-2 bg-blue-400 hover:bg-blue-500 text-white rounded-lg transition-all disabled:opacity-50 text-xs sm:text-sm font-medium h-fit"
                >
                  {submitLoading ? "..." : "Sugerir"}
                </button>
              </div>
            </div>

            {/* Suggestions list */}
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
              </div>
            ) : (
              <div className="space-y-3">
                {suggestions.length === 0 ? (
                  <p className="text-center text-gray-500 py-8 text-sm">
                    No hay sugerencias aún. ¡Comparte tu idea!
                  </p>
                ) : (
                  suggestions.map((suggestion, index) => (
                    <div
                      key={suggestion.id}
                      className={`bg-[#0f0f0f] rounded-lg p-3 sm:p-4 border transition-all ${
                        index === 0
                          ? "border-yellow-500/50 bg-yellow-500/5"
                          : "border-gray-800/50 hover:border-blue-400/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {index === 0 && (
                            <span className="inline-block px-2 py-0.5 bg-yellow-500/20 text-yellow-500 text-xs rounded-full mb-2">
                              Más votada
                            </span>
                          )}
                          <p className="text-white text-xs sm:text-sm">
                            {suggestion.suggestion}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Por {suggestion.users?.name || "Usuario"} •{" "}
                            {new Date(
                              suggestion.suggested_at
                            ).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            handleLike("suggestion", suggestion.id)
                          }
                          aria-label="Me gusta sugerencia"
                          aria-pressed={likedSuggestions.includes(
                            suggestion.id
                          )}
                          className={`flex items-center gap-2 px-2 sm:px-3 py-1 bg-[#0a0a0a] rounded-lg transition-all shrink-0 transform duration-200 ease-out hover:bg-blue-400/20 ${
                            likedSuggestions.includes(suggestion.id)
                              ? "opacity-90"
                              : ""
                          }`}
                        >
                          <span
                            className={`flex items-center justify-center transform transition-transform duration-200 ${
                              animatingLikes.includes(suggestion.id)
                                ? "scale-110 text-blue-400"
                                : animatingUnlikes.includes(suggestion.id)
                                ? "scale-90 text-gray-400/80"
                                : likedSuggestions.includes(suggestion.id)
                                ? "scale-100 text-blue-400"
                                : "scale-100 text-gray-300"
                            }`}
                          >
                            <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
                          </span>
                          <span className="text-xs sm:text-sm text-gray-400">
                            {suggestion.likes || 0}
                          </span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === "reports" && (
          <div className="space-y-4">
            <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
              Reportar Problemas
            </h3>

            {/* Add report form */}
            <div className="bg-[#0f0f0f] rounded-lg p-3 sm:p-4 border border-gray-800/50">
              <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-2">
                Reportar un problema o bug
              </label>
              <div className="space-y-2">
                <select
                  value={newReportSection}
                  onChange={(e) => setNewReportSection(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0a0a0a] border border-gray-800/50 rounded-lg text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                >
                  <option value="general">General</option>
                  <option value="login">Login/Registro</option>
                  <option value="progress">Progreso</option>
                  <option value="plan">Plan de entrenamiento</option>
                  <option value="insights">Estadísticas</option>
                  <option value="community">Community</option>
                </select>
                <div className="flex flex-col sm:flex-row gap-2">
                  <textarea
                    value={newReportText}
                    onChange={(e) => setNewReportText(e.target.value)}
                    placeholder="Describe el problema que encontraste..."
                    rows={3}
                    className="flex-1 px-3 py-2 bg-[#0a0a0a] border border-gray-800/50 rounded-lg text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                  />
                  <button
                    onClick={handleSubmitReport}
                    disabled={submitLoading || !newReportText.trim()}
                    className="px-3 sm:px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all disabled:opacity-50 text-xs sm:text-sm font-medium h-fit"
                  >
                    {submitLoading ? "..." : "Reportar"}
                  </button>
                </div>
              </div>
            </div>

            {/* Reports list (only show user's own reports for privacy) */}
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto"></div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-gray-500">
                  Tus reportes (solo tú puedes verlos)
                </p>
                {reports.filter((r) => r.user_id === userId).length === 0 ? (
                  <p className="text-center text-gray-500 py-8 text-sm">
                    No has reportado ningún problema aún
                  </p>
                ) : (
                  reports
                    .filter((r) => r.user_id === userId)
                    .map((report) => (
                      <div
                        key={report.id}
                        className="bg-[#0f0f0f] rounded-lg p-3 sm:p-4 border border-gray-800/50"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-start gap-2 mb-2">
                              <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
                                {report.section}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(
                                  report.reported_at
                                ).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-white text-xs sm:text-sm">
                              {report.report_text}
                            </p>
                          </div>

                          <button
                            onClick={() => handleLike("report", report.id)}
                            aria-label="Me gusta reporte"
                            aria-pressed={likedReports.includes(report.id)}
                            className={`flex items-center gap-2 px-2 sm:px-3 py-1 bg-[#0a0a0a] rounded-lg transition-all shrink-0 transform duration-200 ease-out hover:bg-red-500/20 ${
                              likedReports.includes(report.id)
                                ? "opacity-90"
                                : ""
                            }`}
                          >
                            <span
                              className={`flex items-center justify-center transform transition-transform duration-200 ${
                                animatingLikes.includes(report.id)
                                  ? "scale-110 text-red-400"
                                  : animatingUnlikes.includes(report.id)
                                  ? "scale-90 text-gray-400/80"
                                  : likedReports.includes(report.id)
                                  ? "scale-100 text-red-400"
                                  : "scale-100 text-gray-300"
                              }`}
                            >
                              <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
                            </span>
                            <span className="text-xs sm:text-sm text-gray-400">
                              {report.likes || 0}
                            </span>
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Routines Tab */}
        {activeTab === "routines" && (
          <div className="space-y-4">
            <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
              Rutinas Compartidas
            </h3>

            {/* Add routine form */}
            <div className="bg-[#0f0f0f] rounded-lg p-3 sm:p-4 border border-gray-800/50">
              <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-2">
                Compartir tu rutina personalizada
              </label>
              <div className="space-y-2">
                <textarea
                  value={newRoutineDesc}
                  onChange={(e) => setNewRoutineDesc(e.target.value)}
                  placeholder="Describe tu rutina: ejercicios, series, repeticiones, etc..."
                  rows={3}
                  className="w-full px-3 py-2 bg-[#0a0a0a] border border-gray-800/50 rounded-lg text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Dificultad
                    </label>
                    <select
                      value={newRoutineDifficulty}
                      onChange={(e) => setNewRoutineDifficulty(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0a0a0a] border border-gray-800/50 rounded-lg text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                    >
                      <option value="principiante">Principiante</option>
                      <option value="intermedio">Intermedio</option>
                      <option value="avanzado">Avanzado</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Duración (min)
                    </label>
                    <input
                      type="number"
                      value={newRoutineDuration}
                      onChange={(e) => setNewRoutineDuration(e.target.value)}
                      min="15"
                      max="180"
                      className="w-full px-3 py-2 bg-[#0a0a0a] border border-gray-800/50 rounded-lg text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                  </div>
                  <button
                    onClick={handleSubmitRoutine}
                    disabled={submitLoading || !newRoutineDesc.trim()}
                    className="px-3 sm:px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-all disabled:opacity-50 text-xs sm:text-sm font-medium mt-auto"
                  >
                    {submitLoading ? "..." : "Compartir"}
                  </button>
                </div>
              </div>
            </div>

            {/* Routines list */}
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
              </div>
            ) : (
              <div className="space-y-3">
                {routines.length === 0 ? (
                  <p className="text-center text-gray-500 py-8 text-sm">
                    No hay rutinas compartidas aún. ¡Comparte la tuya!
                  </p>
                ) : (
                  routines.map((routine) => (
                    <div
                      key={routine.id}
                      className="bg-[#0f0f0f] rounded-lg p-3 sm:p-4 border border-gray-800/50 hover:border-purple-400/50 transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-start gap-2 mb-2">
                            <span
                              className={`px-2 py-0.5 text-xs rounded-full ${
                                routine.difficulty === "principiante"
                                  ? "bg-green-500/20 text-green-400"
                                  : routine.difficulty === "intermedio"
                                  ? "bg-yellow-500/20 text-yellow-400"
                                  : "bg-red-500/20 text-red-400"
                              }`}
                            >
                              {routine.difficulty}
                            </span>
                            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                              {routine.duration}
                            </span>
                          </div>
                          <p className="text-white text-xs sm:text-sm mb-2">
                            {routine.description}
                          </p>
                          <p className="text-xs text-gray-500">
                            Por {routine.users?.name || "Usuario"} •{" "}
                            {new Date(routine.shared_at).toLocaleDateString()}
                          </p>
                        </div>

                        <button
                          onClick={() => handleLike("routine", routine.id)}
                          aria-label="Me gusta rutina"
                          aria-pressed={likedRoutines.includes(routine.id)}
                          className={`flex items-center gap-2 px-2 sm:px-3 py-1 bg-[#0a0a0a] rounded-lg transition-all shrink-0 transform duration-200 ease-out hover:bg-purple-500/20 ${
                            likedRoutines.includes(routine.id)
                              ? "opacity-90"
                              : ""
                          }`}
                        >
                          <span
                            className={`flex items-center justify-center transform transition-transform duration-200 ${
                              animatingLikes.includes(routine.id)
                                ? "scale-110 text-purple-400"
                                : animatingUnlikes.includes(routine.id)
                                ? "scale-90 text-gray-400/80"
                                : likedRoutines.includes(routine.id)
                                ? "scale-100 text-purple-400"
                                : "scale-100 text-gray-300"
                            }`}
                          >
                            <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
                          </span>
                          <span className="text-xs sm:text-sm text-gray-400">
                            {routine.likes || 0}
                          </span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Notes Tab */}
        {activeTab === "notes" && (
          <div className="space-y-4">
            <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
              Notas del Parche
            </h3>

            <div className="space-y-3">
              {patchNotes.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-500">
                  No hay notas de parche disponibles. Crea{" "}
                  <code className="text-xs text-green-400">
                    public/patch-notes.json
                  </code>{" "}
                  para añadirlas.
                </div>
              ) : (
                patchNotes.map((pn) => (
                  <div
                    key={pn.version}
                    className="bg-[#0f0f0f] rounded-lg p-3 sm:p-4 border border-gray-800/50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="text-sm font-semibold text-white">
                          Versión {pn.version}
                        </div>
                        <div className="text-xs text-gray-500">{pn.date}</div>
                      </div>
                    </div>
                    <ul className="list-disc pl-5 text-xs sm:text-sm text-gray-200 space-y-1">
                      {pn.items.map((it, i) => (
                        <li key={i}>{it}</li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

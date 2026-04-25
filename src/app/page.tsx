"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { savePlayerSession } from "@/hooks/usePlayerSession";
import { useGameStore } from "@/store/gameStore";
import type { Room, Player } from "@/types/game";

const schema = z.object({
  pseudo: z
    .string()
    .min(1, "Enter a name")
    .max(16, "Max 16 characters")
    .regex(/^[a-zA-Z0-9 _-]+$/, "Letters, numbers, spaces, - and _ only"),
});

type FormValues = z.infer<typeof schema>;

export default function HomePage() {
  const router = useRouter();
  const { setRoom, setMyPlayer, setPlayers } = useGameStore();
  const [serverError, setServerError] = useState<string | null>(null);
  const actionRef = useRef<"create" | "join">("create");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { pseudo: "" },
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);

    if (actionRef.current === "join") {
      router.push(`/browse?pseudo=${encodeURIComponent(values.pseudo)}`);
      return;
    }

    const res = await fetch("/api/rooms/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pseudo: values.pseudo }),
    });

    const data = await res.json();

    if (!res.ok) {
      setServerError(data.error ?? "Something went wrong");
      return;
    }

    savePlayerSession(data.player.id, data.player.pseudo, data.room.code);
    setRoom(data.room as Room);
    setMyPlayer(data.player.id, data.player.pseudo);
    setPlayers([data.player as Player]);
    router.push(`/room/${data.room.code}`);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 py-12 bg-[var(--background)]">
      <div className="text-center space-y-2">
        <img src="/title.jpg" alt="SUBZ" className="w-52 sm:w-64 mx-auto" />
        <p className="text-lg text-white/50">
          Write the missing subtitle. Be funny.
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4 w-full max-w-xs"
      >
        <Input
          {...register("pseudo")}
          id="pseudo"
          placeholder="Enter your name"
          autoFocus
          autoComplete="off"
          autoCapitalize="words"
          maxLength={16}
          error={errors.pseudo?.message}
        />

        {serverError && (
          <p className="text-sm text-red-400 text-center">{serverError}</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-[70%] mx-auto block cursor-pointer"
          onClick={() => { actionRef.current = "create"; }}
        >
          <img src="/create-game.jpg" alt="Create Game" className="w-full rounded-2xl pointer-events-none" />
        </button>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-[70%] mx-auto block cursor-pointer"
          onClick={() => { actionRef.current = "join"; }}
        >
          <img src="/join-game.jpg" alt="Join Game" className="w-full rounded-2xl pointer-events-none" />
        </button>
      </form>
    </main>
  );
}

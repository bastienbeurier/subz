"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { savePlayerSession } from "@/hooks/usePlayerSession";

const schema = z.object({
  pseudo: z
    .string()
    .min(1, "Enter a name")
    .max(16, "Max 16 characters")
    .regex(/^[a-zA-Z0-9 _-]+$/, "Letters, numbers, spaces, - and _ only"),
});

type FormValues = z.infer<typeof schema>;

interface JoinScreenProps {
  roomCode: string;
}

export default function JoinScreen({ roomCode }: JoinScreenProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);

    const res = await fetch("/api/rooms/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pseudo: values.pseudo, code: roomCode }),
    });

    const data = await res.json();

    if (!res.ok) {
      setServerError(data.error ?? "Something went wrong");
      return;
    }

    savePlayerSession(data.player.id, data.player.pseudo, roomCode);
    setJoined(true);

    // Hard-reload so usePlayerSession re-reads localStorage and the layout
    // reconnect effect fires with the new session. router.refresh() is not
    // enough — it refreshes server data but doesn't re-mount client components.
    window.location.reload();
  };

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-12">
      <div className="text-center space-y-1">
        <p className="text-white/40 text-sm uppercase tracking-wider">
          Room
        </p>
        <h1 className="text-4xl font-black text-white tracking-widest">
          {roomCode}
        </h1>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4 w-full max-w-xs"
      >
        <Input
          {...register("pseudo")}
          id="pseudo"
          label="Your name"
          placeholder="e.g. SpicyTofu"
          autoFocus
          autoComplete="off"
          autoCapitalize="words"
          maxLength={16}
          error={errors.pseudo?.message}
        />

        {serverError && (
          <p className="text-sm text-red-400 text-center">{serverError}</p>
        )}

        <Button type="submit" loading={isSubmitting || joined} className="w-full mt-2">
          Join game
        </Button>
      </form>
    </main>
  );
}

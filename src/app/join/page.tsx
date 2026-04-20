"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  code: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function JoinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode"); // "create" | "random" | null
  const prefillCode = searchParams.get("code") ?? "";

  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { pseudo: "", code: prefillCode },
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);

    let url: string;
    let body: Record<string, string>;

    if (mode === "create") {
      url = "/api/rooms/create";
      body = { pseudo: values.pseudo };
    } else if (mode === "random") {
      url = "/api/rooms/random";
      body = { pseudo: values.pseudo };
    } else {
      url = "/api/rooms/join";
      body = { pseudo: values.pseudo, code: values.code ?? prefillCode };
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      setServerError(data.error ?? "Something went wrong");
      return;
    }

    savePlayerSession(data.player.id, data.player.pseudo, data.room.code);
    router.push(`/room/${data.room.code}`);
  };

  const title =
    mode === "create"
      ? "Create a game"
      : mode === "random"
      ? "Join a game"
      : "Join game";

  const showCodeInput = !mode || (!mode && prefillCode);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 py-12 bg-[var(--background)]">
      <div className="text-center space-y-1">
        <h1 className="text-3xl font-black text-white">{title}</h1>
        <p className="text-white/40 text-sm">Pick a name to continue</p>
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

        {showCodeInput && (
          <Input
            {...register("code")}
            id="code"
            label="Room code"
            placeholder="e.g. ABC123"
            autoComplete="off"
            autoCapitalize="characters"
            maxLength={6}
            error={errors.code?.message}
          />
        )}

        {serverError && (
          <p className="text-sm text-red-400 text-center">{serverError}</p>
        )}

        <Button type="submit" loading={isSubmitting} className="w-full mt-2">
          Let&apos;s go
        </Button>
      </form>
    </main>
  );
}

export default function JoinPage() {
  return (
    <Suspense>
      <JoinForm />
    </Suspense>
  );
}

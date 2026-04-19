import { cn } from "@/lib/utils/cn";
import { AVATAR_COLORS } from "@/types/game";

interface AvatarProps {
  pseudo: string;
  avatarIndex: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Avatar({
  pseudo,
  avatarIndex,
  size = "md",
  className,
}: AvatarProps) {
  const color = AVATAR_COLORS[avatarIndex % AVATAR_COLORS.length];
  const initial = pseudo[0]?.toUpperCase() ?? "?";

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-bold shrink-0",
        {
          "w-8 h-8 text-sm": size === "sm",
          "w-10 h-10 text-base": size === "md",
          "w-14 h-14 text-xl": size === "lg",
        },
        className
      )}
      style={{ backgroundColor: color }}
    >
      {initial}
    </div>
  );
}

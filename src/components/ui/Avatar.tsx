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
  const seed = encodeURIComponent(`${avatarIndex}-${pseudo}`);
  const src = `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${seed}`;

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center shrink-0 overflow-hidden",
        {
          "w-8 h-8": size === "sm",
          "w-10 h-10": size === "md",
          "w-14 h-14": size === "lg",
        },
        className
      )}
      style={{ backgroundColor: color }}
    >
      <img
        src={src}
        alt={pseudo}
        className="w-full h-full object-cover"
        draggable={false}
      />
    </div>
  );
}

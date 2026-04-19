import { cn } from "@/lib/utils/cn";

interface CardProps {
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  selected?: boolean;
}

export function Card({ className, children, onClick, selected }: CardProps) {
  const isInteractive = !!onClick;

  return (
    <div
      onClick={onClick}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      className={cn(
        "rounded-2xl bg-white/5 border-2 p-4",
        selected ? "border-violet-500 bg-violet-500/10" : "border-white/10",
        isInteractive &&
          "cursor-pointer active:scale-95 transition-all hover:bg-white/10",
        className
      )}
    >
      {children}
    </div>
  );
}

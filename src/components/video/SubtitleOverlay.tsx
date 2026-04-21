interface SubtitleOverlayProps {
  text: string | null;
  isVisible: boolean;
  isPlaceholder?: boolean;
}

export function SubtitleOverlay({ text, isVisible, isPlaceholder }: SubtitleOverlayProps) {
  if (!isVisible) return null;
  if (text === null && !isPlaceholder) return null;

  return (
    <div className="absolute bottom-[12%] left-0 right-0 flex justify-center px-4 pointer-events-none">
      <span
        className={
          isPlaceholder
            ? "bg-black/70 text-white/50 text-xl md:text-3xl font-bold px-4 py-1.5 rounded-lg tracking-widest border-2 border-dashed border-white/30"
            : "bg-black/80 text-white text-xl md:text-3xl font-bold px-4 py-1.5 rounded-lg text-center max-w-[90%]"
        }
        style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
      >
        {isPlaceholder ? "insert subtitle here" : text}
      </span>
    </div>
  );
}

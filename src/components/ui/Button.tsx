"use client";

import { cn } from "@/lib/utils/cn";
import { type ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "brand";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center font-bold rounded-2xl transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none select-none",
          {
            "bg-violet-600 text-white hover:bg-violet-500": variant === "primary",
            "bg-[#FF3333] text-white hover:bg-[#ff1a1a]": variant === "brand",
            "bg-white/10 text-white hover:bg-white/20": variant === "secondary",
            "bg-transparent text-white/60 hover:text-white": variant === "ghost",
            "bg-red-600/20 text-red-400 hover:bg-red-600/30": variant === "danger",
          },
          {
            "h-10 px-4 text-sm": size === "sm",
            "h-14 px-6 text-lg": size === "md",
            "h-16 px-8 text-xl": size === "lg",
          },
          className
        )}
        {...props}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            {children}
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };

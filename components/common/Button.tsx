import React from "react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/constants/button";

export const Button = ({
  children,
  variant = "green",
  onClick,
  className = "",
}: {
  children?: React.ReactNode;
  variant?: "green" | "black";
  onClick?: () => void;
  className?: string;
}) => {
  return (
    <div className={cn("relative", className)}>
      {/* BACKDROP BLUR - Large blur effect layer behind the button */}
      {variant === "green" && (
        <div
          className={cn("absolute inset-0 blur-3xl", buttonVariants[variant])}
        />
      )}

      <button
        onClick={onClick}
        className="relative group cursor-pointer bg-transparent border-none"
      >
        {/* HOVER BLUR ANIMATION - Blurred glow that appears on hover */}
        {variant === "green" && (
          <div
            className={cn(
              "absolute inset-0 bg-transparent blur-xl transition-all duration-500",
              buttonVariants[variant]
            )}
          />
        )}

        {/* MAIN BUTTON SURFACE - Angled clip-path, backdrop blur, border */}
        <div
          className={cn(
            "relative bg-zinc-900/50 backdrop-blur-sm border-2 px-8 py-3 transition-all duration-300",
            buttonVariants[variant],
            variant === "black" && "px-2"
          )}
          style={{
            clipPath:
              "polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)",
          }}
        >
          {/* GRADIENT OVERLAY - Shimmer effect on hover */}
          <div
            className={cn(
              "absolute inset-0 bg-gradient-to-r opacity-0 transition-opacity duration-500",
              variant === "green" &&
                "group-hover:opacity-100 from-emerald-500/0 via-emerald-500/10 to-emerald-500/0"
            )}
          />

          {/* TEXT & ICON CONTENT - Label and double arrow icons */}
          <div className="relative flex items-center gap-3 whitespace-nowrap">
            {/* BUTTON TEXT */}
            <span
              className={cn(
                "text-sm font-bold tracking-[0.2em]",
                buttonVariants[variant]
              )}
            >
              {children}
            </span>

            {/* DOUBLE ARROW ICONS - Animate right on hover */}
            <div
              className={cn(
                "flex gap-1 transform transition-transform duration-300",
                variant === "green" && "group-hover:translate-x-2"
              )}
            >
              {/* FIRST ARROW */}
              <svg
                className={cn(
                  "w-3 h-3",
                  variant === "green"
                    ? "text-white drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                    : "text-white"
                )}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M9 5l7 7-7 7"
                />
              </svg>

              {/* SECOND ARROW - Overlapped for double arrow effect */}
              <svg
                className={cn(
                  "w-3 h-3 -ml-2",
                  variant === "green"
                    ? "text-white drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                    : "text-white"
                )}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </div>

          {/* TOP-LEFT CORNER BRACKET - Decorative corner accent */}
          <div
            className={cn(
              "absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 opacity-50",
              variant === "green" ? "border-emerald-400" : "border-gray-200"
            )}
            style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }}
          />

          {/* BOTTOM-RIGHT CORNER BRACKET - Decorative corner accent */}
          <div
            className={cn(
              "absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 opacity-50",
              variant === "green" ? "border-emerald-400" : "border-gray-200"
            )}
            style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }}
          />
        </div>

        {/* SCAN LINE ANIMATION - Vertical scan effect overlay on hover */}
        {variant === "green" && (
          <div
            className="absolute inset-0 overflow-hidden pointer-events-none opacity-0 group-hover:opacity-100"
            style={{
              clipPath:
                "polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)",
            }}
          >
            {/* ANIMATED SCAN GRADIENT - Moves down on hover */}
            <div
              className={cn(
                "absolute inset-0 bg-gradient-to-b from-transparent to-transparent h-full animate-scan",
                variant === "green" && "via-emerald-500/30"
              )}
            />
          </div>
        )}
      </button>
    </div>
  );
};

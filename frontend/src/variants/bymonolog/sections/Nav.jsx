"use client";

import { useEffect, useState } from "react";

import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { brandAssets, overview, nav } from "@/lib/content";

const ROOT = "/bymonolog";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Highlight the current route. `path: ""` is home; others match by prefix.
  const isActive = (path) => {
    const full = `${ROOT}${path}`;
    if (path === "") return pathname === ROOT || pathname === `${ROOT}/`;
    return pathname === full || pathname.startsWith(`${full}/`);
  };

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 transition-colors duration-500"
      style={{
        background: scrolled ? "rgba(14,14,15,0.78)" : "rgba(14,14,15,0.32)",
        backdropFilter: "blur(14px)",
        borderBottom: scrolled
          ? "1px solid var(--hairline)"
          : "1px solid transparent",
      }}
    >
      <nav className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
        <Link to={ROOT} className="group flex shrink-0 items-center gap-3">
          {/* Real PNU symbol — transparent PNG, sits directly on the dark theme. */}
          <span className="flex h-9 w-9 items-center justify-center overflow-hidden">
            <img src={brandAssets.symbolColor}
              alt="부산대학교 심볼"
              width={36}
              height={36}
              className="h-full w-auto object-contain"
              style={{ filter: "brightness(0) invert(1)" }}
              priority
            />
          </span>
          <span className="flex items-baseline gap-1.5">
            <span className="font-heavy text-lg uppercase tracking-tight text-[var(--text)] tw-nowrap">
              ARISE PNU
            </span>
            <span className="font-heavy text-lg uppercase tracking-tight text-[var(--gold)]">
              AI
            </span>
          </span>
          <span className="sr-only">{overview.brand}</span>
        </Link>

        <ul className="hidden items-center gap-7 lg:flex">
          {nav.map((m) => {
            const active = isActive(m.path);
            return (
              <li key={m.path}>
                <Link to={`${ROOT}${m.path}`}
                  aria-current={active ? "page" : undefined}
                  className="mono-label tw-nowrap transition-colors duration-300 hover:text-[var(--text)]"
                  style={{
                    color: active ? "var(--gold)" : undefined,
                  }}
                >
                  {m.label}
                  {"star" in m && m.star ? " ★" : ""}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}

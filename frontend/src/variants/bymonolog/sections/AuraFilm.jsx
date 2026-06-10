"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Play } from "@phosphor-icons/react";

/**
 * VISION FILM (only on /aura): A.U.R.A 설명영상.
 * Facade embed — only a YouTube thumbnail (one image) loads on page view;
 * the heavy YouTube iframe is mounted only after the user clicks play.
 * Zero iframe/JS cost until intent → no server burden, fast first paint.
 * Reduced-motion: skips the GSAP reveal (card is visible by default).
 */
const VIDEO_ID = "j0IO7MtBf-U";
const RUNTIME = "03:04";
const THUMB_HD = `https://img.youtube.com/vi/${VIDEO_ID}/maxresdefault.jpg`;
const THUMB_FALLBACK = `https://img.youtube.com/vi/${VIDEO_ID}/hqdefault.jpg`;

export default function AuraFilm() {
  const root = useRef(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduced) return;

    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context((self) => {
      const scope = self.selector;

      gsap.from(scope(".film-card"), {
        clipPath: "inset(0 0 100% 0)",
        scale: 1.05,
        duration: 1.1,
        ease: "power3.out",
        scrollTrigger: { trigger: scope(".film-card")[0], start: "top 82%" },
      });

      gsap.from(scope(".film-head > *"), {
        opacity: 0,
        y: 24,
        stagger: 0.08,
        duration: 0.7,
        ease: "power3.out",
        scrollTrigger: { trigger: scope(".film-head")[0], start: "top 85%" },
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="mono-section" aria-label="A.U.R.A 비전 필름">
      <div className="mono-section__inner">
        <div className="film-head">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <span className="mono-label">비전 필름 / A.U.R.A FILM</span>
            <span className="mono-label">RUNTIME {RUNTIME}</span>
          </div>

          <h2 className="mt-5 max-w-3xl font-heavy text-4xl uppercase leading-[0.95] tracking-tight text-[var(--text)] md:text-6xl">
            3분으로 보는 비전
          </h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--muted)] md:text-lg">
            A.U.R.A가 그리는 AI 시대의 중심축 — 직접 영상으로 만나보세요.
          </p>
        </div>

        <div
          className="film-card relative mt-10 overflow-hidden rounded-2xl border"
          style={{
            aspectRatio: "16 / 9",
            borderColor: "rgba(201,162,39,0.4)",
            background:
              "radial-gradient(120% 120% at 50% 0%, rgba(201,162,39,0.18) 0%, #0e0e0f 62%)",
          }}
        >
          {playing ? (
            <iframe
              className="absolute inset-0 h-full w-full"
              src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1&rel=0&modestbranding=1`}
              title="A.U.R.A 비전 필름"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
            />
          ) : (
            <button
              type="button"
              onClick={() => setPlaying(true)}
              className="group absolute inset-0 h-full w-full cursor-pointer"
              aria-label="A.U.R.A 비전 필름 재생"
            >
              <img
                src={THUMB_HD}
                onError={(e) => {
                  if (e.currentTarget.src !== THUMB_FALLBACK)
                    e.currentTarget.src = THUMB_FALLBACK;
                }}
                alt="A.U.R.A 비전 필름 미리보기"
                className="absolute inset-0 h-full w-full object-cover opacity-70 transition duration-500 group-hover:scale-[1.03] group-hover:opacity-90"
                loading="lazy"
              />
              <span
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(14,14,15,0.2) 0%, rgba(14,14,15,0.58) 100%)",
                }}
                aria-hidden
              />

              {/* Custom play button — gold ring + glow */}
              <span
                className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border backdrop-blur transition duration-300 group-hover:scale-110 md:h-24 md:w-24"
                style={{
                  borderColor: "var(--gold)",
                  background: "rgba(14,14,15,0.5)",
                  boxShadow: "0 0 44px rgba(201,162,39,0.45)",
                }}
                aria-hidden
              >
                <Play size={34} weight="fill" className="ml-1 text-[var(--gold)]" />
              </span>

              <span className="mono-label absolute bottom-5 left-5 !text-[0.7rem] text-[var(--gold)]">
                WATCH NOW
              </span>
              <span className="mono-label absolute bottom-5 right-5 !text-[0.7rem]">
                {RUNTIME}
              </span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

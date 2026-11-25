"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { stageSubmission, previewJob } from "../../lib/planningSubmission";
import type { TempleSummary } from "../../lib/temples";
import { useT } from "../../lib/i18n";
import { planningT } from "../../lib/planningCopy";
import {
  planningFetch,
  safeUrl,
  formatPlanningDate,
  type PlanningJob,
  type PlanningRequest,
} from "../../lib/planning";
import {
  PlanOverview,
  BudgetSummary,
  DiscoveryCards,
  AttractionSelection,
} from "./PlanSummary";
import { PlanningExperience } from "./PlanningExperience";

const button =
  "rounded-full border border-[#d7b98d] px-4 py-2 text-sm font-semibold text-[#82501c]";

export function ItineraryWorkspace({
  id,
  temples,
}: {
  id: string;
  temples: TempleSummary[];
}) {
  const { lang } = useT();
  const p = (key: string) => planningT(lang, key);
  const router = useRouter();
  const [job, setJob] = useState<PlanningJob | null>(null);
  const [error, setError] = useState("");
  const [day, setDay] = useState(0);
  const [originEdit, setOriginEdit] = useState<string | null>(null);
  const [originRetry, setOriginRetry] = useState<PlanningRequest | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    setJob(null);
    setError("");
    setDay(0);

    const load = async () => {
      try {
        const next = await planningFetch<PlanningJob>("jobs/" + id);
        if (cancelled) return;
        setJob(next);
        setError("");
        if (!["queued", "running"].includes(next.status)) {
          try {
            localStorage.removeItem("pilgrim:active_plan");
          } catch {}
          return;
        }
        timer = setTimeout(load, 1300);
      } catch (e) {
        if (!cancelled) {
          setError(String(e));
          timer = setTimeout(load, 6000);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [id]);

  if (!job) {
    return (
      <div className="p-8" role="status">
        {error || p("queued")}
      </div>
    );
  }

  if (["queued", "running"].includes(job.status)) {
    return (
      <>
        <PlanningExperience
          job={job}
          temples={temples}
          onCancel={async () => {
            try {
              await planningFetch("jobs/" + id, { method: "DELETE" });
              router.push("/plan");
            } catch (e) {
              setError(String(e));
            }
          }}
        />
        {error && (
          <p role="alert" className="p-4">
            {error}
          </p>
        )}
      </>
    );
  }

  if (originRetry) {
    return (
      <PlanningExperience
        fullscreen
        job={previewJob(originRetry)}
        temples={temples}
        onCancel={() => {
          setOriginRetry(null);
          router.push("/plan");
        }}
      />
    );
  }

  if (!job.result) {
    return (
      <section className="p-8">
        <h1 className="font-serif text-3xl">{p("failure")}</h1>
        <p role="alert" className="my-4">
          {job.error_code ? p(job.error_code) : job.error || job.status}
        </p>
        <form
          className="my-5 max-w-xl space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            try {
              const request = {
                ...job.request,
                origin: originEdit ?? job.request.origin,
                allow_unconfirmed_stay: job.request.stay_mode === "overnight",
                time_grid_minutes: 5 as const,
              };
              const next = stageSubmission(request);
              setOriginRetry(request);
              router.push("/planning/" + next);
            } catch {
              setError(p("submissionStorage"));
            }
          }}
        >
          <label className="block text-sm">
            {p("startingPlace")}
            <input
              required
              minLength={2}
              maxLength={160}
              className="mt-2 w-full rounded-xl border border-[#dac5a6] bg-white px-4 py-3"
              value={originEdit ?? job.request.origin}
              onChange={(e) => setOriginEdit(e.target.value)}
            />
          </label>
          {job.origin_candidates?.map((candidate) => (
            <button
              key={candidate.latitude + "," + candidate.longitude}
              type="button"
              className="block w-full rounded-xl border border-[#dac5a6] p-3 text-left text-sm"
              onClick={() =>
                setOriginEdit(candidate.latitude + "," + candidate.longitude)
              }
            >
              {candidate.display_name}
            </button>
          ))}
          <button type="submit" className={button}>
            {p("retryOrigin")}
          </button>
        </form>
        <Link href="/plan" className={button}>
          {p("back")}
        </Link>
      </section>
    );
  }

  const result = job.result;
  const selectedDay =
    result.days[Math.min(day, Math.max(0, result.days.length - 1))];
  const primaryTemple =
    (result.destinations || result.temples).find(
      (temple) =>
        temple.id ===
        (job.request.primary_temple_id || job.request.temple_ids[0]),
    ) || result.temples[0];
  const primaryVisit = selectedDay?.items.find(
    (item) => item.type === "visit",
  );
  const templeMapUrl =
    (primaryTemple && safeUrl(primaryTemple.url)) ||
    (primaryVisit && safeUrl(primaryVisit.url)) ||
    null;

  return (
    <article
      className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-7"
      data-itinerary-workspace
    >
      <header className="border-b border-[#e8d9c2] pb-5">
        <h1 className="font-serif text-3xl leading-tight">{result.title}</h1>
        {primaryTemple && (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-sm font-semibold">
              <span aria-hidden="true">📍 </span>
              {primaryTemple.name}
            </span>
            {templeMapUrl && (
              <a
                href={templeMapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-[#9c5e19] underline underline-offset-4"
              >
                Explore in Maps ↗
              </a>
            )}
          </div>
        )}
        <p className="mt-3 text-sm text-[#796b5d]">
          {job.request.start_date} · {job.request.days} {p("days")} ·{" "}
          {job.request.origin} · IST
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/plan" className={button}>
            {p("back")}
          </Link>
          <Link href="/itinerary" className={button}>
            {p("savedPlans")}
          </Link>
          {job.parent && (
            <Link href={"/itinerary/" + job.parent} className={button}>
              {p("original")}
            </Link>
          )}
        </div>
      </header>

      {error && (
        <p role="alert" className="rounded-2xl border border-[#e8d9c2] bg-[#fffdf9] p-5 text-red-800">
          {error}
        </p>
      )}

      <PlanOverview job={job} />

      <section
        className="rounded-2xl border border-[#e8d9c2] bg-[#fffdf9] p-5"
        data-daily-itinerary
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-serif text-xl">{p("timeline")}</h2>
          <span className="shrink-0 rounded-full bg-[#f4e7d0] px-3 py-1 text-xs font-semibold text-[#82501c]">
            {day + 1} / {result.days.length}
          </span>
        </div>
        <nav
          className="itinerary-horizontal mt-4 flex snap-x gap-2 overflow-x-auto pb-2"
          aria-label="Select itinerary day"
        >
          {result.days.map((selected, index) => (
            <button
              key={selected.date}
              aria-pressed={index === day}
              onClick={() => setDay(index)}
              className={
                "min-w-[112px] snap-start rounded-xl border px-3 py-2 text-left " +
                (index === day
                  ? "border-[#b66a13] bg-[#b66a13] text-white"
                  : "border-[#e8d9c2] bg-[#fffdf9] text-[#5f5547]")
              }
            >
              <span className="block text-xs font-semibold">Day {index + 1}</span>
              <span className="mt-1 block text-[11px] opacity-80">
                {formatPlanningDate(selected.date, lang)}
              </span>
            </button>
          ))}
        </nav>

        {selectedDay?.items.length === 0 && (
          <p className="py-6 text-sm text-[#796b5d]">{p("unplannedDay")}</p>
        )}
        <ol className="space-y-3">
          {selectedDay?.items.map((item, index) => (
            <li
              key={index}
              className="flex gap-3 rounded-xl bg-[#faf5ec] p-3 sm:gap-4 sm:p-4"
            >
              <time className="w-20 shrink-0 text-xs font-semibold text-[#a56520] sm:w-24">
                {item.start}–{item.end}
              </time>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold">{p(item.title)}</h3>
                <p className="mt-1 text-xs text-[#796b5d]">
                  {item.meal ? p(item.meal) + " · " : ""}
                  {item.duration_minutes} min
                  {item.distance_km !== undefined
                    ? ` · ${item.distance_km} km`
                    : ""}
                  {item.source ? " · " + item.source : ""}
                </p>
                {item.type === "meal" && (
                  <p className="mt-2 text-xs text-[#796b5d]">
                    {item.place_id ? item.venue : p("unconfirmed")}
                  </p>
                )}
                {item.verification && (
                  <p className="mt-1 text-xs text-[#796b5d]">
                    {p(item.verification)}
                  </p>
                )}
                {safeUrl(item.url) && (
                  <a
                    href={safeUrl(item.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-xs font-semibold text-[#9c5e19] underline"
                  >
                    Explore in Maps ↗
                  </a>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <BudgetSummary job={job} />
      <DiscoveryCards job={job} />
      {job.request.include_attractions && <AttractionSelection job={job} />}

      <section className="flex justify-center py-2">
        <Link
          href="/chat"
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#a6621d] px-6 text-sm font-semibold text-white shadow-sm"
        >
          Ask about this itinerary
        </Link>
      </section>
    </article>
  );
}

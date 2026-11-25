"use client";
import { useT } from "../../lib/i18n";
import { planningT } from "../../lib/planningCopy";
import {
  safeUrl,
  type PlanningJob,
  type PlanDay,
  type RoutePoint,
} from "../../lib/planning";
const box = "rounded-2xl border border-[#e8d9c2] bg-[#fffdf9] p-5";
const cash = (n: number) =>
  "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
function mapUrl(o: Record<string, unknown>, fallbackName?: string) {
  for (const key of ["maps_url", "map_link", "google_maps_url", "url"]) {
    const url = safeUrl(o[key]);
    if (url) return url;
  }
  const lat = typeof o.lat === "number" ? o.lat : typeof o.latitude === "number" ? o.latitude : null;
  const lng = typeof o.lng === "number" ? o.lng : typeof o.longitude === "number" ? o.longitude : null;
  if (lat !== null && lng !== null) return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  const name = String(o.name || fallbackName || "").trim();
  const address = String(o.address || "").trim();
  const query = [name, address].filter(Boolean).join(", ");
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : null;
}
export function PlanOverview({
  job,
}: {
  job: PlanningJob;
  onAlternative?: (changes: Record<string, unknown>) => void;
}) {
  const { lang } = useT();
  const p = (k: string) => planningT(lang, k);
  const r = job.result!;
  const primary = r.temples.find(
    (t) =>
      t.id === (job.request.primary_temple_id || job.request.temple_ids[0]),
  );
  const plannedCount = r.days.filter((d) => d.items.some((i) => i.type === "visit")).length;
  return (
    <section className="rounded-2xl border border-[#e8d9c2] bg-[#fffdf9] px-5 py-4" data-plan-overview>
      <dl className="grid grid-cols-2 gap-x-5 gap-y-4 md:grid-cols-4">
        {[
          [p("primary"), primary?.name || r.temples[0]?.name],
          [
            p("plannedDays"),
            `${plannedCount} / ${job.request.days}`,
          ],
          [
            p("travellers"),
            String(
              job.request.adults + job.request.children + job.request.elderly,
            ),
          ],
          [p("stay_mode"), p(job.request.stay_mode || "daily_return")],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-xs text-[#796b5d]">{label}</dt>
            <dd className="mt-1 truncate text-sm font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
export function DailyRoute({ day }: { day: PlanDay }) {
  const { lang } = useT();
  const p = (k: string) => planningT(lang, k);
  const pts = day.route_points || [];
  if (pts.length < 2) return null;
  const minX = Math.min(...pts.map((n) => n.lng)),
    maxX = Math.max(...pts.map((n) => n.lng)),
    minY = Math.min(...pts.map((n) => n.lat)),
    maxY = Math.max(...pts.map((n) => n.lat));
  const xy = (n: RoutePoint) => [
    45 + (510 * (n.lng - minX)) / (maxX - minX || 1),
    225 - (175 * (n.lat - minY)) / (maxY - minY || 1),
  ];
  const unique = pts.filter(
    (n, i) => pts.findIndex((t) => t.id === n.id) === i,
  );
  return (
    <section
      className="mt-5 rounded-2xl border border-[#e8d9c2] p-4"
      data-daily-route
    >
      <h3 className="font-serif text-lg">{p("routeMap")}</h3>
      <p className="mt-1 text-xs leading-5 text-[#796b5d]">{p("schematic")}</p>
      <div className="mt-3 grid items-center gap-4 md:grid-cols-2">
        <svg
          viewBox="0 0 600 270"
          role="img"
          aria-label={p("routeMap")}
          className="w-full rounded-xl bg-[#f8f0e1]"
        >
          <defs>
            <pattern
              id="route-grid"
              width="30"
              height="30"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M30 0H0V30"
                fill="none"
                stroke="#e8d9c2"
                strokeWidth=".5"
              />
            </pattern>
          </defs>
          <rect width="600" height="270" fill="url(#route-grid)" />
          <polyline
            points={pts.map((n) => xy(n).join(",")).join(" ")}
            fill="none"
            stroke="#b77529"
            strokeWidth="3"
            strokeDasharray="7 4"
          />
          {unique.map((n) => {
            const [x, y] = xy(n);
            const numbers = pts
              .flatMap((t, i) => (t.id === n.id ? [i + 1] : []))
              .join("/");
            return (
              <g key={n.id}>
                <title>{numbers + " " + n.name}</title>
                <circle cx={x} cy={y} r="17" fill="#a6621d" />
                <text
                  x={x}
                  y={y + 4}
                  textAnchor="middle"
                  fill="white"
                  fontSize="11"
                  fontWeight="bold"
                >
                  {numbers}
                </text>
              </g>
            );
          })}
        </svg>
        <ol className="space-y-2 text-sm">
          {pts.map((n, i) => (
            <li key={i} className="flex gap-3">
              <strong className="text-[#a6621d]">{i + 1}.</strong>
              <span>{n.name}</span>
            </li>
          ))}
        </ol>
      </div>
      {safeUrl(day.maps_url) && (
        <a
          className="mt-3 inline-block text-sm font-semibold text-[#9c5e19] underline"
          href={safeUrl(day.maps_url)}
          target="_blank"
          rel="noopener noreferrer"
        >
          {p("navigation")} ↗
        </a>
      )}
    </section>
  );
}
export function BudgetSummary({ job }: { job: PlanningJob }) {
  const { lang } = useT();
  const p = (k: string) => planningT(lang, k);
  const b = job.result!.budget;
  const priced = b.items
    ? b.items.some((e) => e.quantity > 0 && e.low !== null)
    : true;
  const groups = [
    {
      name: "Transportation",
      categories: ["fuel", "tolls", "parking", "transport", "transportation", "travel"],
    },
    { name: "Accommodation", categories: ["stay", "accommodation", "hotel"] },
    { name: "Food", categories: ["food", "meal", "meals"] },
    {
      name: "Other expenses",
      categories: [
        "darshan_sevas",
        "attraction_entry",
        "miscellaneous",
        "other",
        "entry",
      ],
    },
  ];
  const ledger = b.items || [];
  const categoryTotals =
    b.categories ||
    b.components?.map((component) => ({
      category: component.name,
      low: component.low,
      high: component.high,
      status: "estimated",
    })) ||
    [];
  const amount = (low: number, high: number) =>
    low === high ? cash(low) : `${cash(low)}–${cash(high)}`;
  const getRows = (category: string) => {
    const entries = ledger.filter((entry) => entry.category === category);
    const pricedEntries = entries.filter(
      (entry) =>
        entry.quantity > 0 &&
        (entry.status === "estimated" || entry.status === "catalog_price") &&
        typeof entry.low === "number" &&
        typeof entry.high === "number",
    );
    if (pricedEntries.length) {
      return {
        rows: [
          {
            label: p(category),
            value: amount(
              pricedEntries.reduce((sum, entry) => sum + entry.low!, 0),
              pricedEntries.reduce((sum, entry) => sum + entry.high!, 0),
            ),
          },
        ],
        unavailable: entries.some((entry) => entry.status === "unknown"),
      };
    }

    if (!ledger.length) {
      const total = categoryTotals.find(
        (item) => item.category.toLowerCase() === category,
      );
      if (
        total &&
        total.status !== "unknown" &&
        total.status !== "not_required" &&
        typeof total.low === "number" &&
        typeof total.high === "number"
      ) {
        return {
          rows: [{ label: p(category), value: amount(total.low, total.high) }],
          unavailable: false,
        };
      }
    }
    return {
      rows: [],
      unavailable: entries.some((entry) => entry.status === "unknown"),
    };
  };
  return (
    <section className="rounded-2xl border border-[#e8d9c2] bg-[#fffdf9] p-5" data-plan-budget>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl">{p("budgetTitle")}</h2>
          <p className="mt-1 text-xs text-[#796b5d]">{p("planning_estimate")}</p>
        </div>
        <p className="text-2xl font-semibold text-[#9c5e19]">
          {priced ? `${cash(b.low)}–${cash(b.high)}` : p("unknownCost")}
        </p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 md:grid-cols-4">
        {groups.map((group) => {
          const details = group.categories.flatMap((category) => {
            const result = getRows(category);
            return result.rows.map((row) => ({ ...row, key: category }));
          });
          const unavailable =
            group.categories.some((category) => getRows(category).unavailable) ||
            (group.name === "Transportation" &&
              b.missing.includes("transport_fare"));
          if (!details.length && !unavailable) return null;
          return (
            <div key={group.name} className="min-w-0">
              <h3 className="text-xs font-semibold text-[#796b5d]">
                {group.name}
              </h3>
              <ul className="mt-1 space-y-1">
                {details.map((row) => (
                  <li
                    key={row.key}
                    className="flex items-start justify-between gap-2 text-xs"
                  >
                    <span>{row.label}</span>
                    <span className="shrink-0 font-semibold">{row.value}</span>
                  </li>
                ))}
              </ul>
              {unavailable && (
                <p className="mt-1 text-[10px] text-[#8a8174]">
                  {details.length ? "Some costs unavailable" : "Estimate unavailable"}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
function RecommendationRow({
  title,
  items,
  kind,
  dataAttribute,
}: {
  title: string;
  items: Record<string, unknown>[];
  kind: "hotel" | "restaurant";
  dataAttribute: string;
}) {
  return (
    <section
      className="rounded-2xl border border-[#e8d9c2] bg-[#fffdf9] p-5"
      {...{ [dataAttribute]: "" }}
    >
      <h2 className="font-serif text-xl">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-[#796b5d]">No recommendations available.</p>
      ) : (
        <div className="itinerary-horizontal mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
          {items.map((o, i) => {
            const name = String(o.name || "");
            const address = String(o.address || o.location || "");
            const distance = typeof o.distance_km === "number"
              ? `${o.distance_km} km`
              : typeof o.distance_to_primary_km === "number"
                ? `${o.distance_to_primary_km} km`
                : "";
            const detail = kind === "hotel"
              ? String(o.price_range || o.hotel_type || "")
              : String(o.cuisine || o.average_cost_for_one || "");
            const rating = typeof o.rating === "number"
              ? o.rating
              : typeof o.rating === "string" && o.rating.trim()
                ? o.rating
                : "";
            const url = mapUrl(o, name);
            return (
              <article
                key={i}
                className="flex min-h-[190px] w-[240px] shrink-0 snap-start flex-col rounded-xl border border-[#eee2cf] bg-[#faf6ef] p-4"
              >
                <div className="min-h-0 flex-1">
                  <h3 className="line-clamp-2 text-sm font-semibold">{name}</h3>
                  {(address || distance) && (
                    <p className="mt-2 text-xs text-[#796b5d]">
                      {[address, distance].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {detail && (
                    <p className="mt-2 line-clamp-2 text-xs text-[#796b5d]">{detail}</p>
                  )}
                  {rating !== "" && (
                    <p className="mt-2 text-xs font-semibold text-[#9c5e19]">★ {rating}</p>
                  )}
                </div>
                {url && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex h-9 items-center justify-center rounded-full border border-[#d7b98d] px-4 text-xs font-semibold text-[#82501c]"
                  >
                    Navigate ↗
                  </a>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function DiscoveryCards({ job }: { job: PlanningJob }) {
  const result = job.result!;
  return (
    <>
      <RecommendationRow
        title="Hotels"
        items={result.options.hotels}
        kind="hotel"
        dataAttribute="data-hotels"
      />
      <RecommendationRow
        title="Restaurants"
        items={result.options.restaurants}
        kind="restaurant"
        dataAttribute="data-restaurants"
      />
    </>
  );
}
export function AttractionSelection({ job }: { job: PlanningJob }) {
  const { lang } = useT();
  const p = (k: string) => planningT(lang, k);
  const list = job.result?.attractions || [];
  return (
    <section className="rounded-2xl border border-[#e8d9c2] bg-[#fffdf9] p-5" data-attractions>
      <h2 className="font-serif text-xl">Attractions</h2>
      {list.length === 0 ? (
        <p className="mt-3 text-sm text-[#796b5d]">No attraction recommendations available.</p>
      ) : (
        <div className="itinerary-horizontal mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
          {list.map((a, i) => {
            const url = safeUrl(a.url) ||
              `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.name)}`;
            return (
              <article
                key={i}
                className="flex min-h-[190px] w-[240px] shrink-0 snap-start flex-col rounded-xl border border-[#eee2cf] bg-[#faf6ef] p-4"
              >
                <div className="flex-1">
                  <h3 className="line-clamp-2 text-sm font-semibold">{a.name}</h3>
                  {typeof a.distance_from_primary_km === "number" && (
                    <p className="mt-2 text-xs text-[#796b5d]">
                      {a.distance_from_primary_km} km
                    </p>
                  )}
                  <p className="mt-2 line-clamp-3 text-xs leading-5 text-[#796b5d]">
                    {p(a.reason)}
                  </p>
                  {a.visit_minutes && (
                    <p className="mt-2 text-xs">{a.visit_minutes} min</p>
                  )}
                </div>
                {url && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex h-9 items-center justify-center rounded-full border border-[#d7b98d] px-4 text-xs font-semibold text-[#82501c]"
                  >
                    Navigate ↗
                  </a>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

/** Readable temple facts, with the source text preserved rather than invented
 * availability or an LLM-generated operational summary. */
export function TempleInformation({ job }: { job: PlanningJob }) {
  const { lang } = useT();
  const p = (k: string) => planningT(lang, k);
  const result = job.result!;
  const selected = (result.destinations || result.temples).filter(
    (t) =>
      job.request.temple_ids.includes(t.id) ||
      result.days.some((d) => d.items.some((i) => i.place_id === t.id)),
  );
  const time = (m: number) =>
    `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  return (
    <section className={box} data-temple-information>
      <h2 className="font-serif text-xl">{p("details")}</h2>
      <p className="mt-2 text-xs text-[#796b5d]">
        {p("catalogSourceLanguage")}
      </p>
      {selected.map((tm) => {
        const facts = tm.facts || {};
        const tickets = facts.darshan_and_tickets;
        const general =
          tickets && typeof tickets === "object"
            ? (tickets as Record<string, unknown>).general_darshan
            : null;
        const sourceURLs = Array.isArray(facts.sources)
          ? facts.sources.flatMap((s) =>
              typeof s === "string" && s.match(/^https?:\/\/\S+/)?.[0]
                ? [s.match(/^https?:\/\/\S+/)![0]]
                : [],
            )
          : [];
        return (
          <article key={tm.id} className="mt-5 border-t border-[#e8d9c2] pt-4">
            <h3 className="font-serif text-xl">{tm.name}</h3>
            <p className="mt-1 text-xs text-[#796b5d]">
              {p("lastVerified")}:{" "}
              {tm.last_verified || String(facts.last_verified || p("unknown"))}{" "}
              · {p("catalog_not_live")}
            </p>
            {typeof facts.summary === "string" && (
              <p className="mt-3 text-sm leading-6">{facts.summary}</p>
            )}
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="text-sm font-semibold">
                  {p("publishedWindows")} · IST
                </h4>
                {tm.windows &&
                  Object.entries(tm.windows).map(([date, windows]) => (
                    <p
                      className="mt-2 text-xs leading-5 text-[#796b5d]"
                      key={date}
                    >
                      <time>{date}</time> ·{" "}
                      {windows.length
                        ? windows
                            .map((w) => `${time(w[0])}–${time(w[1])}`)
                            .join(", ")
                        : p("unknown")}
                    </p>
                  ))}
                <p className="mt-2 text-xs leading-5 text-[#796b5d]">
                  {tm.hours_basis}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-semibold">{p("admissionLabel")}</h4>
                <p className="mt-2 text-xs leading-5 text-[#796b5d]">
                  {typeof general === "string" ? general : p("unknown")}
                </p>
              </div>
            </div>
            {typeof facts.dress_code === "string" && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-semibold text-[#9c5e19]">
                  {p("dressCodeLabel")}
                </summary>
                <p className="mt-2 text-sm leading-6 text-[#796b5d]">
                  {facts.dress_code}
                </p>
              </details>
            )}
            <div className="mt-4 flex flex-wrap gap-3 text-xs">
              {sourceURLs.slice(0, 4).map((url, i) => (
                <a
                  key={i}
                  href={safeUrl(url)}
                  className="max-w-full break-words text-[#9c5e19] underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {p("source")} {i + 1}: {new URL(url).hostname} ↗
                </a>
              ))}
            </div>
          </article>
        );
      })}
    </section>
  );
}

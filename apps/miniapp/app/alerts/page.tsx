import Link from "next/link";
import { generatePositionView } from "@yield-copilot/agents";
import { BackButton, HeaderBar, ScreenFrame, StepDots } from "../../components/screen-frame";
import { parseRecommendationInput } from "../../lib/request";

type AlertsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AlertsPage({ searchParams }: AlertsPageProps) {
  const resolvedSearchParams = await searchParams;
  const parsed = parseRecommendationInput(resolvedSearchParams);
  const position = generatePositionView(parsed);
  const filter = Array.isArray(resolvedSearchParams?.filter)
    ? resolvedSearchParams?.filter[0]
    : resolvedSearchParams?.filter;
  const dismissed = Array.isArray(resolvedSearchParams?.dismissed)
    ? resolvedSearchParams?.dismissed[0]
    : resolvedSearchParams?.dismissed;
  const markedRead = Array.isArray(resolvedSearchParams?.read)
    ? resolvedSearchParams?.read[0]
    : resolvedSearchParams?.read;
  const baseParams = new URLSearchParams({
    token: parsed.token,
    amount: parsed.amount,
    goal: parsed.goal,
    timeHorizonDays: String(parsed.timeHorizonDays),
    riskComfort: parsed.riskComfort,
  });
  const items =
    position.alerts.length > 0
      ? position.alerts.map((alert, index) => ({
          severity: alert.severity,
          title: alert.title,
          body: alert.detail,
          time: index === 0 ? "12m" : index === 1 ? "1h" : "3h",
        }))
      : [
          {
            severity: "info",
            title: "No alerts",
            body: "The current position still fits the original brief.",
            time: "Now",
          },
        ];
  const visibleItems = items.filter((item) => {
    if (dismissed === "1" && item.severity === "action") {
      return false;
    }

    if (!filter || filter === "all") {
      return true;
    }

    if (filter === "watch") {
      return item.severity === "warning";
    }

    return item.severity === filter;
  });
  const finalItems =
    markedRead === "1"
      ? [
          {
            severity: "info" as const,
            title: "No alerts",
            body: "The current position still fits the original brief.",
            time: "Now",
          },
        ]
      : visibleItems.length > 0
        ? visibleItems
        : [
            {
              severity: "info" as const,
              title: "No alerts",
              body: "No items match this filter right now.",
              time: "Now",
            },
          ];

  return (
    <ScreenFrame>
      <HeaderBar
        left={<BackButton href={`/position?token=${parsed.token}&amount=${parsed.amount}&goal=${parsed.goal}&timeHorizonDays=${parsed.timeHorizonDays}&riskComfort=${parsed.riskComfort}`} />}
        title="Alerts"
        right={<Link href={`/alerts?${baseParams.toString()}&read=1`} className="screen-topbar__meta">Mark all read</Link>}
      />

      <section className="screen-copy-block screen-copy-block--tight">
        <StepDots current={3} total={3} />
        <h1 className="screen-copy-block__title">
          Know when
          <br />
          to revisit.
        </h1>
        <div className="brief-chip-row">
          <span className="inline-chip inline-chip--green">Kiln in MiniPay</span>
          <span className="inline-chip inline-chip--default">5 rules armed</span>
        </div>
      </section>

      <section className="segmented-row">
        {[
          { label: "All", value: "all" },
          { label: "Action", value: "action" },
          { label: "Watch", value: "watch" },
          { label: "Info", value: "info" },
        ].map((item) => (
          <Link
            key={item.label}
            href={`/alerts?${baseParams.toString()}&filter=${item.value}`}
            className={(!filter ? item.value === "all" : filter === item.value) ? "segmented-row__item is-active" : "segmented-row__item"}
          >
            {item.label}
          </Link>
        ))}
      </section>

      <section className="alert-stack-card">
        {finalItems.map((item, index, arr) => (
          <div key={`${item.title}-${index}`} className={index < arr.length - 1 ? "alert-stack-card__row" : "alert-stack-card__row alert-stack-card__row--last"}>
            <span className={`alert-dot ${item.severity}`} />
            <div className="alert-stack-card__body">
              <div className="alert-stack-card__head">
                <strong>{item.title}</strong>
                <span className={`alert-badge alert-badge--${item.severity}`}>
                  {item.severity === "action" ? "Action" : item.severity === "warning" ? "Watch" : "Info"}
                </span>
                <small>{item.time}</small>
              </div>
              <p>{item.body}</p>
              {item.severity === "action" ? (
                <div className="alert-stack-card__actions">
                  <Link href={`/recommendation?${baseParams.toString()}`} className="alert-stack-card__cta alert-stack-card__cta--primary">Review</Link>
                  <Link href={`/alerts?${baseParams.toString()}&dismissed=1`} className="alert-stack-card__cta">Dismiss</Link>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </section>

      <p className="screen-footnote">That&apos;s everything for now.</p>
    </ScreenFrame>
  );
}

import Link from "next/link";
import { SUPPORT_EMAIL } from "@yield-copilot/shared";
import { BackButton, HeaderBar, ScreenFrame } from "../../components/screen-frame";

export default function SupportPage() {
  const defaultParams =
    "goal=earn-more&token=USDC&amount=2400&timeHorizonDays=30&riskComfort=low";

  return (
    <ScreenFrame>
      <HeaderBar left={<BackButton href="/" />} title="Support" />

      <section className="screen-copy-block screen-copy-block--no-step">
        <h1 className="screen-copy-block__title">Need a hand?</h1>
        <p className="screen-copy-block__body">Real people. No bots forwarding to bots.</p>
      </section>

      <section className="support-email-card">
        <span className="support-email-card__label">Email</span>
        <Link href={`mailto:${SUPPORT_EMAIL}?subject=Yield%20Copilot%20Support`}>
          <strong>{SUPPORT_EMAIL}</strong>
        </Link>
        <span className="support-email-card__status">Typical reply: within 1 business day</span>
      </section>

      <section className="screen-section">
        <div className="screen-section__head">Or</div>
        <div className="support-links-card">
          {[
            { title: "Open the FAQ", detail: "Common questions about yield, risk, fees.", href: "/legal/terms" },
            { title: "Status page", detail: "See live system status.", href: `/alerts?${defaultParams}` },
            { title: "Report a bug", detail: "Send us a quick note with logs.", href: `mailto:${SUPPORT_EMAIL}?subject=Yield%20Copilot%20Bug%20Report` },
          ].map((item, index, arr) => (
            <Link key={item.title} href={item.href} className={index < arr.length - 1 ? "support-links-card__row" : "support-links-card__row support-links-card__row--last"}>
              <div>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>
              <span>→</span>
            </Link>
          ))}
        </div>
      </section>
    </ScreenFrame>
  );
}

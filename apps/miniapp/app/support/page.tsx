import { AppShell } from "../../components/app-shell";

export default function SupportPage() {
  const supportEmail =
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@yieldcopilot.app";

  return (
    <AppShell
      eyebrow="Support"
      title="Support"
      intro="Reach out if you run into an issue with a recommendation, execution flow, or venue availability."
    >
      <section className="panel stack-md">
        <h3>Contact</h3>
        <p>
          Email: <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
        </p>
        <p>
          Response goal: within one business day for execution failures and venue
          availability questions. Complex issues may take up to three business days.
        </p>
      </section>

      <section className="panel stack-md">
        <h3>What we can help with</h3>
        <ul className="bullet-list">
          <li>Execution failures — a recommended action did not complete or returned an error</li>
          <li>Venue availability — a venue you expected to appear is missing or marked unavailable</li>
          <li>Rate questions — the displayed APY looks incorrect or stale</li>
          <li>App behaviour — unexpected UI behaviour, blank screens, or error messages</li>
        </ul>
      </section>

      <section className="panel stack-md">
        <h3>What we cannot help with</h3>
        <p>
          We do not provide tax advice, legal advice, or investment advice of any kind.
          We cannot reverse on-chain transactions or recover funds lost to third-party
          venue failures. For venue-specific disputes, you will need to contact that
          venue directly.
        </p>
      </section>
    </AppShell>
  );
}

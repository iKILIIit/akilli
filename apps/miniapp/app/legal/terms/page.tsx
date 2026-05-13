import { AppShell } from "../../../components/app-shell";

export default function TermsPage() {
  return (
    <AppShell
      eyebrow="Legal"
      title="Terms of service"
      intro="This placeholder copy establishes the minimum structure needed for a first Mini App submission pass."
    >
      <section className="panel stack-md">
        <p>
          Yield Copilot provides informational guidance, not guaranteed returns or
          investment advice. Users remain responsible for reviewing venue terms,
          rates, and transaction details before acting.
        </p>
        <p>
          Third-party venues must be clearly marked, and execution should require
          explicit user approval before any funds move.
        </p>
      </section>
    </AppShell>
  );
}

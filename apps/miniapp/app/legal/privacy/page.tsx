import { AppShell } from "../../../components/app-shell";

export default function PrivacyPage() {
  return (
    <AppShell
      eyebrow="Legal"
      title="Privacy policy"
      intro="This page should be expanded before production, but the scaffold keeps the required route in place now."
    >
      <section className="panel stack-md">
        <p>
          The app should minimize stored personal data. Wallet address, session
          inputs, and position state should only be retained when required for
          execution, monitoring, or support.
        </p>
        <p>
          Off-app notifications should remain disabled until explicit consent and
          retention policies are defined.
        </p>
      </section>
    </AppShell>
  );
}

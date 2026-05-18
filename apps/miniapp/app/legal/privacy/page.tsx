import { AppShell } from "../../../components/app-shell";

export default function PrivacyPage() {
  return (
    <AppShell
      eyebrow="Legal"
      title="Privacy policy"
      intro="MiniPay Yield Copilot is designed to work with the minimum amount of data necessary."
    >
      <section className="panel stack-md">
        <h3>Data collected</h3>
        <p>
          The app reads your wallet address in read-only mode to pre-fill request
          fields when running inside MiniPay. Session inputs — your goal, token,
          amount, time horizon, and risk comfort — are used only to compute the
          recommendation for that session. Position state shown on the position screen
          is derived from those inputs and is not stored on any server.
        </p>
      </section>

      <section className="panel stack-md">
        <h3>Data not collected</h3>
        <p>
          The app does not collect your name, email address, phone number, government
          ID, or any off-chain payment information. It does not link your wallet address
          to any personal identity record. No biometric data is collected or processed.
        </p>
      </section>

      <section className="panel stack-md">
        <h3>Local storage</h3>
        <p>
          Recommendation inputs and position snapshots may be saved in your browser's
          local storage to allow the position tracker to persist between sessions.
          This data never leaves your device and is not transmitted to any server.
          You can clear it at any time by clearing your browser storage.
        </p>
      </section>

      <section className="panel stack-md">
        <h3>Tracking and analytics</h3>
        <p>
          No analytics cookies are set. No third-party tracking scripts are loaded.
          No user behaviour data is shared with advertising networks or data brokers.
          The app does not fingerprint your device.
        </p>
      </section>

      <section className="panel stack-md">
        <h3>Contact</h3>
        <p>
          If you have questions about how your data is handled, visit the{" "}
          <a href="/support">support page</a> to reach the team.
        </p>
      </section>
    </AppShell>
  );
}

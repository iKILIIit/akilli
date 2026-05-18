import { AppShell } from "../../../components/app-shell";

export default function TermsPage() {
  return (
    <AppShell
      eyebrow="Legal"
      title="Terms of service"
      intro="By using MiniPay Yield Copilot you agree to the following terms."
    >
      <section className="panel stack-md">
        <h3>Service description</h3>
        <p>
          MiniPay Yield Copilot is an informational tool that analyzes yield venues and
          provides recommendations based on the inputs you supply. It does not constitute
          financial advice and does not guarantee returns of any kind. All yield rates
          are estimates derived from venue data at the time of the query and may change
          without notice.
        </p>
      </section>

      <section className="panel stack-md">
        <h3>User responsibilities</h3>
        <p>
          You are responsible for verifying the current terms, rates, and operational
          status of any yield venue before acting. The app presents information to help
          you decide; the decision and its consequences remain yours. Do not deposit
          more than you can afford to lose into any venue, including native ones.
        </p>
      </section>

      <section className="panel stack-md">
        <h3>Third-party venues</h3>
        <p>
          Venues labelled as third-party introduce smart contract exposure outside the
          MiniPay environment. By choosing to interact with a third-party venue you
          accept the additional protocol risk associated with that venue's contracts,
          liquidity conditions, and operational continuity. MiniPay Yield Copilot has
          no affiliation with, and makes no representations about, the safety of any
          third-party venue.
        </p>
      </section>

      <section className="panel stack-md">
        <h3>Execution</h3>
        <p>
          No funds move without a wallet signature from you. The app generates a
          proposed execution plan and presents it for your review before requesting
          approval. You should read every step before confirming. If anything is
          unclear, do not sign.
        </p>
      </section>

      <section className="panel stack-md">
        <h3>Limitation of liability</h3>
        <p>
          To the fullest extent permitted by applicable law, MiniPay Yield Copilot and
          its contributors accept no liability for losses arising from yield venue
          failure, smart contract exploits, rate changes, liquidity restrictions, or
          any other condition affecting the venues shown. Use of this tool is at your
          own risk.
        </p>
      </section>

      <section className="panel stack-md">
        <h3>Updates to these terms</h3>
        <p>
          These terms may be updated at any time. Material changes will be reflected
          by an updated date on this page. Continued use of the app after changes
          constitutes acceptance of the revised terms.
        </p>
      </section>
    </AppShell>
  );
}

import { BackButton, HeaderBar, ScreenFrame } from "../../../components/screen-frame";

function LegalSection({
  index,
  title,
  body,
}: {
  index: string;
  title: string;
  body: string;
}) {
  return (
    <section className="legal-section">
      <div className="legal-section__head">
        <span>{index}</span>
        <strong>{title}</strong>
      </div>
      <p>{body}</p>
    </section>
  );
}

export default function TermsPage() {
  return (
    <ScreenFrame>
      <HeaderBar left={<BackButton href="/" />} title="Terms" subtle="v1.4" />

      <section className="screen-copy-block screen-copy-block--no-step screen-copy-block--legal">
        <h1 className="screen-copy-block__title">Terms</h1>
        <p className="screen-copy-block__body">Last updated · May 4, 2026</p>
      </section>

      <div className="legal-stack">
        <LegalSection
          index="01"
          title="What this app is"
          body="Yield Copilot is a decision-support tool. It surfaces yield options and recommends a route. You execute. You stay in control of your funds."
        />
        <LegalSection
          index="02"
          title="Not advice"
          body="Nothing here is investment, legal, or tax advice. Yields and risks change. Always read the destination protocol before you commit."
        />
        <LegalSection
          index="03"
          title="Custody"
          body="We never hold your stablecoins. Transactions are constructed in MiniPay and signed by you."
        />
        <LegalSection
          index="04"
          title="Fees"
          body="Yield Copilot is free to use. Destination protocols and network fees apply as shown at the point of execution."
        />
        <LegalSection
          index="05"
          title="Limit of liability"
          body="To the maximum extent permitted by law, we are not liable for losses arising from on-chain activity initiated by you."
        />
      </div>
    </ScreenFrame>
  );
}

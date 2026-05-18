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

export default function PrivacyPage() {
  return (
    <ScreenFrame>
      <HeaderBar left={<BackButton href="/" />} title="Privacy" subtle="v1.4" />

      <section className="screen-copy-block screen-copy-block--no-step screen-copy-block--legal">
        <h1 className="screen-copy-block__title">Privacy</h1>
        <p className="screen-copy-block__body">Last updated · May 4, 2026</p>
      </section>

      <div className="legal-stack">
        <LegalSection
          index="01"
          title="What we read"
          body="Yield Copilot reads your stablecoin balances and the recommendations you choose to act on. We do not ask for keys."
        />
        <LegalSection
          index="02"
          title="What we store"
          body="Your brief — goal, amount, days, risk — is stored on your device. Aggregated, anonymized usage is sent to improve recommendations."
        />
        <LegalSection
          index="03"
          title="Who else sees it"
          body="No third parties receive your wallet address. Routing partners receive only the transaction MiniPay constructs at the moment of execution."
        />
        <LegalSection
          index="04"
          title="Your controls"
          body="You can clear your brief and history at any time from Settings · Data. Deletion is immediate and total."
        />
      </div>
    </ScreenFrame>
  );
}

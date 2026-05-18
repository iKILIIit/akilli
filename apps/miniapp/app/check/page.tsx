import { defaultRecommendationInput, parseRecommendationInput } from "../../lib/request";
import { IntakeForm } from "../../components/intake-form";
import { BackButton, HeaderBar, ScreenFrame, StepDots } from "../../components/screen-frame";

type CheckPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CheckPage({ searchParams }: CheckPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const parsed = parseRecommendationInput(resolvedSearchParams);
  const walletAddress =
    parsed.walletAddress !== defaultRecommendationInput.walletAddress
      ? parsed.walletAddress
      : undefined;

  return (
    <ScreenFrame>
      <HeaderBar
        left={<BackButton href="/" />}
        title="New check"
        right={<div className="screen-topbar__meta">Save</div>}
      />

      <section className="screen-copy-block">
        <StepDots current={1} total={3} />
        <h1 className="screen-copy-block__title">
          Tell me
          <br />
          the brief.
        </h1>
        <p className="screen-copy-block__body">Set the amount, goal, and risk level.</p>
      </section>

      <div className="screen-form-stack">
        <IntakeForm
          initialGoal={parsed.goal}
          initialToken={parsed.token}
          initialAmount={parsed.amount}
          initialTimeHorizonDays={parsed.timeHorizonDays}
          initialRiskComfort={parsed.riskComfort}
          walletAddress={walletAddress}
        />
      </div>
    </ScreenFrame>
  );
}

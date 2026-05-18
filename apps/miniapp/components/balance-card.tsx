type BalanceCardProps = {
  color: "warm" | "accent" | "dark";
  icon: React.ReactNode;
  amount: string;
  label: string;
  sublabel?: string;
};

const colorMap = {
  warm: "balance-card--warm",
  accent: "balance-card--accent",
  dark: "balance-card--dark",
} as const;

export function BalanceCard({
  color,
  icon,
  amount,
  label,
  sublabel,
}: BalanceCardProps) {
  return (
    <div className={`balance-card ${colorMap[color]}`}>
      <span className="balance-card__icon">{icon}</span>
      <div className="balance-card__bottom">
        <p className="balance-card__amount">{amount}</p>
        <p className="balance-card__label">{label}</p>
        {sublabel ? (
          <p className="balance-card__sublabel">{sublabel}</p>
        ) : null}
      </div>
    </div>
  );
}

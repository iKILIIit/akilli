import Link from "next/link";

function BackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M11 3.5L4.5 9l6.5 5.5M5 9h10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="4" cy="9" r="1.4" fill="currentColor" />
      <circle cx="9" cy="9" r="1.4" fill="currentColor" />
      <circle cx="14" cy="9" r="1.4" fill="currentColor" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M3 7h8M7.5 3.5L11 7l-3.5 3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M7 11V3M3.5 6.5L7 3l3.5 3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ChatPage() {
  const defaultParams =
    "goal=earn-more&token=USDC&amount=2400&timeHorizonDays=30&riskComfort=low";

  return (
    <div className="chat-screen chat-screen--bundle">
      <header className="chat-header chat-header--bundle">
        <Link href="/" className="chat-header__back" aria-label="Go back">
          <BackIcon />
        </Link>

        <div className="chat-profile">
          <span className="chat-profile__avatar" aria-hidden="true" />
          <div>
            <strong>Copilot</strong>
            <span>Online · plain answers</span>
          </div>
        </div>

        <Link href="/support" className="chat-header__icon-btn" aria-label="Open support">
          <MoreIcon />
        </Link>
      </header>

      <div className="chat-body chat-body--bundle">
        <div className="chat-thread-row">
          <span className="chat-thread-row__avatar" aria-hidden="true" />
          <div className="chat-message-bubble">
            <p>Hi — I&apos;m Copilot. I look at your idle stablecoins and help you decide whether to move them, and where.</p>
            <small>I&apos;ll always show one pick + one backup.</small>
          </div>
        </div>

        <div className="chat-thread-row chat-thread-row--user">
          <div className="chat-message-bubble chat-message-bubble--user">
            <p>What should I do with 2,400 USDC for ~30 days?</p>
          </div>
        </div>

        <div className="chat-thread-row">
          <span className="chat-thread-row__avatar" aria-hidden="true" />
          <div className="chat-thread-stack">
            <div className="chat-message-bubble">
              <p>For low risk and instant exit, the better route is Kiln in MiniPay at 6.1%. Backup is MiniPay Boost at 4.8%.</p>
            </div>
            <Link href={`/recommendation?${defaultParams}`} className="chat-inline-card">
              <span className="chat-inline-card__logo">K</span>
              <div>
                <strong>Kiln in MiniPay</strong>
                <small>6.1% · Low · Instant</small>
              </div>
              <span className="chat-inline-card__arrow">
                <ArrowRightIcon />
              </span>
            </Link>
          </div>
        </div>

        <div className="chat-try-label">Try asking</div>
        <div className="chat-prompt-stack">
          {[
            { label: "Audit my positions in hard mode", href: `/recommendation?${defaultParams}` },
            { label: "Audit me", href: `/position?${defaultParams}` },
            { label: "Build my monthly plan", href: "/check" },
          ].map((prompt) => (
            <Link key={prompt.label} href={prompt.href} className="chat-prompt-chip">
              {prompt.label}
              <ArrowRightIcon />
            </Link>
          ))}
        </div>
      </div>

      <footer className="chat-input-bar chat-input-bar--bundle">
        <div className="chat-input-bar__placeholder">Ask anything…</div>
        <div className="chat-input-bar__tools">
          <Link href="/support" className="chat-input-bar__tool" aria-label="Attach image">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="3" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.3" />
              <circle cx="6" cy="6.5" r="1.1" fill="currentColor" />
              <path d="M3 12l3-3 2.5 2.5L11 8l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
            </svg>
          </Link>
          <Link href="/check" className="chat-input-bar__tool" aria-label="Voice input">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="6" y="2" width="4" height="8" rx="2" stroke="currentColor" strokeWidth="1.3" />
              <path d="M3.5 8a4.5 4.5 0 009 0M8 12.5V14.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </Link>
          <Link href="/support" className="chat-input-bar__agent-chip">Copilot</Link>
          <Link href={`/recommendation?${defaultParams}`} className="chat-input-bar__send" aria-label="Send message">
            <ArrowUpIcon />
          </Link>
        </div>
      </footer>
    </div>
  );
}

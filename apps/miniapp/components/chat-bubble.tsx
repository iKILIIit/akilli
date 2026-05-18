import type { ReactNode } from "react";

type ChatBubbleProps = {
  avatar?: ReactNode;
  message: string;
  actions?: Array<{ label: string; href: string }>;
};

export function ChatBubble({ avatar, message, actions }: ChatBubbleProps) {
  return (
    <div className="chat-bubble">
      {avatar ? <div className="chat-bubble__avatar">{avatar}</div> : null}
      <p className="chat-bubble__text">{message}</p>
      {actions && actions.length > 0 ? (
        <div className="chat-bubble__actions">
          {actions.map((action) => (
            <a
              key={action.label}
              href={action.href}
              className="chat-bubble__chip"
            >
              {action.label}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

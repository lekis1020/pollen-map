import {
  CONTACT_X,
  CONTACT_X_HANDLE,
  CONTACT_MAIL,
  CONTACT_GITHUB_ISSUES,
  mailHref,
} from '../data/contact.js';
import './ContactPanel.css';

/**
 * 문제 제보 창구.
 *
 * GitHub 이슈만 두면 개발자가 아닌 이용자는 사실상 제보할 길이 없다.
 * 그래서 X와 메일을 먼저 놓고 GitHub는 마지막에 둔다.
 */
export default function ContactPanel() {
  return (
    <section className="contact-panel" aria-labelledby="contact-heading">
      <h3 id="contact-heading">문제 제보 · 문의</h3>

      <p className="contact-desc">
        지도가 이상하게 보이거나 수종·알레르기 정보가 잘못됐다면 알려주세요.
        확인해서 반영합니다.
      </p>

      <ul className="contact-links">
        <li>
          <a
            href={CONTACT_X}
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg className="contact-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.657l-5.214-6.817-5.966 6.817H1.68l7.73-8.835L1.254 2.25h6.826l4.713 6.231 5.451-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z"
              />
            </svg>
            <span className="contact-label">X</span>
            <span className="contact-value">{CONTACT_X_HANDLE}</span>
          </a>
        </li>
        <li>
          <a href={mailHref()}>
            <svg className="contact-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 6.5h18v11H3zM3.4 7l8.6 6 8.6-6"
              />
            </svg>
            <span className="contact-label">메일</span>
            <span className="contact-value">{CONTACT_MAIL}</span>
          </a>
        </li>
        <li>
          <a
            href={CONTACT_GITHUB_ISSUES}
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg className="contact-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.09.68-.22.68-.5 0-.24-.01-.87-.01-1.71-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.63.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.05 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05a9.3 9.3 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.92-2.34 4.79-4.57 5.04.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.59.69.49A10.06 10.06 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z"
              />
            </svg>
            <span className="contact-label">GitHub</span>
            <span className="contact-value">이슈 등록</span>
          </a>
        </li>
      </ul>
    </section>
  );
}

// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import ContactPanel from './ContactPanel.jsx';

afterEach(cleanup);

// 일반 사용자는 GitHub 이슈를 발행하지 못한다. 그래서 X와 메일이 먼저 오고
// GitHub는 세 번째다. 순서 자체가 이 패널의 요구사항이라 테스트로 고정한다.
describe('ContactPanel', () => {
  it('세 창구를 X · 메일 · GitHub 순으로 보여준다', () => {
    render(<ContactPanel />);
    const links = screen.getAllByRole('link');
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      'https://x.com/lekis1020',
      expect.stringMatching(/^mailto:lekis1020@gmail\.com\?subject=/),
      'https://github.com/lekis1020/pollen-map/issues',
    ]);
  });

  it('메일 링크는 제목을 미리 채워 어떤 서비스의 제보인지 알 수 있게 한다', () => {
    render(<ContactPanel />);
    const mail = screen.getByRole('link', { name: /lekis1020@gmail\.com/ });
    expect(decodeURIComponent(mail.getAttribute('href'))).toContain(
      '식물 알레르기 지도'
    );
  });

  // target="_blank"만 두고 rel을 빠뜨리면 열린 탭이 window.opener로
  // 원본 페이지를 조작할 수 있다. mailto는 새 탭 대상이 아니므로 제외.
  it('새 탭으로 여는 링크에는 rel="noopener noreferrer"가 붙는다', () => {
    render(<ContactPanel />);
    const external = screen
      .getAllByRole('link')
      .filter((a) => a.getAttribute('target') === '_blank');
    expect(external).toHaveLength(2);
    external.forEach((a) => {
      expect(a).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });
});

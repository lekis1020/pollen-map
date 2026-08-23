import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // public/MarkerClustering.js는 네이버가 배포한 서드파티 라이브러리다(Apache 2.0).
  // index.html이 <script>로 직접 싣는 전역 스크립트라 모듈 규칙이 맞지 않고,
  // 우리가 고칠 파일도 아니라 검사 대상에서 뺀다.
  // .pwa-test-dist는 src/pwa.test.js가 산출물을 검사하려고 만드는 임시 빌드다.
  // dist와 같은 이유로 검사하지 않는다 — 우리가 쓴 코드가 아니라 번들 결과물이다.
  globalIgnores(['dist', '.pwa-test-dist', 'public/MarkerClustering.js']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        // index.html이 <script>로 싣는 전역. 위 globalIgnores와 짝이다.
        MarkerClustering: 'readonly',
      },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      // 네이버 지도 오버레이 정리(setMap(null)/close())는 지도 인스턴스가 이미
      // 사라진 뒤에도 불릴 수 있다. 그때 나는 예외는 삼키는 게 맞고, 달리 할
      // 처리도 없다. 빈 catch를 허용하되 catch 외의 빈 블록은 계속 잡는다.
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    // 서버리스 함수(api/)와 테스트 파일은 Node 전역(process, global 등)을 사용한다.
    files: ['api/**/*.js', '**/*.test.{js,jsx}'],
    languageOptions: {
      globals: globals.node,
    },
  },
])

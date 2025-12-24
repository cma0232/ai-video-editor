import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright 端到端测试配置文件
 *
 * 用途：
 * - 配置 E2E 测试环境
 * - 定义浏览器类型和设备
 * - 配置测试服务器和报告
 *
 * 测试命令：
 * - pnpm test:e2e       # 运行所有 E2E 测试
 * - pnpm test:e2e:ui    # 启动 Playwright UI 界面（可视化调试）
 *
 * 文档：https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // 测试文件目录
  testDir: './tests/e2e',

  // 测试输出目录（截图、视频、trace 等）
  outputDir: './docs/test-reports/e2e-results',

  // 完全并行运行测试（更快但需要更多资源）
  fullyParallel: true,

  // CI 环境中禁止使用 test.only（防止意外提交）
  forbidOnly: !!process.env.CI,

  // CI 环境中自动重试失败的测试（减少 flaky test 影响）
  retries: process.env.CI ? 2 : 0,

  // 并发执行的测试数量（CI 环境中使用单线程避免资源竞争）
  workers: process.env.CI ? 1 : undefined,

  // 测试报告配置
  reporter: [
    // HTML 报告（浏览器查看）
    ['html', { outputFolder: 'docs/test-reports/playwright-html' }],
    // 列表报告（终端输出）
    ['list'],
    // JSON 报告（用于 CI/CD 集成）
    ['json', { outputFile: 'docs/test-reports/e2e-results.json' }],
  ],

  // 全局测试配置
  use: {
    // 应用基础 URL
    baseURL: 'http://localhost:8899',

    // 失败时自动重试时记录 trace（用于调试）
    trace: 'on-first-retry',

    // 失败时截图
    screenshot: 'only-on-failure',

    // 失败时保留视频
    video: 'retain-on-failure',

    // 浏览器上下文配置
    contextOptions: {
      // 忽略 HTTPS 错误（开发环境）
      ignoreHTTPSErrors: true,
    },

    // 导航超时（30 秒）
    navigationTimeout: 30000,

    // 操作超时（10 秒）
    actionTimeout: 10000,
  },

  // 测试项目配置（不同浏览器）
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // 可选：其他浏览器测试（暂时注释，需要时启用）
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] }
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] }
    // },

    // 可选：移动浏览器测试
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] }
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] }
    // }
  ],

  // 测试前启动开发服务器
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:8899',
    // 非 CI 环境复用已运行的服务器
    reuseExistingServer: !process.env.CI,
    // 服务器启动超时（2 分钟）
    timeout: 120000,
    // 等待服务器返回 200 状态码
    stdout: 'ignore',
    stderr: 'pipe',
  },
})

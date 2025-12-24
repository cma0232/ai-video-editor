'use client'

import { ApiConfigTab, ApiExamplesTab, CreateJobTab, QuickStartTab } from '@/components/guide/tabs'
import { PageHeader } from '@/components/layout/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui'

const TAB_ITEMS = [
  { value: 'quick-start', label: '快速入门', component: QuickStartTab },
  { value: 'api-config', label: 'API 配置', component: ApiConfigTab },
  { value: 'create-job', label: '创建任务', component: CreateJobTab },
  { value: 'api-examples', label: 'API 示例', component: ApiExamplesTab },
]

export default function GuidePage() {
  return (
    <div className="flex flex-col bg-linear-to-br from-claude-cream-50/30 via-white to-claude-cream-100/50 min-h-screen">
      <PageHeader
        title="使用教程"
        description="从零开始掌握创剪视频工作流，快速上手全自动视频剪辑"
      />

      <section className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <Tabs defaultValue="quick-start" className="w-full">
          {/* Tab 列表 - 响应式设计 */}
          <TabsList className="mb-6 h-auto flex flex-wrap gap-1 bg-claude-cream-100/50 p-1 rounded-xl">
            {TAB_ITEMS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex-1 min-w-[100px] text-sm px-3 py-2.5 data-[state=active]:bg-claude-orange-500 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg transition-all"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Tab 内容 */}
          {TAB_ITEMS.map((tab) => {
            const TabComponent = tab.component
            return (
              <TabsContent key={tab.value} value={tab.value} className="mt-0">
                <TabComponent />
              </TabsContent>
            )
          })}
        </Tabs>
      </section>
    </div>
  )
}

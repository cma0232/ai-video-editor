'use client'

import { Copy, FileText, Loader2, Palette, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ErrorDetailDialog } from '@/components/dialogs/error-detail-dialog'
import { useConfirmDialog } from '@/components/dialogs/use-confirm-dialog'
import { PageHeader } from '@/components/layout/page-header'
import { StyleCard } from '@/components/styles/style-card'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Pagination,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui'

interface StyleSummary {
  id: string
  name: string
  description: string
  config: {
    channel_name: string
    original_audio_scene_count?: number
  }
  is_builtin: boolean
}

export default function StylesPage() {
  const router = useRouter()
  const { confirm } = useConfirmDialog()

  // 风格数据
  const [builtinStyles, setBuiltinStyles] = useState<StyleSummary[]>([])
  const [customStyles, setCustomStyles] = useState<StyleSummary[]>([])
  const [loadingStyles, setLoadingStyles] = useState(true)

  // 分页状态
  const [builtinCurrentPage, setBuiltinCurrentPage] = useState(1)
  const [customCurrentPage, setCustomCurrentPage] = useState(1)
  const pageSize = 15 // 固定每页 15 个（5 行 × 3 列）

  // 删除状态
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // 错误详情弹窗状态
  const [errorDialogOpen, setErrorDialogOpen] = useState(false)
  const [errorDetail, setErrorDetail] = useState('')

  // 创建风格弹框状态
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  // biome-ignore lint/correctness/useExhaustiveDependencies: 初始化加载
  useEffect(() => {
    fetchStyles()
  }, [])

  const fetchStyles = async () => {
    try {
      setLoadingStyles(true)
      const response = await fetch('/api/styles')
      const data = await response.json()
      setBuiltinStyles(data.builtin || [])
      setCustomStyles(data.custom || [])
    } catch {
      // 静默处理
    } finally {
      setLoadingStyles(false)
    }
  }

  // 分页逻辑
  const builtinTotalPages = Math.ceil(builtinStyles.length / pageSize)
  const customTotalPages = Math.ceil(customStyles.length / pageSize)

  const paginatedBuiltinStyles = builtinStyles.slice(
    (builtinCurrentPage - 1) * pageSize,
    builtinCurrentPage * pageSize,
  )

  const paginatedCustomStyles = customStyles.slice(
    (customCurrentPage - 1) * pageSize,
    customCurrentPage * pageSize,
  )

  const handleDeleteStyle = async (id: string) => {
    const confirmed = await confirm({
      title: '确定要删除这个自定义剪辑风格吗？',
      description: '此操作不可恢复，删除后将无法找回风格配置和提示词。',
      variant: 'danger',
      confirmText: '确认删除',
      cancelText: '取消',
    })

    if (!confirmed) {
      return
    }

    try {
      setDeletingId(id)
      const response = await fetch(`/api/styles/${id}`, { method: 'DELETE' })

      if (response.ok) {
        toast.success('风格删除成功')
        await fetchStyles()
      } else {
        const data = await response.json()
        const errorMsg = data.error || '未知错误'
        setErrorDetail(errorMsg)
        setErrorDialogOpen(true)
      }
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : '网络请求失败，请稍后再试'
      setErrorDetail(errorMsg)
      setErrorDialogOpen(true)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex flex-col bg-linear-to-br from-claude-cream-50/30 via-white to-claude-cream-100/50 min-h-screen">
      <PageHeader title="风格库管理" description="浏览和管理剪辑风格预设" />

      {/* 主内容区 */}
      <section className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <Tabs defaultValue="builtin" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 h-12">
            <TabsTrigger
              value="builtin"
              className="text-base data-[state=active]:bg-claude-orange-500 data-[state=active]:text-white"
            >
              预设风格 ({builtinStyles.length})
            </TabsTrigger>
            <TabsTrigger
              value="custom"
              className="text-base data-[state=active]:bg-claude-orange-500 data-[state=active]:text-white"
            >
              自定义风格 ({customStyles.length})
            </TabsTrigger>
          </TabsList>

          {/* 预设风格标签页 */}
          <TabsContent value="builtin" className="space-y-6">
            {/* 加载状态 */}
            {loadingStyles ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-claude-dark-400" />
              </div>
            ) : builtinStyles.length === 0 ? (
              /* 空状态 */
              <div className="flex flex-col items-center gap-3 py-12">
                <Palette className="h-10 w-10 text-claude-dark-400" />
                <p className="text-sm text-claude-dark-400">暂无预设风格</p>
              </div>
            ) : (
              <>
                {/* 风格卡片网格 */}
                <div className="grid gap-5 grid-cols-3 content-start min-h-[800px]">
                  {paginatedBuiltinStyles.map((style) => (
                    <StyleCard
                      key={style.id}
                      id={style.id}
                      name={style.name}
                      description={style.description}
                      channelName={style.config.channel_name}
                      originalAudioSceneCount={style.config.original_audio_scene_count ?? 0}
                      isBuiltin={true}
                    />
                  ))}
                </div>

                {/* 分页器 */}
                {builtinStyles.length > 0 && (
                  <div className="mt-6">
                    <Pagination
                      currentPage={builtinCurrentPage}
                      totalPages={builtinTotalPages}
                      onPageChange={setBuiltinCurrentPage}
                      totalItems={builtinStyles.length}
                      pageSize={pageSize}
                      showQuickJumper={builtinTotalPages > 5}
                    />
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* 自定义风格标签页 */}
          <TabsContent value="custom" className="space-y-6">
            {/* 加载状态 */}
            {loadingStyles ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-claude-dark-400" />
              </div>
            ) : customStyles.length === 0 ? (
              /* 空状态 */
              <div className="flex flex-col items-center gap-3 py-16">
                <Palette className="h-12 w-12 text-claude-dark-400" />
                <p className="text-lg font-semibold text-claude-dark-400">还没有自定义风格</p>
                <p className="max-w-sm text-sm text-claude-dark-300 text-center">
                  创建专属剪辑风格，或基于预设风格快速开始
                </p>
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="mt-2 flex items-center gap-2 bg-claude-orange-500 hover:bg-claude-orange-600 text-white">
                      <Plus className="h-4 w-4" />
                      创建第一个风格
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>创建新风格</DialogTitle>
                      <DialogDescription>选择创建方式开始设计您的剪辑风格</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      {/* 从零开始 */}
                      <Button
                        variant="outline"
                        className="w-full justify-start h-auto py-4 px-4 hover:bg-claude-orange-50 hover:border-claude-orange-300"
                        onClick={() => {
                          setCreateDialogOpen(false)
                          router.push('/styles/edit/new')
                        }}
                      >
                        <FileText className="h-5 w-5 mr-3 text-claude-orange-500" />
                        <div className="text-left">
                          <div className="font-medium text-claude-dark-900">从零开始</div>
                          <div className="text-xs text-claude-dark-400 mt-1">
                            创建全新的剪辑风格配置
                          </div>
                        </div>
                      </Button>

                      {/* 预设风格列表 */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-claude-dark-400">基于预设风格</p>
                        <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                          {builtinStyles.map((style) => (
                            <Button
                              key={style.id}
                              variant="outline"
                              className="w-full justify-start h-auto py-3 px-4 hover:bg-claude-orange-50 hover:border-claude-orange-300"
                              onClick={() => {
                                setCreateDialogOpen(false)
                                router.push(`/styles/edit/new?template=${style.id}`)
                              }}
                            >
                              <Copy className="h-4 w-4 mr-3 text-claude-orange-500 shrink-0" />
                              <div className="text-left flex-1">
                                <div className="font-medium text-claude-dark-900">{style.name}</div>
                                {style.description && (
                                  <div className="text-xs text-claude-dark-400 mt-1 line-clamp-1">
                                    {style.description}
                                  </div>
                                )}
                              </div>
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            ) : (
              <>
                {/* 风格卡片网格（包含创建卡片） */}
                <div className="grid gap-5 grid-cols-3 content-start min-h-[800px]">
                  {paginatedCustomStyles.map((style) => (
                    <StyleCard
                      key={style.id}
                      id={style.id}
                      name={style.name}
                      description={style.description}
                      channelName={style.config.channel_name}
                      originalAudioSceneCount={style.config.original_audio_scene_count ?? 0}
                      isBuiltin={false}
                      isDeleting={deletingId === style.id}
                      onEdit={() => router.push(`/styles/edit/${style.id}`)}
                      onDelete={handleDeleteStyle}
                    />
                  ))}

                  {/* 创建新风格卡片 */}
                  <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                    <DialogTrigger asChild>
                      <div className="border-2 border-dashed border-claude-orange-300 rounded-xl p-6 bg-claude-orange-50/30 hover:bg-claude-orange-50/50 hover:border-claude-orange-400 transition-all cursor-pointer flex flex-col items-center justify-center gap-3 h-full min-h-[180px]">
                        <div className="w-12 h-12 rounded-full bg-claude-orange-500 flex items-center justify-center">
                          <Plus className="h-6 w-6 text-white" />
                        </div>
                        <p className="font-medium text-claude-dark-900">创建新风格</p>
                        <p className="text-xs text-claude-dark-400 text-center">
                          从零开始或基于预设风格
                        </p>
                      </div>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>创建新风格</DialogTitle>
                        <DialogDescription>选择创建方式开始设计您的剪辑风格</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        {/* 从零开始 */}
                        <Button
                          variant="outline"
                          className="w-full justify-start h-auto py-4 px-4 hover:bg-claude-orange-50 hover:border-claude-orange-300"
                          onClick={() => {
                            setCreateDialogOpen(false)
                            router.push('/styles/edit/new')
                          }}
                        >
                          <FileText className="h-5 w-5 mr-3 text-claude-orange-500" />
                          <div className="text-left">
                            <div className="font-medium text-claude-dark-900">从零开始</div>
                            <div className="text-xs text-claude-dark-400 mt-1">
                              创建全新的剪辑风格配置
                            </div>
                          </div>
                        </Button>

                        {/* 预设风格列表 */}
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-claude-dark-400">基于预设风格</p>
                          <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                            {builtinStyles.map((style) => (
                              <Button
                                key={style.id}
                                variant="outline"
                                className="w-full justify-start h-auto py-3 px-4 hover:bg-claude-orange-50 hover:border-claude-orange-300"
                                onClick={() => {
                                  setCreateDialogOpen(false)
                                  router.push(`/styles/edit/new?template=${style.id}`)
                                }}
                              >
                                <Copy className="h-4 w-4 mr-3 text-claude-orange-500 shrink-0" />
                                <div className="text-left flex-1">
                                  <div className="font-medium text-claude-dark-900">
                                    {style.name}
                                  </div>
                                  {style.description && (
                                    <div className="text-xs text-claude-dark-400 mt-1 line-clamp-1">
                                      {style.description}
                                    </div>
                                  )}
                                </div>
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* 分页器 */}
                {customStyles.length > 0 && (
                  <div className="mt-6">
                    <Pagination
                      currentPage={customCurrentPage}
                      totalPages={customTotalPages}
                      onPageChange={setCustomCurrentPage}
                      totalItems={customStyles.length}
                      pageSize={pageSize}
                      showQuickJumper={customTotalPages > 5}
                    />
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </section>

      {/* 错误详情弹窗 */}
      <ErrorDetailDialog
        open={errorDialogOpen}
        onOpenChange={setErrorDialogOpen}
        title="删除风格失败"
        description="删除自定义剪辑风格时发生错误"
        errorDetail={errorDetail}
      />
    </div>
  )
}

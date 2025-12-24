/**
 * 工作流选择器
 * - 极简架构
 */

import type { WorkflowDefinition } from '../types'
import { multiVideoWorkflow } from './multi-video'
import { singleVideoWorkflow } from './single-video'

/**
 * 根据任务特征选择工作流
 */
export function selectWorkflow(videoCount: number): WorkflowDefinition {
  if (videoCount === 1) {
    return singleVideoWorkflow
  }

  return multiVideoWorkflow
}

/**
 * 根据工作流 ID 获取工作流
 */
export function getWorkflowById(workflowId: string): WorkflowDefinition | null {
  switch (workflowId) {
    case 'single-video':
      return singleVideoWorkflow
    case 'multi-video':
      return multiVideoWorkflow
    default:
      return null
  }
}

// 导出工作流定义
export { singleVideoWorkflow, multiVideoWorkflow }

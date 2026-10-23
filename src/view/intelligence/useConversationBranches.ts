import { computed, reactive, ref } from 'vue'
import type { allInstall, searchResultObject } from '@/utils/types/ai'

export type BranchRole = 'user' | 'assistant'
export type BranchStatus = 'idle' | 'streaming' | 'done' | 'error' | 'stopped'

export interface BranchThinkContent {
  thinkText: string
  isShow: boolean
  status: string
  isOpen: boolean
}

export interface BranchAdminContent {
  adminText: string
  isShow: boolean
}

export interface BranchNode {
  id: string
  parentId: string | null
  role: BranchRole
  /** 用户消息的展示文本 */
  content: string
  /** 用户消息真正发送给模型的内容（可能包含附件文本） */
  apiContent: string
  /** AI 消息的展示内容，与 allText 共享同一个对象 */
  adminContent: BranchAdminContent | null
  thinkContent: BranchThinkContent | null
  /** 联网搜索来源，未联网时为 null */
  searchResults: searchResultObject[] | null
  /** AI 原始回答（用于重建 DeepSeek 上下文） */
  raw: string
  status: BranchStatus
  children: string[]
  selectedChildId: string | null
  createdAt: number
}

export interface BranchVersion {
  index: number
  total: number
}

/** 用于服务端持久化的完整分支快照 */
export interface BranchSnapshot {
  version: number
  activeLeafId: string
  rootIds: string[]
  nodes: BranchNode[]
}

const SNAPSHOT_VERSION = 1

const EMPTY_ADMIN: BranchAdminContent = { adminText: '', isShow: false }

/**
 * 前端对话分支树（仅用于版本切换，不提供分支树界面）。
 *
 * 每个节点是一条消息，user / assistant 交替组成一条路径。
 * 同一父节点下的同角色节点互为“版本”，activeLeafId 指向当前活动端点。
 */
export function useConversationBranches() {
  const nodes = reactive<Record<string, BranchNode>>({})
  const rootIds = ref<string[]>([])
  const activeLeafId = ref('')

  let seq = 0
  const nextId = () => `branch_${Date.now().toString(36)}_${(++seq).toString(36)}`

  const getNode = (id: string): BranchNode | null => nodes[id] || null

  const parentOf = (node: BranchNode): BranchNode | null =>
    node.parentId ? nodes[node.parentId] || null : null

  const pathTo = (id: string): BranchNode[] => {
    const path: BranchNode[] = []
    let current: BranchNode | null = id ? nodes[id] || null : null
    while (current) {
      path.unshift(current)
      current = current.parentId ? nodes[current.parentId] || null : null
    }
    return path
  }

  const viewPath = computed(() => pathTo(activeLeafId.value))

  const addNode = (data: {
    parentId: string | null
    role: BranchRole
    content?: string
    apiContent?: string
    adminContent?: BranchAdminContent | null
    thinkContent?: BranchThinkContent | null
    searchResults?: searchResultObject[] | null
    status?: BranchStatus
  }): BranchNode => {
    const id = nextId()
    const node: BranchNode = {
      id,
      parentId: data.parentId,
      role: data.role,
      content: data.content || '',
      apiContent: data.apiContent ?? data.content ?? '',
      adminContent:
        data.role === 'assistant' ? data.adminContent || { adminText: '', isShow: false } : null,
      thinkContent: data.thinkContent || null,
      searchResults: data.searchResults || null,
      raw: '',
      status: data.status || 'idle',
      children: [],
      selectedChildId: null,
      createdAt: Date.now()
    }
    nodes[id] = node

    if (data.parentId && nodes[data.parentId]) {
      nodes[data.parentId].children.push(id)
      nodes[data.parentId].selectedChildId = id
    } else {
      node.parentId = null
      rootIds.value.push(id)
    }
    return node
  }

  /** 同一个父节点下、同角色的兄弟消息（即同一位置的不同版本） */
  const getSiblings = (node: BranchNode): BranchNode[] => {
    const parent = parentOf(node)
    const ids = parent ? parent.children : rootIds.value
    return ids
      .map(id => nodes[id])
      .filter((item): item is BranchNode => !!item && item.role === node.role)
  }

  const versionOf = (node: BranchNode): BranchVersion => {
    const siblings = getSiblings(node)
    const index = siblings.findIndex(item => item.id === node.id)
    return { index: index < 0 ? 0 : index, total: siblings.length }
  }

  /** 沿着“最后选择的子节点”一路走到底 */
  const deepestLeaf = (start: BranchNode): BranchNode => {
    let current = start
    while (current.children.length) {
      const selected =
        current.selectedChildId && nodes[current.selectedChildId]
          ? current.selectedChildId
          : current.children[current.children.length - 1]
      const next = nodes[selected]
      if (!next) break
      current = next
    }
    return current
  }

  /** 把某个叶子设为活动端点，并记录沿途的选择 */
  const commitActiveLeaf = (leafId: string) => {
    const path = pathTo(leafId)
    for (let i = 0; i < path.length - 1; i++) {
      nodes[path[i].id].selectedChildId = path[i + 1].id
    }
    activeLeafId.value = path.length ? leafId : ''
  }

  const buildAllText = (path: BranchNode[]): allInstall[] => {
    const items: allInstall[] = []
    for (let i = 0; i + 1 < path.length; i += 2) {
      const user = path[i]
      const assistant = path[i + 1]
      if (!user || user.role !== 'user' || !assistant || assistant.role !== 'assistant') break
      items.push({
        userText: user.content,
        adminContent: assistant.adminContent || { ...EMPTY_ADMIN },
        thinkContent: assistant.thinkContent || undefined,
        searchResults: assistant.searchResults || undefined
      })
    }
    return items
  }

  const reset = () => {
    Object.keys(nodes).forEach(key => delete nodes[key])
    rootIds.value = []
    activeLeafId.value = ''
  }

  /** 把服务端返回的线性历史装载成一条分支 */
  const loadLinear = (items: allInstall[]): string => {
    reset()
    let parentId: string | null = null
    let lastAssistantId = ''
    items.forEach(item => {
      const user = addNode({
        parentId,
        role: 'user',
        content: item.userText || '',
        apiContent: item.userText || '',
        status: 'done'
      })
      const assistant = addNode({
        parentId: user.id,
        role: 'assistant',
        adminContent: {
          adminText: item.adminContent?.adminText || '',
          isShow: false
        },
        thinkContent: item.thinkContent ? { ...item.thinkContent } : null,
        searchResults: item.searchResults || null,
        status: 'done'
      })
      assistant.raw = item.adminContent?.adminText || ''
      lastAssistantId = assistant.id
      parentId = assistant.id
    })
    if (lastAssistantId) commitActiveLeaf(lastAssistantId)
    return lastAssistantId
  }

  /** 导出完整分支树（包含所有版本，不只是当前活动分支） */
  const serialize = (): BranchSnapshot => ({
    version: SNAPSHOT_VERSION,
    activeLeafId: activeLeafId.value,
    rootIds: [...rootIds.value],
    nodes: Object.values(nodes).map(node => ({
      id: node.id,
      parentId: node.parentId,
      role: node.role,
      content: node.content,
      apiContent: node.apiContent,
      adminContent: node.adminContent
        ? { adminText: node.adminContent.adminText, isShow: node.adminContent.isShow }
        : null,
      thinkContent: node.thinkContent ? { ...node.thinkContent } : null,
      searchResults: node.searchResults ? node.searchResults.map(result => ({ ...result })) : null,
      raw: node.raw,
      status: node.status,
      children: [...node.children],
      selectedChildId: node.selectedChildId,
      createdAt: node.createdAt
    }))
  })

  /** 从服务端快照还原分支树，数据不可用时返回 false */
  const restore = (snapshot: unknown): boolean => {
    if (!snapshot || typeof snapshot !== 'object') return false
    const data = snapshot as Partial<BranchSnapshot>
    if (!Array.isArray(data.nodes) || data.nodes.length === 0) return false
    const valid = data.nodes.every(
      item =>
        item &&
        typeof item.id === 'string' &&
        (item.role === 'user' || item.role === 'assistant') &&
        Array.isArray(item.children)
    )
    if (!valid) return false

    reset()
    data.nodes.forEach(item => {
      nodes[item.id] = {
        id: item.id,
        parentId: item.parentId ?? null,
        role: item.role,
        content: item.content || '',
        apiContent: item.apiContent ?? item.content ?? '',
        adminContent:
          item.role === 'assistant'
            ? {
                adminText: item.adminContent?.adminText || '',
                isShow: !!item.adminContent?.isShow
              }
            : null,
        thinkContent: item.thinkContent
          ? {
              thinkText: item.thinkContent.thinkText || '',
              isShow: !!item.thinkContent.isShow,
              status: item.thinkContent.status || '',
              isOpen: !!item.thinkContent.isOpen
            }
          : null,
        searchResults: Array.isArray(item.searchResults)
          ? item.searchResults.map(result => ({ ...result }))
          : null,
        raw: item.raw || item.adminContent?.adminText || '',
        status: item.status || 'done',
        children: [...item.children],
        selectedChildId: item.selectedChildId ?? null,
        createdAt: item.createdAt || Date.now()
      }
    })

    // 修复脏数据：父节点不存在则视为根节点，children 只保留真实子节点
    Object.values(nodes).forEach(node => {
      if (node.parentId && !nodes[node.parentId]) node.parentId = null
      node.children = node.children.filter(id => !!nodes[id] && nodes[id].parentId === node.id)
    })
    const roots: string[] = Array.isArray(data.rootIds)
      ? data.rootIds.filter(id => !!nodes[id])
      : []
    Object.values(nodes).forEach(node => {
      if (node.parentId) {
        const parent = nodes[node.parentId]
        if (!parent.children.includes(node.id)) parent.children.push(node.id)
      } else if (!roots.includes(node.id)) {
        roots.push(node.id)
      }
    })
    rootIds.value = roots.filter((id, index) => roots.indexOf(id) === index)

    // 恢复活动端点，端点失效时退回到最后一条根分支的末尾
    const savedLeafId = data.activeLeafId || ''
    let leafId = savedLeafId && nodes[savedLeafId] ? savedLeafId : ''
    if (!leafId && rootIds.value.length) {
      leafId = deepestLeaf(nodes[rootIds.value[rootIds.value.length - 1]]).id
    }
    if (!leafId) {
      reset()
      return false
    }
    commitActiveLeaf(leafId)
    if (pathTo(leafId).length < 2) {
      reset()
      return false
    }
    return true
  }

  return {
    nodes,
    rootIds,
    activeLeafId,
    viewPath,
    getNode,
    pathTo,
    addNode,
    getSiblings,
    versionOf,
    deepestLeaf,
    commitActiveLeaf,
    buildAllText,
    reset,
    loadLinear,
    serialize,
    restore
  }
}

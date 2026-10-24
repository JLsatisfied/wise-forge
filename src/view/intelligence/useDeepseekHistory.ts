import { computed, ref } from 'vue'
import type { BranchSnapshot } from './useConversationBranches'

/** 一条 DeepSeek 对话的完整记录 */
export interface DeepseekConversation {
  id: string
  /** 取自首条用户消息，最多 15 个字；可手动重命名 */
  title: string
  createdAt: number
  updatedAt: number
  /** 置顶后固定显示在列表最上方 */
  pinned?: boolean
  /** 完整分支快照，用于再次打开时还原 */
  tree: BranchSnapshot
}

/** 侧边栏列表只需要元信息，不加载体积较大的分支树 */
export type DeepseekConversationMeta = Omit<DeepseekConversation, 'tree'>

export interface DeepseekGroup {
  label: string
  items: DeepseekConversationMeta[]
}

const DB_NAME = 'wise-forge-deepseek-history'
const DB_VERSION = 1
const META_STORE = 'deepseek_meta'
const TREE_STORE = 'deepseek_trees'
const USER_INDEX = 'by_user'

/** 旧版本使用 localStorage，保留用于迁移与降级兜底 */
const LEGACY_PREFIX = 'wise-forge:deepseek-history:'
/** 单用户最多保留的对话条数，超出后丢弃最久未使用的 */
const MAX_CONVERSATIONS = 60
export const TITLE_MAX_LENGTH = 15

const legacyKey = (userId: string) => `${LEGACY_PREFIX}${userId || 'guest'}`

/** 会话标题：首条用户消息压缩空白后截断到 15 个字 */
export const clipTitle = (text: string, max = TITLE_MAX_LENGTH): string => {
  const normalized = (text || '').replace(/\s+/g, ' ').trim()
  const title = Array.from(normalized).slice(0, max).join('')
  return title || '未命名对话'
}

export const createDeepseekId = (): string =>
  `deepseek_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

const normalizeEntry = (item: Partial<DeepseekConversation>): DeepseekConversation | null => {
  if (!item || typeof item.id !== 'string' || !item.tree) return null
  const createdAt = Number(item.createdAt) || Date.now()
  return {
    id: item.id,
    title: item.title || '未命名对话',
    createdAt,
    updatedAt: Number(item.updatedAt) || createdAt,
    pinned: !!item.pinned,
    tree: item.tree
  }
}

const normalizeMeta = (
  item: Partial<DeepseekConversationMeta>
): DeepseekConversationMeta | null => {
  if (!item || typeof item.id !== 'string') return null
  const createdAt = Number(item.createdAt) || Date.now()
  return {
    id: item.id,
    title: item.title || '未命名对话',
    createdAt,
    updatedAt: Number(item.updatedAt) || createdAt,
    pinned: !!item.pinned
  }
}

// ===== 旧数据（localStorage）=====

const readLegacy = (userId: string): DeepseekConversation[] => {
  try {
    if (typeof localStorage === 'undefined') return []
    const raw = localStorage.getItem(legacyKey(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map(item => normalizeEntry(item))
      .filter((item): item is DeepseekConversation => !!item)
      .sort((a, b) => b.updatedAt - a.updatedAt)
  } catch {
    return []
  }
}

const removeLegacy = (userId: string) => {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(legacyKey(userId))
  } catch {
    // 忽略清理失败
  }
}

// ===== 存储抽象：IndexedDB 优先，localStorage 兜底 =====

interface HistoryStorage {
  kind: 'idb' | 'local'
  all(userId: string): Promise<DeepseekConversationMeta[]>
  getTree(userId: string, id: string): Promise<BranchSnapshot | null>
  put(userId: string, entry: DeepseekConversation): Promise<void>
  /** 只更新元信息（重命名 / 置顶），不触碰分支树 */
  putMeta(userId: string, meta: DeepseekConversationMeta): Promise<void>
  remove(userId: string, id: string): Promise<void>
}

const promisify = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

const transactionDone = (tx: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })

let dbPromise: Promise<IDBDatabase> | null = null

const openDatabase = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB 不可用'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(META_STORE)) {
        const meta = db.createObjectStore(META_STORE, { keyPath: 'id' })
        meta.createIndex(USER_INDEX, 'userId', { unique: false })
      }
      if (!db.objectStoreNames.contains(TREE_STORE)) {
        db.createObjectStore(TREE_STORE, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('IndexedDB 被其它页面占用'))
  })
  return dbPromise
}

interface StoredMeta extends DeepseekConversationMeta {
  userId: string
}

const createIdbStorage = (db: IDBDatabase): HistoryStorage => ({
  kind: 'idb',

  async all(userId) {
    const tx = db.transaction(META_STORE, 'readonly')
    const rows = await promisify(
      tx.objectStore(META_STORE).index(USER_INDEX).getAll(userId) as IDBRequest<StoredMeta[]>
    )
    return rows
      .map(row => normalizeMeta(row))
      .filter((item): item is DeepseekConversationMeta => !!item)
      .sort((a, b) => b.updatedAt - a.updatedAt)
  },

  async getTree(_userId, id) {
    const tx = db.transaction(TREE_STORE, 'readonly')
    const row = await promisify(
      tx.objectStore(TREE_STORE).get(id) as IDBRequest<
        { id: string; tree: BranchSnapshot } | undefined
      >
    )
    return row?.tree ?? null
  },

  async put(userId, entry) {
    const tx = db.transaction([META_STORE, TREE_STORE], 'readwrite')
    const meta: StoredMeta = {
      id: entry.id,
      userId,
      title: entry.title || '未命名对话',
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      pinned: !!entry.pinned
    }
    tx.objectStore(META_STORE).put(meta)
    tx.objectStore(TREE_STORE).put({ id: entry.id, tree: entry.tree })
    await transactionDone(tx)
  },

  async putMeta(userId, meta) {
    const tx = db.transaction(META_STORE, 'readwrite')
    tx.objectStore(META_STORE).put({ ...meta, userId })
    await transactionDone(tx)
  },

  async remove(_userId, id) {
    const tx = db.transaction([META_STORE, TREE_STORE], 'readwrite')
    tx.objectStore(META_STORE).delete(id)
    tx.objectStore(TREE_STORE).delete(id)
    await transactionDone(tx)
  }
})

const createLocalStorageStorage = (): HistoryStorage => ({
  kind: 'local',

  async all(userId) {
    return readLegacy(userId).map(({ ...meta }) => meta)
  },

  async getTree(userId, id) {
    return readLegacy(userId).find(item => item.id === id)?.tree ?? null
  },

  async put(userId, entry) {
    if (typeof localStorage === 'undefined') return
    const list = readLegacy(userId).filter(item => item.id !== entry.id)
    list.push(entry)
    const trimmed = list.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_CONVERSATIONS)
    try {
      localStorage.setItem(legacyKey(userId), JSON.stringify(trimmed))
    } catch {
      // 超出容量时只保留最近一半
      localStorage.setItem(
        legacyKey(userId),
        JSON.stringify(trimmed.slice(0, Math.max(1, Math.floor(trimmed.length / 2))))
      )
    }
  },

  async putMeta(userId, meta) {
    if (typeof localStorage === 'undefined') return
    const list = readLegacy(userId).map(item => (item.id === meta.id ? { ...item, ...meta } : item))
    localStorage.setItem(legacyKey(userId), JSON.stringify(list))
  },

  async remove(userId, id) {
    const list = readLegacy(userId).filter(item => item.id !== id)
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(legacyKey(userId), JSON.stringify(list))
  }
})

let storagePromise: Promise<HistoryStorage> | null = null

const getStorage = (): Promise<HistoryStorage> => {
  if (!storagePromise) {
    storagePromise = openDatabase()
      .then(db => createIdbStorage(db))
      .catch(err => {
        console.warn('[deepseek-history] IndexedDB 不可用，回退到 localStorage', err)
        return createLocalStorageStorage()
      })
  }
  return storagePromise
}

/** 首次使用 IndexedDB 时，把旧 localStorage 里的记录迁移过来 */
const migrateLegacy = async (storage: HistoryStorage, userId: string) => {
  if (storage.kind !== 'idb') return
  const legacy = readLegacy(userId)
  if (!legacy.length) return
  try {
    const existing = await storage.all(userId)
    const known = new Set(existing.map(item => item.id))
    for (const entry of legacy) {
      if (known.has(entry.id)) continue
      await storage.put(userId, entry)
    }
    removeLegacy(userId)
  } catch (err) {
    // 迁移失败时保留旧数据，下次启动再试
    console.warn('[deepseek-history] 旧数据迁移失败', err)
  }
}

// ===== 分组 =====

const startOfDay = (time: number): number => {
  const date = new Date(time)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

const shiftDay = (time: number, days: number): number => {
  const date = new Date(time)
  date.setDate(date.getDate() + days)
  return date.getTime()
}

const monthLabel = (time: number): string => {
  const date = new Date(time)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/**
 * 按最近使用时间分组：今天 / 昨天 / 7天内 / 30天内 / yyyy-mm
 * 分组顺序固定，组内按更新时间倒序
 */
export const groupDeepseekHistory = (
  list: DeepseekConversationMeta[],
  now = Date.now()
): DeepseekGroup[] => {
  const today = startOfDay(now)
  const recent: DeepseekGroup[] = [
    { label: '今天', items: [] },
    { label: '昨天', items: [] },
    { label: '7天内', items: [] },
    { label: '30天内', items: [] }
  ]
  const months = new Map<string, DeepseekConversationMeta[]>()
  const pinned: DeepseekConversationMeta[] = []
  const sorted = [...list].sort((a, b) => b.updatedAt - a.updatedAt)

  sorted.forEach(item => {
    // 置顶会话单独成组，不再重复出现在日期分组里
    if (item.pinned) {
      pinned.push(item)
      return
    }
    const day = startOfDay(item.updatedAt)
    if (day >= today) {
      recent[0].items.push(item)
    } else if (day >= shiftDay(today, -1)) {
      recent[1].items.push(item)
    } else if (day >= shiftDay(today, -6)) {
      recent[2].items.push(item)
    } else if (day >= shiftDay(today, -29)) {
      recent[3].items.push(item)
    } else {
      const label = monthLabel(item.updatedAt)
      const bucket = months.get(label)
      if (bucket) bucket.push(item)
      else months.set(label, [item])
    }
  })

  const monthGroups: DeepseekGroup[] = [...months.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([label, items]) => ({ label, items }))

  return [
    ...(pinned.length ? [{ label: '置顶', items: pinned }] : []),
    ...recent,
    ...monthGroups
  ].filter(group => group.items.length > 0)
}

/** DeepSeek 对话历史：按用户隔离保存在 IndexedDB */
export const useDeepseekHistory = (getUserId: () => number | string) => {
  const conversations = ref<DeepseekConversationMeta[]>([])
  const groups = computed(() => groupDeepseekHistory(conversations.value))

  const currentUserId = () => String(getUserId() || 'guest')

  const load = async () => {
    const storage = await getStorage()
    const userId = currentUserId()
    // 申请持久化存储，降低浏览器清理历史的概率（不支持时静默忽略）
    if (storage.kind === 'idb') {
      navigator.storage?.persist?.().catch(() => {})
    }
    await migrateLegacy(storage, userId)
    conversations.value = await storage.all(userId)
  }

  const upsert = async (entry: DeepseekConversation) => {
    // 先同步更新内存，保证侧边栏立即出现，也避免连续保存时重复建档
    const { ...meta } = entry
    const index = conversations.value.findIndex(item => item.id === entry.id)
    if (index >= 0) conversations.value.splice(index, 1, meta)
    else conversations.value.push(meta)

    const storage = await getStorage()
    const userId = currentUserId()
    await storage.put(userId, entry)

    // 超出上限时按最近使用时间淘汰最旧的记录
    const overflow = [...conversations.value]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(MAX_CONVERSATIONS)
    if (!overflow.length) return
    const dropped = new Set(overflow.map(item => item.id))
    for (const item of overflow) await storage.remove(userId, item.id)
    conversations.value = conversations.value.filter(item => !dropped.has(item.id))
  }

  // 重命名 / 置顶：只更新元信息，不重写分支树
  const updateMeta = async (
    id: string,
    patch: Partial<Pick<DeepseekConversationMeta, 'title' | 'pinned'>>
  ) => {
    const index = conversations.value.findIndex(item => item.id === id)
    if (index < 0) return
    const previous = conversations.value[index]
    // 用普通对象落库，避免把响应式代理交给 IndexedDB 结构化克隆
    const next = { ...previous, ...patch }
    conversations.value.splice(index, 1, next)
    try {
      const storage = await getStorage()
      await storage.putMeta(currentUserId(), next)
    } catch (err) {
      // 写失败时回滚，避免界面和存储不一致
      const rollbackIndex = conversations.value.findIndex(item => item.id === id)
      if (rollbackIndex >= 0) conversations.value.splice(rollbackIndex, 1, previous)
      throw err
    }
  }

  const remove = async (id: string) => {
    const storage = await getStorage()
    await storage.remove(currentUserId(), id)
    conversations.value = conversations.value.filter(item => item.id !== id)
  }

  const getTree = async (id: string): Promise<BranchSnapshot | null> => {
    const storage = await getStorage()
    return storage.getTree(currentUserId(), id)
  }

  return { conversations, groups, load, upsert, updateMeta, remove, getTree }
}

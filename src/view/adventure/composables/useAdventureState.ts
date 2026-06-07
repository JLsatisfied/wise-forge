import { reactive, ref } from 'vue'

export interface PlayerStats {
  hp: number
  maxHp: number
  mp: number
  maxMp: number
  level: number
  gold: number
}

export interface AdventureMessage {
  id: number
  type: 'narration' | 'player_action' | 'system'
  content: string
  roll?: number
}

export interface AdventureState {
  player: PlayerStats
  location: string
  inventory: string[]
  history: AdventureMessage[]
  sceneId: string
}

const defaultPlayer: PlayerStats = {
  hp: 30,
  maxHp: 30,
  mp: 15,
  maxMp: 15,
  level: 1,
  gold: 10
}

let msgId = 0

export function useAdventureState() {
  const state = reactive<AdventureState>({
    player: { ...defaultPlayer },
    location: '',
    inventory: ['破旧的行囊', '干粮×3'],
    history: [],
    sceneId: ''
  })

  const isPlaying = ref(false)
  const playerName = ref('')

  const resetState = (sceneId: string, name: string) => {
    state.player = { ...defaultPlayer }
    state.location = ''
    state.inventory = ['破旧的行囊', '干粮×3']
    state.history = []
    state.sceneId = sceneId
    playerName.value = name
    isPlaying.value = true
    msgId = 0
  }

  const addMessage = (msg: Omit<AdventureMessage, 'id'>) => {
    state.history.push({ ...msg, id: msgId++ })
  }

  const parseStatus = (text: string): boolean => {
    const statusMatch = text.match(/【状态】(.+?)(?=\n|$)/)
    if (!statusMatch) return false

    const statusText = statusMatch[1]
    const hpMatch = statusText.match(/HP:(\d+)\/(\d+)/)
    const mpMatch = statusText.match(/MP:(\d+)\/(\d+)/)
    const lvMatch = statusText.match(/Lv:(\d+)/)
    const goldMatch = statusText.match(/金币:(\d+)/)

    if (hpMatch) {
      state.player.hp = parseInt(hpMatch[1])
      state.player.maxHp = parseInt(hpMatch[2])
    }
    if (mpMatch) {
      state.player.mp = parseInt(mpMatch[1])
      state.player.maxMp = parseInt(mpMatch[2])
    }
    if (lvMatch) state.player.level = parseInt(lvMatch[1])
    if (goldMatch) state.player.gold = parseInt(goldMatch[1])

    return true
  }

  const parseInventory = (text: string): boolean => {
    const equipMatch = text.match(/【装备】(.*?)(?=\n|$)/)
    const gainMatch = text.match(/【获得】(.*?)(?=\n|$)/)
    if (equipMatch) {
      const item = equipMatch[1].trim()
      if (!state.inventory.includes(item)) {
        state.inventory.push(item)
      }
    }
    if (gainMatch) {
      const item = gainMatch[1].trim()
      if (!item.startsWith('金币') && !item.includes('×')) {
        state.inventory.push(item)
      }
    }
    return !!(equipMatch || gainMatch)
  }

  const parseLocation = (text: string): boolean => {
    const locMatch = text.match(/【地点】(.*?)(?=\n|$)/)
    if (locMatch) {
      state.location = locMatch[1].trim()
      return true
    }
    return false
  }

  const parseAll = (text: string) => {
    parseLocation(text)
    parseInventory(text)
    parseStatus(text)
  }

  const rollD20 = (): number => {
    return Math.floor(Math.random() * 20) + 1
  }

  const endGame = () => {
    isPlaying.value = false
  }

  return {
    state,
    isPlaying,
    playerName,
    resetState,
    addMessage,
    parseAll,
    parseStatus,
    rollD20,
    endGame
  }
}

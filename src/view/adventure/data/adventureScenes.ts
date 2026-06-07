export interface AdventureScene {
  id: string
  name: string
  subtitle: string
  description: string
  difficulty: string
  initialPrompt: string
}

const scenes: AdventureScene[] = [
  {
    id: 'dragon_peak',
    name: '龙息之峰',
    subtitle: '古老龙族沉睡之地',
    description:
      '你站在龙息峰脚下，灼热的风夹杂着硫磺气息扑面而来。古老的龙族传说在此流传了千年，而你，将揭开这段尘封的历史。',
    difficulty: '⚔️ 史诗',
    initialPrompt:
      '开场：你是一名初出茅庐的冒险者，站在龙息峰山脚小镇「烬石镇」的入口。远方的火山口偶尔喷出火星，村民们神色紧张。请描述你看到的情景，并给出 3 个行动选项。'
  },
  {
    id: 'whisper_forest',
    name: '低语森林',
    subtitle: '树影中的神秘低语',
    description:
      '幽暗的森林中，诡异的低语在树影间回荡。月光透过枝叶洒下斑驳的光点，脚下的腐叶发出沙沙声响。',
    difficulty: '🔮 神秘',
    initialPrompt:
      '开场：你为寻找失踪的巡林人而踏入低语森林。森林边缘有一座废弃的猎人小屋，屋内隐约有灯光。请描述你眼前的情景，并给出 3 个行动选项。'
  },
  {
    id: 'sunken_ruins',
    name: '沉没遗迹',
    subtitle: '潮汐之下的失落古城',
    description:
      '百年一遇的大潮退去后，传说中的古城「塞壬之城」从海雾中浮现。古老的符文在潮湿的石壁上微微发光。',
    difficulty: '🧩 解谜',
    initialPrompt:
      '开场：你乘着小船靠近浮出水面的古城遗迹。海面平静得不自然，空气中弥漫着古老魔法和盐的气息。遗迹入口处，两尊巨大的海妖雕像注视着你。请描述你眼前的情景，并给出 3 个行动选项。'
  }
]

export default scenes

import type {
  Card,
  GamePhase,
  GameAction,
  GamePlayerState,
  GamePlayerStatus,
  InternalPlayerState,
  GameResult,
} from '../../shared/types/game'
import { Deck } from './Deck'
import { HandEvaluator } from './HandEvaluator'
import { PotCalculator } from './PotCalculator'
import { AppError } from '../../shared/utils/response'

/** 引擎内部完整游戏状态 */
export interface EngineState {
  phase: GamePhase
  isEnded: boolean
  pot: number
  communityCards: Card[]
  dealerIndex: number
  smallBlindIndex: number
  bigBlindIndex: number
  currentPlayerIndex: number
  currentBet: number
  minRaise: number
  players: InternalPlayerState[]
  /** 本轮已行动的玩家 index 集合 */
  actedThisRound: Set<number>
}

export class GameEngine {
  private deck: Deck
  private evaluator: HandEvaluator
  private potCalc: PotCalculator
  private state: EngineState

  private smallBlind: number
  private bigBlind: number

  constructor(smallBlind: number, bigBlind: number) {
    this.smallBlind = smallBlind
    this.bigBlind = bigBlind
    this.deck = new Deck()
    this.evaluator = new HandEvaluator()
    this.potCalc = new PotCalculator()

    this.state = {
      phase: 'PREFLOP',
      isEnded: false,
      pot: 0,
      communityCards: [],
      dealerIndex: 0,
      smallBlindIndex: 0,
      bigBlindIndex: 0,
      currentPlayerIndex: 0,
      currentBet: 0,
      minRaise: bigBlind,
      players: [],
      actedThisRound: new Set(),
    }
  }

  /**
   * 初始化新一局
   * @param players 入座玩家列表，按 seatIndex 排序
   * @param dealerIndex 庄家在 players 数组中的 index
   */
  initialize(
    players: Array<{ userId: string; seatIndex: number; chips: number }>,
    dealerIndex: number = 0
  ): EngineState {
    this.deck.reset()
    this.deck.shuffle()

    const n = players.length

    this.state.phase = 'PREFLOP'
    this.state.isEnded = false
    this.state.pot = 0
    this.state.communityCards = []
    this.state.currentBet = 0
    this.state.minRaise = this.bigBlind
    this.state.actedThisRound = new Set()

    // 初始化玩家
    this.state.players = players.map((p) => ({
      userId: p.userId,
      seatIndex: p.seatIndex,
      chips: p.chips,
      bet: 0,
      totalBet: 0,
      status: 'ACTIVE' as GamePlayerStatus,
      holeCards: [] as Card[],
    }))

    // 确定位置
    this.state.dealerIndex = dealerIndex

    if (n === 2) {
      // 单挑：庄家=小盲，另一个=大盲
      this.state.smallBlindIndex = dealerIndex
      this.state.bigBlindIndex = this.nextActive(dealerIndex)
    } else {
      this.state.smallBlindIndex = this.nextActive(dealerIndex)
      this.state.bigBlindIndex = this.nextActive(this.state.smallBlindIndex)
    }

    // 下盲注
    this.placeBet(this.state.smallBlindIndex, this.smallBlind)
    this.placeBet(this.state.bigBlindIndex, this.bigBlind)
    this.state.currentBet = this.bigBlind

    // 发底牌
    for (const player of this.state.players) {
      player.holeCards = this.deck.deal(2)
    }

    // 翻牌前第一个行动者：大盲位之后
    this.state.currentPlayerIndex = this.nextActive(this.state.bigBlindIndex)

    return this.state
  }

  /** 从数据库状态恢复引擎 */
  loadState(dbState: any, playerCards: Map<string, Card[]>): void {
    this.state = {
      ...dbState,
      actedThisRound: new Set(dbState.actedThisRound || []),
      players: dbState.players.map((p: any) => ({
        ...p,
        holeCards: playerCards.get(p.userId) || [],
      })),
    }
  }

  /** 执行玩家操作 */
  performAction(userId: string, action: GameAction, amount?: number): EngineState {
    const playerIndex = this.state.players.findIndex((p) => p.userId === userId)
    if (playerIndex === -1) {
      throw new AppError('PLAYER_NOT_FOUND', '玩家不在游戏中')
    }
    if (playerIndex !== this.state.currentPlayerIndex) {
      throw new AppError('NOT_YOUR_TURN', '还没轮到你')
    }

    const player = this.state.players[playerIndex]

    if (player.status !== 'ACTIVE') {
      throw new AppError('INVALID_STATE', '当前状态不能操作')
    }

    switch (action) {
      case 'fold':
        player.status = 'FOLDED'
        break

      case 'check':
        if (player.bet < this.state.currentBet) {
          throw new AppError('CANNOT_CHECK', '当前不能过牌，需要跟注或加注')
        }
        break

      case 'call': {
        const callAmount = this.state.currentBet - player.bet
        if (callAmount <= 0) {
          throw new AppError('NOTHING_TO_CALL', '没有需要跟注的金额')
        }
        this.placeBet(playerIndex, callAmount)
        break
      }

      case 'raise': {
        if (amount === undefined || amount < this.state.minRaise) {
          throw new AppError('INVALID_RAISE', `加注金额至少 ${this.state.minRaise}`)
        }
        const raiseTotal = (this.state.currentBet - player.bet) + amount
        if (raiseTotal > player.chips) {
          throw new AppError('INSUFFICIENT_CHIPS', '筹码不足')
        }
        this.placeBet(playerIndex, raiseTotal)
        this.state.minRaise = amount
        this.state.currentBet = player.bet
        // 有人加注，重置已行动记录（加注者除外）
        this.state.actedThisRound = new Set([playerIndex])
        break
      }

      case 'all_in': {
        const allInAmount = player.chips
        if (allInAmount <= 0) {
          throw new AppError('NO_CHIPS', '没有筹码可以全下')
        }
        this.placeBet(playerIndex, allInAmount)
        player.status = 'ALL_IN'
        if (player.bet > this.state.currentBet) {
          this.state.currentBet = player.bet
          this.state.actedThisRound = new Set([playerIndex])
        }
        break
      }
    }

    // 标记已行动
    this.state.actedThisRound.add(playerIndex)

    // 推进游戏
    this.advance()

    return this.state
  }

  /** 计算胜负结果 */
  getResults(): GameResult[] {
    const playerResults = this.state.players.map((p) => {
      const isFolded = p.status === 'FOLDED'
      return {
        userId: p.userId,
        totalBet: p.totalBet,
        hand: isFolded
          ? null
          : this.evaluator.evaluate(p.holeCards, this.state.communityCards),
      }
    })

    const distribution = this.potCalc.distribute(playerResults)

    return distribution.map((d) => {
      const player = this.state.players.find((p) => p.userId === d.userId)!
      const chipsWon = d.amount
      const chipsLost = player.totalBet
      return {
        userId: d.userId,
        handRank: d.hand?.name,
        bestHand: d.hand?.bestCards,
        chipsWon,
        chipsLost,
        isWinner: chipsWon > chipsLost,
      }
    })
  }

  /** 获取公开状态（不含私牌） */
  getPublicState() {
    return {
      phase: this.state.phase,
      isEnded: this.state.isEnded,
      pot: this.state.pot,
      communityCards: this.state.communityCards,
      dealerIndex: this.state.dealerIndex,
      smallBlindIndex: this.state.smallBlindIndex,
      bigBlindIndex: this.state.bigBlindIndex,
      currentPlayerIndex: this.state.currentPlayerIndex,
      currentBet: this.state.currentBet,
      minRaise: this.state.minRaise,
      actedThisRound: Array.from(this.state.actedThisRound),
      players: this.state.players.map((p): GamePlayerState => ({
        userId: p.userId,
        seatIndex: p.seatIndex,
        chips: p.chips,
        bet: p.bet,
        totalBet: p.totalBet,
        status: p.status,
      })),
    }
  }

  /** 获取某个玩家的私牌 */
  getPlayerCards(userId: string): Card[] {
    const player = this.state.players.find((p) => p.userId === userId)
    return player?.holeCards || []
  }

  // ─── 内部方法 ──────────────────────────────────────

  private placeBet(playerIndex: number, amount: number): void {
    const player = this.state.players[playerIndex]
    const actual = Math.min(amount, player.chips)
    player.chips -= actual
    player.bet += actual
    player.totalBet += actual
    this.state.pot += actual

    if (player.chips === 0 && player.status === 'ACTIVE') {
      player.status = 'ALL_IN'
    }
  }

  private nextActive(fromIndex: number): number {
    const n = this.state.players.length
    let idx = (fromIndex + 1) % n
    let checked = 0
    while (checked < n) {
      const p = this.state.players[idx]
      if (p.status === 'ACTIVE') return idx
      idx = (idx + 1) % n
      checked++
    }
    return fromIndex
  }

  /** 推进游戏：下一个玩家 or 下一阶段 */
  private advance(): void {
    const activePlayers = this.state.players.filter((p) => p.status === 'ACTIVE')
    const nonFolded = this.state.players.filter((p) => p.status !== 'FOLDED')

    // 只剩 1 个未弃牌 → 直接结束
    if (nonFolded.length <= 1) {
      this.state.isEnded = true
      return
    }

    // 没有能行动的 ACTIVE 玩家（全都 ALL_IN 或 FOLDED）→ 直接翻完所有公共牌
    if (activePlayers.length <= 1) {
      this.runOutBoard()
      return
    }

    // 检查是否所有 ACTIVE 玩家都已行动且下注一致
    const allActed = activePlayers.every((_, i) => {
      const realIndex = this.state.players.indexOf(activePlayers[i])
      return this.state.actedThisRound.has(realIndex)
    })
    const allEqualBet = activePlayers.every((p) => p.bet === this.state.currentBet)

    if (allActed && allEqualBet) {
      this.nextPhase()
    } else {
      // 移到下一个 ACTIVE 玩家
      this.state.currentPlayerIndex = this.nextActive(this.state.currentPlayerIndex)
    }
  }

  /** 所有人 all-in 时，快速翻完公共牌 */
  private runOutBoard(): void {
    while (this.state.communityCards.length < 5) {
      const needed = this.state.communityCards.length === 0 ? 3 : 1
      this.state.communityCards.push(...this.deck.deal(needed))
    }
    this.state.phase = 'SHOWDOWN'
    this.state.isEnded = true
  }

  private nextPhase(): void {
    // 重置本轮下注
    for (const player of this.state.players) {
      player.bet = 0
    }
    this.state.currentBet = 0
    this.state.minRaise = this.bigBlind
    this.state.actedThisRound = new Set()

    switch (this.state.phase) {
      case 'PREFLOP':
        this.state.phase = 'FLOP'
        this.state.communityCards = this.deck.deal(3)
        break
      case 'FLOP':
        this.state.phase = 'TURN'
        this.state.communityCards.push(...this.deck.deal(1))
        break
      case 'TURN':
        this.state.phase = 'RIVER'
        this.state.communityCards.push(...this.deck.deal(1))
        break
      case 'RIVER':
        this.state.phase = 'SHOWDOWN'
        this.state.isEnded = true
        return
    }

    // 新阶段从庄家后第一个 ACTIVE 玩家开始
    this.state.currentPlayerIndex = this.nextActive(this.state.dealerIndex)
  }
}

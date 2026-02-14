import { useEffect, useState } from 'react';
import { View, Text, Image } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useGameStore } from '@/stores/useGameStore';
import { useRoomStore } from '@/stores/useRoomStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { socketService } from '@/services/socket';
import type { Card, Player } from '@holdem/shared-types';

import tableBg from '@/assets/images/table-bg.png';

import './index.scss';

// 座位配置 - 基于设计稿位置 (844 x 320 的牌桌区域)
// 使用 rpx 单位，1x 设计稿尺寸
const SEAT_POSITIONS = [
  { index: 0, x: '235rpx', y: '250rpx', name: 'seat-1' }, // 底部左
  { index: 1, x: '58rpx', y: '188rpx', name: 'seat-2' },  // 左下
  { index: 2, x: '58rpx', y: '55rpx', name: 'seat-3' },   // 左上
  { index: 3, x: '235rpx', y: '5rpx', name: 'seat-4' },   // 顶部左
  { index: 4, x: '527rpx', y: '5rpx', name: 'seat-5' },   // 顶部右
  { index: 5, x: '722rpx', y: '55rpx', name: 'seat-6' },  // 右上
  { index: 6, x: '722rpx', y: '188rpx', name: 'seat-7' }, // 右下
  { index: 7, x: '527rpx', y: '250rpx', name: 'seat-8' }, // 底部右
];

export default function Game() {
  const router = useRouter();
  const roomId = router.params.roomId || '';

  const user = useAuthStore((state) => state.user);
  const { leaveRoom, fetchRoomDetail } = useRoomStore();
  const {
    phase,
    pot,
    communityCards,
    players,
    myCards,
    isMyTurn,
    currentBet,
    minRaise,
    resetGame,
    performAction,
    startGame,
  } = useGameStore();

  const [showLeaveModal, setShowLeaveModal] = useState(false);

  // 初始化
  useEffect(() => {
    if (roomId) {
      fetchRoomDetail(roomId);
      socketService.connect(roomId);
    }

    return () => {
      socketService.disconnect();
      resetGame();
    };
  }, [roomId]);

  // 获取座位上的玩家
  const getPlayerAtSeat = (seatIndex: number): Player | null => {
    return players.find((p) => p.seatIndex === seatIndex) || null;
  };

  // 获取自己的玩家信息
  const getMyPlayer = (): Player | null => {
    return players.find((p) => p.id === user?.id) || null;
  };

  // 检查是否已入座
  const isSeated = players.some((p) => p.id === user?.id);

  // 处理游戏操作
  const handleAction = async (action: 'fold' | 'check' | 'call' | 'raise' | 'all-in') => {
    let amount: number | undefined;

    if (action === 'call') {
      const myPlayer = getMyPlayer();
      amount = currentBet - (myPlayer?.bet || 0);
    } else if (action === 'raise') {
      amount = minRaise;
    }

    await performAction(action, amount);
  };

  // 离开房间
  const handleLeaveRoom = async () => {
    const success = await leaveRoom(roomId);
    if (success) {
      Taro.navigateBack();
    }
  };

  // 选择座位入座
  const handleSelectSeat = (seatIndex: number) => {
    Taro.showToast({ title: `选择座位 ${seatIndex + 1}`, icon: 'none' });
  };

  // 开始游戏
  const handleStartGame = async () => {
    await startGame(roomId);
  };

  const myPlayer = getMyPlayer();

  // 判断游戏状态
  const getGameStatus = () => {
    if (!isSeated) return 'spectating';
    if (phase === 'preflop' && players.length < 2) return 'waiting';
    return 'playing';
  };

  const gameStatus = getGameStatus();

  return (
    <View className="game-page">
      {/* 牌桌区域 */}
      <View className="table-area">
        <Image className="table-bg" src={tableBg} mode="aspectFill" />

        {/* 座位 */}
        {SEAT_POSITIONS.map((seat) => {
          const player = getPlayerAtSeat(seat.index);
          const isSpeaking = player?.isTurn;
          const isFolded = player?.status === 'folded';
          const isSelf = player?.id === user?.id;

          return (
            <View
              key={seat.index}
              className={`seat ${seat.name}`}
              style={{ left: seat.x, top: seat.y }}
              onClick={() => !player && !isSeated && handleSelectSeat(seat.index)}
            >
              {player ? (
                // 有玩家的座位
                <View className={`player-seat ${isSpeaking ? 'speaking' : ''} ${isFolded ? 'folded' : ''} ${isSelf ? 'self' : ''}`}>
                  <View className={`player-avatar ${isSpeaking ? 'speaking' : ''} ${isFolded ? 'folded' : ''} ${isSelf ? 'self' : ''}`}>
                    {player.avatar ? (
                      <Image className="avatar-img" src={player.avatar} mode="aspectFill" />
                    ) : (
                      <Text className="avatar-icon">👤</Text>
                    )}
                  </View>
                  <View className="player-name-row">
                    <Text className="player-name">{player.name}</Text>
                    <Text className="player-seat-num">#{seat.index + 1}</Text>
                  </View>
                  <Text className="player-chips">{player.chips?.toLocaleString()}</Text>

                  {/* 庄家标识 */}
                  {player.isDealer && (
                    <View className="dealer-badge">
                      <Text>D</Text>
                    </View>
                  )}

                  {/* 下注筹码 */}
                  {player.bet !== undefined && player.bet > 0 && (
                    <View className="bet-chip">
                      <Text>{player.bet}</Text>
                    </View>
                  )}

                  {/* 状态标识 */}
                  {isFolded && (
                    <View className="status-badge folded">
                      <Text>弃牌</Text>
                    </View>
                  )}
                  {player.status === 'all-in' && (
                    <View className="status-badge all-in">
                      <Text>ALL IN</Text>
                    </View>
                  )}
                </View>
              ) : (
                // 空座位
                <View className="empty-seat">
                  <Text className="seat-number">{seat.index + 1}</Text>
                </View>
              )}
            </View>
          );
        })}

        {/* 底池信息 */}
        <View className="pot-info">
          <Text className="pot-label">底池:</Text>
          <Text className="pot-value">{pot.toLocaleString()}</Text>
        </View>

        {/* 公共牌区域 */}
        <View className="community-cards">
          <Text className="suit-left">♠</Text>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} className="card-slot">
              {communityCards[i] ? (
                <CardDisplay card={communityCards[i]} />
              ) : null}
            </View>
          ))}
          <Text className="suit-right">♥</Text>
        </View>
      </View>

      {/* 底部操作栏 */}
      <View className="bottom-bar">
        {/* 观战状态 */}
        {gameStatus === 'spectating' && (
          <>
            <View className="my-info">
              <View className="my-avatar gray">
                {user?.avatar ? (
                  <Image className="avatar-img" src={user.avatar} mode="aspectFill" />
                ) : (
                  <Text className="avatar-icon">👤</Text>
                )}
              </View>
              <View className="my-details">
                <Text className="my-name">{user?.name || '德州高手'}</Text>
                <View className="my-chips-row">
                  <Text className="chips-icon">💰</Text>
                  <Text className="chips-value">{user?.chips?.toLocaleString() || '0'}</Text>
                </View>
              </View>
              <View className="status-badge-bar">
                <Text className="status-icon">👁</Text>
                <Text className="status-text">观战中</Text>
              </View>
            </View>
            <View className="action-area">
              <View className="sit-down-btn" onClick={() => handleSelectSeat(0)}>
                <Text className="sit-icon">💺</Text>
                <Text className="sit-text">选座入座</Text>
              </View>
            </View>
          </>
        )}

        {/* 等待状态 */}
        {gameStatus === 'waiting' && isSeated && (
          <>
            <View className="my-info">
              <View className="my-avatar gold">
                {user?.avatar ? (
                  <Image className="avatar-img" src={user.avatar} mode="aspectFill" />
                ) : (
                  <Text className="avatar-icon">👤</Text>
                )}
              </View>
              <View className="my-details">
                <Text className="my-name">{user?.name || '德州高手'}</Text>
                <View className="my-chips-row">
                  <Text className="chips-icon">💰</Text>
                  <Text className="chips-value">{myPlayer?.chips?.toLocaleString() || '0'}</Text>
                </View>
              </View>
            </View>
            <View className="action-area">
              {players.length >= 2 ? (
                <View className="start-btn" onClick={handleStartGame}>
                  <Text className="start-text">开始游戏</Text>
                </View>
              ) : (
                <View className="waiting-badge">
                  <Text className="waiting-text">等待其他玩家...</Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* 游戏中状态 */}
        {gameStatus === 'playing' && isSeated && (
          <>
            <View className="my-info">
              <View className="my-avatar gold">
                {user?.avatar ? (
                  <Image className="avatar-img" src={user.avatar} mode="aspectFill" />
                ) : (
                  <Text className="avatar-icon">👤</Text>
                )}
              </View>
              <View className="my-details">
                <Text className="my-name">{user?.name || '德州高手'}</Text>
                <View className="my-chips-row">
                  <Text className="chips-icon">💰</Text>
                  <Text className="chips-value">{myPlayer?.chips?.toLocaleString() || '0'}</Text>
                </View>
              </View>
              {/* 我的手牌 */}
              {myCards && myCards.length >= 2 && (
                <View className="my-cards">
                  <MyCardDisplay card={myCards[0]} />
                  <MyCardDisplay card={myCards[1]} />
                </View>
              )}
            </View>
            <View className="action-area">
              {isMyTurn ? (
                <View className="action-buttons">
                  <View className="action-btn fold" onClick={() => handleAction('fold')}>
                    <Text>弃牌</Text>
                  </View>
                  {currentBet === 0 ? (
                    <View className="action-btn check" onClick={() => handleAction('check')}>
                      <Text>过牌</Text>
                    </View>
                  ) : (
                    <View className="action-btn call" onClick={() => handleAction('call')}>
                      <Text>跟注 {currentBet}</Text>
                    </View>
                  )}
                  <View className="action-btn raise" onClick={() => handleAction('raise')}>
                    <Text>加注</Text>
                  </View>
                </View>
              ) : (
                <View className="waiting-badge">
                  <Text className="waiting-text">等待其他玩家操作...</Text>
                </View>
              )}
            </View>
          </>
        )}
      </View>

      {/* 退出确认弹窗 */}
      {showLeaveModal && (
        <View className="modal-overlay" onClick={() => setShowLeaveModal(false)}>
          <View className="modal" onClick={(e) => e.stopPropagation()}>
            <View className="modal-header">
              <Text className="modal-title">退出房间</Text>
              <Text className="modal-close" onClick={() => setShowLeaveModal(false)}>×</Text>
            </View>
            <View className="modal-content">
              <Text className="modal-text">确定要退出房间吗？退出后您的筹码将被返还</Text>
            </View>
            <View className="modal-actions">
              <View className="btn btn-cancel" onClick={() => setShowLeaveModal(false)}>
                <Text>取消</Text>
              </View>
              <View className="btn btn-danger" onClick={handleLeaveRoom}>
                <Text>确定退出</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

// 公共牌显示组件
function CardDisplay({ card }: { card: Card }) {
  const suit = card.slice(-1);
  const rank = card.slice(0, -1);

  const suitMap: Record<string, { symbol: string; isRed: boolean }> = {
    h: { symbol: '♥', isRed: true },
    d: { symbol: '♦', isRed: true },
    c: { symbol: '♣', isRed: false },
    s: { symbol: '♠', isRed: false },
  };

  const { symbol, isRed } = suitMap[suit] || { symbol: '?', isRed: false };

  return (
    <View className={`card-face ${isRed ? 'red' : 'black'}`}>
      <Text className="card-rank">{rank}</Text>
      <Text className="card-suit">{symbol}</Text>
    </View>
  );
}

// 我的手牌显示组件
function MyCardDisplay({ card }: { card: Card }) {
  const suit = card.slice(-1);
  const rank = card.slice(0, -1);

  const suitMap: Record<string, { symbol: string; isRed: boolean }> = {
    h: { symbol: '♥', isRed: true },
    d: { symbol: '♦', isRed: true },
    c: { symbol: '♣', isRed: false },
    s: { symbol: '♠', isRed: false },
  };

  const { symbol, isRed } = suitMap[suit] || { symbol: '?', isRed: false };

  return (
    <View className={`my-card ${isRed ? 'red' : 'black'}`}>
      <Text className="my-card-rank">{rank}</Text>
      <Text className="my-card-suit">{symbol}</Text>
    </View>
  );
}

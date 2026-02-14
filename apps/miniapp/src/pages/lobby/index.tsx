import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Input, Image } from '@tarojs/components';
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro';
import { useRoomStore } from '@/stores/useRoomStore';
import { useAuthStore } from '@/stores/useAuthStore';
import btnIcon from '@/assets/images/btnIcon.png';
import searchIcon from '@/assets/images/searchIcon.png';
import playerIcon from '@/assets/images/playerIcon.png';
import homeActive from '@/assets/images/home-active.png';
import homeInactive from '@/assets/images/home-inactive.png';
import myActive from '@/assets/images/my-active.png';
import myInactive from '@/assets/images/my-inactive.png';

import './index.scss';

interface CreateRoomForm {
  name: string;
  bigBlind: number;
  buyIn: number;
}

export default function Lobby() {
  const { rooms, isLoading, hasMore, fetchRooms, createRoom, joinRoom } = useRoomStore();
  const user = useAuthStore((state) => state.user);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [buyInAmount, setBuyInAmount] = useState(1000);
  const [customBuyIn, setCustomBuyIn] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [navBarHeight, setNavBarHeight] = useState(88);
  const [createForm, setCreateForm] = useState<CreateRoomForm>({
    name: '',
    bigBlind: 20,
    buyIn: 1000,
  });

  // 获取导航栏总高度（状态栏 + 胶囊按钮）
  useEffect(() => {
    try {
      // 1. 获取状态栏高度
      const systemInfo = Taro.getSystemInfoSync();
      const statusBarHeight = systemInfo.statusBarHeight || 44;

      // 2. 获取胶囊按钮的位置信息
      const menuButton = Taro.getMenuButtonBoundingClientRect();

      // 3. 计算标题栏高度（不含状态栏）
      const titleBarHeight = (menuButton.top - statusBarHeight) * 2 + menuButton.height;

      // 4. 导航栏总高度
      setNavBarHeight(statusBarHeight + titleBarHeight);
    } catch (e) {
      // 降级使用默认值
      setNavBarHeight(88);
    }
  }, []);

  useDidShow(() => {
    fetchRooms(true);
  });

  usePullDownRefresh(() => {
    fetchRooms(true).then(() => {
      Taro.stopPullDownRefresh();
    });
  });

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      fetchRooms();
    }
  };

  const handleCreateRoom = async () => {
    if (!createForm.name.trim()) {
      Taro.showToast({ title: '请输入房间名', icon: 'none' });
      return;
    }

    const finalBuyIn = customBuyIn ? parseInt(customBuyIn) : createForm.buyIn;
    const result = await createRoom({
      name: createForm.name,
      smallBlind: createForm.bigBlind / 2,
      bigBlind: createForm.bigBlind,
      maxPlayers: 6,
    });

    if (result) {
      setShowCreateModal(false);
      const success = await joinRoom(result.roomId, finalBuyIn);
      if (success) {
        Taro.navigateTo({ url: `/pages/game/index?roomId=${result.roomId}` });
      }
    }
  };

  const handleJoinRoom = async () => {
    if (!selectedRoom) return;

    const finalBuyIn = customBuyIn ? parseInt(customBuyIn) : buyInAmount;
    if (finalBuyIn < 100) {
      Taro.showToast({ title: '买入至少100筹码', icon: 'none' });
      return;
    }

    if (user && finalBuyIn > user.chips) {
      Taro.showToast({ title: '筹码不足', icon: 'none' });
      return;
    }

    const success = await joinRoom(selectedRoom.id, finalBuyIn);
    if (success) {
      setShowJoinModal(false);
      Taro.navigateTo({ url: `/pages/game/index?roomId=${selectedRoom.id}` });
    }
  };

  const openJoinModal = (room: any) => {
    setSelectedRoom(room);
    setBuyInAmount(1000);
    setCustomBuyIn('');
    setShowJoinModal(true);
  };

  const filteredRooms = searchValue
    ? rooms.filter(r => r.name.includes(searchValue) || r.code?.includes(searchValue))
    : rooms;

  return (
    <View className="lobby-page">
      {/* 导航栏占位（状态栏 + 胶囊按钮高度） */}
      <View style={{ height: `${navBarHeight}px` }} />

      {/* 头部 */}
      <View className="header">
        <Text className="header-title">德州扑克大厅</Text>
        <View className="create-btn" onClick={() => setShowCreateModal(true)}>
          <Image className="create-btn-icon" src={btnIcon} mode="scaleToFill" />
          <Text className="create-btn-text">创建房间</Text>
        </View>
      </View>

      {/* 搜索栏 */}
      <View className="search-section">
        <View className="search-bar">
          <Image className="search-icon" src={searchIcon} mode="aspectFit" />
          <Input
            className="search-input"
            placeholder="搜索房间号..."
            placeholderClass="search-placeholder"
            value={searchValue}
            onInput={(e) => setSearchValue(e.detail.value)}
          />
        </View>
      </View>

      {/* 房间列表 */}
      <ScrollView
        className="room-list"
        scrollY
        onScrollToLower={handleLoadMore}
      >
        {filteredRooms.length === 0 && !isLoading ? (
          <View className="empty-state">
            <View className="empty-icon-wrapper">
              <Text className="empty-icon-text">♠♥</Text>
            </View>
            <Text className="empty-title">暂无房间</Text>
            <Text className="empty-desc">还没有可加入的房间{'\n'}快创建一个邀请好友吧</Text>
            <View className="empty-create-btn" onClick={() => setShowCreateModal(true)}>
              <Image className="empty-btn-icon" src={btnIcon} mode="aspectFit" />
              <Text className="empty-btn-text">创建房间</Text>
            </View>
          </View>
        ) : (
          filteredRooms.map((room) => (
            <View key={room.id} className="room-card" onClick={() => openJoinModal(room)}>
              {/* 头部：房间信息 + 玩家人数 */}
              <View className="room-card-header">
                <View className="room-info">
                  <View className="room-icon">
                    <Text className="room-icon-text">♠</Text>
                  </View>
                  <View className="room-texts">
                    <Text className="room-name">{room.name}</Text>
                    <Text className="room-blinds">盲注: {room.smallBlind}/{room.bigBlind}</Text>
                  </View>
                </View>
                <View className="player-count">
                  <Image className="player-icon" src={playerIcon} mode="aspectFit" />
                  <Text className="player-num">{room.playersCount}/{room.maxPlayers}</Text>
                </View>
              </View>
              {/* 底部：底注 + 加入按钮 */}
              <View className="room-card-footer">
                <Text className="room-buyin">底注: {(room.smallBlind * 100).toLocaleString()}</Text>
                <View className="join-btn">
                  <Text className="join-btn-text">加入</Text>
                </View>
              </View>
            </View>
          ))
        )}

        {isLoading && (
          <View className="loading-more">
            <Text>加载中...</Text>
          </View>
        )}
      </ScrollView>

      {/* 自定义 TabBar */}
      <View className="tab-bar">
        <View className="tab-bar-inner">
          <View className="tab-item active">
            <Image className="tab-icon" src={homeActive} mode="aspectFit" />
            <Text className="tab-label">大厅</Text>
          </View>
          <View className="tab-item" onClick={() => Taro.navigateTo({ url: '/pages/profile/index' })}>
            <Image className="tab-icon" src={myInactive} mode="aspectFit" />
            <Text className="tab-label">我的</Text>
          </View>
        </View>
      </View>

      {/* 创建房间弹窗 */}
      {showCreateModal && (
        <View className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <View className="modal" onClick={(e) => e.stopPropagation()}>
            <View className="modal-header">
              <Text className="modal-title">创建房间</Text>
              <Text className="modal-close" onClick={() => setShowCreateModal(false)}>×</Text>
            </View>

            <View className="form-item">
              <Text className="form-label">房间名称</Text>
              <Input
                className="form-input"
                placeholder="请输入房间名称"
                placeholderClass="input-placeholder"
                value={createForm.name}
                onInput={(e) => setCreateForm({ ...createForm, name: e.detail.value })}
              />
            </View>

            <View className="form-item">
              <Text className="form-label">大盲注</Text>
              <Input
                className="form-input"
                placeholder="请输入大盲注金额"
                placeholderClass="input-placeholder"
                type="number"
                value={String(createForm.bigBlind)}
                onInput={(e) => setCreateForm({ ...createForm, bigBlind: parseInt(e.detail.value) || 20 })}
              />
            </View>

            <View className="form-item">
              <Text className="form-label">带入筹码</Text>
              <View className="chip-options">
                {[1000, 2000, 5000].map((amount) => (
                  <View
                    key={amount}
                    className={`chip-option ${createForm.buyIn === amount && !customBuyIn ? 'active' : ''}`}
                    onClick={() => { setCreateForm({ ...createForm, buyIn: amount }); setCustomBuyIn(''); }}
                  >
                    <Text>{amount}</Text>
                  </View>
                ))}
              </View>
              <Input
                className="form-input custom-input"
                placeholder="自定义金额"
                placeholderClass="input-placeholder"
                type="number"
                value={customBuyIn}
                onInput={(e) => setCustomBuyIn(e.detail.value)}
              />
            </View>

            <View className="modal-actions">
              <View className="btn btn-cancel" onClick={() => setShowCreateModal(false)}>
                <Text>取消</Text>
              </View>
              <View className="btn btn-confirm" onClick={handleCreateRoom}>
                <Text>创建房间</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* 加入房间弹窗 */}
      {showJoinModal && selectedRoom && (
        <View className="modal-overlay" onClick={() => setShowJoinModal(false)}>
          <View className="modal" onClick={(e) => e.stopPropagation()}>
            <View className="modal-header">
              <Text className="modal-title">加入房间</Text>
              <Text className="modal-close" onClick={() => setShowJoinModal(false)}>×</Text>
            </View>

            <View className="room-info-card">
              <Text className="room-info-icon">🏠</Text>
              <Text className="room-info-text">房间: {selectedRoom.name} | 大盲: {selectedRoom.bigBlind}</Text>
            </View>

            <View className="form-item">
              <Text className="form-label">带入筹码</Text>
              <View className="chip-options">
                {[1000, 2000, 5000].map((amount) => (
                  <View
                    key={amount}
                    className={`chip-option ${buyInAmount === amount && !customBuyIn ? 'active' : ''}`}
                    onClick={() => { setBuyInAmount(amount); setCustomBuyIn(''); }}
                  >
                    <Text>{amount}</Text>
                  </View>
                ))}
              </View>
              <Input
                className="form-input custom-input"
                placeholder="自定义金额"
                placeholderClass="input-placeholder"
                type="number"
                value={customBuyIn}
                onInput={(e) => setCustomBuyIn(e.detail.value)}
              />
            </View>

            <View className="modal-actions">
              <View className="btn btn-cancel" onClick={() => setShowJoinModal(false)}>
                <Text>取消</Text>
              </View>
              <View className="btn btn-confirm" onClick={handleJoinRoom}>
                <Text>加入房间</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

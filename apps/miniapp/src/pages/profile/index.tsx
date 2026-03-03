import { useState, useEffect } from 'react';
import { View, Text, Image, Button } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useAuthStore } from '@/stores/useAuthStore';
import { checkinApi, callCloud } from '@/services/cloud';
import homeActive from '@/assets/images/home-active.png';
import homeInactive from '@/assets/images/home-inactive.png';
import myActive from '@/assets/images/my-active.png';
import myInactive from '@/assets/images/my-inactive.png';
import avatarIconLg from '@/assets/images/avatarIconLg.png';
import levelIcon from '@/assets/images/levelIcon.png';
import checkinIcon from '@/assets/images/checkinIcon.png';
import menuIcon1 from '@/assets/images/menuIcon1.png';
import menuIcon3 from '@/assets/images/menuIcon3.png';
import menuIcon4 from '@/assets/images/menuIcon4.png';
import successIcon from '@/assets/images/success.png';
import rewardIcon from '@/assets/images/rewardIcon.png';

import './index.scss';

interface CheckinStatus {
  canCheckin: boolean;
  consecutiveDays: number;
  todayChecked: boolean;
  nextReward: number;
}

export default function Profile() {
  const { user, logout, refreshUser } = useAuthStore();
  const [checkinStatus, setCheckinStatus] = useState<CheckinStatus | null>(null);
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [navBarHeight, setNavBarHeight] = useState(88);
  const [checkinResult, setCheckinResult] = useState<{
    reward: number;
    consecutiveDays: number;
    nextReward: number;
  } | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

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
    refreshUser();
    fetchCheckinStatus();
  });

  const fetchCheckinStatus = async () => {
    const response = await checkinApi.getStatus();
    if (response.success && response.data) {
      setCheckinStatus(response.data);
    }
  };

  const handleCheckin = async () => {
    if (checkinStatus?.todayChecked) {
      Taro.showToast({ title: '今日已签到', icon: 'none' });
      return;
    }

    const response = await checkinApi.checkin();
    if (response.success && response.data) {
      setCheckinResult(response.data);
      setShowCheckinModal(true);
      refreshUser();
      fetchCheckinStatus();
    }
  };

  const handleLogout = () => {
    Taro.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          logout();
        }
      },
    });
  };

  // 选择头像并上传
  const handleChooseAvatar = async (e: any) => {
    if (isUploadingAvatar) return;

    const { avatarUrl: tempAvatarUrl } = e.detail;
    if (!tempAvatarUrl) return;

    setIsUploadingAvatar(true);
    Taro.showLoading({ title: '上传中...' });

    try {
      let finalAvatarUrl = '';

      // 上传到微信云存储
      if (Taro.cloud) {
        const cloudPath = `avatars/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
        const uploadRes = await Taro.cloud.uploadFile({
          cloudPath,
          filePath: tempAvatarUrl,
        });

        if (uploadRes.fileID) {
          finalAvatarUrl = uploadRes.fileID;
        }
      }

      if (finalAvatarUrl) {
        // 更新用户头像
        await callCloud('user', 'updateProfile', { avatar: finalAvatarUrl });

        // 刷新用户信息
        await refreshUser();
        Taro.showToast({ title: '头像已更新', icon: 'success' });
      } else {
        Taro.showToast({ title: '上传失败', icon: 'none' });
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      Taro.showToast({ title: '上传失败', icon: 'none' });
    } finally {
      setIsUploadingAvatar(false);
      Taro.hideLoading();
    }
  };

  return (
    <View className="profile-page">
      {/* 导航栏占位（状态栏 + 胶囊按钮高度） */}
      <View style={{ height: `${navBarHeight}px` }} />

      {/* 头部用户信息 */}
      <View className="profile-header">
        <Button
          className="avatar-btn"
          openType="chooseAvatar"
          onChooseAvatar={handleChooseAvatar}
        >
          <View className={`avatar-large ${isUploadingAvatar ? 'uploading' : ''}`}>
            {user?.avatar ? (
              <Image className="avatar-img" src={user.avatar} mode="aspectFill" />
            ) : (
              <Image className="avatar-icon" src={avatarIconLg} mode="aspectFit" />
            )}
            <View className="avatar-edit-hint">
              <Text className="edit-text">点击更换</Text>
            </View>
          </View>
        </Button>
        <Text className="nickname">{user?.name || '德州高手'}</Text>
        <View className="level-badge">
          <Image className="level-icon" src={levelIcon} mode="aspectFit" />
          <Text className="level-text">LV.{user?.statistics?.level || 1}</Text>
        </View>
      </View>

      {/* 资产卡片 */}
      <View className="assets-wrapper">
        <View className="assets-card">
          <View className="asset-item">
            <Text className="asset-value chips">{user?.chips?.toLocaleString() || '0'}</Text>
            <Text className="asset-label">筹码</Text>
          </View>
          <View className="asset-divider" />
          <View className="asset-item">
            <Text className="asset-value games">{user?.statistics?.totalGames || 0}</Text>
            <Text className="asset-label">总场数</Text>
          </View>
          <View className="asset-divider" />
          <View className="asset-item">
            <Text className="asset-value winrate">{user?.statistics?.winRate || 0}%</Text>
            <Text className="asset-label">胜率</Text>
          </View>
        </View>
      </View>

      {/* 签到卡片 */}
      <View className="checkin-wrapper">
        <View className="checkin-card" onClick={handleCheckin}>
          <View className="checkin-left">
            <Image className="checkin-icon" src={checkinIcon} mode="aspectFit" />
            <View className="checkin-info">
              <Text className="checkin-title">每日签到</Text>
              <Text className="checkin-desc">
                已连续签到 {checkinStatus?.consecutiveDays || 7} 天
              </Text>
            </View>
          </View>
          <View className={`checkin-btn ${checkinStatus?.todayChecked ? 'checked' : ''}`}>
            <Text className="checkin-btn-text">
              {checkinStatus?.todayChecked ? '已签到' : '签到'}
            </Text>
          </View>
        </View>
      </View>

      {/* 功能菜单 */}
      <View className="menu-wrapper">
        <Text className="menu-title">功能</Text>
        <View className="menu-list">
          <View className="menu-item">
            <View className="menu-left">
              <Image className="menu-icon" src={menuIcon1} mode="aspectFit" />
              <Text className="menu-text">游戏历史</Text>
            </View>
            <Text className="menu-arrow">›</Text>
          </View>
          <View className="menu-item">
            <View className="menu-left">
              <Image className="menu-icon" src={menuIcon3} mode="aspectFit" />
              <Text className="menu-text">规则</Text>
            </View>
            <Text className="menu-arrow">›</Text>
          </View>
          <View className="menu-item" onClick={handleLogout}>
            <View className="menu-left">
              <Image className="menu-icon" src={menuIcon4} mode="aspectFit" />
              <Text className="menu-text">退出登录</Text>
            </View>
            <Text className="menu-arrow">›</Text>
          </View>
        </View>
      </View>

      {/* 占位空间 */}
      <View className="spacer" />

      {/* 自定义 TabBar */}
      <View className="tab-bar">
        <View className="tab-bar-inner">
          <View className="tab-item" onClick={() => Taro.navigateTo({ url: '/pages/lobby/index' })}>
            <Image className="tab-icon" src={homeInactive} mode="aspectFit" />
            <Text className="tab-label">大厅</Text>
          </View>
          <View className="tab-item active">
            <Image className="tab-icon" src={myActive} mode="aspectFit" />
            <Text className="tab-label">我的</Text>
          </View>
        </View>
      </View>

      {/* 签到成功弹窗 */}
      {showCheckinModal && checkinResult && (
        <View className="modal-overlay" onClick={() => setShowCheckinModal(false)}>
          <View className="checkin-dialog" onClick={(e) => e.stopPropagation()}>
            {/* 成功图标 */}
            <View className="icon-circle">
              <Image className="success-icon" src={successIcon} mode="aspectFit" />
            </View>

            {/* 标题 */}
            <Text className="dialog-title">签到成功</Text>

            {/* 奖励区域 */}
            <View className="reward-section">
              <Text className="reward-label">获得奖励</Text>
              <View className="reward-row">
                <Image className="reward-icon" src={rewardIcon} mode="aspectFit" />
                <Text className="reward-value">+{checkinResult.reward.toLocaleString()}</Text>
              </View>
            </View>

            {/* 明日提示 */}
            <Text className="next-hint">明日签到可获得 {checkinResult.nextReward.toLocaleString()} 筹码</Text>

            {/* 确认按钮 */}
            <View className="confirm-btn" onClick={() => setShowCheckinModal(false)}>
              <Text className="confirm-text">太棒了</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

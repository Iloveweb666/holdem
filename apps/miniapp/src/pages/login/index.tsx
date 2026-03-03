import { useState } from "react";
import { View, Text, Button, Image, Input } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { useAuthStore } from "@/stores/useAuthStore";
import { callCloud } from "@/services/cloud";
import wxIcon from "@/assets/images/wxIcon.png";
import avatarIconLg from "@/assets/images/avatarIconLg.png";

import "./index.scss";

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [nickname, setNickname] = useState("");
  const login = useAuthStore((state) => state.login);
  const { refreshUser } = useAuthStore();

  // 第一步：微信登录
  const handleLogin = async () => {
    if (isLoading) return;

    setIsLoading(true);
    const success = await login();
    setIsLoading(false);

    if (success) {
      // 获取最新用户信息
      const currentUser = useAuthStore.getState().user;

      // 检查是否已设置头像和昵称（默认昵称通常是"微信用户"或以"玩家"开头）
      const hasAvatar = !!currentUser?.avatar;
      const hasCustomName =
        currentUser?.name &&
        !currentUser.name.startsWith("玩家") &&
        currentUser.name !== "微信用户";

      if (hasAvatar && hasCustomName) {
        // 已完善资料，直接进入大厅
        Taro.redirectTo({ url: "/pages/lobby/index" });
      } else {
        // 需要完善资料
        setShowProfileSetup(true);
      }
    }
  };

  // 选择头像回调
  const handleChooseAvatar = (e: any) => {
    const { avatarUrl: tempAvatarUrl } = e.detail;
    setAvatarUrl(tempAvatarUrl);
  };

  // 昵称输入回调
  const handleNicknameInput = (e: any) => {
    setNickname(e.detail.value);
  };

  // 完成设置，保存资料
  const handleComplete = async () => {
    if (isLoading) return;

    // 至少需要昵称
    if (!nickname.trim()) {
      Taro.showToast({ title: "请输入昵称", icon: "none" });
      return;
    }

    setIsLoading(true);

    try {
      // 如果有头像，上传到微信云存储
      let finalAvatarUrl = "";
      if (avatarUrl && Taro.cloud) {
        const cloudPath = `avatars/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;

        const uploadRes = await Taro.cloud.uploadFile({
          cloudPath,
          filePath: avatarUrl,
        });

        if (uploadRes.fileID) {
          // 直接存储 fileID（永久有效，小程序 Image 组件可直接使用）
          finalAvatarUrl = uploadRes.fileID;
        }
      }

      // 更新用户资料
      await callCloud('user', 'updateProfile', {
        name: nickname.trim(),
        avatar: finalAvatarUrl || undefined,
      });

      // 刷新用户信息
      await refreshUser();

      Taro.showToast({ title: "设置成功", icon: "success" });

      // 跳转到大厅
      setTimeout(() => {
        Taro.redirectTo({ url: "/pages/lobby/index" });
      }, 500);
    } catch (error) {
      console.error("Profile update error:", error);
      Taro.showToast({ title: "设置失败", icon: "none" });
    } finally {
      setIsLoading(false);
    }
  };

  // 跳过设置
  const handleSkip = () => {
    Taro.redirectTo({ url: "/pages/lobby/index" });
  };

  // 显示头像昵称设置界面
  if (showProfileSetup) {
    return (
      <View className="login-page">
        <View className="profile-setup">
          <Text className="setup-title">完善个人资料</Text>
          <Text className="setup-desc">设置头像和昵称，让好友更容易认出你</Text>

          {/* 头像选择 */}
          <Button
            className="avatar-btn"
            openType="chooseAvatar"
            onChooseAvatar={handleChooseAvatar}
          >
            <View className="avatar-wrapper">
              {avatarUrl ? (
                <Image
                  className="avatar-img"
                  src={avatarUrl}
                  mode="aspectFill"
                />
              ) : (
                <Image
                  className="avatar-placeholder"
                  src={avatarIconLg}
                  mode="aspectFit"
                />
              )}
            </View>
          </Button>
          <Text className="avatar-hint">点击更换头像</Text>

          {/* 昵称输入 */}
          <View className="nickname-input-wrapper">
            <Input
              className="nickname-input"
              type="nickname"
              placeholder="请输入昵称"
              placeholderClass="nickname-placeholder"
              value={nickname}
              onInput={handleNicknameInput}
              onBlur={handleNicknameInput}
            />
          </View>

          {/* 操作按钮 */}
          <View className="setup-actions">
            <Button
              className={`complete-btn ${isLoading ? "loading" : ""}`}
              onClick={handleComplete}
              disabled={isLoading}
            >
              <Text className="complete-btn-text">
                {isLoading ? "保存中..." : "完成设置"}
              </Text>
            </Button>
            <Text className="skip-btn" onClick={handleSkip}>
              跳过，稍后设置
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // 默认显示登录界面
  return (
    <View className="login-page">
      {/* Logo 区域 */}
      <View className="logo-section">
        <View className="logo-circle">
          <Text className="logo-icon">♠♥</Text>
        </View>
        <Text className="app-name">德州扑克</Text>
        <Text className="app-slogan">与好友一起畅玩德州</Text>
      </View>

      {/* 微信登录按钮 */}
      <Button
        className={`wx-login-btn ${isLoading ? "loading" : ""}`}
        onClick={handleLogin}
        disabled={isLoading}
      >
        <View className="btn-content">
          <Image className="wx-icon" src={wxIcon} mode="aspectFit" />
          <Text className="btn-text">
            {isLoading ? "登录中..." : "微信授权登录"}
          </Text>
        </View>
      </Button>

      {/* 用户协议 */}
      <View className="terms-section">
        <Text className="terms-text">登录即表示同意</Text>
        <Text className="terms-link">《用户协议》</Text>
      </View>
    </View>
  );
}

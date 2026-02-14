import { useEffect } from 'react';
import { View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useAuthStore } from '@/stores/useAuthStore';

import './index.scss';

/**
 * 入口页面 - 路由守卫
 * 检查登录状态，跳转到对应页面
 */
export default function Index() {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);

  useEffect(() => {
    // 等待一帧让状态更新
    setTimeout(() => {
      if (isLoggedIn) {
        // 已登录，跳转到大厅
        Taro.redirectTo({ url: '/pages/lobby/index' });
      } else {
        // 未登录，跳转到登录页
        Taro.redirectTo({ url: '/pages/login/index' });
      }
    }, 100);
  }, [isLoggedIn]);

  return (
    <View className="loading-page">
      <View className="loading-spinner" />
      <View className="loading-text">加载中...</View>
    </View>
  );
}

import { PropsWithChildren } from 'react';
import Taro, { useLaunch } from '@tarojs/taro';
import { useAuthStore } from '@/stores/useAuthStore';

import './app.scss';

// 云开发环境 ID
const CLOUD_ENV_ID = 'cloud1-2g1nqwn82f0ab48b';

function App({ children }: PropsWithChildren) {
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useLaunch(() => {
    console.log('App launched');

    // 初始化云开发
    if (Taro.cloud) {
      Taro.cloud.init({
        env: CLOUD_ENV_ID,
        traceUser: true,
      });
      console.log('Cloud initialized');
    }

    // 检查登录状态
    checkAuth();
  });

  return children;
}

export default App;

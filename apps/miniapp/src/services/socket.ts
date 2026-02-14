import Taro from '@tarojs/taro';
import { useGameStore } from '@/stores/useGameStore';

// WebSocket 基础地址
const WS_BASE_URL = process.env.NODE_ENV === 'development'
  ? 'ws://localhost:3000'
  : 'wss://holdem-api.your-domain.com';

const TOKEN_KEY = 'holdem_token';

type MessageHandler = (data: unknown) => void;

interface SocketMessage {
  type: string;
  payload?: unknown;
}

class WebSocketService {
  private socket: Taro.SocketTask | null = null;
  private roomId: string | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private messageHandlers: Map<string, MessageHandler[]> = new Map();
  private isConnecting = false;

  /**
   * 连接到游戏房间
   */
  connect(roomId: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.isConnecting) {
        resolve(false);
        return;
      }

      this.isConnecting = true;
      this.roomId = roomId;

      const token = Taro.getStorageSync(TOKEN_KEY);
      const url = `${WS_BASE_URL}/ws/game/${roomId}?token=${token}`;

      Taro.connectSocket({
        url,
        success: () => {
          console.log('WebSocket connecting...');
        },
        fail: (error) => {
          console.error('WebSocket connect failed:', error);
          this.isConnecting = false;
          resolve(false);
        },
      });

      // 监听连接打开
      Taro.onSocketOpen(() => {
        console.log('WebSocket connected');
        this.isConnecting = false;
        this.startHeartbeat();
        resolve(true);
      });

      // 监听消息
      Taro.onSocketMessage((res) => {
        try {
          const message = JSON.parse(res.data as string) as SocketMessage;
          this.handleMessage(message);
        } catch (error) {
          console.error('Parse message error:', error);
        }
      });

      // 监听错误
      Taro.onSocketError((error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
      });

      // 监听关闭
      Taro.onSocketClose(() => {
        console.log('WebSocket closed');
        this.stopHeartbeat();
        this.scheduleReconnect();
      });
    });
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.roomId = null;
    this.stopHeartbeat();
    this.clearReconnect();

    if (this.socket) {
      Taro.closeSocket();
      this.socket = null;
    }
  }

  /**
   * 发送消息
   */
  send(type: string, payload?: unknown): void {
    const message = JSON.stringify({ type, payload });

    Taro.sendSocketMessage({
      data: message,
      fail: (error) => {
        console.error('Send message error:', error);
      },
    });
  }

  /**
   * 注册消息处理器
   */
  on(type: string, handler: MessageHandler): void {
    const handlers = this.messageHandlers.get(type) || [];
    handlers.push(handler);
    this.messageHandlers.set(type, handlers);
  }

  /**
   * 移除消息处理器
   */
  off(type: string, handler?: MessageHandler): void {
    if (!handler) {
      this.messageHandlers.delete(type);
      return;
    }

    const handlers = this.messageHandlers.get(type) || [];
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(message: SocketMessage): void {
    const { type, payload } = message;

    // 处理游戏状态更新
    if (type === 'game:update') {
      useGameStore.getState().handleGameUpdate(payload);
    }

    // 调用注册的处理器
    const handlers = this.messageHandlers.get(type) || [];
    handlers.forEach((handler) => handler(payload));

    // 调用通用处理器
    const allHandlers = this.messageHandlers.get('*') || [];
    allHandlers.forEach((handler) => handler({ type, payload }));
  }

  /**
   * 开始心跳
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.send('ping');
    }, 30000);
  }

  /**
   * 停止心跳
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * 计划重连
   */
  private scheduleReconnect(): void {
    if (!this.roomId || this.reconnectTimer) return;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.roomId) {
        console.log('Attempting to reconnect...');
        this.connect(this.roomId);
      }
    }, 3000);
  }

  /**
   * 清除重连计时器
   */
  private clearReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

export const socketService = new WebSocketService();

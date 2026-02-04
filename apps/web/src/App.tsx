import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Lobby from "./pages/Lobby";
import Profile from "./pages/Profile";
import GameRoom from "./pages/GameRoom";
import BottomNav from "./components/BottomNav";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <div className="min-h-screen bg-black flex justify-center">
        {/* We center the mobile container on large screens */}
        <div className="w-full max-w-[480px] bg-background relative shadow-2xl min-h-screen">
          <Routes>
            <Route path="/" element={<Lobby />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/game" element={<GameRoom />} />
          </Routes>
          <BottomNav />
        </div>
      </div>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
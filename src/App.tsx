import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Analytics } from '@vercel/analytics/react';
import { ChatProvider } from "./contexts/ChatContext";
import Layout from "./components/Layout";
import Index from "./pages/Index";
import Chat from "./pages/Chat";
import About from "./pages/About";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ChatProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Chat />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/scanner" element={<Chat />} />
              <Route path="/home" element={<Index />} />
              <Route path="/about" element={<About />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </BrowserRouter>
        <Analytics />
      </TooltipProvider>
    </ChatProvider>
  </QueryClientProvider>
);

export default App;

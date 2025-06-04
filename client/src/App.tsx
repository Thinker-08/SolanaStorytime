import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "./components/ui/toaster";
import NotFound from "./pages/not-found";
import Chat from "./pages/Chat";
import HomePage from "./pages/HomePage";
import Login from "./pages/Login";
import { SessionProvider } from "./context/SessionContext";
import { StorySessionProvider } from "./context/StorySessionContext";
import Create from "./pages/Create";
import Story from "./pages/Story";
import { PromptProvider } from "./context/PromptContext";
import { AuthProvider } from "./context/AuthContext";
import { GoogleOAuthProvider } from '@react-oauth/google';
import Library from "./pages/Library";
import StoryById from "./pages/StoryById";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/home" component={HomePage} />
      <Route path="/chat" component={Chat} />
      <Route path="/create" component={Create} />
      <Route path="/story" component={Story} />
      <Route path="/library" component={Library} />
      <Route path="/library/:id" component={StoryById} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <GoogleOAuthProvider clientId="102903288376-hfgbm13oa510h17houekqvr13e6glk0h.apps.googleusercontent.com">
    <SessionProvider>
      <StorySessionProvider>
      <AuthProvider>
       <PromptProvider>
      <QueryClientProvider client={queryClient}>
        <Router />
        <Toaster />
      </QueryClientProvider>
      </PromptProvider>
      </AuthProvider>
      </StorySessionProvider>
    </SessionProvider>
    </GoogleOAuthProvider>
  );
}

export default App;

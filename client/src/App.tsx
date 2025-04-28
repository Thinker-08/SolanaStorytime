import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "./components/ui/toaster";
import NotFound from "./pages/not-found";
import Chat from "./pages/Chat";
import HomePage from "./pages/HomePage";
import Login from "./pages/Login";
import { SessionProvider } from "./context/SessionContext";
import Create from "./pages/Create";
import Story from "./pages/Story";
import { PromptProvider } from "./context/PromptContext";
import { AuthProvider } from "./context/AuthContext";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/home" component={HomePage} />
      <Route path="/chat" component={Chat} />
      <Route path="/create" component={Create} />
      <Route path="/story" component={Story} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <SessionProvider>
      <AuthProvider>
       <PromptProvider>
      <QueryClientProvider client={queryClient}>
        <Router />
        <Toaster />
      </QueryClientProvider>
      </PromptProvider>
      </AuthProvider>
    </SessionProvider>
  );
}

export default App;

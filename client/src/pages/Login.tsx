// AuthForm.tsx
import { useEffect, useState } from "react";
import { Sun, BookOpen, LogIn } from "lucide-react";                                       // :contentReference[oaicite:3]{index=3}
import { apiRequest } from "../lib/queryClient";
import { useToast } from "../hooks/use-toast";
import { useLocation } from "wouter";

const extractErrorMessage = (error: any) => {
  try {
    const parts = error.message.split(": ");
    if (parts.length > 1) {
      const jsonPart = parts.slice(1).join(": ").trim();
      const parsed = JSON.parse(jsonPart);
      return parsed.message || "An unexpected error occurred.";
    }
    return error.message || "An unexpected error occurred.";
  } catch {
    return "An unexpected error occurred.";
  }
};

export default function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const authToken = localStorage.getItem("authToken");
    if (authToken) setLocation("/home");
  }, []);

  const toggleForm = () => setIsLogin((prev) => !prev);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    // Common fields
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
      toast({ title: "Missing Fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    try {
      const endpoint = isLogin ? "/api/login" : "/api/signup";
      const body: any = { email, password };

      if (!isLogin) {
        const phone = formData.get("phone") as string;
        const username = formData.get("username") as string;
        if (!phone || !username) {
          toast({ title: "Missing Fields", description: "Please fill in all required fields.", variant: "destructive" });
          return;
        }
        body.phone = phone;
        body.username = username;
      }

      const response = await apiRequest("POST", endpoint, body);
      const data = await response.json();

      if (!response.ok || !data.token) {
        toast({
          title: isLogin ? "Login Error" : "Signup Error",
          description: data.message || extractErrorMessage(data) || "Something went wrong.",
          variant: "destructive",
        });
        return;
      }

      localStorage.setItem("authToken", data.token);
      window.location.href = "/home";

    } catch (error: any) {
      toast({
        title: isLogin ? "Login Error" : "Signup Error",
        description: extractErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-900 to-indigo-950 text-white p-6"> {/* :contentReference[oaicite:4]{index=4} */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8">
        {/* Header & Icons */}
        <div className="text-center">
          <div className="mb-2 flex justify-center">
            <div className="relative">
              <Sun className="text-yellow-400 h-16 w-16 absolute -left-6 -top-6 opacity-70 animate-pulse" /> {/* :contentReference[oaicite:5]{index=5} */}
              <div className="bg-gradient-to-br from-violet-500 to-blue-600 rounded-full p-4 shadow-lg shadow-violet-600/30">
                <BookOpen className="h-14 w-14 text-white" />
              </div>
            </div>
          </div>
          <h1 className="text-3xl font-bold mt-4 bg-gradient-to-r from-cyan-400 via-purple-500 to-blue-500 bg-clip-text text-transparent">
            {isLogin ? "Login" : "Sign Up"}
          </h1>
          <p className="text-gray-300 mt-2">
            {isLogin
              ? "Welcome back! Enter your credentials to access your account."
              : "Create a new account to get started."}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 mt-4">
          <input
            type="email"
            name="email"
            placeholder="Email"
            required
            className="w-full p-3 rounded-lg bg-gray-800 border border-indigo-700/50 text-white focus:outline-none focus:ring-2 focus:ring-violet-500 shadow-md"
          /> {/* :contentReference[oaicite:6]{index=6} */}

          {!isLogin && (
            <>
              <input
                type="tel"
                name="phone"
                placeholder="Phone"
                required
                className="w-full p-3 rounded-lg bg-gray-800 border border-indigo-700/50 text-white focus:outline-none focus:ring-2 focus:ring-violet-500 shadow-md"
              />
              <input
                type="text"
                name="username"
                placeholder="Username"
                required
                className="w-full p-3 rounded-lg bg-gray-800 border border-indigo-700/50 text-white focus:outline-none focus:ring-2 focus:ring-violet-500 shadow-md"
              />
            </>
          )}

          <input
            type="password"
            name="password"
            placeholder="Password"
            required
            className="w-full p-3 rounded-lg bg-gray-800 border border-indigo-700/50 text-white focus:outline-none focus:ring-2 focus:ring-violet-500 shadow-md"
          />

          <button
            type="submit"
            className="w-full p-3 bg-gradient-to-r from-violet-600 to-blue-600 rounded-lg font-medium text-white flex items-center justify-center gap-2 shadow-lg shadow-violet-700/30"
          >
            <LogIn size={18} />
            {isLogin ? "Login" : "Sign Up"}
          </button>
        </form>

        {/* Toggle Link */}
        <p className="text-gray-300 text-sm">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button onClick={toggleForm} className="text-violet-400 hover:underline">
            {isLogin ? "Sign up" : "Login"}
          </button>
        </p>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

  useEffect(() => {
    const authToken = localStorage.getItem("authToken");

    // Redirect to home if the token exists
    if (authToken) {
      window.location.href = "/";  // Navigate to home page
    }
  }, []);

  const toggleForm = () => setIsLogin((prev) => !prev);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    if (isLogin) {
      // Login Form
      const email = formData.get("email") as string;
      const password = formData.get("password") as string;

      if (!email || !password) {
        toast({
          title: "Missing Fields",
          description: "Please enter both email and password.",
          variant: "destructive",
        });
        return;
      }

      try {
        const response = await apiRequest('POST', '/api/login', { email, password });
        
        if (!response.ok) {
          const errorData = await response.json();
          toast({
            title: "Login Error",
            description: errorData.message || "Invalid credentials or server response.",
            variant: "destructive",
          });
          return;
        }
        
        const data = await response.json();

        if (data.token) {
          localStorage.setItem("authToken", data.token);
          window.location.href = "/home";
        } else {
          toast({
            title: "Login Error",
            description: "Invalid credentials or server response.",
            variant: "destructive",
          });
        }
      } catch (error: any) {
        console.error("Error during login:", error);
        toast({
          title: "Login Error",
          description: extractErrorMessage(error) || "An unexpected error occurred.",
          variant: "destructive",
        });
      }

    } else {
      // Signup Form
      const email = formData.get("email") as string;
      const phone = formData.get("phone") as string;
      const username = formData.get("username") as string;
      const password = formData.get("password") as string;

      if (!email || !phone || !username || !password) {
        toast({
          title: "Missing Fields",
          description: "Please fill in all fields.",
          variant: "destructive",
        });
        return;
      }

      try {
        const response = await apiRequest('POST', '/api/signup', {
          email,
          phone,
          username,
          password,
        });
        if (!response.ok) {
          const errorData = await response.json();
          toast({
            title: "Signup Error",
            description: extractErrorMessage(errorData) || "Signup failed. Please try again.",
            variant: "destructive",
          });
          return;
        }
        
        const data = await response.json();

        if (data.token) {
          localStorage.setItem("authToken", data.token);
          window.location.href = "/home";
        } else {
          toast({
            title: "Signup Error",
            description: "Signup failed. Please try again.",
            variant: "destructive",
          });
        }
      } catch (error: any) {
        console.error("Error during signup:", extractErrorMessage(error));
        toast({
          title: "Signup Error",
          description: extractErrorMessage(error) || "An unexpected error occurred.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">
          {isLogin ? "Login" : "Sign Up"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Common fields */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              name="email"
              required
              className="mt-1 p-2 w-full border rounded-md text-gray-700"
            />
          </div>

          {!isLogin && (
            <>
              {/* Signup-only fields */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  required
                  className="mt-1 p-2 w-full border rounded-md text-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Username</label>
                <input
                  type="text"
                  name="username"
                  required
                  className="mt-1 p-2 w-full border rounded-md text-gray-700"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              name="password"
              required
              className="mt-1 p-2 w-full border rounded-md text-gray-700"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition"
          >
            {isLogin ? "Login" : "Sign Up"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button onClick={toggleForm} className="text-blue-500 hover:underline">
            {isLogin ? "Sign up" : "Login"}
          </button>
        </p>
      </div>
    </div>
  );
}

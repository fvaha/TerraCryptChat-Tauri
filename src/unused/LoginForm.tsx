
import { useState } from "react";
import { useAppContext } from "../AppContext";

interface Props {
  onSuccess: () => void;
  switchToRegister: () => void;
}

function LoginForm({ onSuccess, switchToRegister }: Props) {
  const { login, clearError } = useAppContext();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    clearError();

    try {
      await login(username, password);
      onSuccess();
    } catch (err) {
      console.error("Login failed:", err);
      setError(
        err instanceof Error 
          ? err.message 
          : "Login failed. Please check your credentials and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-gray-800 p-6 rounded-lg shadow-lg">
      <h2 className="text-xl font-semibold mb-4 text-center">Login</h2>

      {error && (
        <div className="mb-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin}>
        <label className="block text-sm mb-1">Username</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full p-2 mb-4 bg-gray-700 text-white rounded"
          placeholder="Enter your username"
          required
        />

        <label className="block text-sm mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 mb-4 bg-gray-700 text-white rounded"
          placeholder="••••••••"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-semibold"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-400">
        Don't have an account?{" "}
        <button onClick={switchToRegister} className="text-blue-400 underline">
          Register
        </button>
      </p>
    </div>
  );
}

export default LoginForm;
    

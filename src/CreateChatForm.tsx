import { useState } from "react";

type Props = {
  token: string;
  onCreated: () => void;
};

export default function CreateChatForm({ token, onCreated }: Props) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const handleCreate = async () => {
    try {
      // @ts-ignore
      await window.__TAURI__.invoke("create_chat", { token, name });
      onCreated();
      setName("");
    } catch {
      setError("Failed to create chat.");
    }
  };

  return (
    <div>
      <h3>Create Chat</h3>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Chat name" />
      <button onClick={handleCreate}>Create</button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
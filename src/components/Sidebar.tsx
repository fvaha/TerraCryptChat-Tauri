import React, { useEffect, useState } from "react";
import { UserEntity } from "../models";
import { fetchUserById } from "../userService";

type SidebarProps = {
  onChatCreated: () => void;
};

const Sidebar: React.FC<SidebarProps> = ({ onChatCreated }) => {
  const [currentUser, setCurrentUser] = useState<UserEntity | null>(null);

  useEffect(() => {
    fetchUserById("current").then(setCurrentUser); // Replace 'current' logic as needed
  }, []);

  return (
    <div className="w-64 border-r h-screen flex flex-col">
      <div className="p-4 border-b">
        <div className="text-xl font-bold">Terracrypt</div>
        {currentUser && (
          <div className="text-xs text-muted-foreground">{currentUser.username}</div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="p-2 space-y-2">
          <button className="w-full justify-start">Chats</button>
          <button className="w-full justify-start">Friends</button>
          <button className="w-full justify-start">Settings</button>
        </div>
      </div>
      <div className="p-4 border-t">
        <button className="w-full" onClick={onChatCreated}>
          + New Chat
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
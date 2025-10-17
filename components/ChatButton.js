import { useState } from 'react';

export default function ChatButton() {
  const [open, setOpen] = useState(false);

  const toggleChat = () => setOpen(!open);

  return (
    <>
      <button className="chat-button" onClick={toggleChat}>💬</button>
      {open && (
        <div className="chat-box">
          <p>Chat with us!</p>
        </div>
      )}
    </>
  );
}

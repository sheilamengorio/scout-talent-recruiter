import { useState, useRef, useEffect } from 'react';
import Markdown from 'react-markdown';
import { sendChatMessage, uploadLogo } from '../services/api';

function ChatInterface({ messages, onNewMessage, tlpId, scrapingStatus, conversationPhase }) {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!input.trim() || isTyping) return;

    const userMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    // Add user message
    onNewMessage(userMessage);
    setInput('');
    setIsTyping(true);

    try {
      // Send to API
      const conversation = [...messages, userMessage].map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await sendChatMessage(userMessage.content, conversation, tlpId);

      // Add AI response
      const aiMessage = {
        role: 'assistant',
        content: response.reply,
        timestamp: new Date(),
        scrapingStatus: response.scraping_status,
        interviewQuestions: response.interview_questions,
        deploymentPlatforms: response.deployment_platforms,
        conversationPhase: response.conversation_phase
      };

      onNewMessage(aiMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      onNewMessage({
        role: 'assistant',
        content: "Sorry, I'm having trouble processing that. Please try again.",
        timestamp: new Date()
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);

    try {
      const response = await uploadLogo(file);

      onNewMessage({
        role: 'assistant',
        content: `Great! I've uploaded your company logo. It will appear in the preview shortly.`,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error uploading logo:', error);
      onNewMessage({
        role: 'assistant',
        content: "Sorry, I couldn't upload the logo. Please try again.",
        timestamp: new Date()
      });
    } finally {
      setUploading(false);
    }
  };

  // Determine if async operations are happening
  const isBrandScraping = scrapingStatus?.brand === 'in_progress';
  const isMarketResearching = scrapingStatus?.market === 'in_progress';
  const hasAsyncActivity = isBrandScraping || isMarketResearching;

  return (
    <div className="chat-interface">
      <div className="messages-container">
        {messages.map((msg, index) => (
          <div key={index} className={`message message-${msg.role}`}>
            <div className="message-bubble">
              {msg.role === 'assistant' ? (
                <Markdown
                  components={{
                    p: ({ children }) => <p style={{ margin: '0 0 8px 0' }}>{children}</p>,
                    ul: ({ children }) => <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>{children}</ul>,
                    li: ({ children }) => <li style={{ margin: '2px 0' }}>{children}</li>,
                    strong: ({ children }) => <strong style={{ fontWeight: 600 }}>{children}</strong>,
                    h3: ({ children }) => <h3 style={{ margin: '12px 0 6px', fontSize: '1.05em' }}>{children}</h3>,
                    a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#667eea' }}>{children}</a>
                  }}
                >
                  {msg.content}
                </Markdown>
              ) : (
                msg.content
              )}
            </div>
            <div className="message-time">
              {new Date(msg.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>
        ))}

        {/* Async activity indicators */}
        {hasAsyncActivity && (
          <div className="async-indicators">
            {isBrandScraping && (
              <div className="async-badge brand-badge">
                <span className="pulse-dot"></span>
                Analyzing your brand...
              </div>
            )}
            {isMarketResearching && (
              <div className="async-badge market-badge">
                <span className="pulse-dot"></span>
                Checking the market...
              </div>
            )}
          </div>
        )}

        {isTyping && (
          <div className="message message-assistant">
            <div className="message-bubble typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*"
          style={{ display: 'none' }}
        />

        <button
          className="upload-button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          title="Upload company logo"
        >
          {uploading ? '...' : '+'}
        </button>

        <form onSubmit={handleSendMessage} className="chat-form">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isTyping}
            className="chat-input"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="send-button"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

export default ChatInterface;

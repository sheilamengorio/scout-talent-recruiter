import { useState, useEffect, useRef, useCallback } from 'react';
import ChatInterface from './components/ChatInterface';
import LivePreview from './components/LivePreview';
import './styles/app.css';
import './styles/chat.css';
import './styles/preview.css';
import { createTLP, getScrapingStatus } from './services/api';

function App() {
  const [tlpId, setTlpId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scrapingStatus, setScrapingStatus] = useState({ brand: 'pending', market: 'pending' });
  const [brandData, setBrandData] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [conversationPhase, setConversationPhase] = useState('intake');
  const pollingRef = useRef(null);

  // Create TLP on mount
  useEffect(() => {
    const initializeTLP = async () => {
      try {
        const result = await createTLP();
        setTlpId(result.tlp_id);
        setLoading(false);

        // Add welcome message with natural recruiter personality
        setMessages([
          {
            role: 'assistant',
            content: "Hey! I'm your recruitment marketing specialist. I'll help you create a talent landing page that actually attracts the right candidates.\n\nTo get started, tell me a bit about what you're hiring for -- the role, your company, and anything else you've got. Even a job description or company website helps. The more you give me upfront, the faster we'll get this looking sharp.",
            timestamp: new Date()
          }
        ]);
      } catch (error) {
        console.error('Failed to initialize TLP:', error);
        setLoading(false);
      }
    };

    initializeTLP();
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  // Start polling for scraping status
  const startPolling = useCallback((id) => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    pollingRef.current = setInterval(async () => {
      try {
        const status = await getScrapingStatus(id);

        setScrapingStatus({
          brand: status.brand_status,
          market: status.market_status
        });

        // Update brand data when available
        if (status.brand_data) {
          setBrandData(status.brand_data);
        }

        // Check if all async operations are complete
        const brandDone = status.brand_status !== 'in_progress';
        const marketDone = status.market_status !== 'in_progress';

        if (brandDone && marketDone) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;

          // Refresh preview if brand data just completed
          if (status.brand_status === 'completed') {
            setRefreshKey(prev => prev + 1);
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 3000); // Poll every 3 seconds
  }, []);

  const handleNewMessage = useCallback((message) => {
    setMessages(prev => [...prev, message]);

    // If this is an assistant message with scraping status, start polling
    if (message.scrapingStatus) {
      const hasActiveScraping =
        message.scrapingStatus.brand === 'in_progress' ||
        message.scrapingStatus.market === 'in_progress';

      setScrapingStatus(message.scrapingStatus);

      if (hasActiveScraping && tlpId) {
        startPolling(tlpId);
      }
    }

    // Update conversation phase
    if (message.conversationPhase) {
      setConversationPhase(message.conversationPhase);
    }

    // Refresh preview after each assistant message (content may have updated)
    if (message.role === 'assistant') {
      setRefreshKey(prev => prev + 1);
    }
  }, [tlpId, startPolling]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Initializing...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="split-screen">
        {/* Left Panel - Chat */}
        <div className="chat-panel">
          <ChatInterface
            messages={messages}
            onNewMessage={handleNewMessage}
            tlpId={tlpId}
            scrapingStatus={scrapingStatus}
            conversationPhase={conversationPhase}
          />
        </div>

        {/* Right Panel - Preview */}
        <div className="preview-panel">
          <LivePreview
            tlpId={tlpId}
            brandData={brandData}
            refreshKey={refreshKey}
          />
        </div>
      </div>
    </div>
  );
}

export default App;

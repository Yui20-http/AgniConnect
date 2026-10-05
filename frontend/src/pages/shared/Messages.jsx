import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageCircle, Send } from 'lucide-react';
import { chatService } from '../../services';
import { useAuth } from '../../context/useAuth';
import { useToast } from '../../context/ToastContext';
import { useSocket } from '../../context/SocketContext';
import { formatDateTime } from '../../utils/helpers';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

const Messages = ({ role }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { socket } = useSocket();
  const [searchParams] = useSearchParams();
  const requestedFarmerId = searchParams.get('farmerId');
  const requestedDeliveryOrderId = searchParams.get('deliveryOrderId');
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState('');
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const tail = useRef(null);

  const loadConversations = async () => {
    try {
      const response = await chatService.getConversations();
      const rows = response.data.data || [];
      setConversations(rows);
      return rows;
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not load conversations');
      return [];
    }
  };

  useEffect(() => {
    let alive = true;
    const init = async () => {
      setLoading(true);
      let rows = await loadConversations();
      if (role === 'buyer' && requestedFarmerId) {
        try {
          const response = await chatService.startConversation(requestedFarmerId);
          const conversation = response.data.data;
          if (alive) {
            rows = [conversation, ...rows.filter((row) => row._id !== conversation._id)];
            setConversations(rows);
            setActiveId(conversation._id);
          }
        } catch (error) {
          toast.error(error?.response?.data?.message || 'Could not start conversation');
        }
      } else if ((role === 'buyer' || role === 'delivery') && requestedDeliveryOrderId) {
        try {
          const response = await chatService.startDeliveryConversation(requestedDeliveryOrderId);
          const conversation = response.data.data;
          if (alive) {
            rows = [conversation, ...rows.filter((row) => row._id !== conversation._id)];
            setConversations(rows);
            setActiveId(conversation._id);
          }
        } catch (error) {
          toast.error(error?.response?.data?.message || 'Could not start delivery conversation');
        }
      } else if (alive && rows.length) setActiveId((current) => current || rows[0]._id);
      if (alive) setLoading(false);
    };
    init();
    return () => { alive = false; };
  }, [role, requestedFarmerId, requestedDeliveryOrderId]);

  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    chatService.getMessages(activeId)
      .then(({ data }) => setMessages(data.data || []))
      .catch((error) => toast.error(error?.response?.data?.message || 'Could not load messages'));
  }, [activeId]);

  useEffect(() => {
    if (!socket) return undefined;
    const receive = (message) => {
      if (String(message.conversation) !== String(activeId)) return;
      setMessages((current) => current.some((item) => item._id === message._id) ? current : [...current, message]);
      loadConversations();
    };
    socket.on('chat:message', receive);
    return () => socket.off('chat:message', receive);
  }, [socket, activeId]);

  useEffect(() => { tail.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (event) => {
    event.preventDefault();
    if (!body.trim() || !activeId) return;
    try {
      setSending(true);
      const response = await chatService.sendMessage(activeId, body.trim());
      setMessages((current) => current.some((item) => item._id === response.data.data._id) ? current : [...current, response.data.data]);
      setBody('');
      loadConversations();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Message could not be sent');
    } finally { setSending(false); }
  };

  if (loading) return <LoadingSpinner fullScreen label="Loading messages..." />;

  const active = conversations.find((conversation) => conversation._id === activeId);
  const other = (conversation) => {
    if (role !== 'buyer') return conversation.buyer;
    return conversation.kind === 'delivery' ? (conversation.deliveryPartner || conversation.farmer) : conversation.farmer;
  };
  const otherRole = (conversation) => role === 'buyer'
    ? (conversation.kind === 'delivery' ? 'Delivery Partner' : 'Farmer')
    : 'Buyer';

  return (
    <div className="space-y-4">
      <header><h2 className="text-2xl font-bold text-gray-900">Messages</h2><p className="mt-1 text-sm text-gray-500">Private conversations with your farmers, buyers, and assigned delivery partners.</p></header>
      <div className="card grid min-h-[560px] overflow-hidden md:grid-cols-[280px_1fr]">
        <aside className="border-b border-gray-100 md:border-b-0 md:border-r">
          <div className="p-3 font-semibold text-gray-800">Conversations</div>
          {conversations.map((conversation) => (
            <button key={conversation._id} onClick={() => setActiveId(conversation._id)} className={`w-full border-t border-gray-100 p-3 text-left ${activeId === conversation._id ? 'bg-primary-50' : 'hover:bg-gray-50'}`}>
              <p className="truncate text-sm font-semibold text-gray-800">{other(conversation)?.farmName || other(conversation)?.name || 'Conversation'}</p>
              <p className="truncate text-xs text-gray-500">{conversation.lastMessage || 'No messages yet'}</p>
              {conversation.lastMessageAt && <p className="mt-1 text-[10px] text-gray-400">{formatDateTime(conversation.lastMessageAt)}</p>}
            </button>
          ))}
          {!conversations.length && <div className="p-4"><EmptyState icon={MessageCircle} title="No conversations" message={role === 'delivery' ? 'Open an assigned delivery and select Chat with buyer to start.' : 'Open an order or product and select a chat option to start.'} /></div>}
        </aside>
        <section className="flex min-h-[540px] flex-col">
          {active ? <>
            <div className="border-b border-gray-100 p-4"><p className="font-semibold text-gray-900">{other(active)?.farmName || other(active)?.name || 'Conversation'}</p><p className="text-xs text-gray-500">{otherRole(active)}</p></div>
            <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-4">
              {messages.map((message) => {
                const mine = String(message.sender?._id || message.sender) === String(user?._id);
                return <div key={message._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] rounded-xl px-3 py-2 ${mine ? 'bg-primary-600 text-white' : 'bg-white text-gray-800 shadow-sm'}`}><p className="whitespace-pre-wrap break-words text-sm">{message.body}</p><p className={`mt-1 text-[10px] ${mine ? 'text-primary-100' : 'text-gray-400'}`}>{formatDateTime(message.createdAt)}</p></div></div>;
              })}
              <div ref={tail} />
            </div>
            <form onSubmit={send} className="flex gap-2 border-t border-gray-100 p-3"><input className="input" maxLength={2000} value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write a message…" /><button className="btn-primary" disabled={sending || !body.trim()} aria-label="Send message"><Send className="h-4 w-4" /></button></form>
          </> : <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-gray-500">Select a conversation to view messages.</div>}
        </section>
      </div>
    </div>
  );
};

export default Messages;

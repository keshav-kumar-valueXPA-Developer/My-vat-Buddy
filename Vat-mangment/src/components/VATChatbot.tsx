// import React, { useState, useRef, useEffect } from 'react';
// import { MessageSquare, Send } from 'lucide-react';
// import { Transaction, ContextDocument } from '../types';
// import { generateResponse } from '../utils/openai';
// import { calculationAgent } from '../utils/vatAgents';
// import { supabase } from '../utils/supabase';

// interface Message {
//   id: string;
//   text: string;
//   sender: 'user' | 'bot';
//   timestamp: Date;
// }

// interface VATChatbotProps {
//   transactions: Transaction[];
//   documents: ContextDocument[];
//   isOpen: boolean;
//   onClose: () => void;
// }

// export function VATChatbot({ transactions, documents }: VATChatbotProps) {
//   const [messages, setMessages] = useState<Message[]>([]);
//   const [input, setInput] = useState('');
//   const [isLoading, setIsLoading] = useState(false);
//   const [isOnline, setIsOnline] = useState(false);
//   const messagesEndRef = useRef<HTMLDivElement>(null);
  
//   const scrollToBottom = () => {
//     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//   };

//   useEffect(() => {
//     scrollToBottom();
//   }, [messages]);

//   useEffect(() => {
//     checkOnlineStatus();
//   }, []);

//   const checkOnlineStatus = async () => {
//     try {
//       const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
//       if (!apiKey) {
//         console.warn('OpenAI API key not found');
//         setIsOnline(false);
//         return;
//       }

//       const response = await fetch('https://api.openai.com/v1/models', {
//         headers: {
//           'Authorization': `Bearer ${apiKey}`
//         }
//       });
      
//       if (response.ok) {
//         setIsOnline(true);
//       } else {
//         const error = await response.json();
//         console.error('OpenAI API error:', error);
//         setIsOnline(false);
//       }
//     } catch (error) {
//       console.error('Error checking OpenAI status:', error);
//       setIsOnline(false);
//     }
//   };

//   const handleSend = async () => {
//     if (!input.trim() || isLoading) return;

//     const userMessage: Message = {
//       id: crypto.randomUUID(),
//       text: input,
//       sender: 'user',
//       timestamp: new Date()
//     };

//     setMessages(prev => [...prev, userMessage]);
//     setInput('');
//     setIsLoading(true);

//     try {
//       const { data: { user } } = await supabase.auth.getUser();
//       if (!user) throw new Error('User not authenticated');

//       // Check if the query looks like a VAT calculation request
//       const isVATQuery = input.toLowerCase().includes('vat') || 
//                         input.toLowerCase().includes('tax') ||
//                         input.toLowerCase().includes('input') ||
//                         input.toLowerCase().includes('output');

//       let response: string;

//       if (isVATQuery) {
//         // Execute VAT-specific query
//         const { data, error } = await calculationAgent.executeVATQuery(input, user.id);
        
//         if (error) {
//           response = `I encountered an error: ${error}`;
//         } else if (!data) {
//           response = "I couldn't find any relevant data for your query.";
//         } else {
//           // Format the response based on the data type
//           if (Array.isArray(data)) {
//             if (data[0]?.month) {
//               // Monthly summary
//               response = "Here's the monthly VAT summary:\n\n" + data.map(m => 
//                 `Month ${m.month}:\n` +
//                 `- Output VAT: ${m.output_vat.toFixed(2)} AED\n` +
//                 `- Input VAT: ${m.input_vat.toFixed(2)} AED\n` +
//                 `- Net VAT: ${m.net_vat.toFixed(2)} AED`
//               ).join('\n\n');
//             } else {
//               // Transaction list
//               response = "Here are the results:\n\n" + data.map((t, i) =>
//                 `${i + 1}. ${t.description}\n` +
//                 `   Amount: ${t.vat_amount.toFixed(2)} AED\n` +
//                 `   Date: ${new Date(t.date).toLocaleDateString()}`
//               ).join('\n\n');
//             }
//           } else if (typeof data === 'number') {
//             response = `The total VAT amount is ${data.toFixed(2)} AED`;
//           } else {
//             response = "I found the data but I'm not sure how to present it.";
//           }
//         }
//       } else {
//         // Use OpenAI for general queries
//         response = await generateResponse(input, '', documents);
//       }

//       const botMessage: Message = {
//         id: crypto.randomUUID(),
//         text: response,
//         sender: 'bot',
//         timestamp: new Date()
//       };

//       setMessages(prev => [...prev, botMessage]);
//     } catch (error) {
//       console.error('Error generating response:', error);
//       const errorMessage: Message = {
//         id: crypto.randomUUID(),
//         text: "I apologize, but I'm having trouble generating a response. Please try again.",
//         sender: 'bot',
//         timestamp: new Date()
//       };
//       setMessages(prev => [...prev, errorMessage]);
//       console.error("Error fetching VAT data:", error);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
//       <div className="p-4 bg-[#6B8F71] text-white">
//         <div className="flex items-center justify-between">
//           <div className="flex items-center gap-2">
//             <MessageSquare className="h-5 w-5" />
//             <h3 className="font-semibold">VAT Assistant</h3>
//           </div>
//           <div className="flex items-center gap-2">
//             <span className={`inline-block w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'}`} />
//             <span className="text-sm">{isOnline ? 'Online' : 'Offline'}</span>
//           </div>
//         </div>
//       </div>
      
//       <div className="flex-1 overflow-y-auto p-4 space-y-4">
//         {messages.length === 0 && (
//           <div className="text-gray-500 text-center">
//             <p className="mb-2">Welcome to your VAT Assistant!</p>
//             <p>You can ask me about:</p>
//             <ul className="text-left list-disc pl-6 mt-2">
//               <li>Your current VAT position</li>
//               <li>Total VAT for specific periods</li>
//               <li>Top items by VAT amount</li>
//               <li>Monthly VAT summaries</li>
//               <li>VAT regulations and compliance</li>
//             </ul>
//             <p className="mt-4 text-sm text-gray-400">Try asking:</p>
//             <ul className="text-left text-sm text-gray-400 list-disc pl-6 mt-1">
//               <li>"What was the total VAT amount in February 2025?"</li>
//               <li>"Show me the top 10 items with highest input VAT"</li>
//               <li>"Give me a monthly VAT summary for 2025"</li>
//             </ul>
//           </div>
//         )}
//         {messages.map((message) => (
//           <div
//             key={message.id}
//             className={`flex ${
//               message.sender === 'user' ? 'justify-end' : 'justify-start'
//             }`}
//           >
//             <div
//               className={`max-w-[80%] rounded-lg p-3 ${
//                 message.sender === 'user'
//                   ? 'bg-[#6B8F71] text-white'
//                   : 'bg-gray-100 text-gray-900'
//               }`}
//             >
//               <p className="whitespace-pre-wrap">{message.text}</p>
//               <p className="text-xs mt-1 opacity-70">
//                 {message.timestamp.toLocaleTimeString()}
//               </p>
//             </div>
//           </div>
//         ))}
//         <div ref={messagesEndRef} />
//       </div>
      
//       <div className="p-4 border-t">
//         <div className="flex gap-2">
//           <input
//             type="text"
//             value={input}
//             onChange={(e) => setInput(e.target.value)}
//             onKeyPress={(e) => e.key === 'Enter' && handleSend()}
//             placeholder={isOnline ? "Ask me about your VAT..." : "Assistant is offline"}
//             className="flex-1 rounded-lg border-gray-300 focus:border-[#6B8F71] focus:ring-[#6B8F71]"
//             disabled={!isOnline || isLoading}
//           />
//           <button
//             onClick={handleSend}
//             className={`bg-[#6B8F71] text-white p-2 rounded-lg ${
//               !isOnline || isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#6B8F71]/80'
//             }`}
//             disabled={!isOnline || isLoading}
//           >
//             <Send className="h-5 w-5" />
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

import React, { useState, useRef, useEffect } from "react";
import { processQuery } from "../utils/text2sql";
import { MessageSquare, Send } from 'lucide-react';
import { generateResponse } from '../utils/openai';
import { supabase } from '../utils/supabase';
import { Transaction, ContextDocument } from '../types';


interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface VATChatbotProps {
  transactions: Transaction[];
  documents: ContextDocument[];
  isOpen: boolean;
  onClose: () => void;
}

export const VATChatbot = ({ transactions, documents }: VATChatbotProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [chatHistory, setChatHistory] = useState<string[]>([]);
  const [loading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    checkOnlineStatus();
  }, []);

  const checkOnlineStatus = async () => {
    try {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!apiKey) {
        console.warn('OpenAI API key not found');
        setIsOnline(false);
        return;
      }
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      if (response.ok) {
        setIsOnline(true);
      } else {
        const error = await response.json();
        console.error('OpenAI API error:', error);
        setIsOnline(false);
      }
    } catch (error) {
      console.error('Error checking OpenAI status:', error);
      setIsOnline(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
  
    const userMessage: Message = { 
      id: crypto.randomUUID(), // Unique ID
      text: input, 
      sender: "user", 
      timestamp: new Date() 
    };
  
    setMessages(prev=>[...prev, userMessage]);
    setInput('');
    setIsLoading(true);
  
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if the query looks like a VAT calculation request
      const isVATQuery = input.toLowerCase().includes('vat') || 
                        input.toLowerCase().includes('tax') ||
                        input.toLowerCase().includes('transactions')||
                        input.toLowerCase().includes('Compliance')||
                        input.toLowerCase().includes('input') ||
                        input.toLowerCase().includes('output');
      
      let response=" ";

      if (isVATQuery) {
        response = await processQuery(input,chatHistory);
      }
     else {
    // Use OpenAI for general queries
    response = await generateResponse(input, '', documents);
  }

  setChatHistory([...chatHistory, input]);

      const botMessage: Message = { 
        id: crypto.randomUUID(), 
        text: response|| "I couldn't find any relevant information.", 
        sender: "bot", 
        timestamp: new Date() 
      };
  
      setMessages(prev=>[...prev, botMessage]);
    } catch (error) {
      console.error("Error processing message:", error);

      const errorMessage: Message = {
        id: crypto.randomUUID(),
        text:  "I'm sorry, I encountered an error processing your request. Please try again.",
        sender: "bot",
        timestamp: new Date()
      };
  
      setMessages(prev=>[...prev, errorMessage]);
      console.error("Error fetching VAT data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const startListening = () => {
    const SpeechRecognition = (window.SpeechRecognition || window.webkitSpeechRecognition) as any;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.start();
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };
    recognition.onerror = (event: any) => {
      console.error("Voice recognition error:", event.error);
    };
  };
  
  

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
      <div className="p-4 bg-[#6B8F71] text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <h3 className="font-semibold">VAT Assistant</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-block w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-sm">{isOnline ? 'Online' : 'Offline'}</span>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
  {messages.length === 0 && (
    <div className="text-gray-500 text-center">
      <p className="mb-2">Welcome to your VAT Assistant!</p>
      <p>You can ask me about:</p>
      <ul className="text-left list-disc pl-6 mt-2">
        <li>Your current VAT position</li>
        <li>Total VAT for specific periods</li>
      </ul>
    </div>
  )}

  {messages.map((msg) => (
    <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
      <div className={`p-3 rounded-lg ${msg.sender === "user" ? "bg-blue-500 text-white" : "bg-gray-200 text-black"}`}>
        <p>{msg.text}</p>
        <span className="text-xs text-gray-500">{new Date(msg.timestamp).toLocaleTimeString()}</span>
      </div>
    </div>
  ))}
</div>
      
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={isOnline ? "Ask me about your VAT..." : "Assistant is offline"}
            className="flex-1 rounded-lg border-gray-300 focus:border-[#6B8F71] focus:ring-[#6B8F71]"
            disabled={!isOnline || loading}
          />
          <button
            onClick={handleSend}
            className={`bg-[#6B8F71] text-white p-2 rounded-lg ${
              !isOnline || loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#6B8F71]/80'
            }`}
            disabled={!isOnline || loading}
          >
            <Send className="h-5 w-5" />
          </button>
          <button onClick={startListening} className={`bg-[#6B8F71] text-white p-2 rounded-lg ${
            !isOnline || loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#6B8F71]/80'
          }`}>
          🎤
        </button>
        </div>
      </div>
    </div>
  );
}

export default VATChatbot;

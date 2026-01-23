"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Send, Bot, User, Eraser, Settings2 } from "lucide-react"

export default function PlaygroundPage() {
  const [messages, setMessages] = useState<Array<{role: string, content: string}>>([
    { role: "system", content: "You are a helpful AI assistant proxied via OwlApi Gateway." }
  ])
  const [input, setInput] = useState("")

  const handleSend = () => {
    if(!input.trim()) return
    setMessages([...messages, { role: "user", content: input }])
    setInput("")
    // Mock response
    setTimeout(() => {
      setMessages(prev => [...prev, { role: "assistant", content: "This is a mock response from the private model." }])
    }, 1000)
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-6">
      {/* Settings Panel */}
      <div className="w-full lg:w-80 flex-shrink-0 space-y-6 bg-white p-5 rounded-xl border border-zinc-200/60 shadow-sm h-full overflow-y-auto">
        <div className="flex items-center gap-2 pb-4 border-b border-zinc-100">
           <Settings2 className="w-4 h-4 text-zinc-500" />
           <h3 className="font-bold text-sm text-zinc-900">参数配置</h3>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-500">模型 (Model)</label>
            <Select defaultValue="deepseek-r1">
              <SelectTrigger className="h-9 text-xs bg-zinc-50/50">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deepseek-r1">DeepSeek R1 (Reasoning)</SelectItem>
                <SelectItem value="llama3-70b">Llama 3 70B</SelectItem>
                <SelectItem value="qwen-14b">Qwen 1.5 14B</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
             <label className="text-xs font-bold text-zinc-500">温度 (Temperature)</label>
             <div className="flex items-center gap-2">
                <input type="range" min="0" max="1" step="0.1" className="flex-1 h-2 bg-zinc-100 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                <span className="text-xs font-mono text-zinc-600 w-8 text-right">0.7</span>
             </div>
          </div>
          
          <div className="space-y-1.5">
             <label className="text-xs font-bold text-zinc-500">最大Token (Max Tokens)</label>
             <div className="flex items-center gap-2">
                <input type="range" min="128" max="4096" step="128" className="flex-1 h-2 bg-zinc-100 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                <span className="text-xs font-mono text-zinc-600 w-8 text-right">2k</span>
             </div>
          </div>

           <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-500">系统提示词 (System Prompt)</label>
            <Textarea 
              className="resize-none h-32 text-xs bg-zinc-50/50 leading-relaxed"
              defaultValue="You are a helpful AI assistant proxied via OwlApi Gateway."
            />
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white rounded-xl border border-zinc-200/60 shadow-sm overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${msg.role === 'assistant' ? 'bg-blue-100 text-blue-600' : 'bg-zinc-100 text-zinc-600'}`}>
                {msg.role === 'assistant' ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
              </div>
              <div className={`
                 px-4 py-2.5 rounded-2xl text-sm max-w-[80%] leading-relaxed shadow-sm
                 ${msg.role === 'user' 
                   ? 'bg-blue-600 text-white rounded-tr-sm' 
                   : 'bg-zinc-50 text-zinc-800 border border-zinc-100 rounded-tl-sm'}
              `}>
                {msg.content}
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-zinc-100 bg-zinc-50/30">
          <div className="relative">
            <Textarea 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="输入消息与内网模型对话..."
              className="min-h-[80px] w-full resize-none bg-white pr-24 py-3 pl-4 border-zinc-200 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 rounded-xl transition-all"
              onKeyDown={(e) => {
                if(e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
            />
            <div className="absolute bottom-3 right-3 flex gap-2">
              <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-zinc-600 rounded-lg">
                <Eraser className="w-4 h-4" />
              </Button>
              <Button size="sm" onClick={handleSend} className="h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm font-bold text-xs px-3">
                Send <Send className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
          </div>
          <p className="text-[10px] text-zinc-400 text-center mt-2 font-medium">
            模型输出由 OwlApi Gateway 代理加速 • 内容仅供测试
          </p>
        </div>
      </div>
    </div>
  )
}

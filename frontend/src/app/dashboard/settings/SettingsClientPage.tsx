"use client"

import { useState } from "react"
import {
  Settings,
  Shield,
  Key,
  Globe,
  Bell,
  Cpu,
  Save,
  AlertCircle,
  Brain,
  Terminal,
  Clock,
  Zap,
  Activity
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

type SettingsTab = "general" | "ai" | "runner" | "security" | "notifications"

export default function SettingsClientPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general")

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between border-b border-zinc-200/60 pb-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-zinc-400" />
            系统设置 (System Settings)
          </h1>
          <p className="text-xs text-zinc-500 mt-1 font-medium">配置平台全局行为、模型网关默认策略及执行节点集群参数。</p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" className="h-9 px-4 text-xs font-bold border-zinc-200">恢复默认</Button>
           <Button className="h-9 px-6 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm">
             保存更改
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Sidebar Navigation */}
        <div className="md:col-span-3">
          <nav className="flex flex-col space-y-1">
            <SettingsTabLink icon={Globe} label="通用配置" active={activeTab === "general"} onClick={() => setActiveTab("general")} />
            <SettingsTabLink icon={Brain} label="AI 引擎" active={activeTab === "ai"} onClick={() => setActiveTab("ai")} />
            <SettingsTabLink icon={Cpu} label="执行节点" active={activeTab === "runner"} onClick={() => setActiveTab("runner")} />
            <SettingsTabLink icon={Shield} label="安全中心" active={activeTab === "security"} onClick={() => setActiveTab("security")} />
            <SettingsTabLink icon={Bell} label="通知告警" active={activeTab === "notifications"} onClick={() => setActiveTab("notifications")} />
          </nav>
        </div>

        {/* Content Area */}
        <div className="md:col-span-9">
          {activeTab === "general" && (
            <div className="space-y-6">
              <SettingsCard title="平台信息" icon={Globe} iconColor="text-blue-600">
                <div className="grid grid-cols-2 gap-6">
                  <FormItem label="控制台名称" description="显示在浏览器标题和左上角">
                    <Input defaultValue="OwlApi Console" className="h-9 text-xs" />
                  </FormItem>
                  <FormItem label="默认环境" description="新建项目时的默认运行环境">
                    <Select defaultValue="development">
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="development">Development (开发环境)</SelectItem>
                        <SelectItem value="production">Production (生产环境)</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                </div>
              </SettingsCard>

              <SettingsCard title="运行时首选项">
                <div className="space-y-4">
                  <ToggleItem 
                    title="自动格式化 SQL" 
                    description="保存接口时自动运行 sql-formatter 优化排版" 
                    defaultChecked 
                  />
                  <ToggleItem 
                    title="响应预览预览" 
                    description="在 Playground 中默认显示 JSON 结构化预览" 
                    defaultChecked 
                  />
                </div>
              </SettingsCard>
            </div>
          )}

          {activeTab === "ai" && (
            <div className="space-y-6">
              <SettingsCard title="全局代理策略" icon={Brain} iconColor="text-indigo-600">
                <div className="grid grid-cols-2 gap-6">
                  <FormItem label="默认重试次数" description="模型响应失败后的自动重试次数">
                    <Input type="number" defaultValue="3" className="h-9 text-xs" />
                  </FormItem>
                  <FormItem label="超时时间 (秒)" description="单次模型推断的最大等待时间">
                    <Input type="number" defaultValue="60" className="h-9 text-xs" />
                  </FormItem>
                </div>
              </SettingsCard>

              <SettingsCard title="Token 优化">
                <div className="space-y-4">
                  <ToggleItem 
                    title="流式输出支持 (Streaming)" 
                    description="全局启用 SSE 流式响应渲染" 
                    defaultChecked 
                  />
                  <ToggleItem 
                    title="自动裁剪上下文" 
                    description="当 Token 超过模型上限时自动从旧消息开始裁剪" 
                  />
                </div>
              </SettingsCard>
            </div>
          )}

          {activeTab === "runner" && (
            <div className="space-y-6">
              <SettingsCard title="执行节点集群参数" icon={Cpu} iconColor="text-zinc-600">
                <div className="grid grid-cols-2 gap-6">
                  <FormItem label="心跳间隔 (秒)" description="节点向控制面上报状态的频率">
                    <Input type="number" defaultValue="10" className="h-9 text-xs" />
                  </FormItem>
                  <FormItem label="日志保留天数" description="Runner 本地日志的存储期限">
                    <Input type="number" defaultValue="7" className="h-9 text-xs" />
                  </FormItem>
                </div>
              </SettingsCard>

              <SettingsCard title="自动更新与同步">
                <div className="space-y-4">
                  <ToggleItem 
                    title="自动热更新" 
                    description="检测到新版本规则时，Runner 无需重启即可应用" 
                    defaultChecked 
                  />
                  <ToggleItem 
                    title="二进制自动升级" 
                    description="有新的版本发布时，自动在非业务时段更新 Runner 镜像" 
                  />
                </div>
              </SettingsCard>
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-6">
              <SettingsCard title="访问安全性" icon={Shield} iconColor="text-emerald-600">
                 <div className="space-y-4">
                  <ToggleItem 
                    title="强制多因子验证 (MFA)" 
                    description="所有拥有管理员权限的用户必须绑定身份验证器" 
                    defaultChecked 
                  />
                  <ToggleItem 
                    title="内网访问加固" 
                    description="启用后，所有来自公网的直连请求必须附带集群特定的安全指纹" 
                  />
                </div>
              </SettingsCard>

              <SettingsCard title="操作审计">
                <div className="space-y-2">
                   <FormItem label="审计日志存储" description="将所有管理操作记录发送至指定 S3 存储桶 (可选)">
                     <Input placeholder="s3://audit-logs-bucket" className="h-9 text-xs" />
                   </FormItem>
                </div>
              </SettingsCard>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="space-y-6">
              <SettingsCard title="告警通知 Webhook" icon={Bell} iconColor="text-orange-500">
                <div className="space-y-6">
                  <div className="space-y-4">
                    <ToggleItem 
                      title="启用 Webhook 告警" 
                      description="当执行节点离线、SQL 查询超时或 AI 网关异常时发送 POST 请求" 
                      defaultChecked 
                    />
                    <div className="h-[1px] bg-zinc-100 w-full" />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <FormItem label="Webhook 类型" description="选择目标平台以自动适配 Payload 格式">
                      <Select defaultValue="wecom">
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="generic">Generic JSON (通用)</SelectItem>
                          <SelectItem value="feishu">Feishu (飞书)</SelectItem>
                          <SelectItem value="dingtalk">DingTalk (钉钉)</SelectItem>
                          <SelectItem value="wecom">WeCom (企业微信)</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                    <FormItem label="安全密钥 (Secret)" description="可选：用于签名校验或 WeCom 的密钥验证">
                      <Input type="password" placeholder="••••••••••••••••" className="h-9 text-xs" />
                    </FormItem>
                  </div>

                  <div className="space-y-4">
                    <FormItem label="Webhook URL" description="告警消息将发送至此地址">
                      <div className="flex gap-2">
                        <Input placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..." className="h-9 text-xs" />
                        <Button variant="outline" className="h-9 px-4 text-xs font-bold border-zinc-200 shrink-0">
                          发送测试
                        </Button>
                      </div>
                    </FormItem>
                  </div>

                  <div className="pt-2 border-t border-zinc-50 border-dashed">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">推送事件订阅</p>
                    <div className="grid grid-cols-2 gap-x-12 gap-y-3">
                      <ToggleItem title="节点状态变更" description="Runner 上线/离线提醒" defaultChecked />
                      <ToggleItem title="慢查询告警" description="执行耗时超过阈值时提醒" defaultChecked />
                      <ToggleItem title="AI 模型异常" description="上游推理机失败率过高时提醒" />
                      <ToggleItem title="安全拦截" description="产生高危 Web 攻击拦截时提醒" />
                    </div>
                  </div>
                </div>
              </SettingsCard>

              <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-5 flex items-start gap-3">
                <Zap className="w-5 h-5 text-blue-600 shrink-0" />
                <div>
                   <h4 className="text-xs font-bold text-blue-900 uppercase">配置建议</h4>
                   <p className="text-[11px] text-blue-800 mt-1 leading-relaxed">
                     建议配合飞书或钉钉机器人的“安全设置”使用密钥校验模式，以确保运维通知的安全性。
                   </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SettingsTabLink({ icon: Icon, label, active, onClick }: { icon: any; label: string; active?: boolean; onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "flex items-center space-x-3 px-4 py-2.5 rounded-md cursor-pointer transition-all",
        active
          ? "bg-blue-50 text-blue-600 border border-blue-100 shadow-[0_1px_2px_rgba(59,130,246,0.1)]"
          : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
      )}
    >
      <Icon className={cn("w-4 h-4", active ? "text-blue-600" : "text-zinc-400")} />
      <span className="text-xs font-bold tracking-tight">{label}</span>
    </div>
  )
}

function SettingsCard({ title, children, icon: Icon, iconColor }: { title: string; children: React.ReactNode; icon?: any; iconColor?: string }) {
  return (
    <section className="bg-white border border-zinc-200/60 rounded-xl p-6 shadow-sm space-y-5">
      {Icon && (
        <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
          <div className={cn("p-1.5 rounded-md bg-zinc-50", iconColor)}>
            <Icon className="w-4 h-4" />
          </div>
          {title}
        </h3>
      )}
      {!Icon && <h3 className="text-sm font-bold text-zinc-900">{title}</h3>}
      {children}
    </section>
  )
}

function FormItem({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-0.5">{label}</label>
      {children}
      <p className="text-[10px] text-zinc-400 font-medium px-0.5">{description}</p>
    </div>
  )
}

function ToggleItem({ title, description, defaultChecked }: { title: string; description: string; defaultChecked?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <div>
        <p className="text-xs font-bold text-zinc-800">{title}</p>
        <p className="text-[10px] text-zinc-400 mt-0.5">{description}</p>
      </div>
      <Switch defaultChecked={defaultChecked} />
    </div>
  )
}

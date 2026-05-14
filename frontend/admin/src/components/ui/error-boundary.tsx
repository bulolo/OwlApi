"use client"

import { Component, type ReactNode } from "react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground mb-1">加载失败</p>
            <p className="text-xs text-muted-foreground">{this.state.error?.message}</p>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

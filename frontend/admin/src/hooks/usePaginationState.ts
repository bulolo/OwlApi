import { useState } from "react"

export interface PaginationState {
  page: number
  size: number
  keyword: string
  setPage: (page: number) => void
  setSize: (size: number) => void
  onSearch: (kw: string) => void
  params: { page: number; size: number; keyword: string }
}

export function usePaginationState(defaultSize = 10): PaginationState {
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(defaultSize)
  const [keyword, setKeyword] = useState("")

  function onSearch(kw: string) {
    setKeyword(kw)
    setPage(1)
  }

  return {
    page,
    size,
    keyword,
    setPage,
    setSize,
    onSearch,
    params: { page, size, keyword },
  }
}

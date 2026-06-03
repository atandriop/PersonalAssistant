import { Suspense } from 'react'
import MemoriesPage from '@/components/memories/MemoriesPage'

export default function Page() {
  return (
    <Suspense>
      <MemoriesPage />
    </Suspense>
  )
}

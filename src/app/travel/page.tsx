import { Suspense } from 'react'
import TravelPage from '@/components/travel/TravelPage'

export default function Page() {
  return (
    <Suspense>
      <TravelPage />
    </Suspense>
  )
}

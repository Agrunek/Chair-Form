import { useEffect, useState } from 'react'

const MILESTONE_MESSAGES: Record<number, string> = {
  1: 'Your first 10 minutes are complete. Keep working naturally.',
  2: '20 minutes have passed. You’re doing great — just continue as you normally would.',
  3: 'Half an hour already! Continue at your own pace.',
  4: '40 minutes have passed. There’s no need to change your routine.',
  5: 'Almost there. Keep working naturally until you’re ready to finish.',
  6: 'One hour complete. Thank you for taking part!',
}

export function useSessionTimer() {
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [elapsedBeforeRun, setElapsedBeforeRun] = useState(0)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const refresh = () => setNow(Date.now())
    const intervalId = window.setInterval(refresh, 15_000)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])

  const elapsedMs = elapsedBeforeRun + (startedAt === null ? 0 : now - startedAt)
  const elapsedMinutes = Math.floor(elapsedMs / 60_000)
  const milestone = Math.floor(elapsedMinutes / 10)
  const milestoneMessage =
    MILESTONE_MESSAGES[milestone] ??
    (milestone > 6 ? `${milestone * 10} minutes have passed. Keep working at your own pace.` : '')

  function start() {
    setNow(Date.now())
    setStartedAt(Date.now())
  }

  function pause() {
    if (startedAt !== null) {
      const pausedAt = Date.now()
      setElapsedBeforeRun((elapsed) => elapsed + pausedAt - startedAt)
      setStartedAt(null)
      setNow(pausedAt)
    }
  }

  function resume() {
    setNow(Date.now())
    setStartedAt(Date.now())
  }

  function reset() {
    setStartedAt(null)
    setElapsedBeforeRun(0)
    setNow(Date.now())
  }

  const elapsedLabel =
    elapsedMinutes >= 60
      ? `${Math.floor(elapsedMinutes / 60)} hr${elapsedMinutes >= 120 ? 's' : ''} ${elapsedMinutes % 60} min`
      : `${elapsedMinutes} min`

  return {
    elapsedMinutes,
    elapsedLabel,
    isRunning: startedAt !== null,
    hasStarted: startedAt !== null || elapsedBeforeRun > 0,
    milestoneMessage,
    start,
    pause,
    resume,
    reset,
  }
}

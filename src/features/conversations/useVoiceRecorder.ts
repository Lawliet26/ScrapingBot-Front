import { useCallback, useEffect, useRef, useState } from 'react'

const MAX_SECONDS = 90

type RecorderState = 'idle' | 'recording' | 'recorded'

export function useVoiceRecorder() {
  const [state, setState] = useState<RecorderState>('idle')
  const [seconds, setSeconds] = useState(0)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }, [])

  const start = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []
      const recorder = new MediaRecorder(stream)
      recorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        const finalBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setBlob(finalBlob)
        setState('recorded')
        releaseStream()
      }

      recorder.start()
      setState('recording')
      setSeconds(0)
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => {
          const next = prev + 1
          if (next >= MAX_SECONDS) {
            recorderRef.current?.stop()
            stopTimer()
          }
          return next
        })
      }, 1000)
    } catch {
      setError('No pudimos acceder al micrófono. Revisá los permisos del navegador.')
    }
  }, [releaseStream, stopTimer])

  const stop = useCallback(() => {
    stopTimer()
    recorderRef.current?.stop()
  }, [stopTimer])

  const cancel = useCallback(() => {
    stopTimer()
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.onstop = null
      recorderRef.current.stop()
    }
    releaseStream()
    setBlob(null)
    setSeconds(0)
    setState('idle')
  }, [releaseStream, stopTimer])

  const reset = useCallback(() => {
    setBlob(null)
    setSeconds(0)
    setState('idle')
  }, [])

  useEffect(() => {
    return () => {
      stopTimer()
      releaseStream()
    }
  }, [stopTimer, releaseStream])

  return { state, seconds, blob, error, start, stop, cancel, reset, maxSeconds: MAX_SECONDS }
}

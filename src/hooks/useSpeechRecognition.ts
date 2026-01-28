import { useEffect, useRef, useCallback } from 'react'
import { useMeetingStore } from '@/store/meetingStore'

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message?: string
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

interface UseSpeechRecognitionOptions {
  onWakeWord?: () => void
  onTerminationCommand?: () => void
  language?: string
}

const WAKE_WORD = 'hey asistan'
const TERMINATION_COMMAND = 'görüşürüz'

export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}) {
  const { onWakeWord, onTerminationCommand, language = 'tr-TR' } = options
  
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const isListeningRef = useRef(false)
  const shouldRestartRef = useRef(false)
  
  const { 
    recordingState,
    appendTranscript, 
    setInterimTranscript,
    setMicPermission,
    setPermissionError
  } = useMeetingStore()

  const checkWakeWord = useCallback((text: string) => {
    const normalizedText = text.toLowerCase().trim()
    if (normalizedText.includes(WAKE_WORD) || 
        normalizedText.includes('hey assistant') ||
        normalizedText.includes('hey asistan')) {
      onWakeWord?.()
      return true
    }
    return false
  }, [onWakeWord])

  const checkTerminationCommand = useCallback((text: string) => {
    const normalizedText = text.toLowerCase().trim()
    if (normalizedText.includes(TERMINATION_COMMAND) || 
        normalizedText.includes('gorusuruz') ||
        normalizedText.includes('görüşürüz')) {
      onTerminationCommand?.()
      return true
    }
    return false
  }, [onTerminationCommand])

  const startRecognition = useCallback(async () => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
    
    if (!SpeechRecognitionAPI) {
      setPermissionError('Tarayıcınız ses tanıma özelliğini desteklemiyor. Chrome veya Edge kullanın.')
      return false
    }

    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true })
      setMicPermission(true)
      setPermissionError(null)
    } catch (error) {
      setMicPermission(false)
      setPermissionError('Mikrofon erişimi reddedildi. Lütfen tarayıcı ayarlarından izin verin.')
      return false
    }

    if (recognitionRef.current) {
      recognitionRef.current.abort()
    }

    const recognition = new SpeechRecognitionAPI()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = language
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      isListeningRef.current = true
      shouldRestartRef.current = true
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimText = ''
      let finalText = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const transcript = result[0].transcript

        if (result.isFinal) {
          finalText += transcript + ' '
          
          // Check for wake word and termination in final results
          checkWakeWord(transcript)
          checkTerminationCommand(transcript)
        } else {
          interimText += transcript
          
          // Also check interim results for faster response
          checkWakeWord(transcript)
          checkTerminationCommand(transcript)
        }
      }

      if (finalText.trim()) {
        appendTranscript(finalText.trim())
        setInterimTranscript('')
      } else if (interimText) {
        setInterimTranscript(interimText)
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error)
      
      if (event.error === 'not-allowed') {
        setPermissionError('Mikrofon erişimi reddedildi.')
        shouldRestartRef.current = false
      } else if (event.error === 'no-speech') {
        // This is normal, will restart automatically
      } else if (event.error === 'network') {
        setPermissionError('Ağ hatası. İnternet bağlantınızı kontrol edin.')
      }
    }

    recognition.onend = () => {
      isListeningRef.current = false
      
      // Auto-restart if we should continue
      if (shouldRestartRef.current && recordingState === 'recording') {
        setTimeout(() => {
          if (shouldRestartRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start()
            } catch (e) {
              // Ignore errors on restart
            }
          }
        }, 100)
      }
    }

    recognitionRef.current = recognition
    
    try {
      recognition.start()
      return true
    } catch (error) {
      console.error('Failed to start recognition:', error)
      return false
    }
  }, [language, checkWakeWord, checkTerminationCommand, appendTranscript, setInterimTranscript, setMicPermission, setPermissionError, recordingState])

  const stopRecognition = useCallback(() => {
    shouldRestartRef.current = false
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    isListeningRef.current = false
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecognition()
    }
  }, [stopRecognition])

  return {
    startRecognition,
    stopRecognition,
    isListening: isListeningRef.current
  }
}

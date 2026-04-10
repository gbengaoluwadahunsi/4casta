'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Mic, MicOff, X, Send, Sparkles, Volume2, Navigation, Loader2, Brain } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VoiceCommand {
  command: string
  action: string
  keywords: string[]
}

const NAVIGATION_COMMANDS: VoiceCommand[] = [
  { command: 'Go to forecast', action: '/dashboard/forecast', keywords: ['forecast', 'prediction', 'predict'] },
  { command: 'Go to actuals', action: '/dashboard/actuals', keywords: ['actuals', 'actual', 'data', 'records'] },
  { command: 'Go to branches', action: '/dashboard/branches', keywords: ['branches', 'branch', 'locations'] },
  { command: 'Go to users', action: '/dashboard/users', keywords: ['users', 'team', 'members'] },
  { command: 'Go to settings', action: '/dashboard/settings', keywords: ['settings', 'config', 'preferences'] },
  { command: 'Go to dashboard', action: '/dashboard', keywords: ['dashboard', 'home', 'main'] },
  { command: 'Go to regions', action: '/dashboard/regions', keywords: ['regions', 'region', 'areas'] },
  { command: 'Go to activity', action: '/dashboard/activity', keywords: ['activity', 'log', 'history'] },
]

type KokoroTTS = unknown

const VOICES = ['af_heart', 'af_sky', 'af_alloy', 'am_adam', 'am_echo', 'am_onyx'] as const
type VoiceId = typeof VOICES[number]

export function VoiceAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [feedback, setFeedback] = useState('')
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([])
  const [chatInput, setChatInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null)
  const [isModelLoading, setIsModelLoading] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [modelLoaded, setModelLoaded] = useState(false)
  const [showVoiceOptions, setShowVoiceOptions] = useState(false)
  const [selectedVoice, setSelectedVoice] = useState<VoiceId>('af_heart')
  const [ttsInstance, setTtsInstance] = useState<KokoroTTS>(null)
  const audioRef = useRef<AudioContext | null>(null)

  const availableVoices = [
    { id: 'af_heart', name: 'Heart' },
    { id: 'af_sky', name: 'Sky' },
    { id: 'af_alloy', name: 'Alloy' },
    { id: 'am_adam', name: 'Adam' },
    { id: 'am_echo', name: 'Echo' },
    { id: 'am_onyx', name: 'Onyx' },
  ]

  const loadKokoroModel = useCallback(async () => {
    if (ttsInstance || isModelLoading) return
    
    setIsModelLoading(true)
    try {
      const { KokoroTTS } = await import('kokoro-js')
      const hasGPU = typeof navigator !== 'undefined' && 'gpu' in navigator
      const device = hasGPU ? 'webgpu' : 'wasm'
      const dtype = device === 'wasm' ? 'q8' : 'fp32'
      
      const tts = await KokoroTTS.from_pretrained(
        'onnx-community/Kokoro-82M-v1.0-ONNX',
        { dtype, device }
      )
      
      setTtsInstance(tts as KokoroTTS)
      setModelLoaded(true)
    } catch (error) {
      console.error('Failed to load Kokoro:', error)
    } finally {
      setIsModelLoading(false)
    }
  }, [ttsInstance, isModelLoading])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognitionClass = (window as unknown as { SpeechRecognition?: new () => SpeechRecognition, webkitSpeechRecognition?: new () => SpeechRecognition }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognition }).webkitSpeechRecognition
      if (SpeechRecognitionClass) {
        const recognitionInstance = new SpeechRecognitionClass()
        recognitionInstance.continuous = false
        recognitionInstance.interimResults = false
        recognitionInstance.lang = 'en-US'

        recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
          const result = event.results[0][0].transcript
          setTranscript(result)
          processVoiceCommand(result)
        }

        recognitionInstance.onend = () => {
          setIsListening(false)
        }

        recognitionInstance.onerror = () => {
          setIsListening(false)
          setFeedback('Sorry, I didn\'t catch that. Try again.')
        }

        setRecognition(recognitionInstance)
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.close()
      }
    }
  }, [])

  useEffect(() => {
    if (isOpen && !modelLoaded && !isModelLoading) {
      loadKokoroModel()
    }
  }, [isOpen, modelLoaded, isModelLoading, loadKokoroModel])

  const processVoiceCommand = (text: string) => {
    const lowerText = text.toLowerCase()
    
    for (const cmd of NAVIGATION_COMMANDS) {
      if (cmd.keywords.some(keyword => lowerText.includes(keyword))) {
        const msg = `Navigating to ${cmd.command}...`
        setFeedback(msg)
        speakText(msg)
        setTimeout(() => {
          window.location.href = cmd.action
        }, 1500)
        return
      }
    }

    if (lowerText.includes('help') || lowerText.includes('what can you do')) {
      const msg = 'I can navigate to: Forecast, Actuals, Branches, Users, Settings, Regions, Activity, or Dashboard. Just say "Go to [page]".'
      setFeedback(msg)
      speakText(msg)
      return
    }

    if (lowerText.includes('stop') || lowerText.includes('quiet') || lowerText.includes('silence')) {
      setIsSpeaking(false)
      setFeedback('Stopped speaking.')
      return
    }

    const msg = 'I didn\'t understand. Say "Help" for available commands.'
    setFeedback(msg)
    speakText(msg)
  }

  const toggleListening = () => {
    if (!recognition) {
      setFeedback('Voice recognition not supported in this browser.')
      return
    }

    if (isListening) {
      recognition.stop()
    } else {
      setTranscript('')
      setFeedback('')
      recognition.start()
      setIsListening(true)
    }
  }

  const speakText = async (text: string) => {
    if (isSpeaking) {
      setIsSpeaking(false)
      return
    }

    if (!modelLoaded || !ttsInstance) {
      if (!modelLoaded && !isModelLoading) {
        await loadKokoroModel()
      }
      if (!modelLoaded) {
        return
      }
    }

    setIsSpeaking(true)
    
    try {
      const { KokoroTTS } = await import('kokoro-js')
      const tts = ttsInstance as InstanceType<typeof KokoroTTS>
      const audio = await tts.generate(text, { 
        voice: selectedVoice,
        speed: 1.0 
      })
      if (audio) {
        try {
          (audio as { play?: () => void }).play?.()
        } catch {
          console.log('Audio generated but playback not available')
        }
      }
      
      setTimeout(() => {
        setIsSpeaking(false)
      }, 2000)
    } catch (error) {
      console.error('TTS Error:', error)
      setIsSpeaking(false)
    }
  }

  const handleChatSubmit = async () => {
    if (!chatInput.trim() || isProcessing) return
    
    const userMessage = chatInput.trim()
    setChatInput('')
    setIsProcessing(true)

    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }])

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      })
      
      if (response.ok) {
        const data = await response.json()
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.response }])
        speakText(data.response)
      } else {
        setChatMessages(prev => [...prev, { role: 'assistant', content: 'I\'m having trouble connecting. Please try again.' }])
      }
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'I\'m having trouble connecting. Please try again.' }])
    }

    setIsProcessing(false)
  }

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
        size="icon"
      >
        <div className="relative">
          <Sparkles className="w-6 h-6" />
          {modelLoaded && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
          )}
        </div>
        <span className="sr-only">Open AI Assistant</span>
      </Button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 max-w-[calc(100vw-3rem)] z-50">
          <Card className="bg-card/95 backdrop-blur-xl border-primary/20 shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                4casta AI
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  {isModelLoading ? (
                    <span className="flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Loading AI model...
                    </span>
                  ) : modelLoaded ? (
                    <span className="text-green-500">Kokoro TTS Ready</span>
                  ) : (
                    <span>AI model not loaded</span>
                  )}
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 text-xs"
                  onClick={() => setShowVoiceOptions(!showVoiceOptions)}
                >
                  Voice
                </Button>
              </div>

              {showVoiceOptions && (
                <div className="grid grid-cols-2 gap-2 p-2 bg-muted/30 rounded-lg">
                  {availableVoices.map((voice) => (
                    <Button
                      key={voice.id}
                      variant={selectedVoice === voice.id ? 'default' : 'ghost'}
                      size="sm"
                      className="text-xs"
                      onClick={() => setSelectedVoice(voice.id as VoiceId)}
                    >
                      {voice.name}
                    </Button>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                  <Button
                    onClick={toggleListening}
                    variant={isListening ? 'destructive' : 'outline'}
                    size="icon"
                    className={cn('w-10 h-10', isListening && 'animate-pulse')}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </Button>
                  <div className="flex-1">
                    {isListening ? (
                      <p className="text-sm text-primary animate-pulse">Listening...</p>
                    ) : transcript ? (
                      <p className="text-sm">{transcript}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Click mic and speak</p>
                    )}
                  </div>
                </div>
                {feedback && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/10 text-sm">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="w-6 h-6"
                      onClick={() => speakText(feedback)}
                    >
                      {isSpeaking ? <Volume2 className="w-4 h-4 text-primary" /> : <Volume2 className="w-4 h-4" />}
                    </Button>
                    <p>{feedback}</p>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <Navigation className="w-3 h-3" />
                  Try: "Go to forecast" or "Show my data"
                </p>
              </div>

              {chatMessages.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={cn(
                        'p-2 rounded-lg text-sm',
                        msg.role === 'user' ? 'bg-muted ml-4' : 'bg-primary/10 mr-4'
                      )}
                    >
                      {msg.content}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  placeholder="Ask about your data..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleChatSubmit()}
                />
                <Button onClick={handleChatSubmit} size="icon" disabled={isProcessing}>
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}

interface SpeechRecognitionEvent {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string
      }
    }
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start: () => void
  stop: () => void
}
'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Mic, Pause, Play, Trash2, StopCircle, Volume2, Settings } from 'lucide-react'
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"

export default function TranscriptAnalyzer() {
  const [recordingState, setRecordingState] = useState<'initial' | 'recording' | 'paused' | 'finished'>('initial')
  const [elapsedTime, setElapsedTime] = useState(0)
  const [streamToDoc, setStreamToDoc] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [selectedMicrophone, setSelectedMicrophone] = useState<MediaDeviceInfo | null>(null)
  const [availableMicrophones, setAvailableMicrophones] = useState<MediaDeviceInfo[]>([])
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [selectedLanguage, setSelectedLanguage] = useState('en-GB')
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [showAdditionalInstructions, setShowAdditionalInstructions] = useState(false)
  const [additionalInstructions, setAdditionalInstructions] = useState('')
  const [showAnalysisResults, setShowAnalysisResults] = useState(false)
  const [diagnosisSituation, setDiagnosisSituation] = useState('')
  const [treatmentGoal, setTreatmentGoal] = useState('')
  const [adjustReport, setAdjustReport] = useState('')

  const languages = [
    { code: 'en-GB', flag: '🇬🇧' },
    { code: 'en-US', flag: '🇺🇸' },
    { code: 'nl-NL', flag: '🇳🇱' },
    { code: 'fr-FR', flag: '🇫🇷' },
    { code: 'de-DE', flag: '🇩🇪' },
  ]

  useEffect(() => {
    if (recordingState === 'recording') {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [recordingState])

  useEffect(() => {
    const getAvailableMicrophones = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const microphones = devices.filter(device => device.kind === 'audioinput')
        setAvailableMicrophones(microphones)
        if (microphones.length > 0) {
          setSelectedMicrophone(microphones[0])
        }
      } catch (error) {
        console.error('Error getting microphones:', error)
      }
    }

    getAvailableMicrophones()
  }, [])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.addEventListener('timeupdate', handleTimeUpdate)
      audioRef.current.addEventListener('loadedmetadata', handleLoadedMetadata)
      audioRef.current.addEventListener('ended', handleEnded)
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('timeupdate', handleTimeUpdate)
        audioRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata)
        audioRef.current.removeEventListener('ended', handleEnded)
      }
    }
  }, [audioUrl])

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  const handleEnded = () => {
    setIsPlaying(false)
    setCurrentTime(0)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { deviceId: selectedMicrophone?.deviceId ? { exact: selectedMicrophone.deviceId } : undefined } 
      })
      mediaRecorderRef.current = new MediaRecorder(stream)
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        chunksRef.current = []
      }

      mediaRecorderRef.current.start()
      setRecordingState('recording')
      setElapsedTime(0)
    } catch (error) {
      console.error('Error starting recording:', error)
    }
  }

  const handlePauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause()
      setRecordingState('paused')
    }
  }

  const handleResumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume()
      setRecordingState('recording')
    }
  }

  const handleFinishRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      setRecordingState('finished')
    }
  }

  const handleDeleteRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
    }
    setRecordingState('initial')
    setElapsedTime(0)
    setAudioUrl(null)
    setCurrentTime(0)
    setDuration(0)
  }

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleSliderChange = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = (value[0] / 100) * duration
      setCurrentTime(audioRef.current.currentTime)
    }
  }


  const handleTemplateChange = (value: string) => {
    setSelectedTemplate(value)
    setShowAdditionalInstructions(true)
  }

  const handleGenerate = () => {
    setShowAnalysisResults(true)
  }

  const handleUpdate = () => {
    // Implement update logic here
    console.log('Update button clicked')
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="space-y-6 p-6">
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">Transcript</h2>
            {(recordingState === 'recording' || recordingState === 'paused') && (
              <div className="flex items-center text-sm text-red-500">
                <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                {formatTime(elapsedTime)}
              </div>
            )}
          </div>

          {recordingState === 'initial' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="language-select w-[60px] h-[38px] bg-gray-100 border rounded-md flex items-center justify-center">
                  <select 
                    className="opacity-0 absolute w-[60px] h-[38px] cursor-pointer"
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                  >
                    {languages.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.flag}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none text-2xl">{languages.find(lang => lang.code === selectedLanguage)?.flag}</span>
                </div>
                <Button 
                  onClick={handleStartRecording}
                  className="flex-1 bg-gray-900 text-white hover:bg-gray-800 rounded-md"
                >
                  <Mic className="mr-2 h-4 w-4" />
                  Start recording
                </Button>
              </div>
            </div>
          )}

          {(recordingState === 'recording' || recordingState === 'paused') && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  className="flex-1 rounded-md"
                  onClick={recordingState === 'recording' ? handlePauseRecording : handleResumeRecording}
                >
                  {recordingState === 'recording' ? (
                    <><Pause className="mr-2 h-4 w-4" /> Pause</>
                  ) : (
                    <><Play className="mr-2 h-4 w-4" /> Play</>
                  )}
                </Button>
                <Button 
                  className="flex-1 bg-gray-900 text-white hover:bg-gray-800 rounded-md"
                  onClick={handleFinishRecording}
                >
                  <StopCircle className="mr-2 h-4 w-4" />
                  Finish
                </Button>
              </div>
              <Button 
                variant="ghost" 
                className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 rounded-md"
                onClick={handleDeleteRecording}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete recording
              </Button>
            </div>
          )}

          {recordingState === 'finished' && audioUrl && (
            <div className="space-y-4">
              <div className="bg-gray-100 p-4 rounded-md space-y-2">
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={handlePlayPause}>
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Slider 
                    value={[currentTime]}
                    max={duration}
                    step={0.1}
                    className="flex-1"
                    onValueChange={handleSliderChange}
                  />
                  <Volume2 className="h-4 w-4 text-gray-500" />
                </div>
                <div className="text-xs text-gray-500 flex justify-between">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 rounded-md"
                onClick={handleDeleteRecording}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Recording
              </Button>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Switch
              id="stream"
              checked={streamToDoc}
              onCheckedChange={setStreamToDoc}
            />
            <Label htmlFor="stream" className="font-semibold">Stream to document</Label>
          </div>

          <Textarea
            placeholder="The transcript will be shown here"
            className="min-h-[120px]"
            readOnly
          />
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Analysis</h2>
          
          <Select onValueChange={handleTemplateChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select template..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="intake">Intake conversation</SelectItem>
              <SelectItem value="summary">Generic Summary</SelectItem>
              <SelectItem value="gp">Letter for GP</SelectItem>
              <SelectItem value="endTreatment">End Treatment</SelectItem>
              <SelectItem value="soep">SOEP</SelectItem>
            </SelectContent>
          </Select>

          {showAdditionalInstructions && (
            <div className="space-y-2">
              <Label htmlFor="additionalInstructions">Additional Instructions</Label>
              <Textarea
                id="additionalInstructions"
                placeholder="Enter additional instructions..."
                value={additionalInstructions}
                onChange={(e) => setAdditionalInstructions(e.target.value)}
              />
            </div>
          )}

          <Button variant="secondary" onClick={handleGenerate}>Generate</Button>

          {showAnalysisResults && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="diagnosisSituation">Diagnosis Situation</Label>
                <Textarea
                  id="diagnosisSituation"
                  value={diagnosisSituation}
                  onChange={(e) => setDiagnosisSituation(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="treatmentGoal">Treatment Goal</Label>
                <Textarea
                  id="treatmentGoal"
                  value={treatmentGoal}
                  onChange={(e) => setTreatmentGoal(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adjustReport">Adjust Report</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  <Button variant="secondary" size="sm" onClick={() => console.log('Make longer')}>Make longer</Button>
                  <Button variant="secondary" size="sm" onClick={() => console.log('Make shorter')}>Make shorter</Button>
                  <Button variant="secondary" size="sm" onClick={() => console.log('Less formal')}>Less formal</Button>
                  <Button variant="secondary" size="sm" onClick={() => console.log('Add quotes')}>Add quotes</Button>
                  <Button variant="secondary" size="sm" onClick={() => console.log('Add bulletpoints in treatment goal')}>Add bulletpoints in treatment goal</Button>
                </div>
                <Textarea
                  id="adjustReport"
                  placeholder="Pick an option from above or write your own."
                  value={adjustReport}
                  onChange={(e) => setAdjustReport(e.target.value)}
                />
              </div>
              <Button onClick={handleUpdate}>Update</Button>
            </div>
          )}
        </div>
      </CardContent>
      {audioUrl && <audio ref={audioRef} src={audioUrl} />}
    </Card>
  )
}


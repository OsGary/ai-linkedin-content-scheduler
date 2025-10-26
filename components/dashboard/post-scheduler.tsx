'use client'

import { useState } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  CalendarIcon,
  Clock,
  CheckCircle,
  AlertCircle,
  Zap,
  Timer,
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// Define post status types
type PostStatus = "idea" | "draft" | "scheduled" | "published" | "failed"

interface Post {
  id: string
  content: string
  status: PostStatus
  linkedinAccountId: string | null
  linkedinAccount?: {
    id: string
    firstName: string
    lastName: string
    email: string
  } | null
  scheduledAt: Date | null
  publishedAt: Date | null
  linkedinPostId: string | null
  aiGenerated: boolean
  aiPrompt: string | null
  variations: any
  errorReason: string | null
  retryCount: number
  createdAt: Date
  updatedAt: Date
}

interface PostSchedulerProps {
  post: Post
  onSchedule?: (postId: string, scheduledAt: Date) => void
  onPublish?: (postId: string) => void
  onUnschedule?: (postId: string) => void
}

interface ScheduledTimeSlot {
  id: string
  label: string
  description: string
  time: string // HH:MM format
  bestFor: string[]
}

const RECOMMENDED_TIMES: ScheduledTimeSlot[] = [
  {
    id: 'morning-commute',
    label: 'Morning Commute',
    description: 'High engagement during commute hours',
    time: '08:00',
    bestFor: ['Professional insights', 'Industry news', 'Motivational content']
  },
  {
    id: 'lunch-break',
    label: 'Lunch Break',
    description: 'Midday engagement peak',
    time: '12:00',
    bestFor: ['Quick tips', 'Polls', 'Company updates']
  },
  {
    id: 'afternoon-focus',
    label: 'Afternoon Focus',
    description: 'Work-related content performs well',
    time: '15:00',
    bestFor: ['Thought leadership', 'Technical content', 'Case studies']
  },
  {
    id: 'evening-winddown',
    label: 'Evening Wind-down',
    description: 'Relaxed engagement time',
    time: '18:00',
    bestFor: ['Personal stories', 'Reflections', 'Community highlights']
  },
]

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
]

export function PostScheduler({ post, onSchedule, onPublish, onUnschedule }: PostSchedulerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    post.scheduledAt ? new Date(post.scheduledAt) : undefined
  )
  const [selectedTime, setSelectedTime] = useState<string>(
    post.scheduledAt ? format(new Date(post.scheduledAt), 'HH:mm') : ''
  )
  const [selectedTimezone, setSelectedTimezone] = useState('America/New_York')
  const [isScheduling, setIsScheduling] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)

  const canSchedule = post.status === 'draft' || post.status === 'idea'
  const canPublish = post.status === 'draft' && !post.scheduledAt
  const canUnschedule = post.status === 'scheduled' && post.scheduledAt
  const isScheduled = post.status === 'scheduled' && post.scheduledAt

  const handleSchedule = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error('Please select both date and time')
      return
    }

    const scheduledDateTime = new Date(selectedDate)
    const [hours, minutes] = selectedTime.split(':').map(Number)
    scheduledDateTime.setHours(hours, minutes, 0, 0)

    // Validate that the scheduled time is in the future
    const now = new Date()
    if (scheduledDateTime <= now) {
      toast.error('Scheduled time must be in the future')
      return
    }

    setIsScheduling(true)
    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'scheduled',
          scheduledAt: scheduledDateTime.toISOString(),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to schedule post')
      }

      toast.success('Post scheduled successfully')
      setIsOpen(false)
      if (onSchedule) {
        onSchedule(post.id, scheduledDateTime)
      }
    } catch (error) {
      console.error('Error scheduling post:', error)
      toast.error('Failed to schedule post')
    } finally {
      setIsScheduling(false)
    }
  }

  const handlePublish = async () => {
    if (!confirm('Are you sure you want to publish this post now?')) {
      return
    }

    setIsPublishing(true)
    try {
      const response = await fetch(`/api/posts/${post.id}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to publish post')
      }

      toast.success('Post published successfully')
      if (onPublish) {
        onPublish(post.id)
      }
    } catch (error) {
      console.error('Error publishing post:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to publish post')
    } finally {
      setIsPublishing(false)
    }
  }

  const handleUnschedule = async () => {
    if (!confirm('Are you sure you want to unschedule this post? It will be moved back to draft.')) {
      return
    }

    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'draft',
          scheduledAt: null,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to unschedule post')
      }

      toast.success('Post unscheduled successfully')
      if (onUnschedule) {
        onUnschedule(post.id)
      }
    } catch (error) {
      console.error('Error unscheduling post:', error)
      toast.error('Failed to unschedule post')
    }
  }

  const handleQuickSchedule = (timeSlot: ScheduledTimeSlot) => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    setSelectedDate(tomorrow)
    setSelectedTime(timeSlot.time)
  }

  if (isScheduled && post.scheduledAt) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Timer className="h-4 w-4" />
              Scheduled for
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              Scheduled
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span>{format(new Date(post.scheduledAt), 'PPP')}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{format(new Date(post.scheduledAt), 'p')}</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleUnschedule}
              className="flex-1"
            >
              <AlertCircle className="h-3 w-3 mr-1" />
              Unschedule
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handlePublish}
              disabled={isPublishing}
              className="flex-1"
            >
              {isPublishing ? (
                <>
                  <Timer className="h-3 w-3 mr-1 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Zap className="h-3 w-3 mr-1" />
                  Publish Now
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Schedule Post</CardTitle>
          <div className="flex gap-1">
            {canPublish && (
              <Button
                variant="default"
                size="sm"
                onClick={handlePublish}
                disabled={isPublishing}
              >
                {isPublishing ? (
                  <Timer className="h-3 w-3 animate-spin" />
                ) : (
                  <Zap className="h-3 w-3" />
                )}
              </Button>
            )}
            {canSchedule && (
              <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <CalendarIcon className="h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4" align="end">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-sm mb-2">Schedule Post</h4>
                      <p className="text-xs text-muted-foreground">
                        Choose when to publish your post
                      </p>
                    </div>

                    {/* Quick Schedule Options */}
                    <div>
                      <Label className="text-xs font-medium">Quick Schedule</Label>
                      <div className="mt-2 space-y-2">
                        {RECOMMENDED_TIMES.map((timeSlot) => (
                          <Button
                            key={timeSlot.id}
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickSchedule(timeSlot)}
                            className="w-full justify-start h-auto p-2"
                          >
                            <div className="text-left">
                              <div className="font-medium text-xs">{timeSlot.label}</div>
                              <div className="text-xs text-muted-foreground">
                                {timeSlot.time} - {timeSlot.description}
                              </div>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Date/Time */}
                    <div className="border-t pt-4">
                      <Label className="text-xs font-medium">Custom Schedule</Label>
                      <div className="mt-2 space-y-3">
                        <div>
                          <Label className="text-xs">Date</Label>
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            disabled={(date) => date < new Date()}
                            className="rounded-md border"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Time</Label>
                            <Input
                              type="time"
                              value={selectedTime}
                              onChange={(e) => setSelectedTime(e.target.value)}
                              className="h-8 text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Timezone</Label>
                            <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {TIMEZONES.map((tz) => (
                                  <SelectItem key={tz.value} value={tz.value} className="text-xs">
                                    {tz.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Schedule Button */}
                    <Button
                      onClick={handleSchedule}
                      disabled={!selectedDate || !selectedTime || isScheduling}
                      className="w-full"
                      size="sm"
                    >
                      {isScheduling ? (
                        <>
                          <Timer className="h-3 w-3 mr-1 animate-spin" />
                          Scheduling...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Schedule Post
                        </>
                      )}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
      </CardHeader>

      {post.status === 'published' && (
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            Published successfully
          </div>
          {post.publishedAt && (
            <div className="text-xs text-muted-foreground">
              Published on {format(new Date(post.publishedAt), 'PPP at p')}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
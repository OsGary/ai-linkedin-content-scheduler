'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Bot,
  Save,
  X,
  Sparkles,
  RefreshCw,
  Copy,
  Calendar,
  Clock,
  User,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { PostScheduler } from './post-scheduler'

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

interface LinkedInAccount {
  id: string
  firstName: string
  lastName: string
  email: string
}

interface PostModalProps {
  isOpen: boolean
  onClose: () => void
  post: Post | null
  linkedinAccounts: LinkedInAccount[]
  onPostCreated?: (post: Post) => void
  onPostUpdated?: (post: Post) => void
}

// Form validation schema
const postSchema = z.object({
  content: z.string()
    .min(1, 'Post content is required')
    .max(3000, 'Post content must be less than 3000 characters'),
  status: z.enum(['idea', 'draft', 'scheduled', 'published']),
  linkedinAccountId: z.string().nullable(),
  scheduledAt: z.string().nullable(),
})

type PostFormData = z.infer<typeof postSchema>

export function PostModal({
  isOpen,
  onClose,
  post,
  linkedinAccounts,
  onPostCreated,
  onPostUpdated,
}: PostModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [activeTab, setActiveTab] = useState('content')

  const isEditing = !!post

  const form = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      content: post?.content || '',
      status: post?.status || 'idea',
      linkedinAccountId: post?.linkedinAccountId || null,
      scheduledAt: post?.scheduledAt ?
        new Date(post.scheduledAt).toISOString().slice(0, 16) : null,
    },
  })

  const watchStatus = form.watch('status')
  const watchContent = form.watch('content')

  // Update form when post changes
  useEffect(() => {
    if (post) {
      form.reset({
        content: post.content,
        status: post.status,
        linkedinAccountId: post.linkedinAccountId,
        scheduledAt: post.scheduledAt ?
          new Date(post.scheduledAt).toISOString().slice(0, 16) : null,
      })
    } else {
      form.reset({
        content: '',
        status: 'idea',
        linkedinAccountId: linkedinAccounts[0]?.id || null,
        scheduledAt: null,
      })
    }
  }, [post, form, linkedinAccounts])

  const generateAIContent = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please enter a prompt for AI generation')
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: aiPrompt,
          tone: 'professional', // Could be configurable
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate content')
      }

      const data = await response.json()
      form.setValue('content', data.content)
      toast.success('Content generated successfully')
    } catch (error) {
      console.error('Error generating content:', error)
      toast.error('Failed to generate content')
    } finally {
      setIsGenerating(false)
    }
  }

  const generateVariations = async () => {
    if (!watchContent.trim()) {
      toast.error('Please enter content first')
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch('/api/ai/variations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: watchContent,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate variations')
      }

      const data = await response.json()
      form.setValue('content', data.variations[0]) // Use first variation
      toast.success('Content variation generated')
    } catch (error) {
      console.error('Error generating variations:', error)
      toast.error('Failed to generate variations')
    } finally {
      setIsGenerating(false)
    }
  }

  const copyContent = async () => {
    try {
      await navigator.clipboard.writeText(watchContent)
      toast.success('Content copied to clipboard')
    } catch (error) {
      toast.error('Failed to copy content')
    }
  }

  const handleSubmit = async (data: PostFormData) => {
    setIsSubmitting(true)
    try {
      let response
      let url = '/api/posts'
      let method = 'POST'

      if (isEditing && post) {
        url = `/api/posts/${post.id}`
        method = 'PATCH'
      }

      const payload = {
        content: data.content,
        status: data.status,
        linkedinAccountId: data.linkedinAccountId,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt).toISOString() : null,
      }

      response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save post')
      }

      const savedPost = await response.json()

      if (isEditing && onPostUpdated) {
        onPostUpdated(savedPost.post)
      } else if (!isEditing && onPostCreated) {
        onPostCreated(savedPost.post)
      }

      toast.success(isEditing ? 'Post updated successfully' : 'Post created successfully')
      onClose()
      form.reset()
    } catch (error) {
      console.error('Error saving post:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save post')
    } finally {
      setIsSubmitting(false)
    }
  }

  const contentLength = watchContent.length
  const isContentTooLong = contentLength > 3000

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? 'Edit Post' : 'Create New Post'}
            {post?.aiGenerated && (
              <Badge variant="outline" className="text-xs">
                <Bot className="h-3 w-3 mr-1" />
                AI
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="ai">AI Assistant</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-4">
              {/* Content Input */}
              <div className="space-y-2">
                <Label htmlFor="content">Post Content</Label>
                <Textarea
                  id="content"
                  {...form.register('content')}
                  placeholder="Write your LinkedIn post content here..."
                  className="min-h-[120px] resize-none"
                  rows={6}
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {contentLength}/3000 characters
                    {isContentTooLong && (
                      <span className="text-destructive ml-2">
                        (Content too long for LinkedIn)
                      </span>
                    )}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={copyContent}
                    disabled={!watchContent.trim()}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                </div>
              </div>

              {/* Status and Account */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={watchStatus}
                    onValueChange={(value) => form.setValue('status', value as PostStatus)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="idea">Idea</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="linkedinAccount">LinkedIn Account</Label>
                  <Select
                    value={form.getValues('linkedinAccountId') || ''}
                    onValueChange={(value) => form.setValue('linkedinAccountId', value || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {linkedinAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.firstName} {account.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Scheduled Date (shown only for scheduled status) */}
              {watchStatus === 'scheduled' && (
                <div className="space-y-2">
                  <Label htmlFor="scheduledAt">Schedule Date & Time</Label>
                  <Input
                    id="scheduledAt"
                    type="datetime-local"
                    {...form.register('scheduledAt')}
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>
              )}

              {/* Preview */}
              {watchContent && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Preview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm whitespace-pre-wrap">
                      {watchContent}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="ai" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    AI Content Generation
                  </CardTitle>
                  <CardDescription>
                    Use AI to generate content or variations of your existing content
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Generate from prompt */}
                  <div className="space-y-2">
                    <Label htmlFor="aiPrompt">AI Prompt</Label>
                    <Textarea
                      id="aiPrompt"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="Describe what kind of LinkedIn post you want to create..."
                      className="min-h-[80px]"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={generateAIContent}
                      disabled={isGenerating || !aiPrompt.trim()}
                      className="w-full"
                    >
                      {isGenerating ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Bot className="h-4 w-4 mr-2" />
                          Generate Content
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>

                  {/* Generate variations */}
                  <div className="space-y-2">
                    <Label>Generate Variations</Label>
                    <p className="text-sm text-muted-foreground">
                      Generate alternative versions of your existing content
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={generateVariations}
                      disabled={isGenerating || !watchContent.trim()}
                      className="w-full"
                    >
                      {isGenerating ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Create Variations
                        </>
                      )}
                    </Button>
                  </div>

                  {/* AI Tips */}
                  <div className="bg-muted/50 rounded-lg p-3">
                    <h4 className="font-medium text-sm mb-2">AI Tips:</h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Be specific in your prompts for better results</li>
                      <li>• Mention your target audience and tone</li>
                      <li>• Include key topics or themes you want to cover</li>
                      <li>• Ask for specific post types (e.g., "thought leadership", "announcement")</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="schedule" className="space-y-4">
              <PostScheduler
                post={{
                  id: post?.id || '',
                  content: watchContent,
                  status: watchStatus,
                  linkedinAccountId: form.getValues('linkedinAccountId'),
                  scheduledAt: post?.scheduledAt,
                  publishedAt: post?.publishedAt,
                  linkedinPostId: post?.linkedinPostId,
                  aiGenerated: post?.aiGenerated || false,
                  aiPrompt: post?.aiPrompt || null,
                  variations: post?.variations || null,
                  errorReason: post?.errorReason || null,
                  retryCount: post?.retryCount || 0,
                  createdAt: post?.createdAt || new Date(),
                  updatedAt: post?.updatedAt || new Date(),
                }}
                onSchedule={(postId, scheduledAt) => {
                  form.setValue('status', 'scheduled')
                  form.setValue('scheduledAt', scheduledAt.toISOString().slice(0, 16))
                  toast.success('Post scheduled successfully')
                }}
                onPublish={(postId) => {
                  form.setValue('status', 'published')
                  toast.success('Post published successfully')
                }}
                onUnschedule={(postId) => {
                  form.setValue('status', 'draft')
                  form.setValue('scheduledAt', null)
                  toast.success('Post unscheduled')
                }}
              />
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isContentTooLong || !watchContent.trim()}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isEditing ? 'Update' : 'Create'} Post
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
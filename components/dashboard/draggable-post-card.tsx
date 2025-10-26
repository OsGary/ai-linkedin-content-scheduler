'use client'

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  MoreHorizontal,
  Edit,
  Copy,
  Trash2,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Bot,
  ExternalLink,
  GripVertical
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
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

interface DraggablePostCardProps {
  post: Post
  onEdit?: (post: Post) => void
}

const getStatusIcon = (status: PostStatus) => {
  switch (status) {
    case 'idea':
      return <Bot className="h-4 w-4" />
    case 'draft':
      return <Edit className="h-4 w-4" />
    case 'scheduled':
      return <Calendar className="h-4 w-4" />
    case 'published':
      return <CheckCircle className="h-4 w-4" />
    case 'failed':
      return <AlertCircle className="h-4 w-4" />
    default:
      return null
  }
}

const getStatusColor = (status: PostStatus) => {
  switch (status) {
    case 'idea':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'draft':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'scheduled':
      return 'bg-purple-100 text-purple-800 border-purple-200'
    case 'published':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'failed':
      return 'bg-red-100 text-red-800 border-red-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

const formatContent = (content: string, maxLength: number = 150) => {
  if (content.length <= maxLength) return content
  return content.substring(0, maxLength) + '...'
}

export function DraggablePostCard({ post, onEdit }: DraggablePostCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const isLongContent = post.content.length > 150

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: post.id,
    animateLayoutChanges: () => false,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(post.content)
      toast.success('Post content copied to clipboard')
    } catch (error) {
      toast.error('Failed to copy content')
    }
  }

  const handleEdit = () => {
    if (onEdit) {
      onEdit(post)
    } else {
      toast.info('Edit functionality not available')
    }
  }

  const handleDelete = async () => {
    // Will be implemented with API call
    if (confirm('Are you sure you want to delete this post?')) {
      toast.info('Delete functionality coming soon!')
    }
  }

  const handleOpenLinkedIn = () => {
    if (post.linkedinPostId) {
      window.open(`https://www.linkedin.com/posts/${post.linkedinPostId}`, '_blank')
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group"
    >
      <Card className="group-hover:shadow-md transition-all duration-200 cursor-move hover:scale-[1.02]">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            {/* Drag Handle */}
            <div
              {...attributes}
              {...listeners}
              className="flex items-center gap-2 cursor-grab active:cursor-grabbing"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
            </div>

            <div className="flex items-center gap-2 flex-1">
              <Badge
                variant="secondary"
                className={cn('text-xs gap-1', getStatusColor(post.status))}
              >
                {getStatusIcon(post.status)}
                {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
              </Badge>
              {post.aiGenerated && (
                <Badge variant="outline" className="text-xs">
                  <Bot className="h-3 w-3 mr-1" />
                  AI
                </Badge>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopy}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Content
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {post.status === 'published' && post.linkedinPostId && (
                  <DropdownMenuItem onClick={handleOpenLinkedIn}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View on LinkedIn
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="space-y-3">
            {/* Content */}
            <div className="text-sm leading-relaxed">
              {isExpanded ? post.content : formatContent(post.content)}
              {isLongContent && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-xs text-muted-foreground hover:text-foreground mt-1 block"
                >
                  {isExpanded ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>

            {/* Metadata */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              </div>

              {post.scheduledAt && post.status === 'scheduled' && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(post.scheduledAt).toLocaleDateString()}
                </div>
              )}

              {post.publishedAt && post.status === 'published' && (
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Published
                </div>
              )}
            </div>

            {/* LinkedIn Account */}
            {post.linkedinAccount && (
              <div className="text-xs text-muted-foreground">
                Account: {post.linkedinAccount.firstName} {post.linkedinAccount.lastName}
              </div>
            )}

            {/* Error Status */}
            {post.status === 'failed' && post.errorReason && (
              <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                <AlertCircle className="h-3 w-3 inline mr-1" />
                {post.errorReason}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
'use client'

import { PostCard } from './post-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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

interface DashboardColumnProps {
  id: string
  title: string
  color: string
  posts: Post[]
  onPostMove: (postId: string, newStatus: PostStatus) => void
}

const getColorClasses = (color: string) => {
  switch (color) {
    case 'blue':
      return {
        header: 'bg-blue-50 border-blue-200',
        title: 'text-blue-700',
        badge: 'bg-blue-100 text-blue-800',
      }
    case 'yellow':
      return {
        header: 'bg-yellow-50 border-yellow-200',
        title: 'text-yellow-700',
        badge: 'bg-yellow-100 text-yellow-800',
      }
    case 'purple':
      return {
        header: 'bg-purple-50 border-purple-200',
        title: 'text-purple-700',
        badge: 'bg-purple-100 text-purple-800',
      }
    case 'green':
      return {
        header: 'bg-green-50 border-green-200',
        title: 'text-green-700',
        badge: 'bg-green-100 text-green-800',
      }
    default:
      return {
        header: 'bg-gray-50 border-gray-200',
        title: 'text-gray-700',
        badge: 'bg-gray-100 text-gray-800',
      }
  }
}

export function DashboardColumn({ id, title, color, posts, onPostMove }: DashboardColumnProps) {
  const colorClasses = getColorClasses(color)
  const postCount = posts.length

  return (
    <Card className={cn('flex flex-col h-full min-h-[400px]', 'border-2')}>
      <CardHeader className={cn('pb-3', colorClasses.header, 'border-b')}>
        <div className="flex items-center justify-between">
          <CardTitle className={cn('text-base font-semibold', colorClasses.title)}>
            {title}
          </CardTitle>
          <Badge variant="secondary" className={cn('text-xs', colorClasses.badge)}>
            {postCount}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-3 space-y-3 overflow-y-auto">
        {posts.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-muted-foreground text-sm border-2 border-dashed border-muted-foreground/20 rounded-lg">
            No posts
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onMove={(newStatus) => onPostMove(post.id, newStatus)}
            />
          ))
        )}
      </CardContent>
    </Card>
  )
}
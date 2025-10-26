'use client'

import { useState, useEffect } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { DraggableColumn } from './draggable-column'
import { DraggablePostCard } from './draggable-post-card'
import { PostModal } from './post-modal'
import { Button } from '@/components/ui/button'
import { PlusIcon, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

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

interface PostsByStatus {
  idea: Post[]
  draft: Post[]
  scheduled: Post[]
  published: Post[]
}

interface LinkedInAccount {
  id: string
  firstName: string
  lastName: string
  email: string
}

interface DashboardStats {
  total: number
  ideas: number
  drafts: number
  scheduled: number
  published: number
}

interface DraggableDashboardBoardProps {
  initialPosts: PostsByStatus
  stats: DashboardStats
}

const COLUMNS = [
  { id: 'idea', title: 'Ideas', color: 'blue' },
  { id: 'draft', title: 'Drafts', color: 'yellow' },
  { id: 'scheduled', title: 'Scheduled', color: 'purple' },
  { id: 'published', title: 'Published', color: 'green' },
] as const

export function DraggableDashboardBoard({ initialPosts, stats }: DraggableDashboardBoardProps) {
  const [posts, setPosts] = useState<PostsByStatus>(initialPosts)
  const [isLoading, setIsLoading] = useState(false)
  const [activePost, setActivePost] = useState<Post | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPost, setEditingPost] = useState<Post | null>(null)
  const [linkedinAccounts, setLinkedinAccounts] = useState<LinkedInAccount[]>([])
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false)

  // Update posts when initialPosts changes
  useEffect(() => {
    setPosts(initialPosts)
  }, [initialPosts])

  // Fetch LinkedIn accounts on component mount
  useEffect(() => {
    fetchLinkedInAccounts()
  }, [])

  const fetchLinkedInAccounts = async () => {
    setIsLoadingAccounts(true)
    try {
      const response = await fetch('/api/linkedin/accounts')
      if (!response.ok) {
        throw new Error('Failed to fetch LinkedIn accounts')
      }
      const data = await response.json()
      setLinkedinAccounts(data.accounts || [])
    } catch (error) {
      console.error('Error fetching LinkedIn accounts:', error)
      // Don't show toast for this error as it's not critical
    } finally {
      setIsLoadingAccounts(false)
    }
  }

  // Set up dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const refreshPosts = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/posts')
      if (!response.ok) {
        throw new Error('Failed to fetch posts')
      }
      const data = await response.json()

      // Group posts by status
      const updatedPosts = {
        idea: data.posts.filter((post: Post) => post.status === 'idea'),
        draft: data.posts.filter((post: Post) => post.status === 'draft'),
        scheduled: data.posts.filter((post: Post) => post.status === 'scheduled'),
        published: data.posts.filter((post: Post) => post.status === 'published'),
      }

      setPosts(updatedPosts)
      toast.success('Posts refreshed successfully')
    } catch (error) {
      console.error('Error refreshing posts:', error)
      toast.error('Failed to refresh posts')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePostMove = async (postId: string, newStatus: PostStatus) => {
    // Optimistic update
    const oldPosts = { ...posts }

    // Find the post and move it
    const postToMove = Object.values(oldPosts).flat().find(post => post.id === postId)
    if (!postToMove) return

    // Remove post from old status
    const oldStatus = postToMove.status
    const updatedPosts = { ...posts }
    updatedPosts[oldStatus] = updatedPosts[oldStatus].filter(post => post.id !== postId)

    // Add post to new status
    const updatedPost = { ...postToMove, status: newStatus }
    updatedPosts[newStatus] = [...updatedPosts[newStatus], updatedPost]

    setPosts(updatedPosts)

    try {
      // Make API call to update post
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update post status')
      }

      toast.success(`Post moved to ${newStatus}`)
    } catch (error) {
      // Revert on error
      console.error('Error moving post:', error)
      setPosts(oldPosts)
      toast.error('Failed to move post')
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const postId = active.id as string

    // Find the post being dragged
    const draggedPost = Object.values(posts).flat().find(post => post.id === postId)
    setActivePost(draggedPost || null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) {
      setActivePost(null)
      return
    }

    const postId = active.id as string
    const newStatus = over.id as PostStatus

    // Check if the post is being moved to a different column
    const draggedPost = Object.values(posts).flat().find(post => post.id === postId)
    if (draggedPost && draggedPost.status !== newStatus) {
      handlePostMove(postId, newStatus)
    }

    setActivePost(null)
  }

  const handleAddNewPost = () => {
    setEditingPost(null)
    setIsModalOpen(true)
  }

  const handleEditPost = (post: Post) => {
    setEditingPost(post)
    setIsModalOpen(true)
  }

  const handlePostCreated = (newPost: Post) => {
    // Add the new post to the appropriate status column
    setPosts(prevPosts => ({
      ...prevPosts,
      [newPost.status]: [...prevPosts[newPost.status], newPost]
    }))
  }

  const handlePostUpdated = (updatedPost: Post) => {
    // Update the post in the current state
    setPosts(prevPosts => {
      const newPosts = { ...prevPosts }

      // Remove post from all status columns
      Object.keys(newPosts).forEach(status => {
        newPosts[status as keyof PostsByStatus] = newPosts[status as keyof PostsByStatus].filter(
          post => post.id !== updatedPost.id
        )
      })

      // Add updated post to its new status column
      newPosts[updatedPost.status] = [...newPosts[updatedPost.status], updatedPost]

      return newPosts
    })
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingPost(null)
  }

  return (
    <div className="space-y-6">
      {/* Board Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Content Board</h2>
          <p className="text-sm text-muted-foreground">
            Drag and drop posts to move them between stages
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshPosts}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={handleAddNewPost}>
            <PlusIcon className="h-4 w-4 mr-2" />
            New Post
          </Button>
        </div>
      </div>

      {/* Drag and Drop Context */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Swimlane Board */}
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
          {COLUMNS.map((column) => (
            <DraggableColumn
              key={column.id}
              id={column.id}
              title={column.title}
              color={column.color}
              posts={posts[column.id as keyof PostsByStatus]}
              onEditPost={handleEditPost}
            />
          ))}
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activePost ? (
            <div className="transform rotate-3 opacity-90">
              <DraggablePostCard
                post={activePost}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Empty State */}
      {stats.total === 0 && (
        <div className="text-center py-12 bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/20">
          <h3 className="text-lg font-medium mb-2">No posts yet</h3>
          <p className="text-muted-foreground mb-4">
            Start by creating your first post idea
          </p>
          <Button onClick={handleAddNewPost}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Create First Post
          </Button>
        </div>
      )}

      {/* Post Modal */}
      <PostModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        post={editingPost}
        linkedinAccounts={linkedinAccounts}
        onPostCreated={handlePostCreated}
        onPostUpdated={handlePostUpdated}
      />
    </div>
  )
}
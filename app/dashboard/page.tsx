import { auth } from "@/lib/auth"
import { db } from "@/db"
import { posts } from "@/db/schema/content"
import { eq, desc } from "drizzle-orm"
import { LinkedInAccountManager } from "@/components/linkedin-account-manager"
import { DraggableDashboardBoard } from "@/components/dashboard/draggable-board"
import { Button } from "@/components/ui/button"
import { PlusIcon, RefreshCw } from "lucide-react"

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

export default async function DashboardPage() {
  // Fetch posts server-side
  let userPosts: Post[] = []
  let error: string | null = null

  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user?.id) {
      return (
        <div className="@container/main flex flex-1 flex-col gap-6 p-4 lg:p-6">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
            <p className="text-muted-foreground">Please sign in to access your dashboard.</p>
          </div>
        </div>
      )
    }

    userPosts = await db.query.posts.findMany({
      where: eq(posts.userId, session.user.id),
      orderBy: [desc(posts.updatedAt)],
      with: {
        linkedinAccount: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    // Remove sensitive data and format posts
    const safePosts = userPosts.map(post => ({
      id: post.id,
      content: post.content,
      status: post.status,
      linkedinAccountId: post.linkedinAccountId,
      linkedinAccount: post.linkedinAccount,
      scheduledAt: post.scheduledAt,
      publishedAt: post.publishedAt,
      linkedinPostId: post.linkedinPostId,
      aiGenerated: post.aiGenerated,
      aiPrompt: post.aiPrompt,
      variations: post.variations,
      errorReason: post.errorReason,
      retryCount: post.retryCount,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    }))

    userPosts = safePosts
  } catch (err) {
    console.error("Error fetching posts:", err)
    error = "Failed to load posts. Please try again."
  }

  // Group posts by status
  const postsByStatus = {
    idea: userPosts.filter(post => post.status === 'idea'),
    draft: userPosts.filter(post => post.status === 'draft'),
    scheduled: userPosts.filter(post => post.status === 'scheduled'),
    published: userPosts.filter(post => post.status === 'published'),
  }

  // Get post counts for stats
  const stats = {
    total: userPosts.length,
    ideas: postsByStatus.idea.length,
    drafts: postsByStatus.draft.length,
    scheduled: postsByStatus.scheduled.length,
    published: postsByStatus.published.length,
  }

  return (
    <div className="@container/main flex flex-1 flex-col gap-6 p-4 lg:p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">LinkedIn Content Scheduler</h1>
            <p className="text-muted-foreground mt-2">
              Manage your LinkedIn content creation and publishing workflow
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button size="sm">
              <PlusIcon className="h-4 w-4 mr-2" />
              New Post
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Posts</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="text-2xl font-bold">{stats.ideas}</div>
            <div className="text-sm text-muted-foreground">Ideas</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="text-2xl font-bold">{stats.drafts}</div>
            <div className="text-sm text-muted-foreground">Drafts</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="text-2xl font-bold">{stats.scheduled}</div>
            <div className="text-sm text-muted-foreground">Scheduled</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="text-2xl font-bold">{stats.published}</div>
            <div className="text-sm text-muted-foreground">Published</div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-4">
          {/* LinkedIn Account Manager - takes 1 column on large screens */}
          <div className="lg:col-span-1">
            <LinkedInAccountManager />
          </div>

          {/* Swimlane Board - takes 3 columns on large screens */}
          <div className="lg:col-span-3">
            {error ? (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center">
                <h3 className="text-lg font-medium text-destructive mb-2">Error Loading Posts</h3>
                <p className="text-muted-foreground mb-4">{error}</p>
                <Button variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            ) : (
              <DraggableDashboardBoard
                initialPosts={postsByStatus}
                stats={stats}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
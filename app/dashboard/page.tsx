import { LinkedInAccountManager } from "@/components/linkedin-account-manager"

export default function Page() {
  return (
    <div className="@container/main flex flex-1 flex-col gap-6 p-4 lg:p-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">LinkedIn Content Scheduler</h1>
          <p className="text-muted-foreground mt-2">
            Manage your LinkedIn content creation and publishing workflow
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          <LinkedInAccountManager />

          {/* Placeholder for future components */}
          <div className="space-y-6">
            {/* Quick stats will go here */}
            <div className="text-center text-muted-foreground">
              <p>Post statistics and analytics coming soon...</p>
            </div>
          </div>
        </div>

        {/* Content management area will be added in next steps */}
        <div className="text-center py-12 text-muted-foreground">
          <h3 className="text-lg font-medium mb-2">Content Management</h3>
          <p>Drag-and-drop post management interface will be added in the next phase</p>
        </div>
      </div>
    </div>
  )
}
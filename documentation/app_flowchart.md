flowchart TD
  Start[Start ] --> Auth[User authentication]
  Auth --> Dashboard[Load dashboard]
  Dashboard --> Connect[Connect LinkedIn]
  Connect --> Store[Store OAuth tokens]
  Store --> Dashboard
  Dashboard --> Generate[Generate AI content]
  Generate --> AIReq[Call AI API
lib/openai]
  AIReq --> AIRes[Receive content]
  AIRes --> Dashboard
  Dashboard --> Edit[Open post editor]
  Edit --> Save[Save draft]
  Save --> Dashboard
  Dashboard --> Schedule[Schedule post]
  Schedule --> Update[Update status
to scheduled]
  Update --> Dashboard
  subgraph CronJob
    CronStart[Vercel Cron Job
/api/cron/publish]
    CronStart --> Fetch[Fetch scheduled posts]
    Fetch --> Publish[Publish to LinkedIn
lib/linkedin]
    Publish --> Done[Done]
  end
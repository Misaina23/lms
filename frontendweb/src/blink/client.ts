import { createClient } from '@blinkdotnew/sdk'

export const blink = createClient({
  projectId: process.env.NEXT_PUBLIC_BLINK_PROJECT_ID || 'lycee-admin-pro-rrm2ym7b',
  publishableKey: process.env.NEXT_PUBLIC_BLINK_PUBLISHABLE_KEY || 'blnk_pk_qQ8ds5-JT4oiE2Zvvr549L0fyE4BIxkp',
  authRequired: false,
  auth: { mode: 'managed' },
})

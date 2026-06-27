import { withAuth } from "next-auth/middleware"

export default withAuth({
  pages: {
    signIn: '/login',
  },
})

// Protect all routes except the login page, API webhooks, and public assets
export const config = {
    matcher: [
        "/((?!login|api/webhooks|api/twilio|_next/static|_next/image|favicon.ico).*)",
    ]
}

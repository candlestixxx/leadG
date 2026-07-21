// Auth middleware temporarily disabled for local dev without PostgreSQL
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  return NextResponse.next()
}

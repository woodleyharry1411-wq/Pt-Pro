import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll()      { return request.cookies.getAll(); },
        setAll(toSet) {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const isDashboard = request.nextUrl.pathname.startsWith("/trainer/dashboard");
  const isLogin     = request.nextUrl.pathname === "/trainer/login";

  if (isDashboard && !user) {
    return NextResponse.redirect(new URL("/trainer/login", request.url));
  }

  if (isLogin && user) {
    return NextResponse.redirect(new URL("/trainer/dashboard", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/trainer/:path*"],
};

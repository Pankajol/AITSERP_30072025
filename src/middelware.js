import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

// ✅ Role to allowed routes mapping
const ROLE_ROUTES = {
  Admin: ["/", "/users", "/admin", "/admin/:path*"],
  Employee: ["/", "/tasks", "/customer-dashboard", "/customer-dashboard/:path*"],
  "Sales Manager": ["/", "/agent-dashboard", "/agent-dashboard/:path*"],
  "Purchase Manager": ["/", "/supplier-dashboard", "/supplier-dashboard/:path*"],
  "Inventory Manager": ["/", "/inventory-dashboard", "/inventory-dashboard/:path*"],
  "Accounts Manager": ["/", "/accounts-dashboard", "/accounts-dashboard/:path*"],
  "HR Manager": ["/", "/hr-dashboard", "/hr-dashboard/:path*"],
  "Support Executive": ["/", "/support-dashboard", "/support-dashboard/:path*"],
  "Production Head": ["/", "/production-dashboard", "/production-dashboard/:path*"],
  "Project Manager": ["/", "/project-dashboard", "/project-dashboard/:path*"],
};

export function middleware(request) {
  const token = request.cookies.get("token")?.value;

  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = "/signin";
    return NextResponse.redirect(url);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ Roles is an array
    const roles = decoded.roles || [];

    const { pathname } = request.nextUrl;

    // ✅ If user has multiple roles → merge all allowed routes
    const allowedRoutes = roles.flatMap((role) => ROLE_ROUTES[role] || []);

    if (allowedRoutes.length === 0) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }

    const allowed = allowedRoutes.some((route) =>
      pathname.startsWith(route.replace(":path*", ""))
    );

    if (!allowed) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }

    return NextResponse.next();
  } catch (err) {
    console.error("JWT verification failed:", err);
    const url = request.nextUrl.clone();
    url.pathname = "/signin";
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: [
    "/",
    "/users/:path*",
    "/admin/:path*",
    "/tasks/:path*",
    "/customer-dashboard/:path*",
    "/agent-dashboard/:path*",
    "/supplier-dashboard/:path*",
    "/inventory-dashboard/:path*",
    "/accounts-dashboard/:path*",
    "/hr-dashboard/:path*",
    "/support-dashboard/:path*",
    "/production-dashboard/:path*",
    "/project-dashboard/:path*",
  ],
};



// import { NextResponse } from 'next/server';

// export function middleware(request) {
//   const token = request.cookies.get('token')?.value;

//   if (!token) {
//     const url = request.nextUrl.clone();
//     url.pathname = '/signin'; // Redirect to sign-in page if token is missing
//     return NextResponse.redirect(url);
//   }

//   return NextResponse.next();
// }

// export const config = {
//   matcher: ['/','/users/:path*','/admin/:path*', '/customer-dashboard/:path*', '/agent-dashboard/:path*', '/supplier-dashboard/:path*'],
// };

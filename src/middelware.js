import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const ROLE_ROUTES = {
  Admin: ["/", "/admin"],
  Employee: ["/", "/tasks"],
  "Sales Manager": ["/", "/agent-dashboard", "/admin"],
  "Purchase Manager": ["/", "/supplier-dashboard", "/admin"],
  "Inventory Manager": ["/", "/inventory-dashboard", "/admin"],
  "Accounts Manager": ["/", "/accounts-dashboard", "/admin"],
  "HR Manager": ["/", "/hr-dashboard", "/admin"],
  "Support Executive": ["/", "/support-dashboard", "/admin"],
  "Production Head": ["/", "/production-dashboard", "/admin"],
  "Project Manager": ["/", "/project-dashboard", "/admin"],
};

export function middleware(request) {
  const token = request.cookies.get("token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { pathname } = request.nextUrl;

    // Public routes allow
    if (
      pathname.startsWith("/signin") ||
      pathname.startsWith("/unauthorized")
    ) {
      return NextResponse.next();
    }

    // Always allow API if logged in
    if (pathname.startsWith("/api")) {
      return NextResponse.next();
    }

    // 🔥 Support BOTH structures
    const rolesArray =
      Array.isArray(decoded.roles)
        ? decoded.roles
        : decoded.role
        ? [decoded.role]
        : [];

    if (rolesArray.length === 0) {
      return NextResponse.redirect(
        new URL("/unauthorized", request.url)
      );
    }

    // Collect allowed routes from all roles
    const allowedRoutes = rolesArray.flatMap(
      (role) => ROLE_ROUTES[role] || []
    );

    const allowed = allowedRoutes.some((route) =>
      pathname.startsWith(route)
    );

    if (!allowed) {
      return NextResponse.redirect(
        new URL("/unauthorized", request.url)
      );
    }

    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/signin", request.url));
  }
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/agent-dashboard/:path*",
    "/supplier-dashboard/:path*",
    "/inventory-dashboard/:path*",
    "/accounts-dashboard/:path*",
    "/hr-dashboard/:path*",
    "/support-dashboard/:path*",
    "/production-dashboard/:path*",
    "/project-dashboard/:path*",
    "/tasks/:path*",
    "/api/:path*",
  ],
};


// import { NextResponse } from "next/server";
// import jwt from "jsonwebtoken";

// // ✅ Role to allowed routes mapping (Company Users)
// const ROLE_ROUTES = {
//   Admin: ["/", "/users", "/admin", "/admin/:path*"],
//   Employee: ["/", "/tasks", "/customer-dashboard", "/customer-dashboard/:path*"],
//   "Sales Manager": ["/", "/agent-dashboard", "/agent-dashboard/:path*"],
//   "Purchase Manager": ["/", "/supplier-dashboard", "/supplier-dashboard/:path*"],
//   "Inventory Manager": ["/", "/inventory-dashboard", "/inventory-dashboard/:path*"],
//   "Accounts Manager": ["/", "/accounts-dashboard", "/accounts-dashboard/:path*"],
//   "HR Manager": ["/", "/hr-dashboard", "/hr-dashboard/:path*"],
//   "Support Executive": ["/", "/support-dashboard", "/support-dashboard/:path*"],
//   "Production Head": ["/", "/production-dashboard", "/production-dashboard/:path*"],
//   "Project Manager": ["/", "/project-dashboard", "/project-dashboard/:path*"],
// };

// // ✅ Customer routes (Portal)
// const CUSTOMER_ROUTES = [
//   "/customer-dashboard",
//   "/customer-dashboard/:path*",
// ];

// export function middleware(request) {
//   const token = request.cookies.get("token")?.value;

//   if (!token) {
//     const url = request.nextUrl.clone();
//     url.pathname = "/signin";
//     return NextResponse.redirect(url);
//   }

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     const { pathname } = request.nextUrl;

//     // =====================================
//     // 🧾 CUSTOMER PORTAL ACCESS
//     // =====================================
//     if (decoded.type === "customer") {
//       const allowed = CUSTOMER_ROUTES.some((route) =>
//         pathname.startsWith(route.replace(":path*", ""))
//       );

//       if (!allowed) {
//         return NextResponse.redirect(new URL("/unauthorized", request.url));
//       }

//       return NextResponse.next();
//     }

//     // =====================================
//     // 🧑‍💼 COMPANY USER ROLE ACCESS
//     // =====================================
//     const roles = decoded.roles || [];

//     const allowedRoutes = roles.flatMap(
//       (role) => ROLE_ROUTES[role] || []
//     );

//     if (allowedRoutes.length === 0) {
//       return NextResponse.redirect(new URL("/unauthorized", request.url));
//     }

//     const allowed = allowedRoutes.some((route) =>
//       pathname.startsWith(route.replace(":path*", ""))
//     );

//     if (!allowed) {
//       return NextResponse.redirect(new URL("/unauthorized", request.url));
//     }

//     return NextResponse.next();
//   } catch (err) {
//     console.error("JWT verification failed:", err);
//     const url = request.nextUrl.clone();
//     url.pathname = "/signin";
//     return NextResponse.redirect(url);
//   }
// }

// export const config = {
//   matcher: [
//     "/",
//     "/users/:path*",
//     "/admin/:path*",
//     "/tasks/:path*",
//     "/customer-dashboard/:path*",
//     "/agent-dashboard/:path*",
//     "/supplier-dashboard/:path*",
//     "/inventory-dashboard/:path*",
//     "/accounts-dashboard/:path*",
//     "/hr-dashboard/:path*",
//     "/support-dashboard/:path*",
//     "/production-dashboard/:path*",
//     "/project-dashboard/:path*",
//     "/api/:path*",
//   ],
// };




// import { NextResponse } from "next/server";
// import jwt from "jsonwebtoken";

// // ✅ Role to allowed routes mapping
// const ROLE_ROUTES = {
//   Admin: ["/", "/users", "/admin", "/admin/:path*"],
//   Employee: ["/", "/tasks", "/customer-dashboard", "/customer-dashboard/:path*"],
//   "Sales Manager": ["/", "/agent-dashboard", "/agent-dashboard/:path*"],
//   "Purchase Manager": ["/", "/supplier-dashboard", "/supplier-dashboard/:path*"],
//   "Inventory Manager": ["/", "/inventory-dashboard", "/inventory-dashboard/:path*"],
//   "Accounts Manager": ["/", "/accounts-dashboard", "/accounts-dashboard/:path*"],
//   "HR Manager": ["/", "/hr-dashboard", "/hr-dashboard/:path*"],
//   "Support Executive": ["/", "/support-dashboard", "/support-dashboard/:path*"],
//   "Production Head": ["/", "/production-dashboard", "/production-dashboard/:path*"],
//   "Project Manager": ["/", "/project-dashboard", "/project-dashboard/:path*"],
// };

// export function middleware(request) {
//   const token = request.cookies.get("token")?.value;

//   if (!token) {
//     const url = request.nextUrl.clone();
//     url.pathname = "/signin";
//     return NextResponse.redirect(url);
//   }

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     // ✅ Roles is an array
//     const roles = decoded.roles || [];

//     const { pathname } = request.nextUrl;

//     // ✅ If user has multiple roles → merge all allowed routes
//     const allowedRoutes = roles.flatMap((role) => ROLE_ROUTES[role] || []);

//     if (allowedRoutes.length === 0) {
//       return NextResponse.redirect(new URL("/unauthorized", request.url));
//     }

//     const allowed = allowedRoutes.some((route) =>
//       pathname.startsWith(route.replace(":path*", ""))
//     );

//     if (!allowed) {
//       return NextResponse.redirect(new URL("/unauthorized", request.url));
//     }

//     return NextResponse.next();
//   } catch (err) {
//     console.error("JWT verification failed:", err);
//     const url = request.nextUrl.clone();
//     url.pathname = "/signin";
//     return NextResponse.redirect(url);
//   }
// }

// export const config = {
//   matcher: [
//     "/",
//     "/users/:path*",
//     "/admin/:path*",
//     "/tasks/:path*",
//     "/customer-dashboard/:path*",
//     "/agent-dashboard/:path*",
//     "/supplier-dashboard/:path*",
//     "/inventory-dashboard/:path*",
//     "/accounts-dashboard/:path*",
//     "/hr-dashboard/:path*",
//     "/support-dashboard/:path*",
//     "/production-dashboard/:path*",
//     "/project-dashboard/:path*",
//   ],
// };



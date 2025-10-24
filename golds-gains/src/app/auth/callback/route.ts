import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/home";

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch (error) {
              // Ignorar errores de cookies en middleware
              console.error("Error setting cookies:", error);
            }
          },
        },
      }
    );

    try {
      // Intercambiar el código por una sesión
      const { data, error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        console.error("Error exchanging code for session:", exchangeError);
        return NextResponse.redirect(
          new URL("/login?error=auth_failed", requestUrl.origin)
        );
      }

      // Obtener el usuario autenticado
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("Error getting user:", userError);
        return NextResponse.redirect(
          new URL("/login?error=user_not_found", requestUrl.origin)
        );
      }

      if (user.email) {
        // Verificar si el usuario ya existe en la tabla users
        const { data: existingUser, error: checkError } = await supabase
          .from("users")
          .select("id")
          .eq("email", user.email)
          .maybeSingle();

        // Si no existe, crear el usuario en la tabla
        if (!existingUser && !checkError) {
          const { error: insertError } = await supabase.from("users").insert([
            {
              id: user.id, // Usar el mismo ID de Auth
              name:
                user.user_metadata?.full_name ||
                user.user_metadata?.name ||
                user.email.split("@")[0],
              email: user.email,
              password: "", // Contraseña vacía para usuarios de Google
              phone: user.user_metadata?.phone || "",
              role: "user",
            },
          ]);

          if (insertError) {
            console.error("Error al insertar usuario:", insertError);
            // No redirigir a error, continuar con el login
          }
        }
      }

      // Redirigir a la página principal
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    } catch (error) {
      console.error("Unexpected error in callback:", error);
      return NextResponse.redirect(
        new URL("/login?error=unexpected", requestUrl.origin)
      );
    }
  }

  // Si no hay código, redirigir al login
  return NextResponse.redirect(
    new URL("/login?error=no_code", requestUrl.origin)
  );
}

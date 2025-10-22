import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Intercambiar el código por una sesión
    await supabase.auth.exchangeCodeForSession(code);

    // Obtener el usuario autenticado
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user && user.email) {
      // Verificar si el usuario ya existe en la tabla users
      const { data: existingUser, error: checkError } = await supabase
        .from("users")
        .select("id")
        .eq("email", user.email)
        .maybeSingle(); // Usar maybeSingle() en lugar de single()

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
        }
      }
    }
  }

  // Redirigir a la página principal
  return NextResponse.redirect(new URL("/home", requestUrl.origin));
}

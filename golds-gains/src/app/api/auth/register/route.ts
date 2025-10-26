import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { name, email, password, phone } = await request.json();
    // Log incoming request (no passwords)
    console.log("[api/auth/register] POST called with:", {
      name,
      email,
      phone,
    });

    // Validar que todos los campos estén presentes
    if (!name || !email || !password || !phone) {
      return NextResponse.json(
        { error: "Todos los campos son requeridos" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    console.log("[api/auth/register] Creating Supabase client...");
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
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );

    console.log("[api/auth/register] Calling supabase.auth.signUp...");
    // Registrar usuario en Supabase Auth con verificación de email
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${
          process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
        }/auth/callback`,
        data: {
          full_name: name,
          phone: phone,
        },
      },
    });

    if (authError) {
      console.error("Error en Auth:", authError);
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    console.log(
      "[api/auth/register] Auth signUp successful, user ID:",
      authData.user?.id
    );

    // Hashear la contraseña para la tabla personalizada
    const saltRounds = 10;
    console.log("[api/auth/register] Hashing password...");
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    console.log("[api/auth/register] Inserting into users table...");
    // Insertar el usuario en la tabla users
    if (authData.user) {
      const { error: dbError } = await supabase.from("users").insert([
        {
          id: authData.user.id, // Usar el mismo ID de Auth
          name,
          email,
          password: hashedPassword,
          phone,
          role: "user",
        },
      ]);

      if (dbError) {
        console.error("Error al crear usuario en BD:", dbError);
        console.error("DB Error code:", dbError.code);
        console.error("DB Error details:", dbError.details);
        console.error("DB Error hint:", dbError.hint);
        return NextResponse.json(
          { error: "Error al crear el usuario" },
          { status: 500 }
        );
      }
    }

    console.log("[api/auth/register] User created successfully!");
    return NextResponse.json(
      {
        message:
          "Usuario registrado exitosamente. Por favor verifica tu correo electrónico para activar tu cuenta.",
        requiresEmailVerification: true,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error en el registro:", error);
    // Log stack trace and detailed error info
    if (error instanceof Error) {
      console.error("Error stack:", error.stack);
      console.error("Error message:", error.message);
    }
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Return a clear JSON response for GET requests so clients/browsers don't receive HTML 404 pages
  return NextResponse.json(
    {
      error: "Method GET not supported on this endpoint. Use POST to register.",
    },
    { status: 405 }
  );
}

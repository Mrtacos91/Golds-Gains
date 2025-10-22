import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { name, email, password, phone } = await request.json();

    // Validar que todos los campos estén presentes
    if (!name || !email || !password || !phone) {
      return NextResponse.json(
        { error: "Todos los campos son requeridos" },
        { status: 400 }
      );
    }

    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

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

    // Hashear la contraseña para la tabla personalizada
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

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
        return NextResponse.json(
          { error: "Error al crear el usuario" },
          { status: 500 }
        );
      }
    }

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
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

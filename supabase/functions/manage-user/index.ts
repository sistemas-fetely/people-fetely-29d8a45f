import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify caller is super_admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller with anon client
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await anonClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check super_admin role
    const { data: hasRole } = await anonClient.rpc("has_role", {
      _user_id: caller.id,
      _role: "super_admin",
    });
    if (!hasRole) {
      return new Response(JSON.stringify({ error: "Sem permissão" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const body = await req.json();
    const { action } = body;

    if (action === "create") {
      const { email, password, full_name, roles, colaborador_tipo } = body;
      if (!email || !password || !full_name) {
        return new Response(JSON.stringify({ error: "Email, senha e nome são obrigatórios" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      });

      if (createError) {
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Approve profile and set colaborador_tipo
      const profileUpdate: Record<string, unknown> = { approved: true };
      if (colaborador_tipo) {
        profileUpdate.colaborador_tipo = colaborador_tipo;
      }
      await adminClient.from("profiles").update(profileUpdate).eq("user_id", newUser.user.id);

      // Set roles if provided
      if (roles && roles.length > 0) {
        await adminClient.from("user_roles").delete().eq("user_id", newUser.user.id);
        const roleInserts = roles.map((role: string) => ({
          user_id: newUser.user.id,
          role,
        }));
        await adminClient.from("user_roles").insert(roleInserts);
      }

      return new Response(JSON.stringify({ success: true, user_id: newUser.user.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "toggle_ban") {
      const { user_id, ban } = body;
      if (!user_id) {
        return new Response(JSON.stringify({ error: "user_id é obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (ban) {
        const { error } = await adminClient.auth.admin.updateUserById(user_id, {
          ban_duration: "876000h",
        });
        if (error) throw error;
        await adminClient.from("profiles").update({ approved: false }).eq("user_id", user_id);
      } else {
        const { error } = await adminClient.auth.admin.updateUserById(user_id, {
          ban_duration: "none",
        });
        if (error) throw error;
        await adminClient.from("profiles").update({ approved: true }).eq("user_id", user_id);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_roles") {
      const { user_id, roles, colaborador_tipo } = body;
      if (!user_id || !roles) {
        return new Response(JSON.stringify({ error: "user_id e roles são obrigatórios" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await adminClient.from("user_roles").delete().eq("user_id", user_id);
      if (roles.length > 0) {
        const roleInserts = roles.map((role: string) => ({ user_id, role }));
        await adminClient.from("user_roles").insert(roleInserts);
      }

      // Update colaborador_tipo on profile
      if (colaborador_tipo !== undefined) {
        await adminClient.from("profiles").update({ colaborador_tipo: colaborador_tipo || null }).eq("user_id", user_id);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "approve") {
      const { user_id } = body;
      if (!user_id) {
        return new Response(JSON.stringify({ error: "user_id é obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await adminClient.from("profiles").update({ approved: true }).eq("user_id", user_id);

      // Send approval email
      try {
        const { data: { user: targetUser } } = await adminClient.auth.admin.getUserById(user_id);
        const { data: profile } = await adminClient.from("profiles").select("full_name").eq("user_id", user_id).single();

        if (targetUser?.email) {
          await adminClient.functions.invoke("send-transactional-email", {
            body: {
              templateName: "cadastro-aprovado",
              recipientEmail: targetUser.email,
              idempotencyKey: `cadastro-aprovado-${user_id}`,
              templateData: { nome: profile?.full_name || "" },
            },
          });
        }
      } catch (emailErr) {
        console.error("Erro ao enviar email de aprovação:", emailErr);
        // Don't fail the approval if email fails
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete_user") {
      const { user_id } = body;
      if (!user_id) {
        return new Response(JSON.stringify({ error: "user_id é obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (user_id === caller.id) {
        return new Response(JSON.stringify({ error: "Não é possível deletar seu próprio usuário" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await adminClient.from("user_roles").delete().eq("user_id", user_id);
      await adminClient.from("profiles").delete().eq("user_id", user_id);
      const { error } = await adminClient.auth.admin.deleteUser(user_id);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list_users") {
      const { data: { users }, error } = await adminClient.auth.admin.listUsers();
      if (error) throw error;

      const userList = users.map((u) => ({
        id: u.id,
        email: u.email,
        banned: !!u.banned_until && new Date(u.banned_until) > new Date(),
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
      }));

      return new Response(JSON.stringify({ users: userList }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

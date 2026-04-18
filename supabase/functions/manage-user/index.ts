import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const token = authHeader.slice("Bearer ".length);
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    const callerId = claimsData?.claims?.sub;

    if (claimsError || typeof callerId !== "string") {
      console.error("Auth claims error:", claimsError?.message ?? "Token inválido");
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check caller roles
    const { data: isSuperAdmin } = await userClient.rpc("has_role", {
      _user_id: callerId,
      _role: "super_admin",
    });
    const { data: isAdminRH } = await userClient.rpc("has_role", {
      _user_id: callerId,
      _role: "admin_rh",
    });

    if (!isSuperAdmin && !isAdminRH) {
      return new Response(JSON.stringify({ error: "Sem permissão" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
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

      // admin_rh cannot assign super_admin
      if (!isSuperAdmin && roles?.includes("super_admin")) {
        return new Response(JSON.stringify({ error: "Sem permissão para atribuir super_admin" }), {
          status: 403,
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

    if (action === "create_user_standalone") {
      const { email, full_name, roles, colaborador_id, colaborador_tipo } = body;
      if (!email || !full_name) {
        return new Response(JSON.stringify({ error: "Email e nome são obrigatórios" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // admin_rh cannot assign super_admin
      if (!isSuperAdmin && roles?.includes("super_admin")) {
        return new Response(JSON.stringify({ error: "Sem permissão para atribuir super_admin" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create user without password (will use recovery link for first access)
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name },
      });

      if (createError) {
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create/update profile
      await adminClient.from("profiles").upsert({
        user_id: newUser.user.id,
        full_name,
        approved: true,
        colaborador_tipo: colaborador_tipo || "all",
      }, { onConflict: "user_id" });

      // Assign roles
      if (roles && roles.length > 0) {
        await adminClient.from("user_roles").delete().eq("user_id", newUser.user.id);
        const roleInserts = roles.map((role: string) => ({
          user_id: newUser.user.id,
          role,
        }));
        await adminClient.from("user_roles").insert(roleInserts);
      }

      // Link to colaborador if provided
      if (colaborador_id && colaborador_tipo === "clt") {
        await adminClient.from("colaboradores_clt")
          .update({ user_id: newUser.user.id })
          .eq("id", colaborador_id);
      }
      if (colaborador_id && colaborador_tipo === "pj") {
        await adminClient.from("contratos_pj")
          .update({ user_id: newUser.user.id })
          .eq("id", colaborador_id);
      }

      // Send password recovery link for first access
      try {
        await adminClient.auth.admin.generateLink({
          type: "recovery",
          email,
        });
      } catch (linkErr) {
        console.error("Erro ao gerar link de recuperação:", linkErr);
      }

      // Send welcome email
      try {
        await adminClient.functions.invoke("send-transactional-email", {
          body: {
            templateName: "boas-vindas-portal",
            recipientEmail: email,
            idempotencyKey: `boas-vindas-${newUser.user.id}`,
            templateData: {
              nome: full_name,
              email,
              link: Deno.env.get("SITE_URL") || "https://people-fetely.lovable.app",
            },
          },
        });
      } catch (emailErr) {
        console.error("Erro ao enviar e-mail de boas-vindas:", emailErr);
      }

      return new Response(JSON.stringify({ success: true, user_id: newUser.user.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create_user_from_colaborador") {
      const { colaborador_id, tipo, departamento_id, unidade_id, template_id } = body;

      if (!colaborador_id || !tipo || !unidade_id) {
        return new Response(JSON.stringify({ error: "colaborador_id, tipo e unidade_id são obrigatórios" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (tipo !== "clt" && tipo !== "pj") {
        return new Response(JSON.stringify({ error: "tipo deve ser 'clt' ou 'pj'" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`[create_user_from_colaborador] Start. colaborador_id=${colaborador_id}, tipo=${tipo}, unidade_id=${unidade_id}, departamento_id=${departamento_id || "null"}, template_id=${template_id || "derivar"}`);

      // 1. Buscar dados do colaborador
      const tabela = tipo === "clt" ? "colaboradores_clt" : "contratos_pj";
      const selectFields = tipo === "clt"
        ? "id, nome_completo, email_pessoal, cargo_id"
        : "id, contato_nome, contato_email, cargo_id";

      const { data: colab, error: errColab } = await adminClient
        .from(tabela)
        .select(selectFields)
        .eq("id", colaborador_id)
        .single();

      if (errColab || !colab) {
        console.error("[create_user_from_colaborador] Colaborador não encontrado:", errColab);
        return new Response(JSON.stringify({ error: "Colaborador não encontrado" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const email = tipo === "clt" ? (colab as any).email_pessoal : (colab as any).contato_email;
      const full_name = tipo === "clt" ? (colab as any).nome_completo : (colab as any).contato_nome;

      if (!email) {
        return new Response(JSON.stringify({ error: "Colaborador não tem email cadastrado" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 2. Resolver template
      // Prioridade: template_id explícito > template_sugerido_para_cargo > fallback "analista"
      let templateToApply: string | null = template_id || null;
      if (!templateToApply && (colab as any).cargo_id) {
        try {
          const { data: templRpc, error: errTempl } = await adminClient.rpc("template_sugerido_para_cargo", {
            _cargo_id: (colab as any).cargo_id,
          });
          if (errTempl) {
            console.error("[create_user_from_colaborador] Erro ao sugerir template por cargo:", errTempl);
          } else {
            templateToApply = templRpc as string | null;
          }
        } catch (e) {
          console.error("[create_user_from_colaborador] Exception ao sugerir template:", e);
        }
      }

      // Fallback final: usar template "analista" do sistema
      if (!templateToApply) {
        console.log(`[create_user_from_colaborador] cargo_id ausente ou sem template mapeado, usando fallback 'analista'. colab_id=${colaborador_id}, tipo=${tipo}`);
        const { data: fallback } = await adminClient
          .from("cargo_template")
          .select("id")
          .eq("codigo", "analista")
          .eq("is_sistema", true)
          .single();
        templateToApply = (fallback as any)?.id || null;
      }

      if (!templateToApply) {
        console.error("[create_user_from_colaborador] Template 'analista' de fallback não encontrado no banco.");
        return new Response(JSON.stringify({
          error: "Template 'analista' de fallback não foi encontrado no banco. Contate o administrador."
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 3. Criar auth user
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name },
      });

      if (createError) {
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const novoUserId = newUser.user.id;

      // 4. Criar profile
      await adminClient.from("profiles").upsert({
        user_id: novoUserId,
        full_name,
        approved: true,
        colaborador_tipo: tipo,
      }, { onConflict: "user_id" });

      // 5. Vincular colaborador ao user
      await adminClient.from(tabela)
        .update({ user_id: novoUserId })
        .eq("id", colaborador_id);

      // 6. Aplicar template v3 (deriva perfil de área do departamento)
      const { error: errTemplate } = await adminClient.rpc("aplicar_template_cargo_v3", {
        _user_id: novoUserId,
        _template_id: templateToApply,
        _departamento_id: departamento_id || null,
        _unidade_id: unidade_id,
        _atribuidor: callerId || null,
      });

      if (errTemplate) {
        console.error("[create_user_from_colaborador] Erro ao aplicar template v3:", errTemplate);
      }

      // 7. Gerar link de recuperação (primeiro acesso)
      try {
        await adminClient.auth.admin.generateLink({ type: "recovery", email });
      } catch (e) {
        console.error("[create_user_from_colaborador] Erro ao gerar link de recuperação:", e);
      }

      // 8. E-mail de boas-vindas
      try {
        await adminClient.functions.invoke("send-transactional-email", {
          body: {
            templateName: "boas-vindas-portal",
            recipientEmail: email,
            idempotencyKey: `boas-vindas-${novoUserId}-${Date.now()}`,
            templateData: {
              nome: full_name,
              email,
              link: Deno.env.get("SITE_URL") || "https://people-fetely.lovable.app",
            },
          },
        });
      } catch (e) {
        console.error("[create_user_from_colaborador] Erro ao enviar e-mail de boas-vindas:", e);
      }

      console.log(`[create_user_from_colaborador] Success. user_id=${novoUserId}, template_aplicado=${templateToApply}, perfil_aplicado=${errTemplate ? "FALHOU" : "OK"}`);

      return new Response(JSON.stringify({
        success: true,
        user_id: novoUserId,
        template_aplicado: templateToApply,
        aviso_template: errTemplate ? errTemplate.message : null,
      }), {
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

      // admin_rh cannot assign super_admin
      if (!isSuperAdmin && roles.includes("super_admin")) {
        return new Response(JSON.stringify({ error: "Sem permissão para atribuir super_admin" }), {
          status: 403,
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

      // Auto-link user to CLT/PJ record via convites_cadastro
      try {
        const { data: { user: targetUser } } = await adminClient.auth.admin.getUserById(user_id);
        const { data: profile } = await adminClient.from("profiles").select("full_name, colaborador_tipo").eq("user_id", user_id).single();

        if (targetUser?.email) {
          // Find invite by email that has a linked record
          const { data: convite } = await adminClient
            .from("convites_cadastro")
            .select("colaborador_id, contrato_pj_id, tipo")
            .eq("email", targetUser.email)
            .in("status", ["preenchido", "aprovado"])
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (convite?.colaborador_id) {
            await adminClient.from("colaboradores_clt").update({ user_id }).eq("id", convite.colaborador_id);
            // Set colaborador_tipo if not already set
            if (!profile?.colaborador_tipo) {
              await adminClient.from("profiles").update({ colaborador_tipo: "clt" }).eq("user_id", user_id);
            }
          }
          if (convite?.contrato_pj_id) {
            await adminClient.from("contratos_pj").update({ user_id }).eq("id", convite.contrato_pj_id);
            if (!profile?.colaborador_tipo) {
              const tipo = convite.colaborador_id ? "ambos" : "pj";
              await adminClient.from("profiles").update({ colaborador_tipo: tipo }).eq("user_id", user_id);
            }
          }

          // Send approval email
          await adminClient.functions.invoke("send-transactional-email", {
            body: {
              templateName: "cadastro-aprovado",
              recipientEmail: targetUser.email,
              idempotencyKey: `cadastro-aprovado-${user_id}`,
              templateData: { nome: profile?.full_name || "" },
            },
          });
        }
      } catch (linkErr) {
        console.error("Erro ao vincular/enviar email:", linkErr);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "link_record") {
      const { user_id, colaborador_id, contrato_pj_id } = body;
      if (!user_id) {
        return new Response(JSON.stringify({ error: "user_id é obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (colaborador_id) {
        await adminClient.from("colaboradores_clt").update({ user_id }).eq("id", colaborador_id);
      }
      if (contrato_pj_id) {
        await adminClient.from("contratos_pj").update({ user_id }).eq("id", contrato_pj_id);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "unlink_record") {
      const { user_id } = body;
      if (!user_id) {
        return new Response(JSON.stringify({ error: "user_id é obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await adminClient.from("colaboradores_clt").update({ user_id: null }).eq("user_id", user_id);
      await adminClient.from("contratos_pj").update({ user_id: null }).eq("user_id", user_id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete_user") {
      // Only super_admin can delete
      if (!isSuperAdmin) {
        return new Response(JSON.stringify({ error: "Apenas Super Admin pode deletar usuários" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { user_id } = body;
      if (!user_id) {
        return new Response(JSON.stringify({ error: "user_id é obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (user_id === callerId) {
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

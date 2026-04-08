export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      colaborador_acessos_sistemas: {
        Row: {
          colaborador_id: string
          created_at: string
          data_concessao: string | null
          id: string
          observacoes: string | null
          sistema: string
          tem_acesso: boolean
          updated_at: string
          usuario: string | null
        }
        Insert: {
          colaborador_id: string
          created_at?: string
          data_concessao?: string | null
          id?: string
          observacoes?: string | null
          sistema: string
          tem_acesso?: boolean
          updated_at?: string
          usuario?: string | null
        }
        Update: {
          colaborador_id?: string
          created_at?: string
          data_concessao?: string | null
          id?: string
          observacoes?: string | null
          sistema?: string
          tem_acesso?: boolean
          updated_at?: string
          usuario?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "colaborador_acessos_sistemas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores_clt"
            referencedColumns: ["id"]
          },
        ]
      }
      colaborador_departamentos: {
        Row: {
          colaborador_id: string
          created_at: string
          departamento: string
          id: string
          percentual_rateio: number
          updated_at: string
        }
        Insert: {
          colaborador_id: string
          created_at?: string
          departamento: string
          id?: string
          percentual_rateio?: number
          updated_at?: string
        }
        Update: {
          colaborador_id?: string
          created_at?: string
          departamento?: string
          id?: string
          percentual_rateio?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "colaborador_departamentos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores_clt"
            referencedColumns: ["id"]
          },
        ]
      }
      colaborador_equipamentos: {
        Row: {
          colaborador_id: string
          created_at: string
          data_devolucao: string | null
          data_entrega: string | null
          estado: string
          id: string
          marca: string | null
          modelo: string | null
          numero_patrimonio: string | null
          numero_serie: string | null
          observacoes: string | null
          termo_responsabilidade_url: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          colaborador_id: string
          created_at?: string
          data_devolucao?: string | null
          data_entrega?: string | null
          estado?: string
          id?: string
          marca?: string | null
          modelo?: string | null
          numero_patrimonio?: string | null
          numero_serie?: string | null
          observacoes?: string | null
          termo_responsabilidade_url?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          colaborador_id?: string
          created_at?: string
          data_devolucao?: string | null
          data_entrega?: string | null
          estado?: string
          id?: string
          marca?: string | null
          modelo?: string | null
          numero_patrimonio?: string | null
          numero_serie?: string | null
          observacoes?: string | null
          termo_responsabilidade_url?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "colaborador_equipamentos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores_clt"
            referencedColumns: ["id"]
          },
        ]
      }
      colaboradores_clt: {
        Row: {
          agencia: string | null
          bairro: string | null
          banco_codigo: string | null
          banco_nome: string | null
          cargo: string
          cep: string | null
          certificado_reservista: string | null
          chave_pix: string | null
          cidade: string | null
          cnh_categoria: string | null
          cnh_numero: string | null
          cnh_validade: string | null
          complemento: string | null
          conta: string | null
          contato_emergencia_nome: string | null
          contato_emergencia_telefone: string | null
          cpf: string
          created_at: string
          created_by: string | null
          ctps_numero: string | null
          ctps_serie: string | null
          ctps_uf: string | null
          data_admissao: string
          data_integracao: string | null
          data_nascimento: string
          departamento: string
          email_corporativo: string | null
          email_pessoal: string | null
          estado_civil: string | null
          etnia: string | null
          foto_url: string | null
          genero: string | null
          gestor_direto_id: string | null
          horario_trabalho: string | null
          id: string
          jornada_semanal: number | null
          local_trabalho: string | null
          logradouro: string | null
          matricula: string | null
          nacionalidade: string | null
          nome_completo: string
          nome_mae: string | null
          nome_pai: string | null
          numero: string | null
          observacoes: string | null
          orgao_emissor: string | null
          pis_pasep: string | null
          ramal: string | null
          rg: string | null
          salario_base: number
          secao_eleitoral: string | null
          status: string
          telefone: string | null
          tipo_conta: string | null
          tipo_contrato: string
          titulo_eleitor: string | null
          uf: string | null
          updated_at: string
          user_id: string | null
          zona_eleitoral: string | null
        }
        Insert: {
          agencia?: string | null
          bairro?: string | null
          banco_codigo?: string | null
          banco_nome?: string | null
          cargo: string
          cep?: string | null
          certificado_reservista?: string | null
          chave_pix?: string | null
          cidade?: string | null
          cnh_categoria?: string | null
          cnh_numero?: string | null
          cnh_validade?: string | null
          complemento?: string | null
          conta?: string | null
          contato_emergencia_nome?: string | null
          contato_emergencia_telefone?: string | null
          cpf: string
          created_at?: string
          created_by?: string | null
          ctps_numero?: string | null
          ctps_serie?: string | null
          ctps_uf?: string | null
          data_admissao: string
          data_integracao?: string | null
          data_nascimento: string
          departamento: string
          email_corporativo?: string | null
          email_pessoal?: string | null
          estado_civil?: string | null
          etnia?: string | null
          foto_url?: string | null
          genero?: string | null
          gestor_direto_id?: string | null
          horario_trabalho?: string | null
          id?: string
          jornada_semanal?: number | null
          local_trabalho?: string | null
          logradouro?: string | null
          matricula?: string | null
          nacionalidade?: string | null
          nome_completo: string
          nome_mae?: string | null
          nome_pai?: string | null
          numero?: string | null
          observacoes?: string | null
          orgao_emissor?: string | null
          pis_pasep?: string | null
          ramal?: string | null
          rg?: string | null
          salario_base: number
          secao_eleitoral?: string | null
          status?: string
          telefone?: string | null
          tipo_conta?: string | null
          tipo_contrato?: string
          titulo_eleitor?: string | null
          uf?: string | null
          updated_at?: string
          user_id?: string | null
          zona_eleitoral?: string | null
        }
        Update: {
          agencia?: string | null
          bairro?: string | null
          banco_codigo?: string | null
          banco_nome?: string | null
          cargo?: string
          cep?: string | null
          certificado_reservista?: string | null
          chave_pix?: string | null
          cidade?: string | null
          cnh_categoria?: string | null
          cnh_numero?: string | null
          cnh_validade?: string | null
          complemento?: string | null
          conta?: string | null
          contato_emergencia_nome?: string | null
          contato_emergencia_telefone?: string | null
          cpf?: string
          created_at?: string
          created_by?: string | null
          ctps_numero?: string | null
          ctps_serie?: string | null
          ctps_uf?: string | null
          data_admissao?: string
          data_integracao?: string | null
          data_nascimento?: string
          departamento?: string
          email_corporativo?: string | null
          email_pessoal?: string | null
          estado_civil?: string | null
          etnia?: string | null
          foto_url?: string | null
          genero?: string | null
          gestor_direto_id?: string | null
          horario_trabalho?: string | null
          id?: string
          jornada_semanal?: number | null
          local_trabalho?: string | null
          logradouro?: string | null
          matricula?: string | null
          nacionalidade?: string | null
          nome_completo?: string
          nome_mae?: string | null
          nome_pai?: string | null
          numero?: string | null
          observacoes?: string | null
          orgao_emissor?: string | null
          pis_pasep?: string | null
          ramal?: string | null
          rg?: string | null
          salario_base?: number
          secao_eleitoral?: string | null
          status?: string
          telefone?: string | null
          tipo_conta?: string | null
          tipo_contrato?: string
          titulo_eleitor?: string | null
          uf?: string | null
          updated_at?: string
          user_id?: string | null
          zona_eleitoral?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "colaboradores_clt_gestor_direto_id_fkey"
            columns: ["gestor_direto_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos_pj: {
        Row: {
          agencia: string | null
          banco_codigo: string | null
          banco_nome: string | null
          chave_pix: string | null
          cnpj: string
          conta: string | null
          contato_email: string | null
          contato_nome: string
          contato_telefone: string | null
          created_at: string
          created_by: string | null
          data_fim: string | null
          data_inicio: string
          departamento: string
          dia_vencimento: number | null
          forma_pagamento: string
          id: string
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          nome_fantasia: string | null
          objeto: string | null
          observacoes: string | null
          razao_social: string
          renovacao_automatica: boolean
          status: string
          tipo_conta: string | null
          tipo_servico: string
          updated_at: string
          valor_mensal: number
        }
        Insert: {
          agencia?: string | null
          banco_codigo?: string | null
          banco_nome?: string | null
          chave_pix?: string | null
          cnpj: string
          conta?: string | null
          contato_email?: string | null
          contato_nome: string
          contato_telefone?: string | null
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio: string
          departamento: string
          dia_vencimento?: number | null
          forma_pagamento?: string
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          nome_fantasia?: string | null
          objeto?: string | null
          observacoes?: string | null
          razao_social: string
          renovacao_automatica?: boolean
          status?: string
          tipo_conta?: string | null
          tipo_servico: string
          updated_at?: string
          valor_mensal: number
        }
        Update: {
          agencia?: string | null
          banco_codigo?: string | null
          banco_nome?: string | null
          chave_pix?: string | null
          cnpj?: string
          conta?: string | null
          contato_email?: string | null
          contato_nome?: string
          contato_telefone?: string | null
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string
          departamento?: string
          dia_vencimento?: number | null
          forma_pagamento?: string
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          nome_fantasia?: string | null
          objeto?: string | null
          observacoes?: string | null
          razao_social?: string
          renovacao_automatica?: boolean
          status?: string
          tipo_conta?: string | null
          tipo_servico?: string
          updated_at?: string
          valor_mensal?: number
        }
        Relationships: []
      }
      dependentes: {
        Row: {
          colaborador_id: string
          cpf: string | null
          created_at: string
          data_nascimento: string
          documento_url: string | null
          id: string
          incluir_irrf: boolean | null
          incluir_plano_saude: boolean | null
          nome_completo: string
          parentesco: string
          updated_at: string
        }
        Insert: {
          colaborador_id: string
          cpf?: string | null
          created_at?: string
          data_nascimento: string
          documento_url?: string | null
          id?: string
          incluir_irrf?: boolean | null
          incluir_plano_saude?: boolean | null
          nome_completo: string
          parentesco: string
          updated_at?: string
        }
        Update: {
          colaborador_id?: string
          cpf?: string | null
          created_at?: string
          data_nascimento?: string
          documento_url?: string | null
          id?: string
          incluir_irrf?: boolean | null
          incluir_plano_saude?: boolean | null
          nome_completo?: string
          parentesco?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dependentes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores_clt"
            referencedColumns: ["id"]
          },
        ]
      }
      parametros: {
        Row: {
          ativo: boolean
          categoria: string
          created_at: string
          descricao: string | null
          id: string
          label: string
          ordem: number
          updated_at: string
          valor: string
        }
        Insert: {
          ativo?: boolean
          categoria: string
          created_at?: string
          descricao?: string | null
          id?: string
          label: string
          ordem?: number
          updated_at?: string
          valor: string
        }
        Update: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          descricao?: string | null
          id?: string
          label?: string
          ordem?: number
          updated_at?: string
          valor?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          full_name: string | null
          id: string
          position: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          full_name?: string | null
          id?: string
          position?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          full_name?: string | null
          id?: string
          position?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "gestor_rh"
        | "gestor_direto"
        | "colaborador"
        | "financeiro"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "super_admin",
        "gestor_rh",
        "gestor_direto",
        "colaborador",
        "financeiro",
      ],
    },
  },
} as const

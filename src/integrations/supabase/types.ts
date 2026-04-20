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
      acesso_dados_log: {
        Row: {
          alvo_nome: string | null
          alvo_user_id: string | null
          contexto: string | null
          created_at: string
          em_lote: boolean | null
          id: string
          ip_origem: string | null
          justificativa: string | null
          quantidade_alvos: number | null
          registro_id: string | null
          tabela_origem: string | null
          tipo_dado: string
          user_id: string | null
          user_nome: string | null
        }
        Insert: {
          alvo_nome?: string | null
          alvo_user_id?: string | null
          contexto?: string | null
          created_at?: string
          em_lote?: boolean | null
          id?: string
          ip_origem?: string | null
          justificativa?: string | null
          quantidade_alvos?: number | null
          registro_id?: string | null
          tabela_origem?: string | null
          tipo_dado: string
          user_id?: string | null
          user_nome?: string | null
        }
        Update: {
          alvo_nome?: string | null
          alvo_user_id?: string | null
          contexto?: string | null
          created_at?: string
          em_lote?: boolean | null
          id?: string
          ip_origem?: string | null
          justificativa?: string | null
          quantidade_alvos?: number | null
          registro_id?: string | null
          tabela_origem?: string | null
          tipo_dado?: string
          user_id?: string | null
          user_nome?: string | null
        }
        Relationships: []
      }
      alertas_agendados: {
        Row: {
          colaborador_id: string | null
          contrato_pj_id: string | null
          convite_id: string | null
          created_at: string
          data_alerta: string
          executado: boolean
          executado_em: string | null
          id: string
          link: string | null
          mensagem: string | null
          tipo: string
          titulo: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          colaborador_id?: string | null
          contrato_pj_id?: string | null
          convite_id?: string | null
          created_at?: string
          data_alerta: string
          executado?: boolean
          executado_em?: string | null
          id?: string
          link?: string | null
          mensagem?: string | null
          tipo: string
          titulo: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          colaborador_id?: string | null
          contrato_pj_id?: string | null
          convite_id?: string | null
          created_at?: string
          data_alerta?: string
          executado?: boolean
          executado_em?: string | null
          id?: string
          link?: string | null
          mensagem?: string | null
          tipo?: string
          titulo?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alertas_agendados_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores_clt"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_agendados_contrato_pj_id_fkey"
            columns: ["contrato_pj_id"]
            isOneToOne: false
            referencedRelation: "contratos_pj"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_agendados_convite_id_fkey"
            columns: ["convite_id"]
            isOneToOne: false
            referencedRelation: "convites_cadastro"
            referencedColumns: ["id"]
          },
        ]
      }
      atribuicao_origem: {
        Row: {
          atribuicao_id: string
          criado_em: string
          origem: string
          template_id: string | null
        }
        Insert: {
          atribuicao_id: string
          criado_em?: string
          origem: string
          template_id?: string | null
        }
        Update: {
          atribuicao_id?: string
          criado_em?: string
          origem?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "atribuicao_origem_atribuicao_id_fkey"
            columns: ["atribuicao_id"]
            isOneToOne: true
            referencedRelation: "user_atribuicoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atribuicao_origem_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "cargo_template"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          acao: string
          created_at: string
          dados_antes: Json | null
          dados_depois: Json | null
          id: string
          ip_origem: string | null
          justificativa: string | null
          registro_id: string | null
          tabela: string
          user_agent: string | null
          user_email: string | null
          user_id: string | null
          user_nome: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          dados_antes?: Json | null
          dados_depois?: Json | null
          id?: string
          ip_origem?: string | null
          justificativa?: string | null
          registro_id?: string | null
          tabela: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_nome?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          dados_antes?: Json | null
          dados_depois?: Json | null
          id?: string
          ip_origem?: string | null
          justificativa?: string | null
          registro_id?: string | null
          tabela?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_nome?: string | null
        }
        Relationships: []
      }
      beneficios_catalogo: {
        Row: {
          ativo: boolean | null
          beneficio: string
          created_at: string | null
          criado_por: string | null
          id: string
          tipo: string
        }
        Insert: {
          ativo?: boolean | null
          beneficio: string
          created_at?: string | null
          criado_por?: string | null
          id?: string
          tipo?: string
        }
        Update: {
          ativo?: boolean | null
          beneficio?: string
          created_at?: string | null
          criado_por?: string | null
          id?: string
          tipo?: string
        }
        Relationships: []
      }
      beneficios_colaborador: {
        Row: {
          colaborador_id: string
          created_at: string
          data_fim: string | null
          data_inicio: string
          descricao: string | null
          id: string
          numero_cartao: string | null
          observacoes: string | null
          operadora: string | null
          status: string
          tipo: string
          updated_at: string
          valor_desconto: number
          valor_empresa: number
        }
        Insert: {
          colaborador_id: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          descricao?: string | null
          id?: string
          numero_cartao?: string | null
          observacoes?: string | null
          operadora?: string | null
          status?: string
          tipo: string
          updated_at?: string
          valor_desconto?: number
          valor_empresa?: number
        }
        Update: {
          colaborador_id?: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          descricao?: string | null
          id?: string
          numero_cartao?: string | null
          observacoes?: string | null
          operadora?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          valor_desconto?: number
          valor_empresa?: number
        }
        Relationships: [
          {
            foreignKeyName: "beneficios_colaborador_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores_clt"
            referencedColumns: ["id"]
          },
        ]
      }
      beneficios_pj: {
        Row: {
          contrato_id: string
          created_at: string
          data_fim: string | null
          data_inicio: string
          descricao: string | null
          id: string
          numero_cartao: string | null
          observacoes: string | null
          operadora: string | null
          status: string
          tipo: string
          updated_at: string
          valor_desconto: number
          valor_empresa: number
        }
        Insert: {
          contrato_id: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          descricao?: string | null
          id?: string
          numero_cartao?: string | null
          observacoes?: string | null
          operadora?: string | null
          status?: string
          tipo: string
          updated_at?: string
          valor_desconto?: number
          valor_empresa?: number
        }
        Update: {
          contrato_id?: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          descricao?: string | null
          id?: string
          numero_cartao?: string | null
          observacoes?: string | null
          operadora?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          valor_desconto?: number
          valor_empresa?: number
        }
        Relationships: [
          {
            foreignKeyName: "beneficios_pj_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos_pj"
            referencedColumns: ["id"]
          },
        ]
      }
      candidato_avaliacoes: {
        Row: {
          avaliador_id: string
          candidato_id: string
          comentario: string | null
          created_at: string
          id: string
          score: number
          skill: string
        }
        Insert: {
          avaliador_id: string
          candidato_id: string
          comentario?: string | null
          created_at?: string
          id?: string
          score: number
          skill: string
        }
        Update: {
          avaliador_id?: string
          candidato_id?: string
          comentario?: string | null
          created_at?: string
          id?: string
          score?: number
          skill?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidato_avaliacoes_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos"
            referencedColumns: ["id"]
          },
        ]
      }
      candidato_historico: {
        Row: {
          candidato_id: string
          created_at: string
          id: string
          justificativa: string | null
          responsavel_id: string | null
          score_no_momento: number | null
          status_anterior: string | null
          status_novo: string
          vaga_id: string | null
        }
        Insert: {
          candidato_id: string
          created_at?: string
          id?: string
          justificativa?: string | null
          responsavel_id?: string | null
          score_no_momento?: number | null
          status_anterior?: string | null
          status_novo: string
          vaga_id?: string | null
        }
        Update: {
          candidato_id?: string
          created_at?: string
          id?: string
          justificativa?: string | null
          responsavel_id?: string | null
          score_no_momento?: number | null
          status_anterior?: string | null
          status_novo?: string
          vaga_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidato_historico_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidato_historico_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas"
            referencedColumns: ["id"]
          },
        ]
      }
      candidato_notas: {
        Row: {
          autor_id: string
          candidato_id: string
          conteudo: string
          created_at: string
          id: string
        }
        Insert: {
          autor_id: string
          candidato_id: string
          conteudo: string
          created_at?: string
          id?: string
        }
        Update: {
          autor_id?: string
          candidato_id?: string
          conteudo?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidato_notas_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos"
            referencedColumns: ["id"]
          },
        ]
      }
      candidatos: {
        Row: {
          consentimento_lgpd: boolean | null
          consentimento_lgpd_at: string | null
          created_at: string | null
          curriculo_url: string | null
          email: string
          experiencias: Json | null
          formacoes: Json | null
          id: string
          linkedin_url: string | null
          mensagem: string | null
          nome: string
          origem: string | null
          portfolio_url: string | null
          pretensao_salarial: number | null
          score_calculado_em: string | null
          score_detalhado: Json | null
          score_total: number | null
          sistemas_candidato: Json | null
          skills_candidato: Json | null
          status: string
          telefone: string | null
          updated_at: string | null
          vaga_id: string
        }
        Insert: {
          consentimento_lgpd?: boolean | null
          consentimento_lgpd_at?: string | null
          created_at?: string | null
          curriculo_url?: string | null
          email: string
          experiencias?: Json | null
          formacoes?: Json | null
          id?: string
          linkedin_url?: string | null
          mensagem?: string | null
          nome: string
          origem?: string | null
          portfolio_url?: string | null
          pretensao_salarial?: number | null
          score_calculado_em?: string | null
          score_detalhado?: Json | null
          score_total?: number | null
          sistemas_candidato?: Json | null
          skills_candidato?: Json | null
          status?: string
          telefone?: string | null
          updated_at?: string | null
          vaga_id: string
        }
        Update: {
          consentimento_lgpd?: boolean | null
          consentimento_lgpd_at?: string | null
          created_at?: string | null
          curriculo_url?: string | null
          email?: string
          experiencias?: Json | null
          formacoes?: Json | null
          id?: string
          linkedin_url?: string | null
          mensagem?: string | null
          nome?: string
          origem?: string | null
          portfolio_url?: string | null
          pretensao_salarial?: number | null
          score_calculado_em?: string | null
          score_detalhado?: Json | null
          score_total?: number | null
          sistemas_candidato?: Json | null
          skills_candidato?: Json | null
          status?: string
          telefone?: string | null
          updated_at?: string | null
          vaga_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidatos_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas"
            referencedColumns: ["id"]
          },
        ]
      }
      cargo_template: {
        Row: {
          area: string | null
          ativo: boolean
          cargo_id: string | null
          codigo: string
          criado_em: string
          criado_por: string | null
          descricao: string | null
          id: string
          is_sistema: boolean
          nivel_sugerido: string | null
          nome: string
        }
        Insert: {
          area?: string | null
          ativo?: boolean
          cargo_id?: string | null
          codigo: string
          criado_em?: string
          criado_por?: string | null
          descricao?: string | null
          id?: string
          is_sistema?: boolean
          nivel_sugerido?: string | null
          nome: string
        }
        Update: {
          area?: string | null
          ativo?: boolean
          cargo_id?: string | null
          codigo?: string
          criado_em?: string
          criado_por?: string | null
          descricao?: string | null
          id?: string
          is_sistema?: boolean
          nivel_sugerido?: string | null
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "cargo_template_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
        ]
      }
      cargo_template_perfis: {
        Row: {
          criado_em: string
          escopo_unidade_id: string | null
          id: string
          nivel_override: string | null
          perfil_id: string
          template_id: string
        }
        Insert: {
          criado_em?: string
          escopo_unidade_id?: string | null
          id?: string
          nivel_override?: string | null
          perfil_id: string
          template_id: string
        }
        Update: {
          criado_em?: string
          escopo_unidade_id?: string | null
          id?: string
          nivel_override?: string | null
          perfil_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cargo_template_perfis_escopo_unidade_id_fkey"
            columns: ["escopo_unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargo_template_perfis_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargo_template_perfis_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "cargo_template"
            referencedColumns: ["id"]
          },
        ]
      }
      cargos: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          departamento: string | null
          departamento_id: string | null
          faixa_clt_f1_max: number | null
          faixa_clt_f1_min: number | null
          faixa_clt_f2_max: number | null
          faixa_clt_f2_min: number | null
          faixa_clt_f3_max: number | null
          faixa_clt_f3_min: number | null
          faixa_clt_f4_max: number | null
          faixa_clt_f4_min: number | null
          faixa_clt_f5_max: number | null
          faixa_clt_f5_min: number | null
          faixa_pj_f1_max: number | null
          faixa_pj_f1_min: number | null
          faixa_pj_f2_max: number | null
          faixa_pj_f2_min: number | null
          faixa_pj_f3_max: number | null
          faixa_pj_f3_min: number | null
          faixa_pj_f4_max: number | null
          faixa_pj_f4_min: number | null
          faixa_pj_f5_max: number | null
          faixa_pj_f5_min: number | null
          ferramentas: string[] | null
          id: string
          is_clevel: boolean | null
          missao: string | null
          nivel: string
          nome: string
          protege_salario: boolean | null
          responsabilidades: string[] | null
          skills_desejadas: string[] | null
          skills_obrigatorias: string[] | null
          template_id_padrao: string | null
          tipo_contrato: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          departamento?: string | null
          departamento_id?: string | null
          faixa_clt_f1_max?: number | null
          faixa_clt_f1_min?: number | null
          faixa_clt_f2_max?: number | null
          faixa_clt_f2_min?: number | null
          faixa_clt_f3_max?: number | null
          faixa_clt_f3_min?: number | null
          faixa_clt_f4_max?: number | null
          faixa_clt_f4_min?: number | null
          faixa_clt_f5_max?: number | null
          faixa_clt_f5_min?: number | null
          faixa_pj_f1_max?: number | null
          faixa_pj_f1_min?: number | null
          faixa_pj_f2_max?: number | null
          faixa_pj_f2_min?: number | null
          faixa_pj_f3_max?: number | null
          faixa_pj_f3_min?: number | null
          faixa_pj_f4_max?: number | null
          faixa_pj_f4_min?: number | null
          faixa_pj_f5_max?: number | null
          faixa_pj_f5_min?: number | null
          ferramentas?: string[] | null
          id?: string
          is_clevel?: boolean | null
          missao?: string | null
          nivel: string
          nome: string
          protege_salario?: boolean | null
          responsabilidades?: string[] | null
          skills_desejadas?: string[] | null
          skills_obrigatorias?: string[] | null
          template_id_padrao?: string | null
          tipo_contrato?: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          departamento?: string | null
          departamento_id?: string | null
          faixa_clt_f1_max?: number | null
          faixa_clt_f1_min?: number | null
          faixa_clt_f2_max?: number | null
          faixa_clt_f2_min?: number | null
          faixa_clt_f3_max?: number | null
          faixa_clt_f3_min?: number | null
          faixa_clt_f4_max?: number | null
          faixa_clt_f4_min?: number | null
          faixa_clt_f5_max?: number | null
          faixa_clt_f5_min?: number | null
          faixa_pj_f1_max?: number | null
          faixa_pj_f1_min?: number | null
          faixa_pj_f2_max?: number | null
          faixa_pj_f2_min?: number | null
          faixa_pj_f3_max?: number | null
          faixa_pj_f3_min?: number | null
          faixa_pj_f4_max?: number | null
          faixa_pj_f4_min?: number | null
          faixa_pj_f5_max?: number | null
          faixa_pj_f5_min?: number | null
          ferramentas?: string[] | null
          id?: string
          is_clevel?: boolean | null
          missao?: string | null
          nivel?: string
          nome?: string
          protege_salario?: boolean | null
          responsabilidades?: string[] | null
          skills_desejadas?: string[] | null
          skills_obrigatorias?: string[] | null
          template_id_padrao?: string | null
          tipo_contrato?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cargos_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "parametros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargos_template_id_padrao_fkey"
            columns: ["template_id_padrao"]
            isOneToOne: false
            referencedRelation: "cargo_template"
            referencedColumns: ["id"]
          },
        ]
      }
      classificacao_dados: {
        Row: {
          base_legal: string | null
          descricao: string | null
          id: string
          politica: string
          retencao_anos: number | null
          tabela: string
        }
        Insert: {
          base_legal?: string | null
          descricao?: string | null
          id?: string
          politica: string
          retencao_anos?: number | null
          tabela: string
        }
        Update: {
          base_legal?: string | null
          descricao?: string | null
          id?: string
          politica?: string
          retencao_anos?: number | null
          tabela?: string
        }
        Relationships: []
      }
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
          departamento_id: string | null
          id: string
          percentual_rateio: number
          updated_at: string
        }
        Insert: {
          colaborador_id: string
          created_at?: string
          departamento: string
          departamento_id?: string | null
          id?: string
          percentual_rateio?: number
          updated_at?: string
        }
        Update: {
          colaborador_id?: string
          created_at?: string
          departamento?: string
          departamento_id?: string | null
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
          {
            foreignKeyName: "colaborador_departamentos_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "parametros"
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
          acesso_revogado_em: string | null
          agencia: string | null
          bairro: string | null
          banco_codigo: string | null
          banco_nome: string | null
          cargo: string
          cargo_id: string | null
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
          data_desligamento: string | null
          data_integracao: string | null
          data_nascimento: string
          departamento: string
          departamento_id: string | null
          email_corporativo: string | null
          email_pessoal: string | null
          estado_civil: string | null
          etnia: string | null
          fim_periodo_experiencia_1: string | null
          fim_periodo_experiencia_2: string | null
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
          telefone_corporativo: string | null
          tipo_conta: string | null
          tipo_contrato: string
          titulo_eleitor: string | null
          uf: string | null
          unidade_id: string | null
          updated_at: string
          user_id: string | null
          zona_eleitoral: string | null
        }
        Insert: {
          acesso_revogado_em?: string | null
          agencia?: string | null
          bairro?: string | null
          banco_codigo?: string | null
          banco_nome?: string | null
          cargo: string
          cargo_id?: string | null
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
          data_desligamento?: string | null
          data_integracao?: string | null
          data_nascimento: string
          departamento: string
          departamento_id?: string | null
          email_corporativo?: string | null
          email_pessoal?: string | null
          estado_civil?: string | null
          etnia?: string | null
          fim_periodo_experiencia_1?: string | null
          fim_periodo_experiencia_2?: string | null
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
          telefone_corporativo?: string | null
          tipo_conta?: string | null
          tipo_contrato?: string
          titulo_eleitor?: string | null
          uf?: string | null
          unidade_id?: string | null
          updated_at?: string
          user_id?: string | null
          zona_eleitoral?: string | null
        }
        Update: {
          acesso_revogado_em?: string | null
          agencia?: string | null
          bairro?: string | null
          banco_codigo?: string | null
          banco_nome?: string | null
          cargo?: string
          cargo_id?: string | null
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
          data_desligamento?: string | null
          data_integracao?: string | null
          data_nascimento?: string
          departamento?: string
          departamento_id?: string | null
          email_corporativo?: string | null
          email_pessoal?: string | null
          estado_civil?: string | null
          etnia?: string | null
          fim_periodo_experiencia_1?: string | null
          fim_periodo_experiencia_2?: string | null
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
          telefone_corporativo?: string | null
          tipo_conta?: string | null
          tipo_contrato?: string
          titulo_eleitor?: string | null
          uf?: string | null
          unidade_id?: string | null
          updated_at?: string
          user_id?: string | null
          zona_eleitoral?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "colaboradores_clt_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaboradores_clt_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "parametros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaboradores_clt_gestor_direto_id_fkey"
            columns: ["gestor_direto_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaboradores_clt_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      consentimentos_lgpd: {
        Row: {
          aceito: boolean
          criado_em: string
          id: string
          ip_origem: string | null
          revogado_em: string | null
          texto_versao: string
          tipo: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          aceito: boolean
          criado_em?: string
          id?: string
          ip_origem?: string | null
          revogado_em?: string | null
          texto_versao: string
          tipo: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          aceito?: boolean
          criado_em?: string
          id?: string
          ip_origem?: string | null
          revogado_em?: string | null
          texto_versao?: string
          tipo?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      contrato_pj_acessos_sistemas: {
        Row: {
          contrato_pj_id: string
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
          contrato_pj_id: string
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
          contrato_pj_id?: string
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
            foreignKeyName: "contrato_pj_acessos_sistemas_contrato_pj_id_fkey"
            columns: ["contrato_pj_id"]
            isOneToOne: false
            referencedRelation: "contratos_pj"
            referencedColumns: ["id"]
          },
        ]
      }
      contrato_pj_equipamentos: {
        Row: {
          contrato_pj_id: string
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
          contrato_pj_id: string
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
          contrato_pj_id?: string
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
            foreignKeyName: "contrato_pj_equipamentos_contrato_pj_id_fkey"
            columns: ["contrato_pj_id"]
            isOneToOne: false
            referencedRelation: "contratos_pj"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos_pj: {
        Row: {
          acesso_revogado_em: string | null
          agencia: string | null
          bairro: string | null
          banco_codigo: string | null
          banco_nome: string | null
          cargo_id: string | null
          categoria_pj: string
          cep: string | null
          chave_pix: string | null
          cidade: string | null
          cnpj: string
          complemento: string | null
          conta: string | null
          contato_email: string | null
          contato_emergencia_nome: string | null
          contato_emergencia_telefone: string | null
          contato_nome: string
          contato_telefone: string | null
          contrato_assinado: boolean
          cpf: string | null
          created_at: string
          created_by: string | null
          data_fim: string | null
          data_inicio: string
          data_nascimento: string | null
          departamento: string
          departamento_id: string | null
          dia_vencimento: number | null
          email_corporativo: string | null
          email_pessoal: string | null
          estado_civil: string | null
          etnia: string | null
          forma_pagamento: string
          foto_url: string | null
          genero: string | null
          gestor_direto_id: string | null
          id: string
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          logradouro: string | null
          nacionalidade: string | null
          nome_fantasia: string | null
          nome_mae: string | null
          nome_pai: string | null
          numero: string | null
          objeto: string | null
          observacoes: string | null
          orgao_emissor: string | null
          razao_social: string
          renovacao_automatica: boolean
          rg: string | null
          status: string
          telefone: string | null
          telefone_corporativo: string | null
          tipo_conta: string | null
          tipo_servico: string
          uf: string | null
          unidade_id: string | null
          updated_at: string
          user_id: string | null
          valor_mensal: number
        }
        Insert: {
          acesso_revogado_em?: string | null
          agencia?: string | null
          bairro?: string | null
          banco_codigo?: string | null
          banco_nome?: string | null
          cargo_id?: string | null
          categoria_pj?: string
          cep?: string | null
          chave_pix?: string | null
          cidade?: string | null
          cnpj: string
          complemento?: string | null
          conta?: string | null
          contato_email?: string | null
          contato_emergencia_nome?: string | null
          contato_emergencia_telefone?: string | null
          contato_nome: string
          contato_telefone?: string | null
          contrato_assinado?: boolean
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio: string
          data_nascimento?: string | null
          departamento: string
          departamento_id?: string | null
          dia_vencimento?: number | null
          email_corporativo?: string | null
          email_pessoal?: string | null
          estado_civil?: string | null
          etnia?: string | null
          forma_pagamento?: string
          foto_url?: string | null
          genero?: string | null
          gestor_direto_id?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          logradouro?: string | null
          nacionalidade?: string | null
          nome_fantasia?: string | null
          nome_mae?: string | null
          nome_pai?: string | null
          numero?: string | null
          objeto?: string | null
          observacoes?: string | null
          orgao_emissor?: string | null
          razao_social: string
          renovacao_automatica?: boolean
          rg?: string | null
          status?: string
          telefone?: string | null
          telefone_corporativo?: string | null
          tipo_conta?: string | null
          tipo_servico: string
          uf?: string | null
          unidade_id?: string | null
          updated_at?: string
          user_id?: string | null
          valor_mensal: number
        }
        Update: {
          acesso_revogado_em?: string | null
          agencia?: string | null
          bairro?: string | null
          banco_codigo?: string | null
          banco_nome?: string | null
          cargo_id?: string | null
          categoria_pj?: string
          cep?: string | null
          chave_pix?: string | null
          cidade?: string | null
          cnpj?: string
          complemento?: string | null
          conta?: string | null
          contato_email?: string | null
          contato_emergencia_nome?: string | null
          contato_emergencia_telefone?: string | null
          contato_nome?: string
          contato_telefone?: string | null
          contrato_assinado?: boolean
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string
          data_nascimento?: string | null
          departamento?: string
          departamento_id?: string | null
          dia_vencimento?: number | null
          email_corporativo?: string | null
          email_pessoal?: string | null
          estado_civil?: string | null
          etnia?: string | null
          forma_pagamento?: string
          foto_url?: string | null
          genero?: string | null
          gestor_direto_id?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          logradouro?: string | null
          nacionalidade?: string | null
          nome_fantasia?: string | null
          nome_mae?: string | null
          nome_pai?: string | null
          numero?: string | null
          objeto?: string | null
          observacoes?: string | null
          orgao_emissor?: string | null
          razao_social?: string
          renovacao_automatica?: boolean
          rg?: string | null
          status?: string
          telefone?: string | null
          telefone_corporativo?: string | null
          tipo_conta?: string | null
          tipo_servico?: string
          uf?: string | null
          unidade_id?: string | null
          updated_at?: string
          user_id?: string | null
          valor_mensal?: number
        }
        Relationships: [
          {
            foreignKeyName: "contratos_pj_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_pj_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "parametros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_pj_gestor_direto_id_fkey"
            columns: ["gestor_direto_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_pj_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      convites_cadastro: {
        Row: {
          cargo: string | null
          cargo_id: string | null
          colaborador_id: string | null
          contrato_pj_id: string | null
          created_at: string
          criado_por: string | null
          dados_contratacao: Json | null
          dados_preenchidos: Json | null
          data_inicio_prevista: string | null
          departamento: string | null
          departamento_id: string | null
          email: string
          expira_em: string
          grupo_acesso_id: string | null
          id: string
          lembretes_ativos: boolean
          lembretes_suspenso_em: string | null
          lembretes_suspenso_por: string | null
          lider_direto_id: string | null
          nome: string
          observacoes_colaborador: string | null
          origem: string
          prazo_dias: number
          preenchido_em: string | null
          salario_previsto: number | null
          status: string
          tipo: string
          token: string
          unidade_id: string | null
          updated_at: string
        }
        Insert: {
          cargo?: string | null
          cargo_id?: string | null
          colaborador_id?: string | null
          contrato_pj_id?: string | null
          created_at?: string
          criado_por?: string | null
          dados_contratacao?: Json | null
          dados_preenchidos?: Json | null
          data_inicio_prevista?: string | null
          departamento?: string | null
          departamento_id?: string | null
          email: string
          expira_em?: string
          grupo_acesso_id?: string | null
          id?: string
          lembretes_ativos?: boolean
          lembretes_suspenso_em?: string | null
          lembretes_suspenso_por?: string | null
          lider_direto_id?: string | null
          nome: string
          observacoes_colaborador?: string | null
          origem?: string
          prazo_dias?: number
          preenchido_em?: string | null
          salario_previsto?: number | null
          status?: string
          tipo: string
          token?: string
          unidade_id?: string | null
          updated_at?: string
        }
        Update: {
          cargo?: string | null
          cargo_id?: string | null
          colaborador_id?: string | null
          contrato_pj_id?: string | null
          created_at?: string
          criado_por?: string | null
          dados_contratacao?: Json | null
          dados_preenchidos?: Json | null
          data_inicio_prevista?: string | null
          departamento?: string | null
          departamento_id?: string | null
          email?: string
          expira_em?: string
          grupo_acesso_id?: string | null
          id?: string
          lembretes_ativos?: boolean
          lembretes_suspenso_em?: string | null
          lembretes_suspenso_por?: string | null
          lider_direto_id?: string | null
          nome?: string
          observacoes_colaborador?: string | null
          origem?: string
          prazo_dias?: number
          preenchido_em?: string | null
          salario_previsto?: number | null
          status?: string
          tipo?: string
          token?: string
          unidade_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "convites_cadastro_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "convites_cadastro_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores_clt"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "convites_cadastro_contrato_pj_id_fkey"
            columns: ["contrato_pj_id"]
            isOneToOne: false
            referencedRelation: "contratos_pj"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "convites_cadastro_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "parametros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "convites_cadastro_grupo_acesso_id_fkey"
            columns: ["grupo_acesso_id"]
            isOneToOne: false
            referencedRelation: "grupos_acesso"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "convites_cadastro_lider_direto_id_fkey"
            columns: ["lider_direto_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "convites_cadastro_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      delegacoes_gestao: {
        Row: {
          ativa: boolean
          criado_em: string
          criado_por: string | null
          data_fim: string
          data_inicio: string
          gestor_original_id: string
          id: string
          motivo: string
          observacao: string | null
          substituto_id: string
        }
        Insert: {
          ativa?: boolean
          criado_em?: string
          criado_por?: string | null
          data_fim: string
          data_inicio: string
          gestor_original_id: string
          id?: string
          motivo: string
          observacao?: string | null
          substituto_id: string
        }
        Update: {
          ativa?: boolean
          criado_em?: string
          criado_por?: string | null
          data_fim?: string
          data_inicio?: string
          gestor_original_id?: string
          id?: string
          motivo?: string
          observacao?: string | null
          substituto_id?: string
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
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      entrevistas_candidato: {
        Row: {
          candidato_id: string
          created_at: string | null
          fit_cultural: number | null
          id: string
          impressao_geral: number | null
          observacoes: string | null
          pontos_atencao: string | null
          pontos_fortes: string | null
          preenchido_por: string | null
          recomendacao: string | null
          tipo: string
          updated_at: string | null
          vaga_id: string
        }
        Insert: {
          candidato_id: string
          created_at?: string | null
          fit_cultural?: number | null
          id?: string
          impressao_geral?: number | null
          observacoes?: string | null
          pontos_atencao?: string | null
          pontos_fortes?: string | null
          preenchido_por?: string | null
          recomendacao?: string | null
          tipo: string
          updated_at?: string | null
          vaga_id: string
        }
        Update: {
          candidato_id?: string
          created_at?: string | null
          fit_cultural?: number | null
          id?: string
          impressao_geral?: number | null
          observacoes?: string | null
          pontos_atencao?: string | null
          pontos_fortes?: string | null
          preenchido_por?: string | null
          recomendacao?: string | null
          tipo?: string
          updated_at?: string | null
          vaga_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entrevistas_candidato_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrevistas_candidato_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas"
            referencedColumns: ["id"]
          },
        ]
      }
      fala_fetely_conhecimento: {
        Row: {
          aprovado_em: string | null
          aprovado_por: string | null
          area_negocio: string | null
          ativo: boolean
          cargos_aplicaveis: Json | null
          categoria: string
          conteudo: string
          created_at: string
          criado_por: string | null
          departamentos_aplicaveis: Json | null
          fonte: string | null
          fonte_arquivo_nome: string | null
          fonte_arquivo_url: string | null
          id: string
          lote_importacao_id: string | null
          niveis_aplicaveis: Json | null
          origem: string
          publico_alvo: string
          sugerido_por: string | null
          tags: string[] | null
          titulo: string
          updated_at: string
          versao: number
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          area_negocio?: string | null
          ativo?: boolean
          cargos_aplicaveis?: Json | null
          categoria: string
          conteudo: string
          created_at?: string
          criado_por?: string | null
          departamentos_aplicaveis?: Json | null
          fonte?: string | null
          fonte_arquivo_nome?: string | null
          fonte_arquivo_url?: string | null
          id?: string
          lote_importacao_id?: string | null
          niveis_aplicaveis?: Json | null
          origem?: string
          publico_alvo?: string
          sugerido_por?: string | null
          tags?: string[] | null
          titulo: string
          updated_at?: string
          versao?: number
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          area_negocio?: string | null
          ativo?: boolean
          cargos_aplicaveis?: Json | null
          categoria?: string
          conteudo?: string
          created_at?: string
          criado_por?: string | null
          departamentos_aplicaveis?: Json | null
          fonte?: string | null
          fonte_arquivo_nome?: string | null
          fonte_arquivo_url?: string | null
          id?: string
          lote_importacao_id?: string | null
          niveis_aplicaveis?: Json | null
          origem?: string
          publico_alvo?: string
          sugerido_por?: string | null
          tags?: string[] | null
          titulo?: string
          updated_at?: string
          versao?: number
        }
        Relationships: []
      }
      fala_fetely_conversas: {
        Row: {
          arquivada: boolean
          created_at: string
          id: string
          memorias_extraidas: boolean
          titulo: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          arquivada?: boolean
          created_at?: string
          id?: string
          memorias_extraidas?: boolean
          titulo?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          arquivada?: boolean
          created_at?: string
          id?: string
          memorias_extraidas?: boolean
          titulo?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fala_fetely_feedback: {
        Row: {
          comentario: string | null
          created_at: string
          id: string
          mensagem_id: string
          motivo: string | null
          resposta_esperada: string | null
          user_id: string
          util: boolean
        }
        Insert: {
          comentario?: string | null
          created_at?: string
          id?: string
          mensagem_id: string
          motivo?: string | null
          resposta_esperada?: string | null
          user_id: string
          util: boolean
        }
        Update: {
          comentario?: string | null
          created_at?: string
          id?: string
          mensagem_id?: string
          motivo?: string | null
          resposta_esperada?: string | null
          user_id?: string
          util?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "fala_fetely_feedback_mensagem_id_fkey"
            columns: ["mensagem_id"]
            isOneToOne: false
            referencedRelation: "fala_fetely_mensagens"
            referencedColumns: ["id"]
          },
        ]
      }
      fala_fetely_importacoes_pdf: {
        Row: {
          arquivo_nome: string
          arquivo_url: string
          concluida_em: string | null
          conhecimentos_criados: number | null
          created_at: string
          erro_mensagem: string | null
          id: string
          status: string
          tamanho_bytes: number | null
          user_id: string
        }
        Insert: {
          arquivo_nome: string
          arquivo_url: string
          concluida_em?: string | null
          conhecimentos_criados?: number | null
          created_at?: string
          erro_mensagem?: string | null
          id?: string
          status?: string
          tamanho_bytes?: number | null
          user_id: string
        }
        Update: {
          arquivo_nome?: string
          arquivo_url?: string
          concluida_em?: string | null
          conhecimentos_criados?: number | null
          created_at?: string
          erro_mensagem?: string | null
          id?: string
          status?: string
          tamanho_bytes?: number | null
          user_id?: string
        }
        Relationships: []
      }
      fala_fetely_memoria: {
        Row: {
          ativo: boolean
          conteudo_completo: string | null
          conversa_origem_id: string | null
          created_at: string
          id: string
          mensagem_origem_id: string | null
          origem: string
          relevancia: number
          resumo: string
          tags: string[] | null
          tipo: string
          ultimo_uso: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          conteudo_completo?: string | null
          conversa_origem_id?: string | null
          created_at?: string
          id?: string
          mensagem_origem_id?: string | null
          origem?: string
          relevancia?: number
          resumo: string
          tags?: string[] | null
          tipo: string
          ultimo_uso?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          conteudo_completo?: string | null
          conversa_origem_id?: string | null
          created_at?: string
          id?: string
          mensagem_origem_id?: string | null
          origem?: string
          relevancia?: number
          resumo?: string
          tags?: string[] | null
          tipo?: string
          ultimo_uso?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fala_fetely_memoria_conversa_origem_id_fkey"
            columns: ["conversa_origem_id"]
            isOneToOne: false
            referencedRelation: "fala_fetely_conversas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fala_fetely_memoria_mensagem_origem_id_fkey"
            columns: ["mensagem_origem_id"]
            isOneToOne: false
            referencedRelation: "fala_fetely_mensagens"
            referencedColumns: ["id"]
          },
        ]
      }
      fala_fetely_mensagens: {
        Row: {
          conteudo: string
          conversa_id: string
          created_at: string
          fontes_consultadas: Json | null
          id: string
          papel: string
        }
        Insert: {
          conteudo: string
          conversa_id: string
          created_at?: string
          fontes_consultadas?: Json | null
          id?: string
          papel: string
        }
        Update: {
          conteudo?: string
          conversa_id?: string
          created_at?: string
          fontes_consultadas?: Json | null
          id?: string
          papel?: string
        }
        Relationships: [
          {
            foreignKeyName: "fala_fetely_mensagens_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "fala_fetely_conversas"
            referencedColumns: ["id"]
          },
        ]
      }
      fala_fetely_sugestoes_conhecimento: {
        Row: {
          categoria_sugerida: string | null
          conhecimento_gerado_id: string | null
          correcao_sugerida: string
          created_at: string
          id: string
          mensagem_id: string | null
          observacao_revisao: string | null
          origem: string
          pergunta_original: string | null
          resposta_ia: string | null
          revisado_em: string | null
          revisado_por: string | null
          status: string
          titulo_sugerido: string | null
          user_id: string
        }
        Insert: {
          categoria_sugerida?: string | null
          conhecimento_gerado_id?: string | null
          correcao_sugerida: string
          created_at?: string
          id?: string
          mensagem_id?: string | null
          observacao_revisao?: string | null
          origem?: string
          pergunta_original?: string | null
          resposta_ia?: string | null
          revisado_em?: string | null
          revisado_por?: string | null
          status?: string
          titulo_sugerido?: string | null
          user_id: string
        }
        Update: {
          categoria_sugerida?: string | null
          conhecimento_gerado_id?: string | null
          correcao_sugerida?: string
          created_at?: string
          id?: string
          mensagem_id?: string | null
          observacao_revisao?: string | null
          origem?: string
          pergunta_original?: string | null
          resposta_ia?: string | null
          revisado_em?: string | null
          revisado_por?: string | null
          status?: string
          titulo_sugerido?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fala_fetely_sugestoes_conhecimento_conhecimento_gerado_id_fkey"
            columns: ["conhecimento_gerado_id"]
            isOneToOne: false
            referencedRelation: "fala_fetely_conhecimento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fala_fetely_sugestoes_conhecimento_mensagem_id_fkey"
            columns: ["mensagem_id"]
            isOneToOne: false
            referencedRelation: "fala_fetely_mensagens"
            referencedColumns: ["id"]
          },
        ]
      }
      ferias_periodos: {
        Row: {
          colaborador_id: string
          created_at: string
          dias_direito: number
          dias_gozados: number
          dias_vendidos: number
          id: string
          observacoes: string | null
          periodo_fim: string
          periodo_inicio: string
          saldo: number | null
          status: string
          updated_at: string
        }
        Insert: {
          colaborador_id: string
          created_at?: string
          dias_direito?: number
          dias_gozados?: number
          dias_vendidos?: number
          id?: string
          observacoes?: string | null
          periodo_fim: string
          periodo_inicio: string
          saldo?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          colaborador_id?: string
          created_at?: string
          dias_direito?: number
          dias_gozados?: number
          dias_vendidos?: number
          id?: string
          observacoes?: string | null
          periodo_fim?: string
          periodo_inicio?: string
          saldo?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ferias_periodos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores_clt"
            referencedColumns: ["id"]
          },
        ]
      }
      ferias_periodos_pj: {
        Row: {
          contrato_id: string
          created_at: string
          dias_direito: number
          dias_gozados: number
          dias_vendidos: number
          id: string
          observacoes: string | null
          periodo_fim: string
          periodo_inicio: string
          saldo: number | null
          status: string
          updated_at: string
        }
        Insert: {
          contrato_id: string
          created_at?: string
          dias_direito?: number
          dias_gozados?: number
          dias_vendidos?: number
          id?: string
          observacoes?: string | null
          periodo_fim: string
          periodo_inicio: string
          saldo?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          contrato_id?: string
          created_at?: string
          dias_direito?: number
          dias_gozados?: number
          dias_vendidos?: number
          id?: string
          observacoes?: string | null
          periodo_fim?: string
          periodo_inicio?: string
          saldo?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ferias_periodos_pj_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos_pj"
            referencedColumns: ["id"]
          },
        ]
      }
      ferias_pj: {
        Row: {
          contrato_id: string
          created_at: string
          data_fim: string
          data_inicio: string
          dias: number
          id: string
          observacoes: string | null
          periodo_pj_id: string | null
          status: string
          tipo: string
          updated_at: string
        }
        Insert: {
          contrato_id: string
          created_at?: string
          data_fim: string
          data_inicio: string
          dias: number
          id?: string
          observacoes?: string | null
          periodo_pj_id?: string | null
          status?: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          contrato_id?: string
          created_at?: string
          data_fim?: string
          data_inicio?: string
          dias?: number
          id?: string
          observacoes?: string | null
          periodo_pj_id?: string | null
          status?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ferias_pj_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos_pj"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferias_pj_periodo_pj_id_fkey"
            columns: ["periodo_pj_id"]
            isOneToOne: false
            referencedRelation: "ferias_periodos_pj"
            referencedColumns: ["id"]
          },
        ]
      }
      ferias_programacoes: {
        Row: {
          aprovador_id: string | null
          colaborador_id: string
          created_at: string
          data_aprovacao: string | null
          data_fim: string
          data_inicio: string
          dias: number
          id: string
          observacoes: string | null
          periodo_id: string
          status: string
          tipo: string
          updated_at: string
        }
        Insert: {
          aprovador_id?: string | null
          colaborador_id: string
          created_at?: string
          data_aprovacao?: string | null
          data_fim: string
          data_inicio: string
          dias: number
          id?: string
          observacoes?: string | null
          periodo_id: string
          status?: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          aprovador_id?: string | null
          colaborador_id?: string
          created_at?: string
          data_aprovacao?: string | null
          data_fim?: string
          data_inicio?: string
          dias?: number
          id?: string
          observacoes?: string | null
          periodo_id?: string
          status?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ferias_programacoes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores_clt"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferias_programacoes_periodo_id_fkey"
            columns: ["periodo_id"]
            isOneToOne: false
            referencedRelation: "ferias_periodos"
            referencedColumns: ["id"]
          },
        ]
      }
      ferramentas_catalogo: {
        Row: {
          area: string
          ativo: boolean | null
          created_at: string | null
          criado_por: string | null
          ferramenta: string
          id: string
        }
        Insert: {
          area?: string
          ativo?: boolean | null
          created_at?: string | null
          criado_por?: string | null
          ferramenta: string
          id?: string
        }
        Update: {
          area?: string
          ativo?: boolean | null
          created_at?: string | null
          criado_por?: string | null
          ferramenta?: string
          id?: string
        }
        Relationships: []
      }
      folha_competencias: {
        Row: {
          competencia: string
          created_at: string
          id: string
          observacoes: string | null
          status: string
          total_bruto: number | null
          total_colaboradores: number | null
          total_encargos: number | null
          total_liquido: number | null
          updated_at: string
        }
        Insert: {
          competencia: string
          created_at?: string
          id?: string
          observacoes?: string | null
          status?: string
          total_bruto?: number | null
          total_colaboradores?: number | null
          total_encargos?: number | null
          total_liquido?: number | null
          updated_at?: string
        }
        Update: {
          competencia?: string
          created_at?: string
          id?: string
          observacoes?: string | null
          status?: string
          total_bruto?: number | null
          total_colaboradores?: number | null
          total_encargos?: number | null
          total_liquido?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      grupos_acesso: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          is_system: boolean
          nome: string
          role_automatico: Database["public"]["Enums"]["app_role"]
          tipo_colaborador: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          is_system?: boolean
          nome: string
          role_automatico?: Database["public"]["Enums"]["app_role"]
          tipo_colaborador: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          is_system?: boolean
          nome?: string
          role_automatico?: Database["public"]["Enums"]["app_role"]
          tipo_colaborador?: string
          updated_at?: string
        }
        Relationships: []
      }
      holerites: {
        Row: {
          adicional_noturno: number | null
          colaborador_id: string
          competencia_id: string
          created_at: string
          faltas_desconto: number | null
          faltas_dias: number | null
          fgts: number | null
          horas_extras_100: number | null
          horas_extras_100_qtd: number | null
          horas_extras_50: number | null
          horas_extras_50_qtd: number | null
          id: string
          inss: number | null
          inss_patronal: number | null
          irrf: number | null
          outros_descontos: number | null
          outros_proventos: number | null
          plano_saude: number | null
          salario_base: number
          salario_liquido: number | null
          total_descontos: number | null
          total_encargos: number | null
          total_proventos: number | null
          updated_at: string
          vr_desconto: number | null
          vt_desconto: number | null
        }
        Insert: {
          adicional_noturno?: number | null
          colaborador_id: string
          competencia_id: string
          created_at?: string
          faltas_desconto?: number | null
          faltas_dias?: number | null
          fgts?: number | null
          horas_extras_100?: number | null
          horas_extras_100_qtd?: number | null
          horas_extras_50?: number | null
          horas_extras_50_qtd?: number | null
          id?: string
          inss?: number | null
          inss_patronal?: number | null
          irrf?: number | null
          outros_descontos?: number | null
          outros_proventos?: number | null
          plano_saude?: number | null
          salario_base?: number
          salario_liquido?: number | null
          total_descontos?: number | null
          total_encargos?: number | null
          total_proventos?: number | null
          updated_at?: string
          vr_desconto?: number | null
          vt_desconto?: number | null
        }
        Update: {
          adicional_noturno?: number | null
          colaborador_id?: string
          competencia_id?: string
          created_at?: string
          faltas_desconto?: number | null
          faltas_dias?: number | null
          fgts?: number | null
          horas_extras_100?: number | null
          horas_extras_100_qtd?: number | null
          horas_extras_50?: number | null
          horas_extras_50_qtd?: number | null
          id?: string
          inss?: number | null
          inss_patronal?: number | null
          irrf?: number | null
          outros_descontos?: number | null
          outros_proventos?: number | null
          plano_saude?: number | null
          salario_base?: number
          salario_liquido?: number | null
          total_descontos?: number | null
          total_encargos?: number | null
          total_proventos?: number | null
          updated_at?: string
          vr_desconto?: number | null
          vt_desconto?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "holerites_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores_clt"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holerites_competencia_id_fkey"
            columns: ["competencia_id"]
            isOneToOne: false
            referencedRelation: "folha_competencias"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes: {
        Row: {
          cargo_anterior: string | null
          cargo_novo: string | null
          colaborador_id: string | null
          contrato_pj_id: string | null
          created_at: string
          created_by: string | null
          data_efetivacao: string
          departamento_anterior: string | null
          departamento_novo: string | null
          id: string
          motivo: string | null
          observacoes: string | null
          salario_anterior: number | null
          salario_novo: number | null
          status: string
          tipo: string
          updated_at: string
        }
        Insert: {
          cargo_anterior?: string | null
          cargo_novo?: string | null
          colaborador_id?: string | null
          contrato_pj_id?: string | null
          created_at?: string
          created_by?: string | null
          data_efetivacao: string
          departamento_anterior?: string | null
          departamento_novo?: string | null
          id?: string
          motivo?: string | null
          observacoes?: string | null
          salario_anterior?: number | null
          salario_novo?: number | null
          status?: string
          tipo: string
          updated_at?: string
        }
        Update: {
          cargo_anterior?: string | null
          cargo_novo?: string | null
          colaborador_id?: string | null
          contrato_pj_id?: string | null
          created_at?: string
          created_by?: string | null
          data_efetivacao?: string
          departamento_anterior?: string | null
          departamento_novo?: string | null
          id?: string
          motivo?: string | null
          observacoes?: string | null
          salario_anterior?: number | null
          salario_novo?: number | null
          status?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores_clt"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_contrato_pj_id_fkey"
            columns: ["contrato_pj_id"]
            isOneToOne: false
            referencedRelation: "contratos_pj"
            referencedColumns: ["id"]
          },
        ]
      }
      mural_preferencias_usuario: {
        Row: {
          aparecer_no_mural: boolean
          atualizado_em: string
          user_id: string
        }
        Insert: {
          aparecer_no_mural?: boolean
          atualizado_em?: string
          user_id: string
        }
        Update: {
          aparecer_no_mural?: boolean
          atualizado_em?: string
          user_id?: string
        }
        Relationships: []
      }
      mural_publicacoes: {
        Row: {
          aprovado_por: string | null
          area_alvo: string | null
          cor_tema: string | null
          created_at: string
          criado_por: string | null
          data_evento: string | null
          emoji: string | null
          expira_em: string | null
          fixado: boolean | null
          foto_url: string | null
          id: string
          kpi_id: string | null
          mensagem: string | null
          origem: string
          pessoa_alvo_id: string | null
          pessoa_alvo_nome: string | null
          pessoa_alvo_tipo: string | null
          publicado_em: string | null
          segmentacao: Json | null
          status: string
          subtipo: string | null
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          aprovado_por?: string | null
          area_alvo?: string | null
          cor_tema?: string | null
          created_at?: string
          criado_por?: string | null
          data_evento?: string | null
          emoji?: string | null
          expira_em?: string | null
          fixado?: boolean | null
          foto_url?: string | null
          id?: string
          kpi_id?: string | null
          mensagem?: string | null
          origem?: string
          pessoa_alvo_id?: string | null
          pessoa_alvo_nome?: string | null
          pessoa_alvo_tipo?: string | null
          publicado_em?: string | null
          segmentacao?: Json | null
          status?: string
          subtipo?: string | null
          tipo: string
          titulo: string
          updated_at?: string
        }
        Update: {
          aprovado_por?: string | null
          area_alvo?: string | null
          cor_tema?: string | null
          created_at?: string
          criado_por?: string | null
          data_evento?: string | null
          emoji?: string | null
          expira_em?: string | null
          fixado?: boolean | null
          foto_url?: string | null
          id?: string
          kpi_id?: string | null
          mensagem?: string | null
          origem?: string
          pessoa_alvo_id?: string | null
          pessoa_alvo_nome?: string | null
          pessoa_alvo_tipo?: string | null
          publicado_em?: string | null
          segmentacao?: Json | null
          status?: string
          subtipo?: string | null
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      navegacao_log: {
        Row: {
          acessado_em: string
          id: string
          rota: string
          titulo: string | null
          user_id: string
        }
        Insert: {
          acessado_em?: string
          id?: string
          rota: string
          titulo?: string | null
          user_id: string
        }
        Update: {
          acessado_em?: string
          id?: string
          rota?: string
          titulo?: string | null
          user_id?: string
        }
        Relationships: []
      }
      nf_pj_classificacoes: {
        Row: {
          categoria_valor: string
          created_at: string
          created_by: string | null
          descricao_adicional: string | null
          id: string
          justificativa: string | null
          nota_fiscal_id: string
          ordem: number
          updated_at: string
          valor: number
        }
        Insert: {
          categoria_valor: string
          created_at?: string
          created_by?: string | null
          descricao_adicional?: string | null
          id?: string
          justificativa?: string | null
          nota_fiscal_id: string
          ordem?: number
          updated_at?: string
          valor: number
        }
        Update: {
          categoria_valor?: string
          created_at?: string
          created_by?: string | null
          descricao_adicional?: string | null
          id?: string
          justificativa?: string | null
          nota_fiscal_id?: string
          ordem?: number
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "nf_pj_classificacoes_nota_fiscal_id_fkey"
            columns: ["nota_fiscal_id"]
            isOneToOne: false
            referencedRelation: "notas_fiscais_pj"
            referencedColumns: ["id"]
          },
        ]
      }
      nf_pj_log_fiscal: {
        Row: {
          ator_papel: string | null
          ator_user_id: string | null
          detalhes: Json | null
          email_destinatario: string | null
          hash_arquivo: string | null
          id: string
          nota_fiscal_id: string
          registrado_em: string
          tipo_evento: string
        }
        Insert: {
          ator_papel?: string | null
          ator_user_id?: string | null
          detalhes?: Json | null
          email_destinatario?: string | null
          hash_arquivo?: string | null
          id?: string
          nota_fiscal_id: string
          registrado_em?: string
          tipo_evento: string
        }
        Update: {
          ator_papel?: string | null
          ator_user_id?: string | null
          detalhes?: Json | null
          email_destinatario?: string | null
          hash_arquivo?: string | null
          id?: string
          nota_fiscal_id?: string
          registrado_em?: string
          tipo_evento?: string
        }
        Relationships: [
          {
            foreignKeyName: "nf_pj_log_fiscal_nota_fiscal_id_fkey"
            columns: ["nota_fiscal_id"]
            isOneToOne: false
            referencedRelation: "notas_fiscais_pj"
            referencedColumns: ["id"]
          },
        ]
      }
      notas_fiscais_pj: {
        Row: {
          arquivo_url: string | null
          competencia: string
          contrato_id: string
          created_at: string
          data_emissao: string
          data_pagamento: string | null
          data_vencimento: string | null
          descricao: string | null
          id: string
          numero: string
          observacoes: string | null
          serie: string | null
          status: string
          updated_at: string
          valor: number
        }
        Insert: {
          arquivo_url?: string | null
          competencia: string
          contrato_id: string
          created_at?: string
          data_emissao: string
          data_pagamento?: string | null
          data_vencimento?: string | null
          descricao?: string | null
          id?: string
          numero: string
          observacoes?: string | null
          serie?: string | null
          status?: string
          updated_at?: string
          valor: number
        }
        Update: {
          arquivo_url?: string | null
          competencia?: string
          contrato_id?: string
          created_at?: string
          data_emissao?: string
          data_pagamento?: string | null
          data_vencimento?: string | null
          descricao?: string | null
          id?: string
          numero?: string
          observacoes?: string | null
          serie?: string | null
          status?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "notas_fiscais_pj_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos_pj"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes_rh: {
        Row: {
          created_at: string
          id: string
          lida: boolean
          link: string | null
          mensagem: string | null
          tipo: string
          titulo: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          lida?: boolean
          link?: string | null
          mensagem?: string | null
          tipo: string
          titulo: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          lida?: boolean
          link?: string | null
          mensagem?: string | null
          tipo?: string
          titulo?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ofertas_candidato: {
        Row: {
          beneficios: string | null
          candidato_id: string
          created_at: string | null
          data_inicio: string | null
          enviado_em: string | null
          enviado_por: string | null
          id: string
          observacoes: string | null
          respondido_em: string | null
          salario_proposto: number | null
          status: string | null
          tipo_contrato: string | null
          updated_at: string | null
          vaga_id: string
        }
        Insert: {
          beneficios?: string | null
          candidato_id: string
          created_at?: string | null
          data_inicio?: string | null
          enviado_em?: string | null
          enviado_por?: string | null
          id?: string
          observacoes?: string | null
          respondido_em?: string | null
          salario_proposto?: number | null
          status?: string | null
          tipo_contrato?: string | null
          updated_at?: string | null
          vaga_id: string
        }
        Update: {
          beneficios?: string | null
          candidato_id?: string
          created_at?: string | null
          data_inicio?: string | null
          enviado_em?: string | null
          enviado_por?: string | null
          id?: string
          observacoes?: string | null
          respondido_em?: string | null
          salario_proposto?: number | null
          status?: string | null
          tipo_contrato?: string | null
          updated_at?: string | null
          vaga_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ofertas_candidato_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ofertas_candidato_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_checklists: {
        Row: {
          aviso_previo: boolean | null
          colaborador_id: string | null
          colaborador_tipo: string
          concluido_em: string | null
          convite_id: string | null
          coordenador_nome: string | null
          coordenador_user_id: string | null
          created_at: string
          data_efetivacao: string | null
          id: string
          motivo: string | null
          observacoes: string | null
          status: string
          tipo_processo: string | null
          updated_at: string
        }
        Insert: {
          aviso_previo?: boolean | null
          colaborador_id?: string | null
          colaborador_tipo: string
          concluido_em?: string | null
          convite_id?: string | null
          coordenador_nome?: string | null
          coordenador_user_id?: string | null
          created_at?: string
          data_efetivacao?: string | null
          id?: string
          motivo?: string | null
          observacoes?: string | null
          status?: string
          tipo_processo?: string | null
          updated_at?: string
        }
        Update: {
          aviso_previo?: boolean | null
          colaborador_id?: string | null
          colaborador_tipo?: string
          concluido_em?: string | null
          convite_id?: string | null
          coordenador_nome?: string | null
          coordenador_user_id?: string | null
          created_at?: string
          data_efetivacao?: string | null
          id?: string
          motivo?: string | null
          observacoes?: string | null
          status?: string
          tipo_processo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_checklists_convite_id_fkey"
            columns: ["convite_id"]
            isOneToOne: false
            referencedRelation: "convites_cadastro"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_tarefas: {
        Row: {
          checklist_id: string
          concluida_em: string | null
          concluida_por: string | null
          created_at: string
          descricao: string | null
          id: string
          prazo_data: string | null
          prazo_dias: number
          responsavel_role: Database["public"]["Enums"]["app_role"]
          responsavel_user_id: string | null
          status: string
          titulo: string
          updated_at: string
        }
        Insert: {
          checklist_id: string
          concluida_em?: string | null
          concluida_por?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          prazo_data?: string | null
          prazo_dias?: number
          responsavel_role: Database["public"]["Enums"]["app_role"]
          responsavel_user_id?: string | null
          status?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          checklist_id?: string
          concluida_em?: string | null
          concluida_por?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          prazo_data?: string | null
          prazo_dias?: number
          responsavel_role?: Database["public"]["Enums"]["app_role"]
          responsavel_user_id?: string | null
          status?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_tarefas_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "onboarding_checklists"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamentos_pj: {
        Row: {
          competencia: string
          comprovante_url: string | null
          contrato_id: string
          created_at: string
          data_pagamento: string | null
          data_prevista: string
          forma_pagamento: string
          id: string
          nota_fiscal_id: string | null
          observacoes: string | null
          status: string
          updated_at: string
          valor: number
        }
        Insert: {
          competencia: string
          comprovante_url?: string | null
          contrato_id: string
          created_at?: string
          data_pagamento?: string | null
          data_prevista: string
          forma_pagamento?: string
          id?: string
          nota_fiscal_id?: string | null
          observacoes?: string | null
          status?: string
          updated_at?: string
          valor: number
        }
        Update: {
          competencia?: string
          comprovante_url?: string | null
          contrato_id?: string
          created_at?: string
          data_pagamento?: string | null
          data_prevista?: string
          forma_pagamento?: string
          id?: string
          nota_fiscal_id?: string | null
          observacoes?: string | null
          status?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_pj_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos_pj"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_pj_nota_fiscal_id_fkey"
            columns: ["nota_fiscal_id"]
            isOneToOne: false
            referencedRelation: "notas_fiscais_pj"
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
          is_clevel: boolean | null
          label: string
          ordem: number
          pai_valor: string | null
          parent_id: string | null
          perfil_area_codigo: string | null
          updated_at: string
          valor: string
        }
        Insert: {
          ativo?: boolean
          categoria: string
          created_at?: string
          descricao?: string | null
          id?: string
          is_clevel?: boolean | null
          label: string
          ordem?: number
          pai_valor?: string | null
          parent_id?: string | null
          perfil_area_codigo?: string | null
          updated_at?: string
          valor: string
        }
        Update: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          descricao?: string | null
          id?: string
          is_clevel?: boolean | null
          label?: string
          ordem?: number
          pai_valor?: string | null
          parent_id?: string | null
          perfil_area_codigo?: string | null
          updated_at?: string
          valor?: string
        }
        Relationships: [
          {
            foreignKeyName: "parametros_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parametros"
            referencedColumns: ["id"]
          },
        ]
      }
      perfil_packs: {
        Row: {
          criado_em: string
          pack_id: string
          perfil_id: string
        }
        Insert: {
          criado_em?: string
          pack_id: string
          perfil_id: string
        }
        Update: {
          criado_em?: string
          pack_id?: string
          perfil_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "perfil_packs_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "permission_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perfil_packs_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis: {
        Row: {
          area: string | null
          ativo: boolean
          codigo: string
          criado_em: string
          descricao: string | null
          id: string
          is_sistema: boolean
          nivel_sugerido: string | null
          nome: string
          tipo: string
        }
        Insert: {
          area?: string | null
          ativo?: boolean
          codigo: string
          criado_em?: string
          descricao?: string | null
          id?: string
          is_sistema?: boolean
          nivel_sugerido?: string | null
          nome: string
          tipo: string
        }
        Update: {
          area?: string | null
          ativo?: boolean
          codigo?: string
          criado_em?: string
          descricao?: string | null
          id?: string
          is_sistema?: boolean
          nivel_sugerido?: string | null
          nome?: string
          tipo?: string
        }
        Relationships: []
      }
      permission_pack_items: {
        Row: {
          acao: string
          criado_em: string
          id: string
          modulo: string
          nivel_minimo: string | null
          pack_id: string
        }
        Insert: {
          acao: string
          criado_em?: string
          id?: string
          modulo: string
          nivel_minimo?: string | null
          pack_id: string
        }
        Update: {
          acao?: string
          criado_em?: string
          id?: string
          modulo?: string
          nivel_minimo?: string | null
          pack_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permission_pack_items_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "permission_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_packs: {
        Row: {
          ativo: boolean
          codigo: string
          criado_em: string
          descricao: string | null
          id: string
          is_sistema: boolean
          nome: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          criado_em?: string
          descricao?: string | null
          id?: string
          is_sistema?: boolean
          nome: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          criado_em?: string
          descricao?: string | null
          id?: string
          is_sistema?: boolean
          nome?: string
        }
        Relationships: []
      }
      politica_visibilidade_salario: {
        Row: {
          atualizado_em: string
          contexto: Database["public"]["Enums"]["contexto_acesso_salario"]
          id: string
          modo: string
          observacao: string | null
          perfil_codigo: string
        }
        Insert: {
          atualizado_em?: string
          contexto: Database["public"]["Enums"]["contexto_acesso_salario"]
          id?: string
          modo: string
          observacao?: string | null
          perfil_codigo: string
        }
        Update: {
          atualizado_em?: string
          contexto?: Database["public"]["Enums"]["contexto_acesso_salario"]
          id?: string
          modo?: string
          observacao?: string | null
          perfil_codigo?: string
        }
        Relationships: [
          {
            foreignKeyName: "politica_visibilidade_salario_perfil_codigo_fkey"
            columns: ["perfil_codigo"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["codigo"]
          },
        ]
      }
      posicoes: {
        Row: {
          area: string | null
          centro_custo: string | null
          colaborador_id: string | null
          contrato_pj_id: string | null
          created_at: string
          departamento: string
          filial: string | null
          id: string
          id_pai: string | null
          nivel_hierarquico: number
          salario_previsto: number | null
          status: string
          titulo_cargo: string
          updated_at: string
        }
        Insert: {
          area?: string | null
          centro_custo?: string | null
          colaborador_id?: string | null
          contrato_pj_id?: string | null
          created_at?: string
          departamento: string
          filial?: string | null
          id?: string
          id_pai?: string | null
          nivel_hierarquico?: number
          salario_previsto?: number | null
          status?: string
          titulo_cargo: string
          updated_at?: string
        }
        Update: {
          area?: string | null
          centro_custo?: string | null
          colaborador_id?: string | null
          contrato_pj_id?: string | null
          created_at?: string
          departamento?: string
          filial?: string | null
          id?: string
          id_pai?: string | null
          nivel_hierarquico?: number
          salario_previsto?: number | null
          status?: string
          titulo_cargo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posicoes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores_clt"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posicoes_contrato_pj_id_fkey"
            columns: ["contrato_pj_id"]
            isOneToOne: false
            referencedRelation: "contratos_pj"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posicoes_id_pai_fkey"
            columns: ["id_pai"]
            isOneToOne: false
            referencedRelation: "posicoes"
            referencedColumns: ["id"]
          },
        ]
      }
      processos: {
        Row: {
          area_negocio_id: string | null
          codigo: string
          created_at: string
          criado_por: string | null
          descricao: string | null
          diagrama_mermaid: string | null
          id: string
          importacao_pdf_id: string | null
          importado_de_pdf: boolean | null
          narrativa: string | null
          natureza_valor: string
          nome: string
          owner_perfil_codigo: string | null
          owner_user_id: string | null
          sensivel: boolean
          status_valor: string
          tags: string[] | null
          template_sncf_id: string | null
          updated_at: string
          versao_atual: number
          versao_vigente_em: string | null
        }
        Insert: {
          area_negocio_id?: string | null
          codigo: string
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          diagrama_mermaid?: string | null
          id?: string
          importacao_pdf_id?: string | null
          importado_de_pdf?: boolean | null
          narrativa?: string | null
          natureza_valor?: string
          nome: string
          owner_perfil_codigo?: string | null
          owner_user_id?: string | null
          sensivel?: boolean
          status_valor?: string
          tags?: string[] | null
          template_sncf_id?: string | null
          updated_at?: string
          versao_atual?: number
          versao_vigente_em?: string | null
        }
        Update: {
          area_negocio_id?: string | null
          codigo?: string
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          diagrama_mermaid?: string | null
          id?: string
          importacao_pdf_id?: string | null
          importado_de_pdf?: boolean | null
          narrativa?: string | null
          natureza_valor?: string
          nome?: string
          owner_perfil_codigo?: string | null
          owner_user_id?: string | null
          sensivel?: boolean
          status_valor?: string
          tags?: string[] | null
          template_sncf_id?: string | null
          updated_at?: string
          versao_atual?: number
          versao_vigente_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processos_area_negocio_id_fkey"
            columns: ["area_negocio_id"]
            isOneToOne: false
            referencedRelation: "parametros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_importacao_pdf_id_fkey"
            columns: ["importacao_pdf_id"]
            isOneToOne: false
            referencedRelation: "processos_importacoes_pdf"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_owner_perfil_codigo_fkey"
            columns: ["owner_perfil_codigo"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "processos_template_sncf_id_fkey"
            columns: ["template_sncf_id"]
            isOneToOne: false
            referencedRelation: "sncf_templates_processos"
            referencedColumns: ["id"]
          },
        ]
      }
      processos_importacoes_pdf: {
        Row: {
          arquivo_nome: string
          arquivo_paginas: number | null
          arquivo_tamanho_kb: number | null
          created_at: string
          erro_mensagem: string | null
          id: string
          importado_por: string | null
          importado_por_nome: string | null
          processos_criados: string[] | null
          resultado_ia: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          arquivo_nome: string
          arquivo_paginas?: number | null
          arquivo_tamanho_kb?: number | null
          created_at?: string
          erro_mensagem?: string | null
          id?: string
          importado_por?: string | null
          importado_por_nome?: string | null
          processos_criados?: string[] | null
          resultado_ia?: Json | null
          status: string
          updated_at?: string
        }
        Update: {
          arquivo_nome?: string
          arquivo_paginas?: number | null
          arquivo_tamanho_kb?: number | null
          created_at?: string
          erro_mensagem?: string | null
          id?: string
          importado_por?: string | null
          importado_por_nome?: string | null
          processos_criados?: string[] | null
          resultado_ia?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      processos_ligacoes: {
        Row: {
          criado_em: string
          criado_por: string | null
          descricao: string | null
          id: string
          ordem: number
          processo_destino_id: string
          processo_origem_id: string
          tipo_ligacao: string
        }
        Insert: {
          criado_em?: string
          criado_por?: string | null
          descricao?: string | null
          id?: string
          ordem?: number
          processo_destino_id: string
          processo_origem_id: string
          tipo_ligacao: string
        }
        Update: {
          criado_em?: string
          criado_por?: string | null
          descricao?: string | null
          id?: string
          ordem?: number
          processo_destino_id?: string
          processo_origem_id?: string
          tipo_ligacao?: string
        }
        Relationships: [
          {
            foreignKeyName: "processos_ligacoes_processo_destino_id_fkey"
            columns: ["processo_destino_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_ligacoes_processo_destino_id_fkey"
            columns: ["processo_destino_id"]
            isOneToOne: false
            referencedRelation: "processos_unificados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_ligacoes_processo_origem_id_fkey"
            columns: ["processo_origem_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_ligacoes_processo_origem_id_fkey"
            columns: ["processo_origem_id"]
            isOneToOne: false
            referencedRelation: "processos_unificados"
            referencedColumns: ["id"]
          },
        ]
      }
      processos_log_consultas: {
        Row: {
          consultado_em: string
          id: string
          processo_id: string
          user_id: string | null
        }
        Insert: {
          consultado_em?: string
          id?: string
          processo_id: string
          user_id?: string | null
        }
        Update: {
          consultado_em?: string
          id?: string
          processo_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processos_log_consultas_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_log_consultas_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos_unificados"
            referencedColumns: ["id"]
          },
        ]
      }
      processos_sugestoes: {
        Row: {
          avaliado_em: string | null
          avaliado_por: string | null
          descricao: string
          id: string
          motivo_decisao: string | null
          origem: string | null
          processo_id: string | null
          status: string
          sugerido_em: string
          sugerido_por: string | null
          titulo_sugerido: string | null
        }
        Insert: {
          avaliado_em?: string | null
          avaliado_por?: string | null
          descricao: string
          id?: string
          motivo_decisao?: string | null
          origem?: string | null
          processo_id?: string | null
          status?: string
          sugerido_em?: string
          sugerido_por?: string | null
          titulo_sugerido?: string | null
        }
        Update: {
          avaliado_em?: string | null
          avaliado_por?: string | null
          descricao?: string
          id?: string
          motivo_decisao?: string | null
          origem?: string | null
          processo_id?: string | null
          status?: string
          sugerido_em?: string
          sugerido_por?: string | null
          titulo_sugerido?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processos_sugestoes_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_sugestoes_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos_unificados"
            referencedColumns: ["id"]
          },
        ]
      }
      processos_tags_areas: {
        Row: {
          area_id: string
          processo_id: string
        }
        Insert: {
          area_id: string
          processo_id: string
        }
        Update: {
          area_id?: string
          processo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "processos_tags_areas_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "parametros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_tags_areas_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_tags_areas_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos_unificados"
            referencedColumns: ["id"]
          },
        ]
      }
      processos_tags_cargos: {
        Row: {
          cargo_id: string
          processo_id: string
        }
        Insert: {
          cargo_id: string
          processo_id: string
        }
        Update: {
          cargo_id?: string
          processo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "processos_tags_cargos_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_tags_cargos_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_tags_cargos_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos_unificados"
            referencedColumns: ["id"]
          },
        ]
      }
      processos_tags_departamentos: {
        Row: {
          departamento_id: string
          processo_id: string
        }
        Insert: {
          departamento_id: string
          processo_id: string
        }
        Update: {
          departamento_id?: string
          processo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "processos_tags_departamentos_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "parametros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_tags_departamentos_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_tags_departamentos_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos_unificados"
            referencedColumns: ["id"]
          },
        ]
      }
      processos_tags_sistemas: {
        Row: {
          processo_id: string
          sistema_id: string
        }
        Insert: {
          processo_id: string
          sistema_id: string
        }
        Update: {
          processo_id?: string
          sistema_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "processos_tags_sistemas_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_tags_sistemas_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos_unificados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_tags_sistemas_sistema_id_fkey"
            columns: ["sistema_id"]
            isOneToOne: false
            referencedRelation: "sncf_sistemas"
            referencedColumns: ["id"]
          },
        ]
      }
      processos_tags_tipos_colaborador: {
        Row: {
          processo_id: string
          tipo: string
        }
        Insert: {
          processo_id: string
          tipo: string
        }
        Update: {
          processo_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "processos_tags_tipos_colaborador_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_tags_tipos_colaborador_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos_unificados"
            referencedColumns: ["id"]
          },
        ]
      }
      processos_tags_unidades: {
        Row: {
          processo_id: string
          unidade_id: string
        }
        Insert: {
          processo_id: string
          unidade_id: string
        }
        Update: {
          processo_id?: string
          unidade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "processos_tags_unidades_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_tags_unidades_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos_unificados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_tags_unidades_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      processos_versoes: {
        Row: {
          descricao_snapshot: string | null
          diagrama_snapshot: string | null
          id: string
          motivo_alteracao: string | null
          narrativa_snapshot: string | null
          natureza_snapshot: string | null
          nome_snapshot: string
          numero: number
          passos_snapshot: Json | null
          processo_id: string
          publicado_em: string
          publicado_por: string | null
          tags_snapshot: Json | null
        }
        Insert: {
          descricao_snapshot?: string | null
          diagrama_snapshot?: string | null
          id?: string
          motivo_alteracao?: string | null
          narrativa_snapshot?: string | null
          natureza_snapshot?: string | null
          nome_snapshot: string
          numero: number
          passos_snapshot?: Json | null
          processo_id: string
          publicado_em?: string
          publicado_por?: string | null
          tags_snapshot?: Json | null
        }
        Update: {
          descricao_snapshot?: string | null
          diagrama_snapshot?: string | null
          id?: string
          motivo_alteracao?: string | null
          narrativa_snapshot?: string | null
          natureza_snapshot?: string | null
          nome_snapshot?: string
          numero?: number
          passos_snapshot?: Json | null
          processo_id?: string
          publicado_em?: string
          publicado_por?: string | null
          tags_snapshot?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "processos_versoes_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_versoes_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos_unificados"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          acesso_ativado_em: string | null
          approved: boolean
          avatar_url: string | null
          colaborador_tipo: string | null
          created_at: string
          departamento_id: string | null
          department: string | null
          full_name: string | null
          id: string
          position: string | null
          termo_uso_aceito_em: string | null
          termo_uso_versao: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          acesso_ativado_em?: string | null
          approved?: boolean
          avatar_url?: string | null
          colaborador_tipo?: string | null
          created_at?: string
          departamento_id?: string | null
          department?: string | null
          full_name?: string | null
          id?: string
          position?: string | null
          termo_uso_aceito_em?: string | null
          termo_uso_versao?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          acesso_ativado_em?: string | null
          approved?: boolean
          avatar_url?: string | null
          colaborador_tipo?: string | null
          created_at?: string
          departamento_id?: string | null
          department?: string | null
          full_name?: string | null
          id?: string
          position?: string | null
          termo_uso_aceito_em?: string | null
          termo_uso_versao?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "parametros"
            referencedColumns: ["id"]
          },
        ]
      }
      remuneracoes: {
        Row: {
          atualizado_em: string
          criado_em: string
          criado_por: string | null
          data_vigencia_fim: string | null
          data_vigencia_inicio: string
          id: string
          moeda: string
          natureza: string
          observacao: string | null
          periodicidade: string
          user_id: string
          valor: number
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          criado_por?: string | null
          data_vigencia_fim?: string | null
          data_vigencia_inicio: string
          id?: string
          moeda?: string
          natureza: string
          observacao?: string | null
          periodicidade?: string
          user_id: string
          valor: number
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          criado_por?: string | null
          data_vigencia_fim?: string | null
          data_vigencia_inicio?: string
          id?: string
          moeda?: string
          natureza?: string
          observacao?: string | null
          periodicidade?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      responsabilidades_catalogo: {
        Row: {
          area: string
          ativo: boolean | null
          created_at: string | null
          criado_por: string | null
          id: string
          nivel: string
          responsabilidade: string
        }
        Insert: {
          area: string
          ativo?: boolean | null
          created_at?: string | null
          criado_por?: string | null
          id?: string
          nivel?: string
          responsabilidade: string
        }
        Update: {
          area?: string
          ativo?: boolean | null
          created_at?: string | null
          criado_por?: string | null
          id?: string
          nivel?: string
          responsabilidade?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          colaborador_tipo: string
          created_at: string
          granted: boolean
          id: string
          module: string
          nivel_minimo: Database["public"]["Enums"]["nivel_cargo"] | null
          permission: string
          role_name: string
          updated_at: string
        }
        Insert: {
          colaborador_tipo?: string
          created_at?: string
          granted?: boolean
          id?: string
          module: string
          nivel_minimo?: Database["public"]["Enums"]["nivel_cargo"] | null
          permission: string
          role_name: string
          updated_at?: string
        }
        Update: {
          colaborador_tipo?: string
          created_at?: string
          granted?: boolean
          id?: string
          module?: string
          nivel_minimo?: Database["public"]["Enums"]["nivel_cargo"] | null
          permission?: string
          role_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_name_fkey"
            columns: ["role_name"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["name"]
          },
        ]
      }
      sistema_reportes: {
        Row: {
          atribuido_a: string | null
          descricao: string
          id: string
          passos_reproduzir: string | null
          prioridade: string | null
          reportado_em: string
          reportado_por: string | null
          resolvido_em: string | null
          resposta_admin: string | null
          rota: string
          status_valor: string
          tipo_valor: string
          titulo_tela: string | null
          updated_at: string
          user_agent: string | null
          viewport_width: number | null
        }
        Insert: {
          atribuido_a?: string | null
          descricao: string
          id?: string
          passos_reproduzir?: string | null
          prioridade?: string | null
          reportado_em?: string
          reportado_por?: string | null
          resolvido_em?: string | null
          resposta_admin?: string | null
          rota: string
          status_valor?: string
          tipo_valor: string
          titulo_tela?: string | null
          updated_at?: string
          user_agent?: string | null
          viewport_width?: number | null
        }
        Update: {
          atribuido_a?: string | null
          descricao?: string
          id?: string
          passos_reproduzir?: string | null
          prioridade?: string | null
          reportado_em?: string
          reportado_por?: string | null
          resolvido_em?: string | null
          resposta_admin?: string | null
          rota?: string
          status_valor?: string
          tipo_valor?: string
          titulo_tela?: string | null
          updated_at?: string
          user_agent?: string | null
          viewport_width?: number | null
        }
        Relationships: []
      }
      skills_catalogo: {
        Row: {
          area: string
          ativo: boolean | null
          created_at: string | null
          criado_por: string | null
          id: string
          nivel: string
          skill: string
          tipo: string
        }
        Insert: {
          area: string
          ativo?: boolean | null
          created_at?: string | null
          criado_por?: string | null
          id?: string
          nivel?: string
          skill: string
          tipo?: string
        }
        Update: {
          area?: string
          ativo?: boolean | null
          created_at?: string | null
          criado_por?: string | null
          id?: string
          nivel?: string
          skill?: string
          tipo?: string
        }
        Relationships: []
      }
      sncf_documentacao: {
        Row: {
          ativo: boolean
          autor_nome: string | null
          autor_user_id: string | null
          categoria: string | null
          conteudo: string
          created_at: string
          descricao: string | null
          editado_por: string | null
          editado_por_nome: string | null
          fala_fetely_conhecimento_id: string | null
          id: string
          ordem: number
          slug: string
          sync_fala_fetely: boolean | null
          tags: string[] | null
          tipo: string
          titulo: string
          updated_at: string
          versao: number
        }
        Insert: {
          ativo?: boolean
          autor_nome?: string | null
          autor_user_id?: string | null
          categoria?: string | null
          conteudo: string
          created_at?: string
          descricao?: string | null
          editado_por?: string | null
          editado_por_nome?: string | null
          fala_fetely_conhecimento_id?: string | null
          id?: string
          ordem?: number
          slug: string
          sync_fala_fetely?: boolean | null
          tags?: string[] | null
          tipo: string
          titulo: string
          updated_at?: string
          versao?: number
        }
        Update: {
          ativo?: boolean
          autor_nome?: string | null
          autor_user_id?: string | null
          categoria?: string | null
          conteudo?: string
          created_at?: string
          descricao?: string | null
          editado_por?: string | null
          editado_por_nome?: string | null
          fala_fetely_conhecimento_id?: string | null
          id?: string
          ordem?: number
          slug?: string
          sync_fala_fetely?: boolean | null
          tags?: string[] | null
          tipo?: string
          titulo?: string
          updated_at?: string
          versao?: number
        }
        Relationships: []
      }
      sncf_documentacao_versoes: {
        Row: {
          conteudo: string
          created_at: string
          documento_id: string
          editado_por: string | null
          editado_por_nome: string | null
          id: string
          observacao_mudanca: string | null
          titulo: string
          versao: number
        }
        Insert: {
          conteudo: string
          created_at?: string
          documento_id: string
          editado_por?: string | null
          editado_por_nome?: string | null
          id?: string
          observacao_mudanca?: string | null
          titulo: string
          versao: number
        }
        Update: {
          conteudo?: string
          created_at?: string
          documento_id?: string
          editado_por?: string | null
          editado_por_nome?: string | null
          id?: string
          observacao_mudanca?: string | null
          titulo?: string
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "sncf_documentacao_versoes_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "sncf_documentacao"
            referencedColumns: ["id"]
          },
        ]
      }
      sncf_processos_categorias: {
        Row: {
          ativo: boolean
          cor: string | null
          created_at: string
          criado_por: string | null
          descricao: string | null
          icone: string | null
          id: string
          modulo_origem: string
          natureza: string
          nome: string
          ordem: number
          slug: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          icone?: string | null
          id?: string
          modulo_origem?: string
          natureza?: string
          nome: string
          ordem?: number
          slug: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          icone?: string | null
          id?: string
          modulo_origem?: string
          natureza?: string
          nome?: string
          ordem?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      sncf_sistemas: {
        Row: {
          ativo: boolean
          cor: string | null
          created_at: string
          descricao: string | null
          icone: string | null
          id: string
          nome: string
          ordem: number
          rota_base: string
          slug: string
        }
        Insert: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          descricao?: string | null
          icone?: string | null
          id?: string
          nome: string
          ordem?: number
          rota_base: string
          slug: string
        }
        Update: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          descricao?: string | null
          icone?: string | null
          id?: string
          nome?: string
          ordem?: number
          rota_base?: string
          slug?: string
        }
        Relationships: []
      }
      sncf_tarefas: {
        Row: {
          accountable_role: string | null
          accountable_user_id: string | null
          area_destino: string | null
          bloqueante: boolean | null
          colaborador_id: string | null
          colaborador_nome: string | null
          colaborador_tipo: string | null
          concluida_em: string | null
          concluida_por: string | null
          created_at: string
          criado_por: string | null
          descricao: string | null
          evidencia_texto: string | null
          evidencia_url: string | null
          id: string
          informar_user_ids: string[] | null
          link_acao: string | null
          motivo_bloqueio: string | null
          origem_extensao_id: string | null
          prazo_data: string | null
          prazo_dias: number | null
          prioridade: string
          processo_id: string | null
          processo_tipo: string | null
          responsavel_role: string | null
          responsavel_user_id: string | null
          sistema_origem: string
          status: string
          tipo_processo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          accountable_role?: string | null
          accountable_user_id?: string | null
          area_destino?: string | null
          bloqueante?: boolean | null
          colaborador_id?: string | null
          colaborador_nome?: string | null
          colaborador_tipo?: string | null
          concluida_em?: string | null
          concluida_por?: string | null
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          evidencia_texto?: string | null
          evidencia_url?: string | null
          id?: string
          informar_user_ids?: string[] | null
          link_acao?: string | null
          motivo_bloqueio?: string | null
          origem_extensao_id?: string | null
          prazo_data?: string | null
          prazo_dias?: number | null
          prioridade?: string
          processo_id?: string | null
          processo_tipo?: string | null
          responsavel_role?: string | null
          responsavel_user_id?: string | null
          sistema_origem?: string
          status?: string
          tipo_processo?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          accountable_role?: string | null
          accountable_user_id?: string | null
          area_destino?: string | null
          bloqueante?: boolean | null
          colaborador_id?: string | null
          colaborador_nome?: string | null
          colaborador_tipo?: string | null
          concluida_em?: string | null
          concluida_por?: string | null
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          evidencia_texto?: string | null
          evidencia_url?: string | null
          id?: string
          informar_user_ids?: string[] | null
          link_acao?: string | null
          motivo_bloqueio?: string | null
          origem_extensao_id?: string | null
          prazo_data?: string | null
          prazo_dias?: number | null
          prioridade?: string
          processo_id?: string | null
          processo_tipo?: string | null
          responsavel_role?: string | null
          responsavel_user_id?: string | null
          sistema_origem?: string
          status?: string
          tipo_processo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sncf_tarefas_origem_extensao_id_fkey"
            columns: ["origem_extensao_id"]
            isOneToOne: false
            referencedRelation: "sncf_template_extensoes"
            referencedColumns: ["id"]
          },
        ]
      }
      sncf_template_extensoes: {
        Row: {
          ativo: boolean
          categoria_id: string
          created_at: string
          criado_por: string | null
          descricao: string | null
          dimensao: string
          id: string
          nome: string
          referencia_id: string | null
          referencia_label: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria_id: string
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          dimensao: string
          id?: string
          nome: string
          referencia_id?: string | null
          referencia_label: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria_id?: string
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          dimensao?: string
          id?: string
          nome?: string
          referencia_id?: string | null
          referencia_label?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sncf_template_extensoes_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "sncf_processos_categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      sncf_template_extensoes_tarefas: {
        Row: {
          accountable_role: string | null
          area_destino: string | null
          bloqueante: boolean | null
          created_at: string
          descricao: string | null
          extensao_id: string
          id: string
          link_acao: string | null
          motivo_bloqueio: string | null
          ordem: number
          prazo_dias: number
          prioridade: string | null
          responsavel_role: string | null
          sistema_origem: string | null
          titulo: string
        }
        Insert: {
          accountable_role?: string | null
          area_destino?: string | null
          bloqueante?: boolean | null
          created_at?: string
          descricao?: string | null
          extensao_id: string
          id?: string
          link_acao?: string | null
          motivo_bloqueio?: string | null
          ordem?: number
          prazo_dias?: number
          prioridade?: string | null
          responsavel_role?: string | null
          sistema_origem?: string | null
          titulo: string
        }
        Update: {
          accountable_role?: string | null
          area_destino?: string | null
          bloqueante?: boolean | null
          created_at?: string
          descricao?: string | null
          extensao_id?: string
          id?: string
          link_acao?: string | null
          motivo_bloqueio?: string | null
          ordem?: number
          prazo_dias?: number
          prioridade?: string | null
          responsavel_role?: string | null
          sistema_origem?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "sncf_template_extensoes_tarefas_extensao_id_fkey"
            columns: ["extensao_id"]
            isOneToOne: false
            referencedRelation: "sncf_template_extensoes"
            referencedColumns: ["id"]
          },
        ]
      }
      sncf_templates_processos: {
        Row: {
          ativo: boolean
          categoria_id: string | null
          created_at: string
          descricao: string | null
          id: string
          nome: string
          processos_id: string | null
          tipo_colaborador: string | null
          tipo_processo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria_id?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          processos_id?: string | null
          tipo_colaborador?: string | null
          tipo_processo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria_id?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          processos_id?: string | null
          tipo_colaborador?: string | null
          tipo_processo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sncf_templates_processos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "sncf_processos_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sncf_templates_processos_processos_id_fkey"
            columns: ["processos_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sncf_templates_processos_processos_id_fkey"
            columns: ["processos_id"]
            isOneToOne: false
            referencedRelation: "processos_unificados"
            referencedColumns: ["id"]
          },
        ]
      }
      sncf_templates_tarefas: {
        Row: {
          accountable_role: string | null
          area_destino: string | null
          bloqueante: boolean | null
          chave_jsonb: string | null
          condicao_aplicacao: string | null
          created_at: string
          descricao: string | null
          id: string
          motivo_bloqueio: string | null
          ordem: number
          prazo_dias: number
          prioridade: string | null
          responsavel_role: string | null
          sistema_origem: string | null
          somente_clt: boolean
          template_id: string
          titulo: string
        }
        Insert: {
          accountable_role?: string | null
          area_destino?: string | null
          bloqueante?: boolean | null
          chave_jsonb?: string | null
          condicao_aplicacao?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          motivo_bloqueio?: string | null
          ordem?: number
          prazo_dias?: number
          prioridade?: string | null
          responsavel_role?: string | null
          sistema_origem?: string | null
          somente_clt?: boolean
          template_id: string
          titulo: string
        }
        Update: {
          accountable_role?: string | null
          area_destino?: string | null
          bloqueante?: boolean | null
          chave_jsonb?: string | null
          condicao_aplicacao?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          motivo_bloqueio?: string | null
          ordem?: number
          prazo_dias?: number
          prioridade?: string | null
          responsavel_role?: string | null
          sistema_origem?: string | null
          somente_clt?: boolean
          template_id?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "sncf_templates_tarefas_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "sncf_templates_processos"
            referencedColumns: ["id"]
          },
        ]
      }
      sncf_user_systems: {
        Row: {
          ativo: boolean
          concedido_em: string
          concedido_por: string | null
          id: string
          role_no_sistema: string
          sistema_id: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          concedido_em?: string
          concedido_por?: string | null
          id?: string
          role_no_sistema?: string
          sistema_id: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          concedido_em?: string
          concedido_por?: string | null
          id?: string
          role_no_sistema?: string
          sistema_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sncf_user_systems_sistema_id_fkey"
            columns: ["sistema_id"]
            isOneToOne: false
            referencedRelation: "sncf_sistemas"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      testes_tecnicos: {
        Row: {
          avaliado_em: string | null
          avaliado_por: string | null
          candidato_id: string
          created_at: string | null
          desafio_contexto: string | null
          desafio_criterios: string | null
          desafio_descricao: string | null
          desafio_entregaveis: string | null
          entregue_em: string | null
          enviado_em: string | null
          enviado_por: string | null
          id: string
          link_entrega: string | null
          nota: number | null
          notificacao_rh_enviada: boolean | null
          pontos_avaliados: string | null
          prazo_entrega: string | null
          resultado: string | null
          skills_a_validar: Json | null
          skills_validadas: Json | null
          updated_at: string | null
          vaga_id: string
        }
        Insert: {
          avaliado_em?: string | null
          avaliado_por?: string | null
          candidato_id: string
          created_at?: string | null
          desafio_contexto?: string | null
          desafio_criterios?: string | null
          desafio_descricao?: string | null
          desafio_entregaveis?: string | null
          entregue_em?: string | null
          enviado_em?: string | null
          enviado_por?: string | null
          id?: string
          link_entrega?: string | null
          nota?: number | null
          notificacao_rh_enviada?: boolean | null
          pontos_avaliados?: string | null
          prazo_entrega?: string | null
          resultado?: string | null
          skills_a_validar?: Json | null
          skills_validadas?: Json | null
          updated_at?: string | null
          vaga_id: string
        }
        Update: {
          avaliado_em?: string | null
          avaliado_por?: string | null
          candidato_id?: string
          created_at?: string | null
          desafio_contexto?: string | null
          desafio_criterios?: string | null
          desafio_descricao?: string | null
          desafio_entregaveis?: string | null
          entregue_em?: string | null
          enviado_em?: string | null
          enviado_por?: string | null
          id?: string
          link_entrega?: string | null
          nota?: number | null
          notificacao_rh_enviada?: boolean | null
          pontos_avaliados?: string | null
          prazo_entrega?: string | null
          resultado?: string | null
          skills_a_validar?: Json | null
          skills_validadas?: Json | null
          updated_at?: string | null
          vaga_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "testes_tecnicos_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "testes_tecnicos_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas"
            referencedColumns: ["id"]
          },
        ]
      }
      ti_ativos: {
        Row: {
          atribuido_em: string | null
          colaborador_id: string | null
          colaborador_nome: string | null
          colaborador_tipo: string | null
          condicao: string | null
          created_at: string
          created_by: string | null
          data_compra: string | null
          devolvido_em: string | null
          em_manutencao: boolean | null
          especificacoes: Json | null
          estado: string
          fornecedor: string | null
          fotos: string[] | null
          garantia_ate: string | null
          hostname: string | null
          id: string
          localizacao: string | null
          marca: string | null
          modelo: string | null
          nota_fiscal: string | null
          numero_patrimonio: string | null
          numero_serie: string | null
          observacoes: string | null
          status: string
          tipo: string
          updated_at: string
          valor_atual_mercado: number | null
          valor_compra: number | null
          valor_estimado_em: string | null
        }
        Insert: {
          atribuido_em?: string | null
          colaborador_id?: string | null
          colaborador_nome?: string | null
          colaborador_tipo?: string | null
          condicao?: string | null
          created_at?: string
          created_by?: string | null
          data_compra?: string | null
          devolvido_em?: string | null
          em_manutencao?: boolean | null
          especificacoes?: Json | null
          estado?: string
          fornecedor?: string | null
          fotos?: string[] | null
          garantia_ate?: string | null
          hostname?: string | null
          id?: string
          localizacao?: string | null
          marca?: string | null
          modelo?: string | null
          nota_fiscal?: string | null
          numero_patrimonio?: string | null
          numero_serie?: string | null
          observacoes?: string | null
          status?: string
          tipo: string
          updated_at?: string
          valor_atual_mercado?: number | null
          valor_compra?: number | null
          valor_estimado_em?: string | null
        }
        Update: {
          atribuido_em?: string | null
          colaborador_id?: string | null
          colaborador_nome?: string | null
          colaborador_tipo?: string | null
          condicao?: string | null
          created_at?: string
          created_by?: string | null
          data_compra?: string | null
          devolvido_em?: string | null
          em_manutencao?: boolean | null
          especificacoes?: Json | null
          estado?: string
          fornecedor?: string | null
          fotos?: string[] | null
          garantia_ate?: string | null
          hostname?: string | null
          id?: string
          localizacao?: string | null
          marca?: string | null
          modelo?: string | null
          nota_fiscal?: string | null
          numero_patrimonio?: string | null
          numero_serie?: string | null
          observacoes?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          valor_atual_mercado?: number | null
          valor_compra?: number | null
          valor_estimado_em?: string | null
        }
        Relationships: []
      }
      ti_ativos_historico: {
        Row: {
          acao: string
          ativo_id: string
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          de_colaborador: string | null
          fornecedor: string | null
          garantia_servico_ate: string | null
          id: string
          observacoes: string | null
          para_colaborador: string | null
          responsavel_id: string | null
          status_anterior: string | null
          tipo_manutencao: string | null
          valor: number | null
        }
        Insert: {
          acao: string
          ativo_id: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          de_colaborador?: string | null
          fornecedor?: string | null
          garantia_servico_ate?: string | null
          id?: string
          observacoes?: string | null
          para_colaborador?: string | null
          responsavel_id?: string | null
          status_anterior?: string | null
          tipo_manutencao?: string | null
          valor?: number | null
        }
        Update: {
          acao?: string
          ativo_id?: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          de_colaborador?: string | null
          fornecedor?: string | null
          garantia_servico_ate?: string | null
          id?: string
          observacoes?: string | null
          para_colaborador?: string | null
          responsavel_id?: string | null
          status_anterior?: string | null
          tipo_manutencao?: string | null
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ti_ativos_historico_ativo_id_fkey"
            columns: ["ativo_id"]
            isOneToOne: false
            referencedRelation: "ti_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      unidades: {
        Row: {
          ativa: boolean
          atualizado_em: string
          cidade: string | null
          cnpj: string | null
          codigo: string
          criado_em: string
          estado: string | null
          id: string
          nome: string
          tipo: string
        }
        Insert: {
          ativa?: boolean
          atualizado_em?: string
          cidade?: string | null
          cnpj?: string | null
          codigo: string
          criado_em?: string
          estado?: string | null
          id?: string
          nome: string
          tipo: string
        }
        Update: {
          ativa?: boolean
          atualizado_em?: string
          cidade?: string | null
          cnpj?: string | null
          codigo?: string
          criado_em?: string
          estado?: string | null
          id?: string
          nome?: string
          tipo?: string
        }
        Relationships: []
      }
      user_atribuicoes: {
        Row: {
          criado_em: string
          criado_por: string | null
          id: string
          nivel: string | null
          perfil_id: string
          unidade_id: string | null
          user_id: string
          valido_ate: string | null
        }
        Insert: {
          criado_em?: string
          criado_por?: string | null
          id?: string
          nivel?: string | null
          perfil_id: string
          unidade_id?: string | null
          user_id: string
          valido_ate?: string | null
        }
        Update: {
          criado_em?: string
          criado_por?: string | null
          id?: string
          nivel?: string | null
          perfil_id?: string
          unidade_id?: string | null
          user_id?: string
          valido_ate?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_atribuicoes_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_atribuicoes_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          atribuido_manualmente: boolean
          created_at: string
          id: string
          nivel: Database["public"]["Enums"]["nivel_cargo"] | null
          revogado_em: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          atribuido_manualmente?: boolean
          created_at?: string
          id?: string
          nivel?: Database["public"]["Enums"]["nivel_cargo"] | null
          revogado_em?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          atribuido_manualmente?: boolean
          created_at?: string
          id?: string
          nivel?: Database["public"]["Enums"]["nivel_cargo"] | null
          revogado_em?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vagas: {
        Row: {
          area: string
          beneficios: string | null
          beneficios_ids: string[] | null
          beneficios_outros: string | null
          cargo_id: string | null
          created_at: string | null
          criado_por: string | null
          departamento: string | null
          descricao: string | null
          faixa_max: number | null
          faixa_min: number | null
          ferramentas: string[] | null
          ferramentas_ids: string[] | null
          ferramentas_outras: string | null
          gestor_id: string | null
          id: string
          is_clevel: boolean | null
          jornada: string | null
          local_trabalho: string | null
          missao: string | null
          nivel: string
          num_vagas: number
          publicado_em: string | null
          responsabilidades: string[] | null
          skills_desejadas: string[] | null
          skills_obrigatorias: string[] | null
          status: string
          tipo_contrato: string
          titulo: string
          updated_at: string | null
          vagas_preenchidas: number
          vigencia_fim: string | null
          vigencia_inicio: string | null
        }
        Insert: {
          area: string
          beneficios?: string | null
          beneficios_ids?: string[] | null
          beneficios_outros?: string | null
          cargo_id?: string | null
          created_at?: string | null
          criado_por?: string | null
          departamento?: string | null
          descricao?: string | null
          faixa_max?: number | null
          faixa_min?: number | null
          ferramentas?: string[] | null
          ferramentas_ids?: string[] | null
          ferramentas_outras?: string | null
          gestor_id?: string | null
          id?: string
          is_clevel?: boolean | null
          jornada?: string | null
          local_trabalho?: string | null
          missao?: string | null
          nivel?: string
          num_vagas?: number
          publicado_em?: string | null
          responsabilidades?: string[] | null
          skills_desejadas?: string[] | null
          skills_obrigatorias?: string[] | null
          status?: string
          tipo_contrato?: string
          titulo: string
          updated_at?: string | null
          vagas_preenchidas?: number
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Update: {
          area?: string
          beneficios?: string | null
          beneficios_ids?: string[] | null
          beneficios_outros?: string | null
          cargo_id?: string | null
          created_at?: string | null
          criado_por?: string | null
          departamento?: string | null
          descricao?: string | null
          faixa_max?: number | null
          faixa_min?: number | null
          ferramentas?: string[] | null
          ferramentas_ids?: string[] | null
          ferramentas_outras?: string | null
          gestor_id?: string | null
          id?: string
          is_clevel?: boolean | null
          jornada?: string | null
          local_trabalho?: string | null
          missao?: string | null
          nivel?: string
          num_vagas?: number
          publicado_em?: string | null
          responsabilidades?: string[] | null
          skills_desejadas?: string[] | null
          skills_obrigatorias?: string[] | null
          status?: string
          tipo_contrato?: string
          titulo?: string
          updated_at?: string | null
          vagas_preenchidas?: number
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vagas_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      kpis_nf_pj_mensal: {
        Row: {
          despesa_variavel: number | null
          folha_contratual: number | null
          mes_submissao: string | null
          taxa_aprovacao_1a_tentativa_pct: number | null
          total_aprovadas: number | null
          total_em_disputa: number | null
          total_rejeitadas: number | null
          total_submetidas: number | null
          valor_medio: number | null
        }
        Relationships: []
      }
      meus_acessos_salario: {
        Row: {
          ator_nome: string | null
          ator_user_id: string | null
          contexto: string | null
          criado_em: string | null
          em_lote: boolean | null
          id: string | null
          justificativa: string | null
          quantidade_alvos: number | null
        }
        Relationships: []
      }
      onboarding_tarefas_view: {
        Row: {
          checklist_id: string | null
          concluida_em: string | null
          concluida_por: string | null
          created_at: string | null
          descricao: string | null
          id: string | null
          prazo_data: string | null
          prazo_dias: number | null
          responsavel_role: Database["public"]["Enums"]["app_role"] | null
          responsavel_user_id: string | null
          status: string | null
          titulo: string | null
          updated_at: string | null
        }
        Insert: {
          checklist_id?: string | null
          concluida_em?: string | null
          concluida_por?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string | null
          prazo_data?: string | null
          prazo_dias?: number | null
          responsavel_role?: never
          responsavel_user_id?: string | null
          status?: string | null
          titulo?: string | null
          updated_at?: string | null
        }
        Update: {
          checklist_id?: string | null
          concluida_em?: string | null
          concluida_por?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string | null
          prazo_data?: string | null
          prazo_dias?: number | null
          responsavel_role?: never
          responsavel_user_id?: string | null
          status?: string | null
          titulo?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      processos_ligacoes_expandidas: {
        Row: {
          criado_em: string | null
          descricao: string | null
          destino_codigo: string | null
          destino_nome: string | null
          id: string | null
          ordem: number | null
          origem_codigo: string | null
          origem_nome: string | null
          processo_destino_id: string | null
          processo_origem_id: string | null
          tipo_ligacao: string | null
          tipo_ligacao_label: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processos_ligacoes_processo_destino_id_fkey"
            columns: ["processo_destino_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_ligacoes_processo_destino_id_fkey"
            columns: ["processo_destino_id"]
            isOneToOne: false
            referencedRelation: "processos_unificados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_ligacoes_processo_origem_id_fkey"
            columns: ["processo_origem_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_ligacoes_processo_origem_id_fkey"
            columns: ["processo_origem_id"]
            isOneToOne: false
            referencedRelation: "processos_unificados"
            referencedColumns: ["id"]
          },
        ]
      }
      processos_unificados: {
        Row: {
          area_negocio_id: string | null
          area_nome: string | null
          codigo: string | null
          consultas_30d: number | null
          created_at: string | null
          descricao: string | null
          diagrama_mermaid: string | null
          id: string | null
          narrativa: string | null
          natureza_valor: string | null
          nome: string | null
          owner_nome: string | null
          owner_perfil_codigo: string | null
          owner_user_id: string | null
          sensivel: boolean | null
          status_valor: string | null
          sugestoes_pendentes: number | null
          tags_areas: Json | null
          tags_cargos: Json | null
          tags_departamentos: Json | null
          tags_sistemas: Json | null
          tags_tipos_colaborador: Json | null
          tags_unidades: Json | null
          template_sncf_id: string | null
          total_consultas: number | null
          updated_at: string | null
          versao_atual: number | null
          versao_vigente_em: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processos_area_negocio_id_fkey"
            columns: ["area_negocio_id"]
            isOneToOne: false
            referencedRelation: "parametros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_owner_perfil_codigo_fkey"
            columns: ["owner_perfil_codigo"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "processos_template_sncf_id_fkey"
            columns: ["template_sncf_id"]
            isOneToOne: false
            referencedRelation: "sncf_templates_processos"
            referencedColumns: ["id"]
          },
        ]
      }
      revogacoes_acesso_historico: {
        Row: {
          ator_nome: string | null
          ator_user_id: string | null
          criado_em: string | null
          dados_antes: Json | null
          dados_depois: Json | null
          id: string | null
          justificativa: string | null
          tabela: string | null
          tipo_acao: string | null
          user_id_revogado: string | null
        }
        Insert: {
          ator_nome?: string | null
          ator_user_id?: string | null
          criado_em?: string | null
          dados_antes?: Json | null
          dados_depois?: Json | null
          id?: string | null
          justificativa?: string | null
          tabela?: string | null
          tipo_acao?: string | null
          user_id_revogado?: string | null
        }
        Update: {
          ator_nome?: string | null
          ator_user_id?: string | null
          criado_em?: string | null
          dados_antes?: Json | null
          dados_depois?: Json | null
          id?: string | null
          justificativa?: string | null
          tabela?: string | null
          tipo_acao?: string | null
          user_id_revogado?: string | null
        }
        Relationships: []
      }
      tarefas_emissao_nf_pendentes: {
        Row: {
          contrato_id: string | null
          created_at: string | null
          departamento: string | null
          email_corporativo: string | null
          pj_nome: string | null
          pj_user_id: string | null
          prazo_data: string | null
          razao_social: string | null
          status: string | null
          tarefa_id: string | null
          titulo: string | null
          valor_mensal: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      aplicar_template_cargo: {
        Args: {
          _area_perfil_codigo: string
          _atribuidor?: string
          _template_id: string
          _unidade_id: string
          _user_id: string
        }
        Returns: {
          atribuicao_id: string
          nivel: string
          perfil_nome: string
          unidade_nome: string
        }[]
      }
      aplicar_template_cargo_v3: {
        Args: {
          _atribuidor?: string
          _departamento_id: string
          _template_id: string
          _unidade_id: string
          _user_id: string
        }
        Returns: {
          atribuicao_id: string
          nivel: string
          perfil_nome: string
          unidade_nome: string
        }[]
      }
      aprovar_nf_pj: {
        Args: { _nota_id: string; _observacao_rh?: string }
        Returns: Json
      }
      autosave_convite_cadastro: {
        Args: { _dados: Json; _token: string }
        Returns: boolean
      }
      contar_uso_template: { Args: { _template_id: string }; Returns: Json }
      criar_tarefa_aprovacao_nf_pj: {
        Args: { _nota_id: string }
        Returns: string
      }
      criar_tarefa_correcao_nf_pj: {
        Args: { _erros: Json; _nota_id: string }
        Returns: string
      }
      criar_tarefa_emissao_nf_pj: {
        Args: { _competencia: string; _contrato_id: string }
        Returns: string
      }
      criar_tarefas_emissao_nf_pj_mensal: { Args: never; Returns: number }
      decisao_salario: {
        Args: {
          _alvo_user_id: string
          _contexto: Database["public"]["Enums"]["contexto_acesso_salario"]
          _viewer_id: string
        }
        Returns: string
      }
      decisao_salario_lote: {
        Args: {
          _alvo_user_ids: string[]
          _contexto: Database["public"]["Enums"]["contexto_acesso_salario"]
        }
        Returns: {
          alvo_user_id: string
          modo: string
        }[]
      }
      delegacao_ativa_entre: {
        Args: { _gestor: string; _substituto: string }
        Returns: boolean
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      gerar_celebracoes_aniversario_mural: { Args: never; Returns: number }
      gerar_celebracoes_tempo_casa_mural: { Args: never; Returns: number }
      gerar_periodos_ferias_pendentes: { Args: never; Returns: undefined }
      get_convite_by_token: { Args: { _token: string }; Returns: Json }
      get_organograma_tree: {
        Args: never
        Returns: {
          area: string
          centro_custo: string
          colaborador_id: string
          contrato_pj_id: string
          created_at: string
          departamento: string
          depth: number
          filial: string
          id: string
          id_pai: string
          nivel_hierarquico: number
          path: string[]
          salario_previsto: number
          status: string
          titulo_cargo: string
          updated_at: string
        }[]
      }
      get_user_colaborador_tipo: {
        Args: { _user_id: string }
        Returns: string[]
      }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_permission: {
        Args: { _module: string; _permission: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role_with_level: {
        Args: {
          _nivel_minimo?: Database["public"]["Enums"]["nivel_cargo"]
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      marcar_nf_enviada_pagamento: {
        Args: { _email_destinatario: string; _nota_id: string }
        Returns: Json
      }
      meu_contrato_pj_ativo: {
        Args: never
        Returns: {
          categoria_pj: string
          cnpj: string
          contato_nome: string
          data_fim: string
          data_inicio: string
          id: string
          nome_fantasia: string
          razao_social: string
          status: string
          valor_mensal: number
        }[]
      }
      meus_atalhos_personalizados: {
        Args: { _limite?: number }
        Returns: {
          acessos: number
          rota: string
          titulo: string
          ultimo_acesso: string
        }[]
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      nivel_rank: { Args: { _nivel: string }; Returns: number }
      perfil_area_do_departamento: {
        Args: { _departamento_id: string }
        Returns: {
          area_label: string
          departamento_label: string
          perfil_codigo: string
          perfil_nome: string
        }[]
      }
      pessoa_aparece_no_mural: { Args: { _user_id: string }; Returns: boolean }
      preview_template_cargo: {
        Args: {
          _area_perfil_codigo: string
          _template_id: string
          _unidade_id: string
        }
        Returns: {
          nivel: string
          perfil_nome: string
          perfil_tipo: string
          unidade_nome: string
        }[]
      }
      processar_exclusao_dados_usuario: {
        Args: { _user_id: string }
        Returns: Json
      }
      processar_mural_fetely_diario: { Args: never; Returns: Json }
      processos_publicar_versao: {
        Args: { _motivo?: string; _processo_id: string }
        Returns: number
      }
      reabrir_nf_pj: {
        Args: { _motivo: string; _nota_id: string }
        Returns: Json
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      registrar_aceite_termo_uso: {
        Args: { _versao: string }
        Returns: undefined
      }
      registrar_acesso_dado: {
        Args: {
          _alvo_user_id: string
          _contexto?: string
          _registro_id?: string
          _tabela_origem?: string
          _tipo_dado: string
        }
        Returns: undefined
      }
      registrar_acesso_salario_lote: {
        Args: {
          _alvo_user_ids: string[]
          _contexto: Database["public"]["Enums"]["contexto_acesso_salario"]
          _justificativa: string
        }
        Returns: number
      }
      registrar_audit: {
        Args: {
          _acao: string
          _dados_antes?: Json
          _dados_depois?: Json
          _justificativa?: string
          _registro_id: string
          _tabela: string
        }
        Returns: string
      }
      registrar_consulta_processo: {
        Args: { _processo_id: string }
        Returns: undefined
      }
      registrar_log_fiscal_nf: {
        Args: {
          _ator_papel?: string
          _detalhes?: Json
          _email_destinatario?: string
          _nota_id: string
          _tipo_evento: string
        }
        Returns: string
      }
      rejeitar_nf_pj: {
        Args: { _motivo: string; _nota_id: string }
        Returns: Json
      }
      revogar_acessos_ex_colaboradores: { Args: never; Returns: number }
      submit_convite_cadastro: {
        Args: { _dados: Json; _token: string }
        Returns: boolean
      }
      tem_consentimento_ativo: {
        Args: { _tipo: string; _user_id: string }
        Returns: boolean
      }
      tem_permissao: {
        Args: {
          _acao: string
          _modulo: string
          _unidade_id?: string
          _user_id: string
        }
        Returns: boolean
      }
      tem_qualquer_acesso_modulo: {
        Args: { _modulo: string; _user_id: string }
        Returns: boolean
      }
      template_sugerido_para_cargo: {
        Args: { _cargo_id: string }
        Returns: string
      }
      termo_uso_versao_vigente: { Args: never; Returns: string }
      user_perfis_detalhados: {
        Args: { _user_id: string }
        Returns: {
          atribuicao_id: string
          nivel: string
          perfil_codigo: string
          perfil_nome: string
          perfil_tipo: string
          unidade_id: string
          unidade_nome: string
          valido_ate: string
        }[]
      }
      user_unidades_acessiveis: {
        Args: { _user_id: string }
        Returns: {
          unidade_codigo: string
          unidade_id: string
          unidade_nome: string
        }[]
      }
      validar_email_corporativo: { Args: { _email: string }; Returns: Json }
      validar_nf_pj: { Args: { _nota_id: string }; Returns: Json }
      validar_prontidao_sistema: { Args: never; Returns: Json }
      verificar_user_orfao: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "gestor_rh"
        | "gestor_direto"
        | "colaborador"
        | "financeiro"
        | "admin_rh"
        | "admin_ti"
        | "fiscal"
        | "operacional"
        | "recrutador"
        | "rh"
        | "administrativo"
        | "ti"
        | "recrutamento"
        | "gestao_direta"
        | "estagiario"
        | "diretoria_executiva"
      contexto_acesso_salario:
        | "proprio"
        | "folha"
        | "holerite"
        | "admissao"
        | "convite"
        | "revisao_salarial"
        | "recrutamento"
        | "dashboard_custos"
        | "organograma"
        | "relatorio_pj"
        | "auditoria"
      nivel_cargo:
        | "estagio"
        | "assistente"
        | "analista"
        | "coordenador"
        | "gerente"
        | "diretor"
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
        "admin_rh",
        "admin_ti",
        "fiscal",
        "operacional",
        "recrutador",
        "rh",
        "administrativo",
        "ti",
        "recrutamento",
        "gestao_direta",
        "estagiario",
        "diretoria_executiva",
      ],
      contexto_acesso_salario: [
        "proprio",
        "folha",
        "holerite",
        "admissao",
        "convite",
        "revisao_salarial",
        "recrutamento",
        "dashboard_custos",
        "organograma",
        "relatorio_pj",
        "auditoria",
      ],
      nivel_cargo: [
        "estagio",
        "assistente",
        "analista",
        "coordenador",
        "gerente",
        "diretor",
      ],
    },
  },
} as const

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
          responsavel_id: string | null
          status_anterior: string | null
          status_novo: string
        }
        Insert: {
          candidato_id: string
          created_at?: string
          id?: string
          responsavel_id?: string | null
          status_anterior?: string | null
          status_novo: string
        }
        Update: {
          candidato_id?: string
          created_at?: string
          id?: string
          responsavel_id?: string | null
          status_anterior?: string | null
          status_novo?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidato_historico_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos"
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
          id: string
          linkedin_url: string | null
          nome: string
          origem: string | null
          portfolio_url: string | null
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
          id?: string
          linkedin_url?: string | null
          nome: string
          origem?: string | null
          portfolio_url?: string | null
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
          id?: string
          linkedin_url?: string | null
          nome?: string
          origem?: string | null
          portfolio_url?: string | null
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
      cargos: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          departamento: string | null
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
          id: string
          is_clevel: boolean | null
          nivel: string
          nome: string
          protege_salario: boolean | null
          tipo_contrato: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          departamento?: string | null
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
          id?: string
          is_clevel?: boolean | null
          nivel: string
          nome: string
          protege_salario?: boolean | null
          tipo_contrato?: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          departamento?: string | null
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
          id?: string
          is_clevel?: boolean | null
          nivel?: string
          nome?: string
          protege_salario?: boolean | null
          tipo_contrato?: string
          updated_at?: string | null
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
            foreignKeyName: "colaboradores_clt_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaboradores_clt_gestor_direto_id_fkey"
            columns: ["gestor_direto_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          agencia: string | null
          bairro: string | null
          banco_codigo: string | null
          banco_nome: string | null
          cargo_id: string | null
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
          dia_vencimento: number | null
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
          tipo_conta: string | null
          tipo_servico: string
          uf: string | null
          updated_at: string
          user_id: string | null
          valor_mensal: number
        }
        Insert: {
          agencia?: string | null
          bairro?: string | null
          banco_codigo?: string | null
          banco_nome?: string | null
          cargo_id?: string | null
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
          dia_vencimento?: number | null
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
          tipo_conta?: string | null
          tipo_servico: string
          uf?: string | null
          updated_at?: string
          user_id?: string | null
          valor_mensal: number
        }
        Update: {
          agencia?: string | null
          bairro?: string | null
          banco_codigo?: string | null
          banco_nome?: string | null
          cargo_id?: string | null
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
          dia_vencimento?: number | null
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
          tipo_conta?: string | null
          tipo_servico?: string
          uf?: string | null
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
            foreignKeyName: "contratos_pj_gestor_direto_id_fkey"
            columns: ["gestor_direto_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      convites_cadastro: {
        Row: {
          cargo: string | null
          colaborador_id: string | null
          contrato_pj_id: string | null
          created_at: string
          criado_por: string | null
          dados_preenchidos: Json | null
          data_inicio_prevista: string | null
          departamento: string | null
          email: string
          expira_em: string
          grupo_acesso_id: string | null
          id: string
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
          updated_at: string
        }
        Insert: {
          cargo?: string | null
          colaborador_id?: string | null
          contrato_pj_id?: string | null
          created_at?: string
          criado_por?: string | null
          dados_preenchidos?: Json | null
          data_inicio_prevista?: string | null
          departamento?: string | null
          email: string
          expira_em?: string
          grupo_acesso_id?: string | null
          id?: string
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
          updated_at?: string
        }
        Update: {
          cargo?: string | null
          colaborador_id?: string | null
          contrato_pj_id?: string | null
          created_at?: string
          criado_por?: string | null
          dados_preenchidos?: Json | null
          data_inicio_prevista?: string | null
          departamento?: string | null
          email?: string
          expira_em?: string
          grupo_acesso_id?: string | null
          id?: string
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
          updated_at?: string
        }
        Relationships: [
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
      onboarding_checklists: {
        Row: {
          colaborador_id: string | null
          colaborador_tipo: string
          concluido_em: string | null
          convite_id: string | null
          created_at: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          colaborador_id?: string | null
          colaborador_tipo: string
          concluido_em?: string | null
          convite_id?: string | null
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          colaborador_id?: string | null
          colaborador_tipo?: string
          concluido_em?: string | null
          convite_id?: string | null
          created_at?: string
          id?: string
          status?: string
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
          updated_at?: string
          valor?: string
        }
        Relationships: []
      }
      pcs_faixas: {
        Row: {
          ativo: boolean | null
          cargo: string
          created_at: string | null
          f1_max: number | null
          f1_min: number | null
          f2_max: number | null
          f2_min: number | null
          f3_max: number | null
          f3_min: number | null
          f4_max: number | null
          f4_min: number | null
          f5_max: number | null
          f5_min: number | null
          id: string
          tipo: string
        }
        Insert: {
          ativo?: boolean | null
          cargo: string
          created_at?: string | null
          f1_max?: number | null
          f1_min?: number | null
          f2_max?: number | null
          f2_min?: number | null
          f3_max?: number | null
          f3_min?: number | null
          f4_max?: number | null
          f4_min?: number | null
          f5_max?: number | null
          f5_min?: number | null
          id?: string
          tipo: string
        }
        Update: {
          ativo?: boolean | null
          cargo?: string
          created_at?: string | null
          f1_max?: number | null
          f1_min?: number | null
          f2_max?: number | null
          f2_min?: number | null
          f3_max?: number | null
          f3_min?: number | null
          f4_max?: number | null
          f4_min?: number | null
          f5_max?: number | null
          f5_min?: number | null
          id?: string
          tipo?: string
        }
        Relationships: []
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
      profiles: {
        Row: {
          approved: boolean
          avatar_url: string | null
          colaborador_tipo: string | null
          created_at: string
          department: string | null
          full_name: string | null
          id: string
          position: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approved?: boolean
          avatar_url?: string | null
          colaborador_tipo?: string | null
          created_at?: string
          department?: string | null
          full_name?: string | null
          id?: string
          position?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approved?: boolean
          avatar_url?: string | null
          colaborador_tipo?: string | null
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
      role_permissions: {
        Row: {
          colaborador_tipo: string
          created_at: string
          granted: boolean
          id: string
          module: string
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
      user_roles: {
        Row: {
          atribuido_manualmente: boolean
          created_at: string
          id: string
          revogado_em: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          atribuido_manualmente?: boolean
          created_at?: string
          id?: string
          revogado_em?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          atribuido_manualmente?: boolean
          created_at?: string
          id?: string
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
          responsabilidades: string[] | null
          skills_desejadas: string[] | null
          skills_obrigatorias: string[] | null
          status: string
          tipo_contrato: string
          titulo: string
          updated_at: string | null
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
          responsabilidades?: string[] | null
          skills_desejadas?: string[] | null
          skills_obrigatorias?: string[] | null
          status?: string
          tipo_contrato?: string
          titulo: string
          updated_at?: string | null
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
          responsabilidades?: string[] | null
          skills_desejadas?: string[] | null
          skills_obrigatorias?: string[] | null
          status?: string
          tipo_contrato?: string
          titulo?: string
          updated_at?: string | null
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
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
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
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      submit_convite_cadastro: {
        Args: { _dados: Json; _token: string }
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
        | "admin_rh"
        | "admin_ti"
        | "fiscal"
        | "operacional"
        | "recrutador"
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
      ],
    },
  },
} as const

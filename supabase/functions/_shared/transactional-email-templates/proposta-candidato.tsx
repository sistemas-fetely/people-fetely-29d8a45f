/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Hr, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  nome?: string
  cargo?: string
  tipo_contrato?: string
  salario?: string | null
  data_inicio?: string | null
  beneficios?: string | null
  observacoes?: string | null
}

export function PropostaCandidato({
  nome = 'Candidato',
  cargo = 'a vaga',
  tipo_contrato = 'CLT',
  salario = null,
  data_inicio = null,
  beneficios = null,
  observacoes = null,
}: Props) {
  const primeiroNome = nome.split(' ')[0]
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>É oficial — você faz parte da Fetely! 🎉</Preview>
      <Body style={{ backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif", margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto', padding: '0' }}>

          {/* Header verde Fetely */}
          <Section style={{ backgroundColor: '#2D6A4F', borderRadius: '12px 12px 0 0', padding: '30px 25px', textAlign: 'center' as const }}>
            <Text style={{ fontSize: '28px', fontWeight: 'bold', color: '#ffffff', margin: '0 0 4px' }}>
              Fetély.
            </Text>
            <Text style={{ fontSize: '12px', color: '#B7E4C7', margin: 0 }}>
              Vamos celebrar!! Venha criar algo novo...
            </Text>
          </Section>

          {/* Conteúdo principal */}
          <Section style={{ padding: '30px 25px' }}>

            <Text style={{ fontSize: '20px', fontWeight: 'bold', color: '#1a3a5c', margin: '0 0 16px' }}>
              Uma boa notícia chegou 🌿
            </Text>

            <Text style={{ fontSize: '15px', color: '#3a3a4a', lineHeight: '1.6', margin: '0 0 12px' }}>
              {primeiroNome}, é com muita alegria que a Fetely faz uma proposta para você!
            </Text>

            <Text style={{ fontSize: '15px', color: '#3a3a4a', lineHeight: '1.6', margin: '0 0 12px' }}>
              Passamos por este processo junto com você, e a cada etapa ficou mais claro:
              você tem o que a Fetely precisa. É a combinação certa.
            </Text>

            <Text style={{ fontSize: '15px', color: '#3a3a4a', lineHeight: '1.6', margin: '0 0 20px' }}>
              Queremos você como <strong>{cargo}</strong> no nosso time.
              Aqui estão os detalhes da nossa proposta:
            </Text>

            {/* Card da proposta */}
            <Section style={{ backgroundColor: '#F0FFF4', borderRadius: '12px', padding: '20px', border: '1px solid #B7E4C7', marginBottom: '20px' }}>

              <Text style={{ fontSize: '14px', fontWeight: 'bold', color: '#2D6A4F', margin: '0 0 16px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
                Proposta
              </Text>

              <Section style={{ marginBottom: '12px' }}>
                <Text style={{ fontSize: '12px', color: '#999', margin: '0 0 2px' }}>Cargo</Text>
                <Text style={{ fontSize: '15px', fontWeight: '600', color: '#1a3a5c', margin: 0 }}>{cargo}</Text>
              </Section>

              <Section style={{ marginBottom: '12px' }}>
                <Text style={{ fontSize: '12px', color: '#999', margin: '0 0 2px' }}>Regime</Text>
                <Text style={{ fontSize: '15px', fontWeight: '600', color: '#1a3a5c', margin: 0 }}>{tipo_contrato}</Text>
              </Section>

              {salario && (
                <Section style={{ marginBottom: '12px' }}>
                  <Text style={{ fontSize: '12px', color: '#999', margin: '0 0 2px' }}>
                    {tipo_contrato === 'PJ' ? 'Honorários mensais' : 'Salário mensal'}
                  </Text>
                  <Text style={{ fontSize: '15px', fontWeight: '600', color: '#1a3a5c', margin: 0 }}>{salario}</Text>
                </Section>
              )}

              {data_inicio && (
                <Section style={{ marginBottom: '12px' }}>
                  <Text style={{ fontSize: '12px', color: '#999', margin: '0 0 2px' }}>Início previsto</Text>
                  <Text style={{ fontSize: '15px', fontWeight: '600', color: '#1a3a5c', margin: 0 }}>{data_inicio}</Text>
                </Section>
              )}

              {beneficios && (
                <Section style={{ marginBottom: '12px' }}>
                  <Text style={{ fontSize: '12px', color: '#999', margin: '0 0 2px' }}>Benefícios</Text>
                  <Text style={{ fontSize: '14px', color: '#3a3a4a', margin: 0 }}>{beneficios}</Text>
                </Section>
              )}

              {observacoes && (
                <Section style={{ marginBottom: '0' }}>
                  <Text style={{ fontSize: '12px', color: '#999', margin: '0 0 2px' }}>Observações</Text>
                  <Text style={{ fontSize: '14px', color: '#3a3a4a', margin: 0 }}>{observacoes}</Text>
                </Section>
              )}
            </Section>

            <Text style={{ fontSize: '15px', color: '#3a3a4a', lineHeight: '1.6', margin: '0 0 12px' }}>
              Nosso time de RH entrará em contato em breve para alinhar os próximos passos
              e esclarecer qualquer dúvida que você tiver.
            </Text>

            <Text style={{ fontSize: '15px', color: '#3a3a4a', lineHeight: '1.6', fontStyle: 'italic', margin: '0 0 12px' }}>
              A memória não guarda o preço — ela guarda a presença.
              E a sua presença aqui já faz toda a diferença. ✨
            </Text>

          </Section>

          <Hr style={{ borderColor: '#e5e7eb', margin: '0 25px' }} />

          <Section style={{ padding: '16px 25px' }}>
            <Text style={{ fontSize: '12px', color: '#999999', margin: 0 }}>
              Fetely · Vamos celebrar!! Venha criar algo novo...
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: PropostaCandidato,
  subject: (data: Record<string, any>) =>
    `É oficial — sua proposta da Fetely chegou! 🎉`,
  previewData: {
    nome: 'Maria Silva',
    cargo: 'Analista RH Jr',
    tipo_contrato: 'CLT',
    salario: 'R$ 3.200',
    data_inicio: '01/05/2026',
    beneficios: 'VR, VT, Plano de Saúde',
    observacoes: null,
  },
} satisfies TemplateEntry

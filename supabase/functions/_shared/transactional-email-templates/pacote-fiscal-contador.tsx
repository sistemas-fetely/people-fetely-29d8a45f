import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section, Row, Column, Link, Button,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Fetely"

interface PacoteFiscalContadorProps {
  mensagem_personalizada?: string
  descricao_remessa?: string
  qtd_contas?: number | string
  qtd_documentos?: number | string
  valor_total?: string
  link_zip?: string
  link_expira_em?: string
  periodo?: string
  remetente_nome?: string
}

const PacoteFiscalContadorEmail = ({
  mensagem_personalizada,
  descricao_remessa,
  qtd_contas,
  qtd_documentos,
  valor_total,
  link_zip,
  link_expira_em,
  periodo,
  remetente_nome,
}: PacoteFiscalContadorProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>
      Pacote fiscal Fetely — {descricao_remessa || ''} — {qtd_contas || 0} doc(s)
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Pacote Fiscal — {descricao_remessa || 'Sem descrição'}</Heading>

        {/* Mensagem personalizada (preserva quebras de linha) */}
        {mensagem_personalizada ? (
          <Section style={mensagemBox}>
            {mensagem_personalizada.split('\n').map((linha, i) => (
              <Text key={i} style={text}>{linha || '\u00A0'}</Text>
            ))}
          </Section>
        ) : (
          <>
            <Text style={text}>Prezado(a),</Text>
            <Text style={text}>
              Segue o pacote de documentos fiscais para conferência e arquivamento.
            </Text>
          </>
        )}

        <Section style={card}>
          <Heading as="h2" style={h2}>Resumo</Heading>
          {periodo && (
            <Row>
              <Column style={labelCol}><Text style={labelText}>Período</Text></Column>
              <Column><Text style={valueText}>{periodo}</Text></Column>
            </Row>
          )}
          <Row>
            <Column style={labelCol}><Text style={labelText}>Contas</Text></Column>
            <Column><Text style={valueText}>{qtd_contas || 0}</Text></Column>
          </Row>
          <Row>
            <Column style={labelCol}><Text style={labelText}>Documentos</Text></Column>
            <Column><Text style={valueText}>{qtd_documentos || 0}</Text></Column>
          </Row>
          {valor_total && (
            <Row>
              <Column style={labelCol}><Text style={labelText}>Valor total</Text></Column>
              <Column><Text style={valueStrong}>{valor_total}</Text></Column>
            </Row>
          )}
        </Section>

        {link_zip && (
          <Section style={ctaBox}>
            <Heading as="h2" style={h2}>Download do pacote</Heading>
            <Text style={text}>
              O pacote inclui todas as NFs e recibos do período em um arquivo ZIP,
              organizados por fornecedor, com um CSV de resumo.
            </Text>
            <Button href={link_zip} style={ctaButton}>
              Baixar pacote (ZIP)
            </Button>
            {link_expira_em && (
              <Text style={textSmall}>
                Link válido até <strong>{link_expira_em}</strong>. Após essa data,
                solicite reenvio.
              </Text>
            )}
          </Section>
        )}

        <Hr style={hr} />
        <Text style={footer}>
          Atenciosamente,<br />
          {remetente_nome || `Equipe ${SITE_NAME}`}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PacoteFiscalContadorEmail,
  subject: (data: Record<string, any>) =>
    `[Fetely] Pacote fiscal — ${data.descricao_remessa || 'Documentos'}`,
  displayName: 'Pacote Fiscal — Contador',
  previewData: {
    mensagem_personalizada:
      'Olá,\n\nSegue o pacote de documentos fiscais do período.\n\nQualquer dúvida, fico à disposição.\n\nObrigado.',
    descricao_remessa: 'Lote 02/05/2026',
    qtd_contas: 24,
    qtd_documentos: 31,
    valor_total: 'R$ 47.583,90',
    link_zip: 'https://example.com/pacote.zip',
    link_expira_em: '01/06/2026',
    periodo: '01/04/2026 a 30/04/2026',
    remetente_nome: 'Flavio Simeliovich',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { padding: '30px 25px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a3d2b', margin: '0 0 20px' }
const h2 = { fontSize: '15px', fontWeight: 'bold' as const, color: '#1a3d2b', margin: '0 0 10px' }
const text = { fontSize: '15px', color: '#3a3a4a', lineHeight: '1.6', margin: '0 0 8px' }
const textSmall = { fontSize: '13px', color: '#6b7280', lineHeight: '1.5', margin: '12px 0 0' }
const mensagemBox = { padding: '14px 16px', backgroundColor: '#fafbfc', borderRadius: '8px', margin: '0 0 16px', border: '1px solid #e5e7eb' }
const card = { padding: '14px 16px', backgroundColor: '#f7f9fc', borderRadius: '8px', margin: '0 0 14px', border: '1px solid #e5e7eb' }
const ctaBox = { padding: '18px 16px', backgroundColor: '#f0f9f4', borderRadius: '8px', margin: '0 0 18px', border: '1px solid #c8e6d3', textAlign: 'center' as const }
const ctaButton = { backgroundColor: '#1a3d2b', color: '#ffffff', padding: '12px 24px', borderRadius: '6px', textDecoration: 'none', fontSize: '15px', fontWeight: 'bold' as const, display: 'inline-block', margin: '8px 0' }
const labelCol = { width: '120px', verticalAlign: 'top' as const }
const labelText = { fontSize: '12px', color: '#6b7280', margin: '4px 0', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }
const valueText = { fontSize: '14px', color: '#1a3d2b', margin: '4px 0' }
const valueStrong = { fontSize: '16px', color: '#1a3d2b', margin: '4px 0', fontWeight: 'bold' as const }
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footer = { fontSize: '13px', color: '#999999', margin: '0', lineHeight: '1.5' }

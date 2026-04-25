import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section, Row, Column,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Fetely People"

interface PagamentoSolicitacaoProps {
  fornecedor?: string
  valor?: string
  vencimento?: string
  nf_numero?: string
  categoria?: string
  banco?: string
  agencia?: string
  conta_bancaria?: string
  pix?: string
  observacao?: string
  solicitante?: string
}

const PagamentoSolicitacaoEmail = ({
  fornecedor,
  valor,
  vencimento,
  nf_numero,
  categoria,
  banco,
  agencia,
  conta_bancaria,
  pix,
  observacao,
  solicitante,
}: PagamentoSolicitacaoProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Solicitação de pagamento — {fornecedor || ''} — {valor || ''}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Solicitação de Pagamento</Heading>
        <Text style={text}>
          Prezado(a),
        </Text>
        <Text style={text}>
          Segue solicitação de pagamento aprovada{solicitante ? ` por ${solicitante}` : ''}.
          Por favor, processe e devolva o comprovante.
        </Text>

        <Section style={card}>
          <Heading as="h2" style={h2}>Resumo</Heading>
          <Row>
            <Column style={labelCol}><Text style={labelText}>Fornecedor</Text></Column>
            <Column><Text style={valueText}>{fornecedor || '—'}</Text></Column>
          </Row>
          <Row>
            <Column style={labelCol}><Text style={labelText}>Valor</Text></Column>
            <Column><Text style={valueStrong}>{valor || '—'}</Text></Column>
          </Row>
          <Row>
            <Column style={labelCol}><Text style={labelText}>Vencimento</Text></Column>
            <Column><Text style={valueText}>{vencimento || '—'}</Text></Column>
          </Row>
          {nf_numero && nf_numero !== '—' && (
            <Row>
              <Column style={labelCol}><Text style={labelText}>NF</Text></Column>
              <Column><Text style={valueText}>{nf_numero}</Text></Column>
            </Row>
          )}
          {categoria && categoria !== '—' && (
            <Row>
              <Column style={labelCol}><Text style={labelText}>Categoria</Text></Column>
              <Column><Text style={valueText}>{categoria}</Text></Column>
            </Row>
          )}
        </Section>

        <Section style={card}>
          <Heading as="h2" style={h2}>Dados bancários do fornecedor</Heading>
          <Row>
            <Column style={labelCol}><Text style={labelText}>Banco</Text></Column>
            <Column><Text style={valueText}>{banco || '—'}</Text></Column>
          </Row>
          <Row>
            <Column style={labelCol}><Text style={labelText}>Agência</Text></Column>
            <Column><Text style={valueText}>{agencia || '—'}</Text></Column>
          </Row>
          <Row>
            <Column style={labelCol}><Text style={labelText}>Conta</Text></Column>
            <Column><Text style={valueText}>{conta_bancaria || '—'}</Text></Column>
          </Row>
          <Row>
            <Column style={labelCol}><Text style={labelText}>PIX</Text></Column>
            <Column><Text style={valueText}>{pix || '—'}</Text></Column>
          </Row>
        </Section>

        {observacao && observacao !== '—' && (
          <Section style={obsBox}>
            <Text style={labelText}>Observação</Text>
            <Text style={text}>{observacao}</Text>
          </Section>
        )}

        <Hr style={hr} />
        <Text style={footer}>
          Atenciosamente,<br />
          Equipe {SITE_NAME}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PagamentoSolicitacaoEmail,
  subject: (data: Record<string, any>) =>
    `[Fetely] Pagamento — ${data.fornecedor || 'Fornecedor'} — ${data.valor || ''}`,
  displayName: 'Solicitação de Pagamento',
  previewData: {
    fornecedor: 'Rocabella Distribuidora',
    valor: 'R$ 4.500,00',
    vencimento: '30/04/2026',
    nf_numero: '174882',
    categoria: '06.01.01 Produto Acabado Nacional',
    banco: 'Itaú',
    agencia: '1234',
    conta_bancaria: '56789-0',
    pix: 'cnpj@empresa.com.br',
    observacao: 'Pagar via PIX preferencialmente.',
    solicitante: 'Maria Souza',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { padding: '30px 25px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a3a5c', margin: '0 0 20px' }
const h2 = { fontSize: '15px', fontWeight: 'bold' as const, color: '#1a3a5c', margin: '0 0 10px' }
const text = { fontSize: '15px', color: '#3a3a4a', lineHeight: '1.6', margin: '0 0 16px' }
const card = { padding: '14px 16px', backgroundColor: '#f7f9fc', borderRadius: '8px', margin: '0 0 14px', border: '1px solid #e5e7eb' }
const obsBox = { padding: '12px 16px', backgroundColor: '#fffaf0', borderRadius: '8px', margin: '0 0 14px', border: '1px solid #fde9c4' }
const labelCol = { width: '120px', verticalAlign: 'top' as const }
const labelText = { fontSize: '12px', color: '#6b7280', margin: '4px 0', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }
const valueText = { fontSize: '14px', color: '#1a3a5c', margin: '4px 0' }
const valueStrong = { fontSize: '16px', color: '#1a3a5c', margin: '4px 0', fontWeight: 'bold' as const }
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footer = { fontSize: '13px', color: '#999999', margin: '0', lineHeight: '1.5' }

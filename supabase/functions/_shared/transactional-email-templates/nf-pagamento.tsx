import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Button, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Fetely People"

interface NFPagamentoProps {
  nomeColaborador?: string
  nomeFantasia?: string
  numeroNF?: string
  valor?: string
  dataVencimento?: string
  arquivoUrl?: string
  dadosPix?: string
  linkBoleto?: string
  observacao?: string
}

const NFPagamentoEmail = ({
  nomeColaborador,
  nomeFantasia,
  numeroNF,
  valor,
  dataVencimento,
  arquivoUrl,
  dadosPix,
  linkBoleto,
  observacao,
}: NFPagamentoProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Solicitação de pagamento {valor ? `- ${valor}` : ''} - venc. {dataVencimento || ''}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Solicitação de Pagamento</Heading>
        <Text style={text}>Prezado(a) responsável pelo financeiro,</Text>
        <Text style={text}>
          Segue abaixo solicitação de pagamento para processamento{nomeColaborador ? ` referente a ${nomeColaborador}` : ''}{nomeFantasia ? ` (${nomeFantasia})` : ''}.
        </Text>

        <Text style={detailsTitle}>Dados do Pagamento:</Text>
        <Text style={detailItem}><strong>Valor:</strong> {valor || '—'}</Text>
        <Text style={detailItem}><strong>Data de Vencimento:</strong> {dataVencimento || '—'}</Text>
        {nomeColaborador && (
          <Text style={detailItem}>
            <strong>Prestador/Fornecedor:</strong> {nomeColaborador}
            {nomeFantasia ? ` (${nomeFantasia})` : ''}
          </Text>
        )}
        {numeroNF && (
          <Text style={detailItem}><strong>Número da NF:</strong> {numeroNF}</Text>
        )}

        {dadosPix && (
          <>
            <Text style={detailsTitle}>Dados PIX / Bancários:</Text>
            <Text style={pixBox}>{dadosPix}</Text>
          </>
        )}

        {linkBoleto && (
          <Section style={buttonSection}>
            <Button style={downloadButton} href={linkBoleto}>
              📄 Abrir Boleto
            </Button>
          </Section>
        )}

        {arquivoUrl && (
          <Section style={buttonSection}>
            <Button style={downloadButton} href={arquivoUrl}>
              📎 Baixar Nota Fiscal (PDF)
            </Button>
          </Section>
        )}

        {observacao && (
          <>
            <Text style={detailsTitle}>Observações:</Text>
            <Text style={text}>{observacao}</Text>
          </>
        )}

        <Hr style={hr} />
        <Text style={text}>
          Após o pagamento, o status será atualizado automaticamente via conciliação bancária.
        </Text>
        <Text style={text}>
          Em caso de dúvidas, entre em contato com o departamento administrativo.
        </Text>
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
  component: NFPagamentoEmail,
  subject: (data: Record<string, any>) =>
    `[Fetely] Pagamento ${data.valor || ''} - venc. ${data.dataVencimento || ''}`,
  displayName: 'NF para Pagamento',
  previewData: {
    nomeColaborador: 'João Silva',
    nomeFantasia: 'Empresa XYZ',
    numeroNF: '12345',
    valor: 'R$ 5.000,00',
    dataVencimento: '15/01/2025',
    arquivoUrl: 'https://example.com/nf.pdf',
    dadosPix: 'joao@email.com (PIX)',
    linkBoleto: 'https://example.com/boleto.pdf',
    observacao: 'Favor pagar até o vencimento.',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { padding: '30px 25px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a3a5c', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#3a3a4a', lineHeight: '1.6', margin: '0 0 16px' }
const detailsTitle = { fontSize: '15px', color: '#1a3a5c', fontWeight: 'bold' as const, margin: '16px 0 8px' }
const detailItem = { fontSize: '15px', color: '#3a3a4a', lineHeight: '1.6', margin: '0 0 4px' }
const pixBox = {
  backgroundColor: '#f5f5f5',
  padding: '12px',
  borderRadius: '6px',
  fontSize: '14px',
  fontFamily: 'monospace',
  wordBreak: 'break-all' as const,
  margin: '8px 0 16px',
  color: '#1a3a5c',
}
const buttonSection = { margin: '20px 0', textAlign: 'center' as const }
const downloadButton = {
  backgroundColor: '#1a3a5c',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '6px',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  textDecoration: 'none',
}
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footer = { fontSize: '13px', color: '#999999', margin: '0', lineHeight: '1.5' }

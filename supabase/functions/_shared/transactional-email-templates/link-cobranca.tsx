import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview,
  Text, Hr, Section, Row, Column, Link,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface LinkCobrancaProps {
  parceiro_nome?: string
  tipo?: string          // 'PIX' | 'Cartão de Crédito' | 'Cartão'
  link_pagamento?: string
  valor?: string
  vencimento?: string
  pedido_id_externo?: string
  numero_parcela?: string
  total_parcelas?: string
}

const LinkCobrancaEmail = ({
  parceiro_nome,
  tipo,
  link_pagamento,
  valor,
  vencimento,
  pedido_id_externo,
  numero_parcela,
  total_parcelas,
}: LinkCobrancaProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>
      Fetély · Pagamento disponível — {valor} via {tipo}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Text style={headerBrand}>Fetély.</Text>
        </Section>

        <Section style={bodySection}>
          <Text style={celebrationText}>
            Toda grande celebração começa com uma escolha...
          </Text>
          <Heading style={h1}>Seu pagamento está pronto</Heading>

          {parceiro_nome && (
            <Text style={greeting}>Olá, {parceiro_nome}!</Text>
          )}

          <Text style={paragraph}>
            Seu pedido{pedido_id_externo ? ` #${pedido_id_externo}` : ''} está aguardando
            pagamento via {tipo || 'link'}.
          </Text>

          <Section style={detalhesBox}>
            <Row>
              <Column style={detalheLabel}>Valor</Column>
              <Column style={detalheValor}>{valor || '—'}</Column>
            </Row>
            {vencimento && (
              <Row>
                <Column style={detalheLabel}>Vencimento</Column>
                <Column style={detalheValor}>{vencimento}</Column>
              </Row>
            )}
            {numero_parcela && total_parcelas && (
              <Row>
                <Column style={detalheLabel}>Parcela</Column>
                <Column style={detalheValor}>{numero_parcela}/{total_parcelas}</Column>
              </Row>
            )}
          </Section>

          {link_pagamento && (
            <Section style={{ textAlign: 'center', margin: '0 0 20px' }}>
              <Button href={link_pagamento} style={ctaButton}>
                Pagar agora
              </Button>
              <Text style={linkAlt}>
                Ou copie o link:{" "}
                <Link href={link_pagamento} style={linkStyle}>
                  {link_pagamento}
                </Link>
              </Text>
            </Section>
          )}

          <Text style={paragraph}>
            Em caso de dúvidas, entre em contato com nosso time comercial.
          </Text>
        </Section>

        <Hr style={hr} />

        <Section style={footerSection}>
          <Text style={footer}>
            Fetély Comércio Importação e Exportação Ltda · CNPJ 63.591.078/0001-48
          </Text>
          <Text style={{ ...footer, margin: '4px 0 0', fontWeight: 600 }}>
            #celebreoqueimporta
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

const main = { backgroundColor: '#f5f5f5', fontFamily: 'Helvetica,Arial,sans-serif' }
const container = { margin: '0 auto', maxWidth: '560px', backgroundColor: '#ffffff' }
const headerSection = { backgroundColor: '#1a1a1a', padding: '24px 32px' }
const headerBrand = { color: '#ffffff', fontSize: '24px', fontWeight: '700', margin: '0', letterSpacing: '-0.5px' }
const bodySection = { padding: '32px 32px 24px' }
const celebrationText = { fontSize: '12px', color: '#888888', margin: '0 0 16px', letterSpacing: '0.5px', textTransform: 'uppercase' as const }
const h1 = { fontSize: '22px', fontWeight: '700', color: '#1a1a1a', margin: '0 0 16px' }
const greeting = { fontSize: '15px', color: '#333333', margin: '0 0 12px' }
const paragraph = { fontSize: '14px', color: '#555555', lineHeight: '1.5', margin: '0 0 16px' }
const detalhesBox = { backgroundColor: '#f8f8f8', borderRadius: '8px', padding: '16px 20px', margin: '0 0 20px' }
const detalheLabel = { fontSize: '12px', color: '#888888', width: '40%', paddingBottom: '6px' }
const detalheValor = { fontSize: '14px', color: '#1a1a1a', fontWeight: '600', paddingBottom: '6px' }
const ctaButton = { backgroundColor: '#1a1a1a', color: '#ffffff', fontSize: '15px', fontWeight: '600', padding: '14px 32px', borderRadius: '8px', textDecoration: 'none', display: 'inline-block' }
const linkAlt = { fontSize: '12px', color: '#888888', margin: '12px 0 0', textAlign: 'center' as const }
const linkStyle = { color: '#555555' }
const hr = { borderColor: '#eeeeee', margin: '0' }
const footerSection = { padding: '20px 32px' }
const footer = { fontSize: '11px', color: '#aaaaaa', margin: '0 0 4px', textAlign: 'center' as const }

export const template: TemplateEntry = {
  component: LinkCobrancaEmail,
  subject: (data) => `Fetély · Pagamento ${data.tipo || ''} — ${data.valor || ''} · Pedido ${data.pedido_id_externo || ''}`,
  displayName: 'Link de Cobrança (Cartão/PIX)',
  previewData: {
    parceiro_nome: 'Bella Decorações',
    tipo: 'PIX',
    link_pagamento: 'https://pag.ae/exemplo',
    valor: 'R$ 4.807,65',
    vencimento: '15/06/2026',
    pedido_id_externo: 'PED-1780249308300',
    numero_parcela: '1',
    total_parcelas: '1',
  },
}

import { Card, Muted, Screen, Title } from '@/components/ui';

export default function Conocimiento() {
  return (
    <Screen>
      <Title>Base de conocimiento</Title>
      <Muted>Documentos vectorizados por proyecto (bge-m3 + pgvector)</Muted>
      <Card>
        <Muted>La búsqueda semántica llegará cuando se vectorice `conocimiento`.</Muted>
      </Card>
    </Screen>
  );
}

import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { getTitular, valorOPendiente, FECHA_TEXTOS_LEGALES, type Titular } from '@/lib/legal';
import { socialMetadata, titleWithBrand } from '@/lib/seo';
import { absoluteUrl, SITE_NAME } from '@/lib/site';

const RUTA = '/aviso-legal';

const DESCRIPCION = `Aviso legal e información del titular de ${SITE_NAME} conforme al artículo 10 de la LSSI.`;

export const metadata: Metadata = {
  title: 'Aviso legal',
  description: DESCRIPCION,
  robots: { index: false, follow: true },
  alternates: { canonical: absoluteUrl(RUTA) },
  ...socialMetadata({ title: titleWithBrand('Aviso legal'), description: DESCRIPCION, path: RUTA, imageAlt: 'Aviso legal · Ododex' })
};

export default function AvisoLegalPage() {
  const titular = getTitular();
  const dato = (campo: keyof Titular) => valorOPendiente(titular, campo);

  return (
    <main className="main-wrapper">
      <Breadcrumbs
        items={[
          { name: 'Inicio', url: '/' },
          { name: 'Aviso legal', url: RUTA }
        ]}
      />
      <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-4">Aviso legal</h1>
      <div className="card legal-text">
        <h2>Datos del titular</h2>
        <p>
          En cumplimiento del artículo 10 de la Ley 34/2002, de servicios de la sociedad de la información y de comercio electrónico (LSSI), se informa de que el titular de este sitio web es:
        </p>
        <ul>
          <li>Titular: {dato('nombre')}</li>
          <li>NIF: {dato('nif')}</li>
          <li>Domicilio: {dato('domicilio')}</li>
          <li>Correo electrónico de contacto: {dato('email')}</li>
          {titular.tipo === 'empresa' && <li>Datos del Registro Mercantil: {dato('registroMercantil')}</li>}
        </ul>

        <h2>Objeto del sitio</h2>
        <p>
          {SITE_NAME} ofrece una calculadora orientativa del coste por kilómetro de un coche eléctrico frente a uno de gasolina o diésel. Los precios de los carburantes son las medias de las gasolineras que publica el Ministerio para la Transición Ecológica y el Reto Demográfico (MITECO). Las tarifas de recarga eléctrica las recopila Ododex y son orientativas.
        </p>

        <h2>Carácter no oficial y orientativo</h2>
        <p>
          Este sitio es independiente. No es una web oficial del MITECO ni de ninguna otra administración pública. Los resultados son estimaciones orientativas: el precio real de los carburantes y de la recarga depende de la gasolinera, del operador, de la tarifa contratada y de las promociones, y el consumo real de cada coche varía.
        </p>

        <h2>Limitación de responsabilidad</h2>
        <p>
          El titular procura que los datos y cálculos sean correctos y estén actualizados, pero no garantiza su exactitud ni su vigencia. No se responsabiliza de las decisiones tomadas ni de los perjuicios derivados del uso de los cálculos. Antes de tomar una decisión de compra, contrasta los precios y el consumo con tus propios datos.
        </p>

        <h2>Propiedad intelectual</h2>
        <p>
          Los textos, el diseño, el código, el logotipo y demás contenidos del sitio son propiedad del titular o se usan con autorización, y están protegidos por la normativa de propiedad intelectual. No se permite su reproducción, distribución o transformación sin permiso expreso, salvo para uso personal y citando la fuente.
        </p>

        <h2>Enlaces a terceros</h2>
        <p>
          El sitio puede enlazar a páginas de terceros, como la sede electrónica del MITECO, de donde proceden los precios de los carburantes. El titular no controla esos sitios ni responde de su contenido o de sus políticas.
        </p>

        <h2>Legislación aplicable</h2>
        <p>
          Este aviso se rige por la legislación española. Para cualquier controversia serán competentes los juzgados y tribunales que correspondan conforme a la normativa aplicable.
        </p>

        <p className="text-xs text-muted">Última revisión: {FECHA_TEXTOS_LEGALES}</p>
      </div>
    </main>
  );
}

// Contenido del prototipo Figma. Revisar con BITS-94 antes de producción.
export const mockPolicies = {
  terms: {
    badge: 'PERMISO OBLIGATORIO',
    title: 'Términos y condiciones',
    subtitle: 'Las reglas de uso de Solventa. Está corto a propósito.',
    action: 'Entendido, acepto',
    sections: [
      {
        heading: '1 · Quién te presta el servicio',
        body: 'Solventa Colombia S.A.S., NIT 901.482.117-3, Bogotá. Somos intermediarios de seguros: la póliza la emite la aseguradora que te indicamos antes de pagar.',
      },
      {
        heading: '2 · Qué puedes hacer aquí',
        body: 'Cotizar, contratar, pagar y administrar tu seguro de vida deudores y de hogar asociado a tu crédito de vivienda.',
      },
      {
        heading: '3 · Tu firma electrónica',
        body: 'Cuando aceptas desde tu cuenta, esa aceptación vale como tu firma y queda registrada con fecha y hora, según la Ley 527 de 1999.',
      },
      {
        heading: '4 · Tus claves',
        body: 'Tu usuario y tu clave son personales. Si crees que alguien más los tiene, avísanos y los bloqueamos.',
      },
      {
        heading: '5 · Cuándo termina',
        body: 'Puedes cerrar tu cuenta cuando quieras. Si tienes póliza activa, sigue vigente hasta que la canceles con la aseguradora.',
      },
      {
        heading: '6 · Si algo sale mal',
        body: 'Escríbenos a hola@solventa.co. También puedes acudir al Defensor del Consumidor Financiero o a la Superintendencia Financiera.',
      },
    ],
    note: 'Aceptar estos términos no te compromete a comprar. Puedes cotizar, mirarlo con calma y salir cuando quieras.',
  },
  personal: {
    badge: 'PERMISO OBLIGATORIO',
    title: 'Tratamiento de datos personales',
    subtitle: 'Qué datos tuyos usamos y para qué. Ley 1581 de 2012.',
    action: 'Autorizo el tratamiento',
    sections: [
      {
        heading: '1 · Quién responde por tus datos',
        body: 'Solventa Colombia S.A.S., NIT 901.482.117-3, Bogotá. Puedes escribirnos a datos@solventa.co o llamar al 601 000 0000.',
      },
      {
        heading: '2 · Qué datos recogemos',
        body: 'Tu nombre, tipo y número de documento, fecha de nacimiento, correo, celular y los datos de tu crédito: banco, saldo y plazo.',
      },
      {
        heading: '3 · Para qué los usamos',
        body: 'Calcular tu precio, confirmar que eres tú, contratar y administrar tu seguro, prevenir fraude y lavado de activos, y avisarte de tu seguro.',
      },
      {
        heading: '4 · Con quién los compartimos',
        body: 'Con la aseguradora que emite la póliza y con el banco de tu crédito, para registrar la cobertura. Con nadie más, y nunca los vendemos.',
      },
      {
        heading: '5 · Tus derechos',
        body: 'Conocer, actualizar, corregir y borrar tus datos, pedir prueba de esta autorización y revocarla. Respondemos en 15 días hábiles. También puedes reclamar ante la SIC.',
      },
    ],
    note: 'Por ley del sector conservamos tu información mientras tengas póliza y diez años más.',
  },
  financial: {
    badge: 'PERMISO OPCIONAL',
    title: 'Consulta en centrales de riesgo',
    subtitle: 'Es opcional. Si la das, tu precio puede bajar.',
    action: 'Autorizo la consulta',
    sections: [
      {
        heading: '1 · Qué autorizas',
        body: 'Consultar, reportar, procesar y divulgar la información sobre tu comportamiento crediticio, financiero y comercial ante los operadores de información.',
      },
      {
        heading: '2 · A quiénes consultamos',
        body: 'DataCrédito Experian y TransUnion, antes CIFIN. Son los dos operadores vigilados en Colombia.',
      },
      {
        heading: '3 · Para qué la usamos',
        body: 'Para conocer tu historial de pago y ajustar tu precio. Con buen historial lo que pagas al mes puede bajar hasta 14 %.',
      },
      {
        heading: '4 · Qué reportamos',
        body: 'Si contratas, reportamos el pago de tu póliza. Si te atrasas, el dato negativo permanece el doble del tiempo que estuviste en mora, máximo cuatro años desde el día en que pagues.',
      },
      {
        heading: '5 · Antes de reportarte',
        body: 'Te avisamos con veinte días de anticipación para que puedas ponerte al día o aclarar lo que no reconozcas.',
      },
      {
        heading: '6 · Puedes retirarla',
        body: 'Quitas esta autorización cuando quieras desde tu perfil. Tu plan vuelve a la tarifa estándar y tu póliza sigue vigente.',
      },
    ],
    note: 'Es opcional. Si no la autorizas puedes seguir igual y calculamos tu cotización solo con los datos que nos diste.',
  },
} as const;

export const mockDocuments = Object.entries(mockPolicies).map(([key, p]) => ({
  tipo: key === 'terms' ? 'terminos' : key === 'personal' ? 'open-data' : 'open-finance',
  version: 'V1',
  titulo: p.title,
  subtitulo: p.subtitle,
  baseLegal: 'Documento de demostración',
  contenido: p.sections.map((s) => `<h3>${s.heading}</h3><p>${s.body}</p>`).join(''),
  notaPie: p.note,
}));

# Decisiones de diseño

## I5 · Montos en `Float`

**Estado:** se mantienen como `Float` por ahora. Revisar si la app se usa con monedas con centavos.

**Por qué no es urgente.** La app maneja pesos colombianos (COP), que en la práctica no usan centavos. Un `Float` de 64 bits representa exactamente cualquier entero hasta 2^53 (≈ 9·10^15), así que sumas y restas de montos enteros no acumulan error. Los saldos que se actualizan con `increment`/`decrement` son operaciones atómicas en la base de datos.

**Dónde sí hay decimales:** intereses y cuotas (tasas E.A., amortización). Son valores calculados que se muestran redondeados; el redondeo se hace al mostrar y los saldos guardados provienen de montos que ingresa la persona.

**Riesgo residual.** Si alguien escribe un monto con decimales (p. ej. `10.10`), las sumas pueden arrastrar errores de ~1e-12. La conciliación de saldos (`/api/admin/conciliacion`) detecta derivas, y las pruebas e2e comprueban que una deriva de 123,45 se vea.

**Si se decide migrar.** Opción recomendada: `Decimal(18, 2)` en Prisma (o enteros en la unidad mínima), en una migración aparte con copia de seguridad previa, convirtiendo en los bordes de la API (`Number()` al serializar). Es un cambio que toca casi todas las rutas y todos los totales del dashboard, por eso no se mezcla con esta fase.

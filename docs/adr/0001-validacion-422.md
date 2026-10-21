# 0001 — Validación de DTO con `422`

| Campo     | Valor                     |
| --------- | ------------------------- |
| Estado    | Aceptado                  |
| Fecha     | 2026-10-20                |
| Decisores | Equipo backend (3 devs)   |
| Tags      | api, validación, contrato |

## Contexto

El backend legacy (FastAPI/Pydantic) responde **`422 Unprocessable Entity`**
cuando un DTO no valida. El frontend clasifica los errores así:

- `422` → error de validación (se muestra por campo en el formulario).
- `400` → error de negocio (mensaje general).

NestJS, por defecto, responde `400` ante un `ValidationPipe` fallido. Si se deja
el default, todos los errores de formulario del front se degradan a "error de
negocio".

## Decisión

Toda validación de DTO responde **`422`** con un único string en español con
formato `Campo '<campo>': <mensaje>`.

```json
{ "detail": "Campo 'precio': debe ser mayor a 0" }
```

## Alternativas consideradas

| Alternativa                     | Por qué se descarta                                     |
| ------------------------------- | ------------------------------------------------------- |
| Mantener `400` de NestJS        | Rompe la clasificación del front (`normalizeApiError`). |
| Devolver array de errores       | El contrato y el front esperan un solo string.          |
| Validar a mano en el controller | Duplica lógica y no cubre todos los DTOs.               |

## Consecuencias

**Positivas**

- Cero cambios en el frontend.
- Un único punto de traducción de errores.

**Negativas / costos**

- Hay que configurar `exceptionFactory` y traducir mensajes al español.
- El primer error es el único que se informa: el usuario corrige de a uno.

## Implementación

`ValidationPipe` global con `exceptionFactory` que lanza
`UnprocessableEntityException` (MIG-20; código de referencia en
`docs/api-contract.md` §9.2). Los mensajes en español se definen en cada DTO con
`class-validator`.

**Verificación:** e2e que envía un body inválido y espera `422` + `{ detail }`
con el prefijo `Campo '<campo>':`.

## Referencias

- `docs/api-contract.md` D-03, §5.3, §9.2
- `docs/conventions.md` §6.2
- Ticket MIG-20

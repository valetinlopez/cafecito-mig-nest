# 0002 — Envelope de error `{ detail }`

| Campo     | Valor                   |
| --------- | ----------------------- |
| Estado    | Aceptado                |
| Fecha     | 2026-10-20              |
| Decisores | Equipo backend (3 devs) |
| Tags      | api, errores, contrato  |

## Contexto

El frontend lee **exclusivamente** `json.detail` para mostrar y clasificar
errores (`frontend/lib/api.ts`). El legacy responde `{ "detail": "..." }` en
todos los códigos no-2xx.

NestJS, por defecto, responde:

```json
{ "statusCode": 404, "message": "Not Found", "error": "Not Found" }
```

Ese shape deja `detail` en `undefined` y todos los mensajes del front se
degradan a `Error <status>`.

## Decisión

Toda respuesta no-2xx responde exactamente:

```json
{ "detail": "Mensaje legible en español" }
```

Sin `statusCode`, `message`, `error`, `path` ni `timestamp`.

## Alternativas consideradas

| Alternativa                               | Por qué se descarta                                        |
| ----------------------------------------- | ---------------------------------------------------------- |
| Mantener el shape de Nest                 | Rompe todos los flujos de error del front.                 |
| Incluir `detail` además del shape de Nest | El front ignora el resto; agrega ruido y fuga información. |
| Adaptar el front                          | Fuera de alcance de la migración (constitución §2).        |

## Consecuencias

**Positivas**

- Compatibilidad total con el front actual.
- Superficie de error controlada (no se filtran stack traces).

**Negativas / costos**

- Se pierde el detalle estructurado de Nest para debugging HTTP.
- Los `500` deben loguearse del lado del servidor, porque el body no lo dice.

## Implementación

`AllExceptionsFilter` global registrado con `APP_FILTER` (MIG-20; referencia en
`docs/api-contract.md` §9.3). Mapea `HttpException` a su status y usa
`exception.message` o el primer mensaje del payload; cualquier otra excepción es
`500` con `Error interno del servidor`.

**Verificación:** e2e de `400`, `401`, `403`, `404`, `422` y `500` comprobando
que el body tenga solo la clave `detail`.

## Referencias

- `docs/api-contract.md` D-02, §5
- Ticket MIG-20

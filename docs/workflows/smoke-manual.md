# Workflow — Smoke manual contra base real

> Parte manual de MIG-38 ([spec 038](../../specs/038-smoke-e2e/spec.md)). Cubre lo
> que `test/frontend-compat.e2e-spec.ts` no puede probar sin PostgreSQL.

| Lo prueba el e2e automático                     | Lo prueba esta guía                                      |
| ----------------------------------------------- | -------------------------------------------------------- |
| Rutas, guards, validación y formato de errores  | Mapeo de entities contra las tablas reales               |
| Reglas de negocio de los services               | SQL de dashboard, reportes, movimientos y totales        |
| Shape exacto contra `frontend/types/api.ts`     | Transformers, defaults de columna y restricciones        |
| Arranque de todos los módulos juntos            | Transacciones y hora correcta en el frontend             |

**Cuándo correrla:** después de MIG-44 y antes del cutover (MIG-42).

**Estado:** todavía no se ejecutó. Los comandos no se probaron contra una base.

---

## 1. Precondiciones

> **Nunca contra producción:** esta guía crea pedidos, cajas y pagos, y borra un
> producto. Usar una base local o un branch de Neon descartable.

1. Una base con el esquema real y los datos del seed: `npm run seed` cuando exista
   (MIG-39) o `python seed.py` del backend legacy. Usuarios
   `admin@cafecito.com` y `mozo@cafecito.com`, clave `123456`.
2. `DATABASE_URL` apuntando a esa base y `SECRET_KEY` definida en `.env`.
3. **Puertos:** el backend usa `3000` por defecto, el mismo puerto que Next. Usar
   `PORT=8000`, el que ya espera `frontend/.env.example`. Si se usa otro, ajustar
   `NEXT_PUBLIC_API_URL`.
4. `CORS_ORIGINS=http://localhost:3000` para que el navegador pueda llamar a la API.
5. `npm run start:dev`, y en otra terminal (Git Bash):

```bash
API=http://localhost:8000/api/v1
TOKEN=$(curl -s "$API/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"admin@cafecito.com","password":"123456"}' \
  | node -pe "JSON.parse(require('fs').readFileSync(0)).access_token")
AUTH="Authorization: Bearer $TOKEN"
JSON='Content-Type: application/json'
```

---

## 2. Los siete pasos del flujo

### Paso 1 — Login y perfil

```bash
curl -s "$API/auth/me" -H "$AUTH"
```

**Esperado:** `200` con `rol: "admin"` y sin `password_hash`.

### Paso 2 — Mesas del seed

```bash
curl -s "$API/mesas/" -H "$AUTH"
```

**Esperado:** `200` con 12 mesas ordenadas por número y `estado: "libre"`.

### Paso 3 — Crear pedido

Anotar antes el stock de los productos 1 y 5 con `GET /productos/1` y
`GET /productos/5`.

```bash
curl -s "$API/pedidos/" -H "$AUTH" -H "$JSON" \
  -d '{"mesa_id":1,"detalles":[{"producto_id":1,"cantidad":2},{"producto_id":5,"cantidad":1}]}'
```

**Esperado:** `201` con `estado: "pendiente"`, `total` number igual a la suma de
los subtotales, `fecha` terminada en `Z` y `mesa.estado: "ocupada"`. El stock del
producto 1 baja 2 y el del producto 5 baja 1.

### Paso 4 — Estados del pedido

Reemplazar `1` por el `id` del pedido creado.

```bash
for estado in en_preparacion listo entregado; do
  curl -s -X PATCH "$API/pedidos/1" -H "$AUTH" -H "$JSON" -d "{\"estado\":\"$estado\"}"
done
```

**Esperado:** `200` en cada uno. Al llegar a `entregado`, `mesa.estado` es
`pendiente_cobro`.

### Paso 5 — Abrir caja y cobrar

```bash
curl -s "$API/caja/apertura" -H "$AUTH" -H "$JSON" -d '{"monto_inicial":1000}'
curl -s "$API/pedidos/1/pago" -H "$AUTH" -H "$JSON" -d '{"metodo_pago":"efectivo"}'
```

**Esperado:** apertura `201` con `total_ventas: 0`, `fecha_cierre: null` y
`monto_final: null`. Cobro `200` con `estado: "pagado"` y `mesa.estado: "libre"`.
`GET /pedidos/` ya no lo lista.

### Paso 6 — Movimientos y cierre

Reemplazar `1` por el `id` de la caja abierta.

```bash
curl -s "$API/caja/1/movimientos" -H "$AUTH"
curl -s "$API/caja/cierre" -H "$AUTH" -H "$JSON" -d '{"monto_final":3150}'
curl -s "$API/caja/historial" -H "$AUTH"
```

**Esperado:** un movimiento con `monto` number, `mesa_numero: 1` y
`usuario_nombre`. Cierre `200` con `estado: "cerrada"` y `total_ventas` igual al
total del pedido.

### Paso 7 — Dashboard y reportes

Usar la fecha de hoy en Buenos Aires.

```bash
curl -s "$API/dashboard/resumen" -H "$AUTH"
curl -s "$API/reportes/ventas?desde=AAAA-MM-DD&hasta=AAAA-MM-DD" -H "$AUTH"
```

**Esperado:** `ventas_dia.total` y `resumen.total_vendido` iguales al total
cobrado, con todos los importes como number. `ventas_por_metodo`,
`productos_mas_vendidos` y `mesas_utilizadas` traen los datos del pedido, y
`cajas[0].diferencia` es `monto_final - (monto_inicial + ventas_efectivo)`.

---

## 3. Verificaciones que solo tienen sentido con base real

| # | Qué hacer                                                           | Esperado                                                     |
| - | ------------------------------------------------------------------- | ------------------------------------------------------------ |
| A | `POST /empleados/` sin `activo`                                     | Responde `activo: true` (`DEFAULT` de la columna)            |
| B | `DELETE /productos/1` (ya vendido en el paso 3)                     | `400` con el mensaje del contrato; el producto sigue         |
| C | Crear un producto y hacer `DELETE` sobre él                         | `204` sin body; `GET` posterior responde `404`               |
| D | Pedido con un producto válido y otro con cantidad mayor al stock    | `400` y **ningún** stock cambia                              |
| E | `npm run schema:log`                                                | Sin diferencias inesperadas (MIG-44)                         |

---

## 4. Verificación visual en el frontend

Con `NEXT_PUBLIC_API_URL` apuntando a este backend, recorrer como admin y como
mozo: login, mesas, pedidos, carrito, productos (incluido eliminar), caja,
dashboard, empleados y reportes.

- [ ] Las horas de pedidos y caja coinciden con la hora real, sin las 3 h de
      diferencia del legacy (ADR 0007).
- [ ] Un mozo que entra a `/caja` vuelve a `/mesas` con el aviso de permisos.
- [ ] Los errores se ven como mensajes en español, no como `Error 400`.

---

## 5. Registro de ejecución

| Fecha | Quién | Base | Commit | Resultado | Observaciones |
| ----- | ----- | ---- | ------ | --------- | ------------- |
|       |       |      |        |           |               |

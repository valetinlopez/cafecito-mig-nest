# Workflow — Smoke manual contra base real

> Parte manual de MIG-38 ([spec 038](../../specs/038-smoke-e2e/spec.md)) y MIG-44
> ([spec 044](../../specs/044-esquema-real/spec.md)). Cubre lo que
> `test/frontend-compat.e2e-spec.ts` no puede probar sin PostgreSQL.

| Lo prueba el e2e automático                     | Lo prueba esta guía                                      |
| ----------------------------------------------- | -------------------------------------------------------- |
| Rutas, guards, validación y formato de errores  | Mapeo de entities contra las tablas reales               |
| Reglas de negocio de los services               | SQL de dashboard, reportes, movimientos y totales        |
| Shape exacto contra `frontend/types/api.ts`     | Transformers y restricciones reales                      |
| Arranque de todos los módulos juntos            | Transacciones y hora correcta en el frontend             |

**Cuándo correrla:** antes del cutover (MIG-42), y otra vez si cambia una entity o
una consulta.

---

## 1. Precondiciones

> **Nunca contra producción:** esta guía crea mesas, productos, pedidos, cajas,
> pagos y empleados, y cierra la caja abierta. Usar siempre una copia descartable.

1. **Crear la copia:** en Neon, **Branches → New branch**, con `production` como
   parent y **Branch data and schema**.
2. **Configurar `.env`:** copiar la URL de esa branch a `DATABASE_URL`. Revisar en
   **Connect** que el host sea el de la branch y no el de `production`.
3. **`DB_SYNCHRONIZE` sin definir.** Si se activa, TypeORM puede borrar columnas.
4. **Puertos:** el backend usa `3000` por defecto, el mismo puerto que Next. Usar
   `PORT=8000`, el que ya espera `frontend/.env.example`. Si se usa otro, ajustar
   `NEXT_PUBLIC_API_URL`.
5. **CORS:** `CORS_ORIGINS=http://localhost:3000`, para que el navegador pueda
   llamar a la API.
6. **Arrancar:** `PORT=8000 npm run start:dev`. En otra terminal (Git Bash), iniciar
   sesión con un **administrador real**:

```bash
API=http://localhost:8000/api/v1
JSON='Content-Type: application/json'
campo() { node -pe "const v = JSON.parse(require('fs').readFileSync(0)); $1"; }
api() { curl -s -w '\nHTTP %{http_code}\n' -H "$AUTH" -H "$JSON" "$@"; }

read -rp 'Email: ' EMAIL
read -rsp 'Contraseña: ' PASSWORD; echo
TOKEN=$(EMAIL="$EMAIL" PASSWORD="$PASSWORD" node -e "
  fetch('$API/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: process.env.EMAIL, password: process.env.PASSWORD }),
  }).then(async (r) => {
    const b = await r.json();
    if (!r.ok) { console.error(r.status, b.detail); process.exit(1); }
    console.log(b.access_token);
  })")
unset PASSWORD
AUTH="Authorization: Bearer $TOKEN"
```

**Esperado:** se define `TOKEN` sin errores. Repetir con un mozo real para probar
su login, y guardar el token del administrador para el resto de la guía.

---

## 2. Comparar el esquema

```bash
npm run schema:log
```

**Esperado:** `Your schema is up to date`. Este comando solo lee. Si propone
cambios, se corrige el mapeo, nunca la base (ADR 0009).

---

## 3. Los pasos del flujo

Los pasos crean sus propios datos, así que sirven para cualquier estado de la copia.

### Paso 1 — Datos existentes

```bash
api "$API/auth/me"
for ruta in mesas productos categorias pedidos empleados caja/historial; do
  api "$API/$ruta/" | tail -1
done
```

**Esperado:** `200` en todos, y `/auth/me` sin `password_hash`.

**Totales históricos:** comparar el `total_ventas` y los movimientos de cada caja
con esta consulta, ejecutada en el SQL Editor de Neon **sobre la branch**:

```sql
SELECT c.id, COALESCE(SUM(p.monto), 0) AS total
FROM cajas c
LEFT JOIN pagos p ON p.fecha >= c.fecha_apertura
  AND p.fecha <= COALESCE(c.fecha_cierre, now() AT TIME ZONE 'utc')
GROUP BY c.id ORDER BY c.id;
```

### Paso 2 — Crear mesa y producto de prueba

```bash
SUFIJO=$(date +%s)
CATEGORIA=$(curl -s "$API/categorias/" -H "$AUTH" | campo 'v[0].id')
MESA=$(curl -s "$API/mesas/" -H "$AUTH" -H "$JSON" \
  -d "{\"numero\":$((SUFIJO % 100000 + 1000))}" | campo 'v.id')
PRODUCTO=$(curl -s "$API/productos/" -H "$AUTH" -H "$JSON" \
  -d "{\"nombre\":\"Smoke $SUFIJO\",\"precio\":1000.50,\"stock\":10,\"categoria_id\":$CATEGORIA}" \
  | campo 'v.id')
echo "mesa=$MESA producto=$PRODUCTO"
```

**Esperado:** dos ids numéricos. Si falta alguno, revisar la respuesta sin `campo`.

### Paso 3 — Crear pedido

```bash
PEDIDO=$(curl -s "$API/pedidos/" -H "$AUTH" -H "$JSON" \
  -d "{\"mesa_id\":$MESA,\"detalles\":[{\"producto_id\":$PRODUCTO,\"cantidad\":2}]}" \
  | tee /dev/stderr | campo 'v.id')
api "$API/productos/$PRODUCTO"
```

**Esperado:** `estado: "pendiente"`, `total: 2001`, `fecha` terminada en `Z` y
`mesa.estado: "ocupada"`. El stock del producto pasa de 10 a 8.

### Paso 4 — Estados del pedido

```bash
for estado in en_preparacion listo entregado; do
  api -X PATCH "$API/pedidos/$PEDIDO" -d "{\"estado\":\"$estado\"}"
done
```

**Esperado:** `200` en cada uno. Al llegar a `entregado`, `mesa.estado` es
`pendiente_cobro`.

### Paso 5 — Abrir caja y cobrar

La copia puede traer una caja abierta. Se cierra para empezar un período propio.

```bash
ABIERTA=$(curl -s "$API/caja/" -H "$AUTH" | campo 'v === null ? "" : v.id')
[ -n "$ABIERTA" ] && api "$API/caja/cierre" -d '{"monto_final":0}'
CAJA=$(curl -s "$API/caja/apertura" -H "$AUTH" -H "$JSON" \
  -d '{"monto_inicial":1000}' | tee /dev/stderr | campo 'v.id')
api "$API/pedidos/$PEDIDO/pago" -d '{"metodo_pago":"efectivo"}'
```

**Esperado:** apertura con `total_ventas: 0`, `fecha_apertura` con la hora actual,
`fecha_cierre: null` y `monto_final: null`. Cobro `200` con `estado: "pagado"` y
`mesa.estado: "libre"`. `GET /pedidos/` ya no lo lista.

### Paso 6 — Movimientos y cierre

```bash
api "$API/caja/$CAJA/movimientos"
api "$API/caja/cierre" -d '{"monto_final":3001}'
api "$API/caja/historial"
```

**Esperado:** un movimiento con `monto: 2001` y `usuario_nombre` igual al usuario
que creó el pedido. Cierre `200` con `estado: "cerrada"` y `total_ventas: 2001`.

### Paso 7 — Dashboard y reportes

```bash
HOY=$(node -p "new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })")
api "$API/dashboard/resumen"
api "$API/reportes/ventas?desde=$HOY&hasta=$HOY"
```

**Esperado:** todos los importes como number. La caja de prueba figura en `cajas`
con `ventas_efectivo: 2001` y `diferencia: 0`, y el pedido aparece en las ventas
del día.

---

## 4. Verificaciones que solo tienen sentido con base real

| # | Qué hacer                                              | Esperado                                                  |
| - | ------------------------------------------------------ | --------------------------------------------------------- |
| A | `POST /empleados/` sin `activo` e iniciar sesión       | `activo: true` y login `200`: la aplicación asigna el valor |
| B | `PATCH /empleados/{id}` con `activo: false` e iniciar sesión | Login `401`                                         |
| C | `DELETE` del producto vendido en el paso 3             | `400` con el mensaje del contrato; el producto sigue      |
| D | Crear otro producto y hacer `DELETE`                   | `204` sin body; `GET` posterior responde `404`            |
| E | Pedido con un producto con stock y otro sin stock suficiente | `400` y **ningún** stock cambia                     |
| F | Dos cobros simultáneos de un pedido entregado (abajo)  | Un `200` y un `400`, y un solo pago                       |
| G | Repetir `npm run schema:log`                           | Sigue sin cambios: el flujo no alteró el esquema          |

**Doble cobro:** con una caja abierta y `$PEDIDO` en estado `entregado`:

```bash
for i in 1 2; do
  curl -s -o /dev/null -w '%{http_code}\n' "$API/pedidos/$PEDIDO/pago" \
    -H "$AUTH" -H "$JSON" -d '{"metodo_pago":"efectivo"}' &
done
wait
api "$API/caja/$CAJA/movimientos"
```

---

## 5. Verificación visual en el frontend

Con `NEXT_PUBLIC_API_URL` apuntando a este backend, recorrer como admin y como
mozo: login, mesas, pedidos, carrito, productos (incluido eliminar), caja,
dashboard, empleados y reportes.

- [ ] Las horas de pedidos y caja coinciden con la hora real, sin las 3 h de
      diferencia del legacy (ADR 0007).
- [ ] Un mozo que entra a `/caja` vuelve a `/mesas` con el aviso de permisos.
- [ ] Los errores se ven como mensajes en español, no como `Error 400`.

---

## 6. Al terminar

1. Borrar la branch de Neon.
2. Sacar la URL del `.env`.
3. Completar el registro.

## 7. Registro de ejecución

| Fecha | Quién | Base | Commit | Resultado | Observaciones |
| ----- | ----- | ---- | ------ | --------- | ------------- |
| 2026-11-03 | Alexis Napoli y agente | Branch de Neon `mig-44-validacion` | Sin commitear, sobre `ad5ab60` | Pasa | Detalle en `specs/044-esquema-real/validate.md`. Sin la sección 5 (frontend). |
